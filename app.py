import fitz
import requests
import base64
import json
import os
import re
from pathlib import Path

FILE_PATH = r"C:\Hexa-MedPlus\z-asset\lab-report.pdf"
API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
API_KEY = os.environ.get("NVIDIA_API_KEY")
if not API_KEY:
    raise RuntimeError("NVIDIA_API_KEY environment variable is not set.")

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
- For scanned clinical documents or lab reports, focus on extracting text (OCR). You MUST extract ALL visible text. Do not stop extracting text early just because a portion of the document is blurry.
- You MUST leave the `clinical_findings` array completely empty `[]` for documents. Do NOT hallucinate anatomical sizes or locations from document text.
- If the image is a logo, QR code, signature, or any other graphic that does not contain medical/clinical information, you MUST set `"is_clinical_data": false`. Otherwise, set it to `true`.
- If ANY part of the text is obscured, smudged, or blurred, you MUST describe exactly what is unreadable in the `blurry_text_regions` array (e.g. `["Center table values blurred", "Patient name illegible"]`). Do not guess or hallucinate text that you cannot read clearly.

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

def analyze_image_with_vision_ai(image_bytes, image_type="jpeg"):
    base64_img = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:image/{image_type};base64,{base64_img}"
    
    payload = {
        "model": "meta/llama-3.2-90b-vision-instruct",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_uri}}
                ]
            }
        ],
        "temperature": 0.1,
        "top_p": 0.9,
        "max_tokens": 4096,
        "stream": False
    }
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=120)
        if response.ok:
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
            except json.JSONDecodeError as err:
                print(f"[!] Primary JSON decode failed ({err}), attempting fallback sanitization...")
                try:
                    sanitized = content_str.replace('\r\n', '\\n').replace('\n', '\\n').replace('\t', '\\t')
                    parsed = json.loads(sanitized, strict=False)
                    if isinstance(parsed, str):
                        parsed = json.loads(parsed, strict=False)
                    return parsed
                except json.JSONDecodeError as err2:
                    print(f"[!] Vision AI JSON parsing fallback error 1: {err}, 2: {err2}")
                    return {"raw_text": content_str}
        else:
            print("[!] API Error:", response.text)
            return {"api_error": response.text, "status_code": response.status_code}
    except Exception as e:
        print("[!] Request failed:", str(e))
        return {"api_error": str(e)}

def process_file(file_path_str):
    file_path = Path(file_path_str)
    if not file_path.exists():
        raise FileNotFoundError(f"{file_path_str} not found.")

    ext = file_path.suffix.lower()
    
    response_data = {
        "source_file": str(file_path),
        "native_extracted_text": "",
        "vision_analysis": []
    }

    if ext == '.pdf':
        print(f"[*] Processing PDF: {file_path}")
        doc = fitz.open(file_path)
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            response_data["native_extracted_text"] += text
            
            images = page.get_images(full=True)
            for img_index, img in enumerate(images, start=1):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                # Check dimensions
                pix = fitz.Pixmap(doc, xref)
                w, h = pix.width, pix.height
                if w < 300 or h < 300:
                    print(f"[*] Skipping tiny embedded image (size: {w}x{h})")
                    continue
                    
                print(f"[*] Found valid embedded image {img_index} on page {page_num + 1} ({w}x{h})")
                print("[*] Sending image to NVIDIA NIM API (meta/llama-3.2-90b-vision-instruct)...")
                
                analysis_result = analyze_image_with_vision_ai(image_bytes, base_image["ext"])
                response_data["vision_analysis"].append({
                    "page": page_num + 1,
                    "image_index": img_index,
                    "analysis": analysis_result
                })
        print(f"[*] PDF Parsing Complete. Extracted {len(response_data['native_extracted_text'])} chars of text and analyzed {len(response_data['vision_analysis'])} images.")
    else:
        print(f"[*] Processing Image: {file_path}")
        with open(file_path, "rb") as f:
            image_bytes = f.read()
        print("[*] Sending image to NVIDIA NIM API (meta/llama-3.2-90b-vision-instruct)...")
        analysis_result = analyze_image_with_vision_ai(image_bytes, ext.strip('.'))
        response_data["vision_analysis"].append({
            "page": 1,
            "image_index": 1,
            "analysis": analysis_result
        })

    with open("response.json", "w", encoding="utf-8") as f:
        json.dump(response_data, f, indent=4)
    print("\n=== FINAL HYBRID RESPONSE SAVED TO response.json ===")

if __name__ == "__main__":
    process_file(FILE_PATH)
