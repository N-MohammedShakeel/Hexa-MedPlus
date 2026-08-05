import json
import asyncio
import httpx
import fitz
from aiokafka import AIOKafkaConsumer
from app.core.config import settings
from app.graph.orchestrator import clinical_workflow
from app.core.db import AsyncSessionLocal
from app.models.insight import EncounterAiInsightEntity
from app.models.document_analysis import DocumentAnalysisEntity
from app.core.rag import ingest_document, delete_document_embeddings
from app.utils.logger import log_info, log_error

from app.api.vision import analyze_image_with_vision_ai, structure_lab_report_with_llama, structure_clinical_note_with_llama
from app.utils.blur_detector import check_image_blur

# File extensions treated as images for Vision AI processing
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.dcm'}

def _is_image_document(file_key: str, doc_type: str) -> bool:
    """Return True if this document should be sent to Vision AI (images only)."""
    if not file_key:
        return False
    ext = '.' + file_key.rsplit('.', 1)[-1].lower() if '.' in file_key else ''
    return ext in IMAGE_EXTENSIONS

def _is_pdf_document(file_key: str) -> bool:
    """Return True if the file is a PDF."""
    if not file_key:
        return False
    ext = '.' + file_key.rsplit('.', 1)[-1].lower() if '.' in file_key else ''
    return ext == '.pdf'

def _generate_ai_heading(analysis_result: dict, doc_type: str) -> str:
    """Auto-generate a clean human-readable heading from Vision AI result."""
    meta = analysis_result.get('image_metadata', {})
    modality = meta.get('modality', '')
    body_part = meta.get('body_part_or_document_type', '')
    findings = analysis_result.get('clinical_findings', [])

    if modality and body_part and body_part.lower() not in ('document', 'lab report', 'qr code', ''):
        if findings:
            top = findings[0]
            finding_name = top.get('finding', '')
            location = top.get('location', '')
            confidence = int((top.get('confidence') or 0) * 100)
            parts = [f"{modality} \u2014 {body_part}"]
            if finding_name:
                parts.append(finding_name)
            if location:
                parts.append(f"at {location}")
            if confidence:
                parts.append(f"({confidence}% confidence)")
            return ' '.join(parts)
        return f"{modality} \u2014 {body_part}"
    elif body_part.lower() in ('lab report', 'document'):
        ocr = analysis_result.get('ocr_extraction', {}).get('extracted_text', '')
        if 'haematology' in ocr.lower() or 'cbc' in ocr.lower():
            return 'CBC / Haematology Lab Report'
        if 'blood group' in ocr.lower():
            return 'Blood Group & Lab Panel Report'
        if 'chemistry' in ocr.lower():
            return 'Biochemistry Lab Report'
        return 'Clinical Lab Report'
    elif doc_type == 'LAB_REPORT':
        return 'Lab Report'
    elif doc_type == 'IMAGING':
        return 'Imaging Study'
    return 'Clinical Document'

def _build_analysis_fields(file_key: str, mrn: str, doc_type: str, analysis_result: dict, native_text: str = "", document_id: str = None) -> dict:
    if 'raw_text' in analysis_result:
        ocr = {'extracted_text': analysis_result['raw_text']}
        analysis_result['recommendation'] = "SYSTEM WARNING: The AI model failed to output structured JSON. The raw markdown output is provided below for review."
    else:
        ocr = analysis_result.get('ocr_extraction', {})
        
    findings = analysis_result.get('clinical_findings', [])
    meta = analysis_result.get('image_metadata', {})
    quality = analysis_result.get('image_quality', {})

    image_meta = {
        'modality': meta.get('modality', ''),
        'body_part_or_document_type': meta.get('body_part_or_document_type', ''),
        'is_clinical_data': meta.get('is_clinical_data', False),
        'overall_quality': quality.get('overall_quality', ''),
        'readability_confidence': quality.get('readability_confidence'),
        'artifacts': quality.get('artifacts', []),
        'limitations': analysis_result.get('limitations', [])
    }
    return {
        'file_key': file_key,
        'patient_mrn': mrn,
        'document_type': doc_type,
        'extracted_text': ocr.get('extracted_text', ''),
        'report_summary': analysis_result.get('recommendation', ''),
        'native_extracted_text': native_text,
        'ai_heading': _generate_ai_heading(analysis_result, doc_type),
        'clinical_findings': findings if findings else [],
        'image_metadata': image_meta,
        'blurry_regions': ocr.get('blurry_text_regions', []),
        'blur_doctor_inputs': [],
        'needs_blur_annotation': bool(analysis_result.get('needs_blur_annotation', False) or len(ocr.get('blurry_text_regions', [])) > 0),
        'image_width': analysis_result.get('image_width'),
        'image_height': analysis_result.get('image_height'),
        'document_id': document_id,
        'model_used': 'meta/llama-3.2-90b-vision-instruct'
    }

