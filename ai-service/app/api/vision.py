from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse, Response
import httpx
import base64
import json
import re
import asyncio
import fitz
from json_repair import repair_json
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.core.db import get_db
from app.models.document_analysis import DocumentAnalysisEntity
from app.utils.logger import log_info, log_error
from app.utils.blur_detector import check_image_blur
import app.core.state as state
import os

router = APIRouter()

API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

prompt = """
You are the Hexa MedPlus Vision AI Radiologist and Document Analyzer.

Your entire response MUST be a single valid JSON object.

Rules:
- Do not use markdown.
- Do not use ```json.
- Do not include any introductory text like "**Answer:**". Output ONLY the raw JSON object starting with `{`.
- Do not explain anything outside JSON.
- Output exactly one JSON object.
- Every field must exist. If a field is not applicable, use null or empty arrays.
- For medical images (MRI/X-Ray/CT), focus on anatomical findings, anomalies, and symmetry.
- For scanned clinical documents or lab reports, focus on extracting text (OCR). You MUST extract ALL visible text, including all numbers, values, and units.
- For tabular data, matrices, or test results, you MUST extract both the test names/labels AND their corresponding numerical results, reference ranges, and units. Do not skip the numbers!
- Do not stop extracting text early just because a portion of the document is blurry.
- You MUST leave the `clinical_findings` array completely empty `[]` for documents. Do NOT hallucinate anatomical sizes or locations from document text.
- If the image is a logo, QR code, signature, or any other graphic that does not contain medical/clinical information, you MUST set `"is_clinical_data": false`. Otherwise, set it to `true`.
- If any text is obscured, smudged, or blurred, do not guess or hallucinate text that you cannot read clearly. Leave `blurry_text_regions` as an empty array `[]` (the backend will populate it via OpenCV).

The JSON schema is:
{
  "image_metadata": {
      "modality": "",
      "body_part_or_document_type": "",
      "is_clinical_data": true
  },
  "image_quality": {
      "overall_quality": "",
      "artifacts": [],
      "readability_confidence": 0.0
  },
  "clinical_findings": [
      {
          "finding": "",
          "appearance": "",
          "signal": "",
          "location": "",
          "size_estimate": "",
          "severity": "",
          "confidence": 0.0
      }
  ],
  "ocr_extraction": {
      "extracted_text": "",
      "blurry_text_regions": []
  },
  "recommendation": "",
  "limitations": []
}
"""