async def _call_vision_api(file_key: str, file_url: str = None, doc_type: str = '') -> dict:
    """
    Call NVIDIA NIM Vision AI API for image files.
    For text-based document types (LAB_REPORT, CLINICAL_NOTE, DISCHARGE, OTHER):
      - Always run Vision AI regardless of blur percentage
      - Blur boxes are preserved as UI annotation overlay only
    For imaging types (IMAGING, XRAY, MRI, CT_SCAN, DICOM):
      - Skip if image is too blurry (>25%)
    """
    if not file_url:
        log_info("No file_url provided for '" + file_key + "' - Vision AI skipped.")
        return None

    TEXT_DOC_TYPES = {'LAB_REPORT', 'CLINICAL_NOTE', 'DISCHARGE', 'OTHER'}
    is_text_doc = doc_type in TEXT_DOC_TYPES

    log_info("Sending '" + file_key + "' (type=" + doc_type + ") to NVIDIA NIM Vision AI...")
    try:
        if 'postgres' not in settings.POSTGRES_HOST and 'minio' in file_url:
            file_url = file_url.replace('http://minio:', 'http://localhost:')

        async with httpx.AsyncClient(timeout=120.0) as client:
            img_resp = await client.get(file_url)
            img_resp.raise_for_status()
            image_bytes = img_resp.content

        ext = file_key.rsplit('.', 1)[-1].lower() if '.' in file_key else 'jpeg'

        blur_pct, blur_boxes, img_width, img_height = check_image_blur(image_bytes)
        log_info("check_image_blur: " + file_key + " is " + str(round(blur_pct, 2)) + "% blurry (" + str(len(blur_boxes)) + " regions).")

        if not is_text_doc:
            # Bypass blur logic for MRIs, X-Rays, and general imaging which shouldn't be penalized for soft edges
            log_info(f"Ignoring blur detection results for imaging document type: {doc_type}")
            blur_pct = 0.0
            blur_boxes = []

        if blur_boxes:
            # Blurry regions found in a text document: skip the expensive Vision AI call and return
            # immediately so the doctor can annotate first (mirrors the PDF pipeline).
            # The full OCR/structuring pass runs later via /reanalyze, merged with
            # the doctor's annotations.
            log_info(file_key + " has " + str(len(blur_boxes)) + " blurry boxes. Skipping Vision AI call to await doctor input.")
            return {
                "needs_blur_annotation": True,
                "ocr_extraction": {"extracted_text": "", "blurry_text_regions": blur_boxes},
                "image_metadata": {},
                "clinical_findings": [],
                "image_quality": {},
                "image_width": img_width,
                "image_height": img_height
            }

        # No blur detected: run Vision AI normally
        result = await analyze_image_with_vision_ai(image_bytes, ext, max_tokens=4096)
        if result:
            result['image_width'] = img_width
            result['image_height'] = img_height
        return result

    except Exception as e:
        log_error("NVIDIA NIM Vision AI call failed for '" + file_key + "': " + str(e))
        return None


async def _process_vision_api_pdf_stream(file_key: str, file_url: str):
    """
    For PDF files: yield (page_num, total_pages, analysis_result) progressively.
    page_num=0 means initialization.
    """
    if not file_url:
        return
    MAX_PAGES = 5
    try:
        # If running locally, minio in the URL needs to be mapped to localhost
        if 'postgres' not in settings.POSTGRES_HOST and 'minio' in file_url:
            file_url = file_url.replace('http://minio:', 'http://localhost:')
            
        async with httpx.AsyncClient(timeout=120.0) as client:
            pdf_resp = await client.get(file_url)
            pdf_resp.raise_for_status()
            pdf_bytes = pdf_resp.content

        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        page_count = min(len(doc), MAX_PAGES)
        log_info(f"PDF Vision AI: Rendering {page_count} page(s) of '{file_key}'...")

        # Yield initial state so DB can be created before page 1 starts!
        yield (0, page_count, None)

        for page_num in range(page_count):
            page = doc[page_num]
            mat = fitz.Matrix(1.5, 1.5)  # 150 DPI
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes('png')

            blur_pct, blur_boxes, img_width, img_height = check_image_blur(img_bytes)
            log_info(f"Page {page_num+1} blur: {blur_pct:.2f}%")

            if len(blur_boxes) > 0:
                log_info(f"Page {page_num+1} has {len(blur_boxes)} blurry boxes. Skipping Vision AI call to await doctor input.")
                result = {
                    "needs_blur_annotation": True,
                    "ocr_extraction": {"extracted_text": "", "blurry_text_regions": blur_boxes},
                    "image_metadata": {},
                    "clinical_findings": [],
                    "image_quality": {},
                    "image_width": img_width,
                    "image_height": img_height
                }
            else:
                result = await analyze_image_with_vision_ai(img_bytes, 'png', max_tokens=4096)
                if result:
                    result['image_width'] = img_width
                    result['image_height'] = img_height
                
            yield (page_num + 1, page_count, result)

        doc.close()
    except Exception as e:
        log_error(f"PDF Vision AI stream failed for '{file_key}': {str(e)}")


async def consume_notes():
    consumer = AIOKafkaConsumer(
        'clinical-notes',
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="ai-engine-python-group"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            try:
                data = json.loads(msg.value.decode('utf-8'))
                encounter_id = data.get("encounterId")
                note_content = data.get("noteContent")
                patient_context = data.get("patientContext", "")

                if not encounter_id or not note_content:
                    continue

                initial_state = {
                    "encounter_id": encounter_id,
                    "note_content": note_content,
                    "patient_context": patient_context
                }
                result_state = clinical_workflow.invoke(initial_state)

                async with AsyncSessionLocal() as session:
                    insight = EncounterAiInsightEntity(
                        encounter_id=result_state["encounter_id"],
                        ai_summary=result_state.get("summary"),
                        ai_diagnosis=result_state.get("diagnosis"),
                        ai_codes=result_state.get("codes"),
                        ai_pathway=result_state.get("pathway"),
                        hitl_status=result_state.get("hitl_status", "NONE")
                    )
                    session.add(insight)
                    await session.commit()
            except Exception as e:
                log_error(f"Error processing clinical-notes message: {e}")
    finally:
        await consumer.stop()


async def consume_documents():
    consumer = AIOKafkaConsumer(
        'document.parsed',
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="ai-engine-document-group"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            try:
                data = json.loads(msg.value.decode('utf-8'))
                file_key = data.get('fileKey')
                text     = data.get('extractedText', '')
                mrn      = data.get('mrn')
                doc_type = data.get('documentType', '')
                file_url = data.get('fileUrl')
                document_id = data.get('documentId')

                # ── 1. RAG ingestion ──────────────────────────────────────
                if text and mrn:
                    await asyncio.to_thread(ingest_document, text, doc_type, mrn, file_key)
                    
                    if doc_type == 'CLINICAL_NOTE':
                        try:
                            # Use api-gateway or direct internal docker URL if available, fallback to localhost
                            base_url = 'http://api-gateway:8080' if 'postgres' in settings.POSTGRES_HOST else 'http://localhost:8081'
                            async with httpx.AsyncClient(timeout=10.0) as client:
                                payload = {
                                    "tag": "CLINICAL_NOTE",
                                    "content": text
                                }
                                resp = await client.post(f"{base_url}/api/clinical/patients/{mrn}/notes", json=payload)
                                resp.raise_for_status()
                                log_info(f"Successfully auto-saved CLINICAL_NOTE for MRN {mrn}")
                        except Exception as e:
                            log_error(f"Failed to auto-save CLINICAL_NOTE to patient notes: {e}")

                if not mrn:
                    continue

                # ── 2. Vision AI for Image files ──────────────────────────
                if _is_image_document(file_key, doc_type):
                    vision_result = await _call_vision_api(file_key, file_url, doc_type)
                    if vision_result and 'api_error' not in vision_result:
                        fields = _build_analysis_fields(file_key, mrn, doc_type, vision_result, text, document_id)
                        if 'Lab Report' in fields['ai_heading'] or doc_type == 'LAB_REPORT':
                            log_info(f"Structuring Lab Report for {file_key}...")
                            structured_data = await structure_lab_report_with_llama(fields['extracted_text'])
                            if structured_data:
                                fields['clinical_findings'] = structured_data.get('lab_findings', [])
                                if structured_data.get('heading'):
                                    fields['ai_heading'] = structured_data.get('heading')
                                fields['report_summary'] = structured_data.get('summary', '')
                                if structured_data.get('patient_info'):
                                    fields['image_metadata'] = fields.get('image_metadata', {})
                                    fields['image_metadata']['patient_info'] = structured_data.get('patient_info')
                        
                        async with AsyncSessionLocal() as session:
                            needs_blur = fields.pop('needs_blur_annotation', False)
                            analysis = DocumentAnalysisEntity(**fields)
                            session.add(analysis)
                            await session.commit()
                        log_info(f"Vision analysis saved for {file_key} (MRN: {mrn}) — {fields.get('ai_heading')}")

                        # Update document status based on blur detection result
                        new_doc_status = 'BLUR_DETECTED' if needs_blur else 'COMPLETED'
                        try:
                            ds_base = 'http://document-service:8082' if 'postgres' in settings.POSTGRES_HOST else 'http://localhost:8082'
                            async with httpx.AsyncClient(timeout=5.0) as status_client:
                                await status_client.put(
                                    ds_base + "/api/documents/by-file-key/" + file_key + "/status",
                                    params={"status": new_doc_status}
                                )
                                log_info("Updated document status to " + new_doc_status + " for " + file_key)
                        except Exception as se:
                            log_error("Failed to update document status: " + repr(se))

                        # Auto-save non-imaging docs to patient notes after Vision AI processing
                        if doc_type not in ('LAB_REPORT', 'IMAGING', 'XRAY', 'MRI', 'CT_SCAN', 'DICOM') and fields.get('report_summary') and mrn:
                            try:
                                base_url = 'http://api-gateway:8080' if 'postgres' in settings.POSTGRES_HOST else 'http://localhost:8081'
                                tag = 'CLINICAL_NOTE' if doc_type == 'CLINICAL_NOTE' else (file_key.split('-', 1)[-1] if '-' in file_key else file_key)
                                note_payload = {"tag": tag, "content": fields['report_summary']}
                                async with httpx.AsyncClient(timeout=10.0) as client:
                                    resp = await client.post(base_url + "/api/clinical/patients/" + mrn + "/notes", json=note_payload)
                                    if resp.status_code < 300:
                                        log_info("Auto-saved " + doc_type + " to patient notes for MRN " + mrn)
                                    else:
                                        log_error("Auto-save note failed: " + resp.text)
                            except Exception as note_err:
                                log_error("Auto-save note exception: " + repr(note_err))

                # ── 3. Vision AI for PDF files ────────────────────────────
                elif _is_pdf_document(file_key):
                    analysis_id = None
                    async for page_num, total_pages, result in _process_vision_api_pdf_stream(file_key, file_url):
                        async with AsyncSessionLocal() as session:
                            if page_num == 0:
                                # Create initial DB record
                                fields = _build_analysis_fields(file_key, mrn, doc_type, {}, text)
                                fields['image_metadata'] = fields.get('image_metadata', {})
                                fields['image_metadata']['total_pages'] = total_pages
                                fields['image_metadata']['processed_pages'] = 0
                                needs_blur = fields.pop('needs_blur_annotation', False)
                                analysis = DocumentAnalysisEntity(**fields)
                                session.add(analysis)
                                analysis_id = analysis.id
                                await session.commit()
                                log_info(f"Created new PDF page analysis record: {analysis_id}")
                            elif result and 'api_error' not in result:
                                # Update existing DB record
                                existing = await session.get(DocumentAnalysisEntity, analysis_id)
                                needs_blur = fields.pop('needs_blur_annotation', False)
                                if existing:
                                    ocr_text = result.get('ocr_extraction', {}).get('extracted_text', '')
                                    if ocr_text:
                                        existing.extracted_text = (existing.extracted_text or '') + '\n\n' + ocr_text

                                    if doc_type == 'LAB_REPORT':
                                        log_info(f"Structuring Lab Report for {file_key} Page {page_num}...")
                                        structured = await structure_lab_report_with_llama(ocr_text)
                                        if structured:
                                            new_findings = structured.get('lab_findings', [])
                                            existing.clinical_findings = (existing.clinical_findings or []) + new_findings
                                            if structured.get('heading'):
                                                existing.ai_heading = structured.get('heading')

                                    meta = dict(existing.image_metadata or {})
                                    meta['processed_pages'] = page_num
                                    
                                    # Overwrite image metadata with actual model results if it's the first real page
                                    if page_num == 1 and result.get('image_metadata'):
                                        model_meta = result.get('image_metadata')
                                        meta['modality'] = model_meta.get('modality', '')
                                        meta['body_part_or_document_type'] = model_meta.get('body_part_or_document_type', '')
                                        
                                    existing.image_metadata = meta
                                    await session.commit()
                                    log_info(f"PDF Vision analysis updated for {file_key} Page {page_num}/{total_pages}")

            except Exception as e:
                log_error(f"Error processing document.parsed event: {e}")
    finally:
        await consumer.stop()


async def consume_guideline_retirements():
    consumer = AIOKafkaConsumer(
        'guideline.retired',
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="ai-engine-guideline-lifecycle-group"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            try:
                data = json.loads(msg.value.decode('utf-8'))
                file_key = data.get('fileKey')
                if file_key:
                    await asyncio.to_thread(delete_document_embeddings, file_key)
            except Exception as e:
                log_error(f"Error processing guideline.retired message: {e}")
    finally:
        await consumer.stop()


async def start_kafka_consumers():
    asyncio.create_task(consume_notes())
    asyncio.create_task(consume_documents())
    asyncio.create_task(consume_guideline_retirements())