async def call_aws_bedrock_vision(image_bytes: bytes, image_type: str, prompt_text: str, model_id: str = "amazon.nova-pro-v1:0", max_tokens: int = 2048) -> dict:
    log_info(f"🤖 VISION ROUTING: Executing with AWS Bedrock Vision ({model_id})...")
    try:
        import boto3
        import asyncio
        import re
        import json
        key_id = settings.AWS_ACCESS_KEY_ID or os.environ.get("AWS_ACCESS_KEY_ID")
        secret_key = settings.AWS_SECRET_ACCESS_KEY or os.environ.get("AWS_SECRET_ACCESS_KEY")
        region = settings.AWS_DEFAULT_REGION or os.environ.get("AWS_DEFAULT_REGION", "ap-south-1")
        bedrock = boto3.client(
            'bedrock-runtime',
            aws_access_key_id=key_id,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        
        fmt = image_type.lower()
        if fmt in ['jpg', 'jpeg']:
            fmt = 'jpeg'
        elif fmt not in ['png', 'gif', 'webp']:
            fmt = 'png'

        def _invoke_bedrock():
            return bedrock.converse(
                modelId=model_id,
                messages=[{
                    'role': 'user',
                    'content': [
                        {'image': {'format': fmt, 'source': {'bytes': image_bytes}}},
                        {'text': prompt_text}
                    ]
                }],
                inferenceConfig={'temperature': 0.1, 'maxTokens': max_tokens}
            )

        response = await asyncio.to_thread(_invoke_bedrock)
        output_text = response['output']['message']['content'][0]['text']
        clean_text = re.sub(r'```(?:json)?\s*', '', output_text)
        clean_text = re.sub(r'\s*```', '', clean_text).strip()
        return json.loads(clean_text)
    except Exception as e:
        log_error(f"AWS Bedrock Vision call failed ({model_id}): {e}")
        return {"error": f"AWS Bedrock Vision failed: {str(e)}"}

async def analyze_image_with_vision_ai(image_bytes: bytes, image_type: str = "jpeg", max_tokens: int = 2048, custom_prompt: str = None, timeout: float = 300.0) -> dict:
    actual_prompt = custom_prompt if custom_prompt else prompt

    # Route to AWS Bedrock Vision models if selected
    if state.GLOBAL_VISION_PREFERENCE == "aws_nova_pro":
        return await call_aws_bedrock_vision(image_bytes, image_type, actual_prompt, model_id="apac.amazon.nova-pro-v1:0", max_tokens=max_tokens)
    elif state.GLOBAL_VISION_PREFERENCE == "aws_nova":
        return await call_aws_bedrock_vision(image_bytes, image_type, actual_prompt, model_id="apac.amazon.nova-lite-v1:0", max_tokens=max_tokens)

    api_key = os.environ.get("NVIDIA_API_KEY") or os.environ.get("NVIDIA_NIM_API_KEY") or settings.NVIDIA_NIM_API_KEY
    if not api_key:
        log_error("NVIDIA_API_KEY / NVIDIA_NIM_API_KEY is not set.")
        return {"error": "NVIDIA_API_KEY is not configured"}

    base64_img = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:image/{image_type};base64,{base64_img}"

    payload = {
        "model": "meta/llama-3.2-90b-vision-instruct",
        "messages": [
            {
                "role": "system",
                "content": "You are a medical AI. You MUST output ONLY valid JSON. Absolutely NO markdown formatting. NO asterisks. DO NOT include ```json."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": actual_prompt},
                    {"type": "image_url", "image_url": {"url": data_uri}}
                ]
            }
        ],
        "temperature": 0.1,
        "top_p": 0.9,
        "max_tokens": max_tokens,
        "stream": False
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(API_URL, headers=headers, json=payload)
            if response.status_code == 200:
                result = response.json()
                content_str = result["choices"][0]["message"]["content"]
                
                # Clean markdown code blocks if present
                content_str = re.sub(r"^```(?:json)?", "", content_str.strip(), flags=re.MULTILINE)
                content_str = re.sub(r"```$", "", content_str.strip(), flags=re.MULTILINE).strip()
                
                match = re.search(r"\{.*\}", content_str, re.DOTALL)
                if match:
                    content_str = match.group(0)
                    
                # Fix invalid backslash escapes (e.g. \< or \% or \ space) that LLMs sometimes generate
                content_str = re.sub(r'\\(?!["\\/bfnrtu])', lambda m: '\\\\', content_str)
                    
                try:
                    parsed = json.loads(content_str, strict=False)
                    if isinstance(parsed, str):
                        parsed = json.loads(parsed, strict=False)
                    return parsed
                except json.JSONDecodeError:
                    try:
                        repaired = repair_json(content_str, return_objects=True)
                        if repaired:
                            return repaired
                        else:
                            raise ValueError("json_repair returned empty")
                    except Exception as e:
                        log_error(f"[!] Failed to parse Vision AI JSON output: {e}")
                        log_error(f"[!] Raw unparseable content:\n{content_str}")
                        return {"raw_text": content_str}
            else:
                log_error(f"[!] API Error: {response.text}")
                return {"api_error": response.text, "status_code": response.status_code}
    except Exception as e:
        log_error(f"[!] Request failed: {repr(e)}")
        return {"api_error": repr(e)}

async def structure_lab_report_with_llama(ocr_text: str) -> dict:
    """Uses LLaMA to structure OCR text from a lab report."""
    if not ocr_text or not ocr_text.strip():
        return {}

    api_key = os.environ.get("NVIDIA_API_KEY") or os.environ.get("NVIDIA_NIM_API_KEY") or settings.NVIDIA_NIM_API_KEY
    if not api_key:
        log_error("NVIDIA_API_KEY / NVIDIA_NIM_API_KEY is not set.")
        return {"error": "NVIDIA_API_KEY is not configured"}

    prompt_text = """You are a medical AI assistant.
Extract structured information from the following lab report OCR text.
Output MUST be a single JSON object.
Do not use markdown blocks. Output raw JSON.

Schema:
{
    "patient_info": {"name": "", "age": "", "gender": "", "vitals": {}},
    "lab_findings": [
        {"finding": "Test Name", "result": "12.5", "unit": "g/dL", "reference_range": "13.0 - 17.0", "flag": "L"}
    ],
    "heading": "Auto-generated Title",
    "summary": "Brief clinical summary"
}

OCR Text:
""" + ocr_text

    payload = {
        "model": "meta/llama-3.1-70b-instruct",
        "messages": [
            {"role": "user", "content": prompt_text}
        ],
        "temperature": 0.1,
        "top_p": 0.9,
        "max_tokens": 2048,
        "stream": False
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(API_URL, headers=headers, json=payload)
            if response.status_code == 200:
                result = response.json()
                content_str = result["choices"][0]["message"]["content"]
                
                content_str = re.sub(r"^```(?:json)?", "", content_str.strip(), flags=re.MULTILINE)
                content_str = re.sub(r"```$", "", content_str.strip(), flags=re.MULTILINE).strip()
                match = re.search(r"\{.*\}", content_str, re.DOTALL)
                if match:
                    content_str = match.group(0)
                    
                content_str = re.sub(r'\\(?!["\\/bfnrtu])', lambda m: '\\\\', content_str)
                    
                try:
                    parsed = json.loads(content_str, strict=False)
                    if isinstance(parsed, str):
                        parsed = json.loads(parsed, strict=False)
                    return parsed
                except json.JSONDecodeError:
                    try:
                        repaired = repair_json(content_str, return_objects=True)
                        if repaired:
                            return repaired
                        else:
                            raise ValueError("json_repair returned empty")
                    except Exception as e:
                        log_error(f"[!] Failed to parse Lab JSON output: {e}")
                        log_error(f"[!] Raw unparseable content:\n{content_str}")
                        return {}
            else:
                log_error(f"[!] Lab structure API Error: {response.text}")
                return {}
    except Exception as e:
        log_error(f"[!] Lab structure request failed: {repr(e)}")
        return {}


async def structure_clinical_note_with_llama(ocr_text: str, doc_type: str = "OTHER") -> dict:
    """Uses LLaMA to summarize and structure a clinical note or other document."""
    if not ocr_text or not ocr_text.strip():
        return {}

    api_key = os.environ.get("NVIDIA_API_KEY") or os.environ.get("NVIDIA_NIM_API_KEY") or settings.NVIDIA_NIM_API_KEY
    if not api_key:
        return {}

    schema_str = '{"heading": "Concise document title", "summary": "Clinical summary in 2-3 sentences", "key_points": ["Key finding 1"]}'
    prompt_text = (
        "You are a medical AI assistant.\n"
        "Summarize and structure the following clinical document OCR text.\n"
        "Output MUST be a single JSON object. Do not use markdown. Output raw JSON.\n\n"
        "Schema:\n" + schema_str + "\n\n"
        "Document type: " + doc_type + "\n"
        "OCR Text:\n"
    ) + ocr_text

    payload = {
        "model": "meta/llama-3.1-70b-instruct",
        "messages": [{"role": "user", "content": prompt_text}],
        "temperature": 0.1,
        "top_p": 0.9,
        "max_tokens": 1024,
        "stream": False
    }
    headers = {
        "Authorization": "Bearer " + api_key,
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(API_URL, headers=headers, json=payload)
            if response.status_code == 200:
                result = response.json()
                raw = result["choices"][0]["message"]["content"]
                raw = re.sub(r"^```(?:json)?", "", raw.strip(), flags=re.MULTILINE)
                raw = re.sub(r"```$", "", raw.strip(), flags=re.MULTILINE).strip()
                m = re.search(r"\{.*\}", raw, re.DOTALL)
                if m:
                    raw = m.group(0)
                raw = re.sub(r'\\(?!["\\\\/bfnrtu])', lambda x: "\\\\", raw)
                try:
                    parsed = json.loads(raw, strict=False)
                    if isinstance(parsed, str):
                        parsed = json.loads(parsed, strict=False)
                    return parsed
                except Exception:
                    try:
                        from json_repair import repair_json
                        repaired = repair_json(raw, return_objects=True)
                        return repaired if repaired else {}
                    except Exception as e2:
                        log_error("[!] Failed to parse clinical note JSON: " + str(e2))
                        return {"summary": ocr_text[:2000]}
            else:
                log_error("[!] Clinical note structure API Error: " + response.text)
                return {}
    except Exception as e:
        log_error("[!] Clinical note structure request failed: " + repr(e))
        return {}

@router.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyzes an uploaded image or PDF natively using PyMuPDF and NVIDIA NIM.
    Rejects images that are heavily blurred (> 25%).
    """
    log_info(f"Processing uploaded file: {file.filename}")
    try:
        file_bytes = await file.read()
        ext = Path(file.filename).suffix.lower()

        response_data = {
            "source_file": file.filename,
            "native_extracted_text": "",
            "vision_analysis": []
        }

        if ext == '.pdf':
            log_info(f"[*] Processing PDF: {file.filename}")
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                if text:
                    response_data["native_extracted_text"] += text + "\n"
                
                images = page.get_images(full=True)
                for img_index, img in enumerate(images, start=1):
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    img_ext = base_image["ext"]
                    
                    # Check blur before sending
                    blur_pct, _, _, _ = check_image_blur(image_bytes)
                    if blur_pct > 25.0:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Embedded image on page {page_num+1} is heavily blurred ({blur_pct:.1f}%). Please re-upload a clearer image."
                        )
                        
                    log_info(f"[*] Sending embedded image to NVIDIA NIM API...")
                    analysis_result = await analyze_image_with_vision_ai(image_bytes, img_ext)
                    response_data["vision_analysis"].append({
                        "page": page_num + 1,
                        "image_index": img_index,
                        "analysis": analysis_result
                    })
        else:
            log_info(f"[*] Processing Image: {file.filename}")
            blur_pct, _, _, _ = check_image_blur(file_bytes)
            if blur_pct > 25.0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Document is heavily blurred ({blur_pct:.1f}%). Please re-upload a clearer image."
                )
            
            log_info("[*] Sending image to NVIDIA NIM API...")
            img_ext = ext.strip('.') if ext else "jpeg"
            analysis_result = await analyze_image_with_vision_ai(file_bytes, img_ext)
            response_data["vision_analysis"].append({
                "page": 1,
                "image_index": 1,
                "analysis": analysis_result
            })

        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Vision analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def vision_status():
    """Check if the NVIDIA NIM API is configured."""
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        return {"status": "NOT_CONFIGURED", "model": "meta/llama-3.2-90b-vision-instruct"}
    return {"status": "ONLINE", "model": "meta/llama-3.2-90b-vision-instruct"}

from pydantic import BaseModel
from typing import Optional

class UpdateVisionResultRequest(BaseModel):
    extractedText: Optional[str] = None
    reportSummary: Optional[str] = None
    verified: Optional[bool] = True

@router.get("/results")
async def get_all_vision_results(db: AsyncSession = Depends(get_db)):
    """Returns all Vision AI analysis results across all patients."""
    result = await db.execute(
        select(DocumentAnalysisEntity)
        .order_by(DocumentAnalysisEntity.analyzed_at.desc())
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "fileKey": r.file_key,
            "patientMrn": r.patient_mrn,
            "documentType": r.document_type,
            "extractedText": r.extracted_text,
            "reportSummary": r.report_summary,
            "nativeExtractedText": r.native_extracted_text,
            "aiHeading": r.ai_heading,
            "clinicalFindings": r.clinical_findings or [],
            "imageMetadata": r.image_metadata or {},
            "blurryRegions": r.blurry_regions or [],
            "blurDoctorInputs": r.blur_doctor_inputs or [],
            "imageWidth": r.image_width,
            "imageHeight": r.image_height,
            "modelUsed": r.model_used,
            "analyzedAt": r.analyzed_at.isoformat() if r.analyzed_at else None,
            "verified": getattr(r, 'verified', False),
            "needsBlurAnnotation": getattr(r, 'needs_blur_annotation', False) or False,
            "documentId": getattr(r, 'document_id', None),
        }
        for r in records
    ]

@router.get("/results/{mrn}")
async def get_vision_results_by_mrn(mrn: str, db: AsyncSession = Depends(get_db)):
    """
    Returns all Vision AI analysis results for a specific patient MRN.
    """
    result = await db.execute(
        select(DocumentAnalysisEntity)
        .where(DocumentAnalysisEntity.patient_mrn == mrn)
        .order_by(DocumentAnalysisEntity.analyzed_at.desc())
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "fileKey": r.file_key,
            "patientMrn": r.patient_mrn,
            "documentType": r.document_type,
            "extractedText": r.extracted_text,
            "reportSummary": r.report_summary,
            "nativeExtractedText": r.native_extracted_text,
            "aiHeading": r.ai_heading,
            "clinicalFindings": r.clinical_findings or [],
            "imageMetadata": r.image_metadata or {},
            "blurryRegions": r.blurry_regions or [],
            "blurDoctorInputs": r.blur_doctor_inputs or [],
            "imageWidth": r.image_width,
            "imageHeight": r.image_height,
            "modelUsed": r.model_used,
            "analyzedAt": r.analyzed_at.isoformat() if r.analyzed_at else None,
            "verified": getattr(r, 'verified', False),
            "needsBlurAnnotation": getattr(r, 'needs_blur_annotation', False) or False,
            "documentId": getattr(r, 'document_id', None),
        }
        for r in records
    ]

@router.get("/results/{mrn}/labs/trend")
async def get_lab_trends(mrn: str, db: AsyncSession = Depends(get_db)):
    """
    Aggregates structured lab findings across all of a patient's LAB_REPORT
    documents, grouped by test name, and returns a point series + a short
    AI-generated trend insight for each test that appears in 2+ documents
    (a single result isn't a trend).
    """
    from app.models.schemas import LabTrendInsightSchema
    from app.prompts.templates import LAB_TREND_PROMPT
    from app.graph.nodes.agents import get_llm, robust_json_invoke
    from langchain_core.output_parsers import JsonOutputParser

    result = await db.execute(
        select(DocumentAnalysisEntity)
        .where(
            DocumentAnalysisEntity.patient_mrn == mrn,
            DocumentAnalysisEntity.document_type == 'LAB_REPORT'
        )
        .order_by(DocumentAnalysisEntity.analyzed_at.asc())
    )
    records = result.scalars().all()

    groups = {}
    for r in records:
        if not r.clinical_findings:
            continue
        for finding in r.clinical_findings:
            test_name = (finding.get('finding') or finding.get('test_name') or '').strip()
            result_val = finding.get('result')
            if not test_name or result_val in (None, ''):
                continue
            group = groups.setdefault(test_name, {
                'unit': finding.get('unit', ''),
                'referenceRange': finding.get('reference_range', ''),
                'points': []
            })
            group['points'].append({
                'date': r.analyzed_at.isoformat() if r.analyzed_at else None,
                'result': result_val,
                'flag': finding.get('flag', '')
            })

    trends = []
    for test_name, group in groups.items():
        if len(group['points']) < 2:
            continue

        ai_insight = "Trend analysis unavailable."
        try:
            parser = JsonOutputParser(pydantic_object=LabTrendInsightSchema)
            input_dict = {
                "test_name": test_name,
                "unit": group['unit'],
                "reference_range": group['referenceRange'],
                "points": json.dumps(group['points']),
                "format_instructions": parser.get_format_instructions()
            }
            llm = get_llm()
            output = await asyncio.to_thread(
                robust_json_invoke, LAB_TREND_PROMPT, llm, parser, input_dict,
                {"insight": "Trend analysis unavailable."}
            )
            if isinstance(output, dict) and output.get('insight'):
                ai_insight = output['insight']
        except Exception as e:
            log_error(f"Lab trend insight failed for '{test_name}' (MRN {mrn}): {str(e)}")

        trends.append({
            "testName": test_name,
            "unit": group['unit'],
            "referenceRange": group['referenceRange'],
            "points": group['points'],
            "aiInsight": ai_insight
        })

    return {"trends": trends}


class UpdateVisionResultRequest(BaseModel):
    extractedText: Optional[str] = None
    reportSummary: Optional[str] = None
    aiHeading: Optional[str] = None
    blurDoctorInputs: Optional[list] = None
    clinicalFindings: Optional[list] = None
    verified: Optional[bool] = True

@router.put("/results/{analysis_id}")
async def update_vision_result(
    analysis_id: str,
    payload: UpdateVisionResultRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates a Vision AI analysis record — text, heading, blur inputs, and verified status.
    """
    result = await db.execute(
        select(DocumentAnalysisEntity).where(DocumentAnalysisEntity.id == analysis_id)
    )
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Vision AI analysis record not found")

    if payload.extractedText is not None:
        record.extracted_text = payload.extractedText
    if payload.reportSummary is not None:
        record.report_summary = payload.reportSummary
    if payload.aiHeading is not None:
        record.ai_heading = payload.aiHeading
    if payload.blurDoctorInputs is not None:
        record.blur_doctor_inputs = payload.blurDoctorInputs
    if payload.clinicalFindings is not None:
        record.clinical_findings = payload.clinicalFindings
    if hasattr(record, 'verified'):
        record.verified = payload.verified if payload.verified is not None else True

    await db.commit()
    await db.refresh(record)
    return {
        "status": "SUCCESS",
        "id": record.id,
        "extractedText": record.extracted_text,
        "reportSummary": record.report_summary,
        "aiHeading": record.ai_heading,
        "verified": getattr(record, 'verified', True)
    }

@router.delete("/results/{analysis_id}")
async def delete_vision_result(
    analysis_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a Vision AI analysis record.
    """
    result = await db.execute(
        select(DocumentAnalysisEntity).where(DocumentAnalysisEntity.id == analysis_id)
    )
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Vision AI analysis record not found")

    await db.delete(record)
    await db.commit()
    return {"status": "SUCCESS", "message": "Record deleted"}

@router.delete("/results/by-file-key/{file_key:path}")
async def delete_vision_result_by_file_key(
    file_key: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a Vision AI analysis record using its file_key.
    Useful for cascading deletes from the document service.
    """
    result = await db.execute(
        select(DocumentAnalysisEntity).where(DocumentAnalysisEntity.file_key == file_key)
    )
    records = result.scalars().all()
    if not records:
        # Don't raise 404, just return success if it doesn't exist
        return {"status": "SUCCESS", "message": "No records found to delete"}

    for record in records:
        await db.delete(record)
        
    await db.commit()
    return {"status": "SUCCESS", "message": f"Deleted {len(records)} record(s)"}

def _resolve_document_url(file_key: str, file_url: Optional[str] = None) -> str:
    if file_url and 'http' in file_url:
        resolved = file_url
    else:
        resolved = "http://document-service:8082/api/documents/download?fileKey=" + file_key
    if 'postgres' not in settings.POSTGRES_HOST and 'document-service' in resolved:
        resolved = resolved.replace('http://document-service:8082', 'http://localhost:8082')
    return resolved


@router.get("/pdf-page-image")
async def get_pdf_page_image(fileKey: str, page: int = 1):
    """
    Renders a single page of an uploaded PDF as a PNG, at the same 1.5x render
    matrix used during ingestion, so blur-region bounding boxes line up.
    Used by the blur-annotation UI to show the correct page for each region.
    """
    try:
        file_url = _resolve_document_url(fileKey)
        async with httpx.AsyncClient(timeout=60.0) as client:
            pdf_resp = await client.get(file_url)
            pdf_resp.raise_for_status()
            pdf_bytes = pdf_resp.content

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        try:
            if page < 1 or page > len(doc):
                raise HTTPException(status_code=404, detail=f"Page {page} not found in document")
            pg = doc[page - 1]
            mat = fitz.Matrix(1.5, 1.5)
            pix = pg.get_pixmap(matrix=mat, alpha=False)
            png_bytes = pix.tobytes("png")
        finally:
            doc.close()

        return Response(content=png_bytes, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Failed to render PDF page image for {fileKey} page {page}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ReanalyzeVisionRequest(BaseModel):
    fileUrl: Optional[str] = None
    blurDoctorInputs: list

@router.post("/results/{analysis_id}/reanalyze")
async def reanalyze_vision_result(
    analysis_id: str,
    payload: ReanalyzeVisionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Re-analyzes a document using a 2-step pipeline:
      Step 1 — Vision AI: pure OCR extraction from the image (no injected notes in prompt)
      Step 2 — LLaMA: structures the OCR text merged with doctor blur annotations
    After re-analysis, auto-saves clinical/other docs to patient notes.
    """
    result = await db.execute(
        select(DocumentAnalysisEntity).where(DocumentAnalysisEntity.id == analysis_id)
    )
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Vision AI analysis record not found")

    is_pdf = record.file_key.lower().endswith('.pdf')

    try:
        file_url = _resolve_document_url(record.file_key, payload.fileUrl)
        meta = dict(record.image_metadata or {})

        if is_pdf:
            # ── PDF: re-render + re-OCR only the pages the doctor annotated ────
            # (non-blurry pages were already OCR'd correctly during ingestion and
            # are already sitting in record.extracted_text — no need to redo them).
            pages_notes = {}
            for inp in payload.blurDoctorInputs:
                region = inp.get('region', '')
                note_text = inp.get('text', '')
                page_match = re.match(r'page:(\d+)', region)
                page_num = int(page_match.group(1)) if page_match else 1
                pages_notes.setdefault(page_num, []).append((region, note_text))

            async with httpx.AsyncClient(timeout=60.0) as client:
                pdf_resp = await client.get(file_url)
                pdf_resp.raise_for_status()
                pdf_bytes = pdf_resp.content

            pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            annotated_sections = []
            try:
                for page_num in sorted(pages_notes.keys()):
                    if page_num < 1 or page_num > len(pdf_doc):
                        continue
                    page = pdf_doc[page_num - 1]
                    mat = fitz.Matrix(1.5, 1.5)
                    pix = page.get_pixmap(matrix=mat, alpha=False)
                    page_bytes = pix.tobytes("png")

                    log_info(f"Reanalyze Step 1 (PDF page {page_num}): calling Vision AI for OCR extraction...")
                    page_vision = await analyze_image_with_vision_ai(page_bytes, "png", max_tokens=4096, timeout=300.0)
                    page_ocr = ""
                    if page_vision and 'api_error' not in page_vision:
                        page_ocr = page_vision.get('ocr_extraction', {}).get('extracted_text', '')
                        if page_num == 1 and page_vision.get('image_metadata'):
                            meta.update(page_vision.get('image_metadata'))

                    doctor_notes = "\n".join(
                        "- " + region + ": " + note_text
                        for region, note_text in pages_notes[page_num]
                        if note_text and 'Skipped' not in note_text
                    )
                    section = f"[Page {page_num} — doctor-annotated]\n{page_ocr}"
                    if doctor_notes:
                        section += "\n\nDoctor annotations for blurry regions:\n" + doctor_notes
                    annotated_sections.append(section)
            finally:
                pdf_doc.close()

            ocr_text = (record.extracted_text or '').strip()
            if annotated_sections:
                ocr_text += "\n\n" + "\n\n".join(annotated_sections)
            merged_text = ocr_text
        else:
            # ── Single image: pure OCR, extract all visible text ───────────────
            async with httpx.AsyncClient(timeout=60.0) as client:
                img_resp = await client.get(file_url)
                img_resp.raise_for_status()
                image_bytes = img_resp.content

            ext = record.file_key.rsplit('.', 1)[-1].lower() if '.' in record.file_key else 'jpeg'

            log_info("Reanalyze Step 1: calling Vision AI for OCR extraction...")
            vision_result = await analyze_image_with_vision_ai(image_bytes, ext, max_tokens=4096, timeout=300.0)

            if not vision_result or 'api_error' in vision_result:
                raise HTTPException(status_code=500, detail="Vision AI API failed during re-analysis Step 1")

            ocr_text = vision_result.get('ocr_extraction', {}).get('extracted_text', '')
            meta.update(vision_result.get('image_metadata', {}))

            # ── Merge OCR with doctor blur annotations ────────────────────────
            doctor_notes = ""
            for inp in payload.blurDoctorInputs:
                region = inp.get('region', '')
                note_text = inp.get('text', '')
                if note_text and 'Skipped' not in note_text:
                    doctor_notes += "- " + region + ": " + note_text + "\n"

            merged_text = ocr_text
            if doctor_notes:
                merged_text += "\n\nDoctor annotations for blurry regions:\n" + doctor_notes

        # ── Step 2: LLaMA — structure the merged text ─────────────────────────
        log_info("Reanalyze Step 2: calling LLaMA for structuring...")
        findings = []
        summary = ""
        heading = record.ai_heading or ""

        doc_type = record.document_type or 'OTHER'

        if doc_type == 'LAB_REPORT' or 'Lab Report' in (record.ai_heading or ''):
            structured = await structure_lab_report_with_llama(merged_text)
            if structured:
                findings = structured.get('lab_findings', [])
                summary = structured.get('summary', '')
                if structured.get('heading'):
                    heading = structured['heading']
                if structured.get('patient_info'):
                    meta['patient_info'] = structured['patient_info']
        else:
            structured = await structure_clinical_note_with_llama(merged_text, doc_type)
            if structured:
                summary = structured.get('summary', merged_text[:2000])
                if structured.get('heading'):
                    heading = structured['heading']

        # ── Persist to DB ─────────────────────────────────────────────────────
        record.extracted_text = ocr_text
        record.report_summary = summary
        record.clinical_findings = findings if findings else []
        record.blur_doctor_inputs = payload.blurDoctorInputs
        record.ai_heading = heading
        record.needs_blur_annotation = False

        record.image_metadata = meta

        await db.commit()
        await db.refresh(record)

        # ── Update document status to COMPLETED after successful reanalysis ───
        from app.core.kafka_consumer import _update_document_status
        await _update_document_status(record.file_key, "COMPLETED")

        # ── Auto-save non-lab docs to patient notes ──────────────────────────
        if doc_type not in ('LAB_REPORT', 'IMAGING', 'XRAY', 'MRI', 'CT_SCAN', 'DICOM') and summary and record.patient_mrn:
            try:
                base_url = 'http://api-gateway:8080' if 'postgres' in settings.POSTGRES_HOST else 'http://localhost:8081'
                tag = 'CLINICAL_NOTE' if doc_type == 'CLINICAL_NOTE' else (record.file_key.split('-', 1)[-1] if '-' in record.file_key else record.file_key)
                note_payload = {"tag": tag, "content": summary}
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        base_url + "/api/clinical/patients/" + record.patient_mrn + "/notes",
                        json=note_payload
                    )
                    if resp.status_code < 300:
                        log_info("Auto-saved " + doc_type + " to patient notes for MRN " + record.patient_mrn)
                    else:
                        log_error("Auto-save note failed: " + resp.text)
            except Exception as note_err:
                log_error("Auto-save note exception: " + repr(note_err))

        return {
            "status": "SUCCESS",
            "message": "Re-analysis complete (2-step: Vision OCR + LLaMA structuring)",
            "extractedText": record.extracted_text,
            "reportSummary": record.report_summary,
            "clinicalFindings": record.clinical_findings,
            "aiHeading": record.ai_heading,
        }

    except Exception as e:
        log_error("Re-analysis failed for record " + analysis_id + ": " + str(e))
        raise HTTPException(status_code=500, detail=str(e))

