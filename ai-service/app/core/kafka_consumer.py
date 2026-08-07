import json
import asyncio
import uuid
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
from app.utils.identity_matcher import check_patient_identity

# File extensions treated as images for Vision AI processing
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.dcm', '.dicom'}

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

# File extensions treated as plain-text documents (no Vision AI, but need LLaMA structuring)
TEXT_EXTENSIONS = {'.txt', '.csv', '.docx', '.doc', '.xlsx', '.xls', '.rtf'}

def _is_text_document(file_key: str) -> bool:
    """Return True if the file is a text/office document (not image, not PDF)."""
    if not file_key:
        return False
    ext = '.' + file_key.rsplit('.', 1)[-1].lower() if '.' in file_key else ''
    return ext in TEXT_EXTENSIONS

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

def _build_analysis_fields(file_key: str, mrn: str, doc_type: str, analysis_result: dict, native_text: str = "", document_id: str = None, custom_doc_name: str = None) -> dict:
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
        'limitations': analysis_result.get('limitations', []),
        # Whatever identity fields Vision AI found printed on the document itself —
        # merged with LLaMA structuring's own read further down, so either pass can
        # supply the field the other missed. Used by the identity mismatch check.
        'patient_info': analysis_result.get('patient_info', {}) or {}
    }
    return {
        'file_key': file_key,
        'patient_mrn': mrn,
        'document_type': doc_type,
        'extracted_text': ocr.get('extracted_text', ''),
        'report_summary': analysis_result.get('recommendation', ''),
        'native_extracted_text': native_text,
        'ai_heading': custom_doc_name if (doc_type == 'OTHER' and custom_doc_name) else _generate_ai_heading(analysis_result, doc_type),
        'clinical_findings': findings if findings else [],
        'image_metadata': image_meta,
        'blurry_regions': ocr.get('blurry_text_regions', []),
        'blur_doctor_inputs': [],
        'needs_blur_annotation': bool(analysis_result.get('needs_blur_annotation', False) or len(ocr.get('blurry_text_regions', [])) > 0),
        'image_width': analysis_result.get('image_width'),
        'image_height': analysis_result.get('image_height'),
        'document_id': document_id,
        'model_used': analysis_result.get('_model_used', 'meta/llama-3.2-90b-vision-instruct')
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

        async with httpx.AsyncClient(timeout=300.0) as client:
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


# Minimum native (embedded, selectable) text characters on a page before we
# trust it over re-OCR'ing via Vision AI. Mirrors document-service's own
# LOW_CONFIDENCE_THRESHOLD (PdfParserService.java) so both services agree on
# what counts as "this page already has real text" vs. "this is probably a
# scanned/image-only page that still needs Vision AI."
NATIVE_TEXT_MIN_CHARS = 150

async def _process_vision_api_pdf_stream(file_key: str, file_url: str):
    """
    For PDF files: yield (page_num, total_pages, analysis_result) progressively.
    page_num=0 means initialization. Pages with sufficient native (embedded)
    text skip the expensive Vision AI OCR call entirely and use that text
    directly — most PDFs are a mix of native-text pages and scanned/image
    pages, and re-OCR'ing a page that already has selectable text wastes an
    AI call and can only make the extracted text worse.
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

            native_text = (page.get_text() or '').strip()
            if len(native_text) >= NATIVE_TEXT_MIN_CHARS:
                log_info(f"Page {page_num+1} of '{file_key}' has {len(native_text)} native text chars — skipping Vision AI OCR.")
                result = {
                    "ocr_extraction": {"extracted_text": native_text, "blurry_text_regions": []},
                    "image_metadata": {},
                    "clinical_findings": [],
                    "image_quality": {},
                    "image_width": None,
                    "image_height": None,
                    "_model_used": "native-pdf-text-extraction"
                }
                yield (page_num + 1, page_count, result)
                continue

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


async def _update_document_status(file_key: str, status: str):
    """Pushes the final (or failed) status back to document-service once AI processing settles."""
    try:
        ds_base = 'http://document-service:8082' if 'postgres' in settings.POSTGRES_HOST else 'http://localhost:8082'
        async with httpx.AsyncClient(timeout=5.0) as status_client:
            await status_client.put(
                ds_base + "/api/documents/by-file-key/" + file_key + "/status",
                params={"status": status}
            )
            log_info("Updated document status to " + status + " for " + file_key)
    except Exception as se:
        log_error("Failed to update document status: " + repr(se))


async def consume_documents():
    consumer = AIOKafkaConsumer(
        'document.parsed',
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="ai-engine-document-group",
        # Vision AI calls (NVIDIA NIM) can take 5-10 min for large images.
        # Default max_poll_interval_ms=300000 (5 min) causes the coordinator to
        # evict this consumer mid-processing and cancel the in-flight HTTP request.
        # Raise it to 20 minutes to give the Vision AI enough headroom.
        max_poll_interval_ms=1200000,
        session_timeout_ms=60000,
        heartbeat_interval_ms=20000,
    )
    await consumer.start()
    try:
        async for msg in consumer:
            file_key = None
            try:
                data = json.loads(msg.value.decode('utf-8'))
                file_key = data.get('fileKey')
                text     = data.get('extractedText', '')
                mrn      = data.get('mrn')
                doc_type = data.get('documentType', '')
                file_url = data.get('fileUrl')
                document_id = data.get('documentId')
                custom_doc_name = data.get('customDocName')

                # ── 1. RAG ingestion ──────────────────────────────────────
                # Note: patient-note creation for CLINICAL_NOTE/OTHER documents no longer
                # happens here (or anywhere else in this file) — it happens exactly once,
                # gated on the doctor's "Verify" click, in vision.py's update_vision_result.
                # That's the only reliable trigger point across image/PDF/text sources and
                # avoids the duplicate/premature notes the old scattered auto-pushes caused.
                if text and mrn:
                    await asyncio.to_thread(ingest_document, text, doc_type, mrn, file_key)

                if not mrn:
                    continue

                # ── 2. Vision AI for Image files ──────────────────────────
                if _is_image_document(file_key, doc_type):
                    try:
                        # This single consumer processes one Kafka message at a time, so
                        # a document only starts getting real AI attention once this fires —
                        # until then it's still queued behind whatever came before it.
                        await _update_document_status(file_key, "AI_PROCESSING")
                        vision_result = await _call_vision_api(file_key, file_url, doc_type)
                        if vision_result and 'api_error' not in vision_result:
                            fields = _build_analysis_fields(file_key, mrn, doc_type, vision_result, text, document_id, custom_doc_name)
                            if 'Lab Report' in fields['ai_heading'] or doc_type == 'LAB_REPORT':
                                log_info(f"Structuring Lab Report for {file_key}...")
                                structured_data = await structure_lab_report_with_llama(fields['extracted_text'])
                                if structured_data:
                                    fields['clinical_findings'] = structured_data.get('lab_findings', [])
                                    if structured_data.get('heading'):
                                        fields['ai_heading'] = structured_data.get('heading')
                                    fields['report_summary'] = structured_data.get('summary', '')
                                    if structured_data.get('patient_info'):
                                        # Merge rather than overwrite — Vision AI's own read of the
                                        # image (already in fields['image_metadata']['patient_info']
                                        # via _build_analysis_fields) may have caught a field LLaMA's
                                        # OCR-text-only pass missed, or vice versa.
                                        existing_info = dict(fields.get('image_metadata', {}).get('patient_info') or {})
                                        for k, v in structured_data['patient_info'].items():
                                            if v and not existing_info.get(k):
                                                existing_info[k] = v
                                        fields['image_metadata']['patient_info'] = existing_info

                            # needs_blur_annotation/document_id are real columns now — keep
                            # them in `fields` so they're actually persisted below.
                            needs_blur = fields.get('needs_blur_annotation', False)
                            identity_result = await check_patient_identity(mrn, fields['image_metadata'].get('patient_info', {}))
                            fields['identity_check_status'] = identity_result['status']
                            fields['identity_mismatches'] = identity_result['mismatches']
                            async with AsyncSessionLocal() as session:
                                analysis = DocumentAnalysisEntity(**fields)
                                session.add(analysis)
                                await session.commit()
                            log_info(f"Vision analysis saved for {file_key} (MRN: {mrn}) — {fields.get('ai_heading')}")

                            # Update document status based on blur detection result
                            new_doc_status = 'BLUR_DETECTED' if needs_blur else 'COMPLETED'
                            await _update_document_status(file_key, new_doc_status)
                        else:
                            log_error(f"Vision AI returned no usable result for {file_key}: {vision_result}")
                            await _update_document_status(file_key, "FAILED")
                    except Exception as img_err:
                        log_error(f"Image document processing failed for {file_key}: {img_err}")
                        await _update_document_status(file_key, "FAILED")

                # ── 3. Vision AI for PDF files ────────────────────────────
                elif _is_pdf_document(file_key):
                    analysis_id = None
                    any_blur = False
                    pdf_failed = False
                    try:
                        await _update_document_status(file_key, "AI_PROCESSING")
                        async for page_num, total_pages, result in _process_vision_api_pdf_stream(file_key, file_url):
                            async with AsyncSessionLocal() as session:
                                if page_num == 0:
                                    # Create initial DB record. The id is generated here in
                                    # Python (not left to the ORM's client-side default) because
                                    # reading analysis.id right after session.add() — before a
                                    # flush/commit actually runs the default — returns None. That
                                    # used to make every later session.get(..., None) look-up fail
                                    # silently (a SAWarning, and `existing` always None), so no PDF
                                    # ever got its later pages merged in.
                                    fields = _build_analysis_fields(file_key, mrn, doc_type, {}, text, document_id, custom_doc_name)
                                    fields['id'] = str(uuid.uuid4())
                                    fields['image_metadata']['total_pages'] = total_pages
                                    fields['image_metadata']['processed_pages'] = 0
                                    fields['needs_blur_annotation'] = False
                                    analysis = DocumentAnalysisEntity(**fields)
                                    session.add(analysis)
                                    await session.commit()
                                    analysis_id = fields['id']
                                    log_info(f"Created new PDF page analysis record: {analysis_id}")
                                elif result and 'api_error' not in result:
                                    # Update existing DB record
                                    existing = await session.get(DocumentAnalysisEntity, analysis_id)
                                    page_regions = result.get('ocr_extraction', {}).get('blurry_text_regions', [])
                                    page_needs_blur = bool(result.get('needs_blur_annotation', False) or page_regions)
                                    if page_needs_blur:
                                        any_blur = True
                                    if existing:
                                        ocr_text = result.get('ocr_extraction', {}).get('extracted_text', '')
                                        if ocr_text:
                                            existing.extracted_text = (existing.extracted_text or '') + '\n\n' + ocr_text

                                        if page_regions:
                                            tagged = [
                                                {**r, 'page': page_num,
                                                 'imgWidth': result.get('image_width'), 'imgHeight': result.get('image_height')}
                                                for r in page_regions
                                            ]
                                            existing.blurry_regions = (existing.blurry_regions or []) + tagged

                                        if ocr_text and doc_type == 'LAB_REPORT':
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
                                        if page_num == 1 and result.get('_model_used'):
                                            existing.model_used = result.get('_model_used')

                                        # Merge this page's identity fields in — only filling whatever
                                        # earlier pages didn't already find, since a multi-page PDF's
                                        # patient header may only appear on page 1.
                                        page_patient_info = result.get('patient_info') or {}
                                        if page_patient_info:
                                            existing_info = dict(meta.get('patient_info') or {})
                                            for k, v in page_patient_info.items():
                                                if v and not existing_info.get(k):
                                                    existing_info[k] = v
                                            meta['patient_info'] = existing_info

                                        existing.image_metadata = meta
                                        existing.needs_blur_annotation = any_blur
                                        await session.commit()
                                        log_info(f"PDF Vision analysis updated for {file_key} Page {page_num}/{total_pages}")
                    except Exception as pdf_err:
                        log_error(f"PDF document processing failed for {file_key}: {pdf_err}")
                        pdf_failed = True

                    if analysis_id is None:
                        # Nothing was ever persisted (e.g. PDF failed to download/open) — surface as FAILED.
                        await _update_document_status(file_key, "FAILED")
                    elif pdf_failed:
                        await _update_document_status(file_key, "FAILED")
                    else:
                        # Run the identity check once, after all pages' patient_info has merged in.
                        async with AsyncSessionLocal() as session:
                            existing = await session.get(DocumentAnalysisEntity, analysis_id)
                            if existing:
                                identity_result = await check_patient_identity(mrn, (existing.image_metadata or {}).get('patient_info', {}))
                                existing.identity_check_status = identity_result['status']
                                existing.identity_mismatches = identity_result['mismatches']
                                await session.commit()
                        await _update_document_status(file_key, "BLUR_DETECTED" if any_blur else "COMPLETED")

                # ── 4. Text/Office documents (TXT, DOCX, CSV, etc.) ──────────
                elif _is_text_document(file_key) and text and mrn:
                    log_info(f"Text document detected: {file_key} (type={doc_type}). Running LLaMA structuring...")
                    try:
                        await _update_document_status(file_key, "AI_PROCESSING")
                        if doc_type == 'LAB_REPORT':
                            structured = await structure_lab_report_with_llama(text)
                        else:
                            structured = await structure_clinical_note_with_llama(text)

                        ai_heading = (structured.get('heading') if structured else None) or custom_doc_name or f"{doc_type.replace('_', ' ').title()} — {file_key.rsplit('-', 1)[-1] if '-' in file_key else file_key}"
                        findings = structured.get('lab_findings', []) if doc_type == 'LAB_REPORT' else []
                        summary = structured.get('summary', '') if structured else ''
                        patient_info = (structured.get('patient_info') or {}) if structured else {}

                        identity_result = await check_patient_identity(mrn, patient_info)

                        fields = {
                            'file_key': file_key,
                            'patient_mrn': mrn,
                            'document_type': doc_type,
                            'extracted_text': text,
                            'native_extracted_text': text,
                            'report_summary': summary,
                            'ai_heading': ai_heading,
                            'clinical_findings': findings,
                            'image_metadata': {'patient_info': patient_info},
                            'blurry_regions': [],
                            'blur_doctor_inputs': [],
                            'image_width': None,
                            'image_height': None,
                            'model_used': (structured or {}).get('_model_used', 'text-structuring-llama'),
                            'identity_check_status': identity_result['status'],
                            'identity_mismatches': identity_result['mismatches'],
                        }
                        async with AsyncSessionLocal() as session:
                            analysis = DocumentAnalysisEntity(**fields)
                            session.add(analysis)
                            await session.commit()
                        log_info(f"Text document analysis saved for {file_key} (MRN: {mrn})")
                        await _update_document_status(file_key, "COMPLETED")
                    except Exception as te:
                        log_error(f"Text document structuring failed for {file_key}: {te}")
                        await _update_document_status(file_key, "FAILED")

                elif _is_text_document(file_key) and (not text) and mrn:
                    # No extractable text (e.g. an empty file) — nothing left for the AI
                    # pipeline to do, so don't leave the document stuck in PROCESSING forever.
                    log_info(f"Text document {file_key} had no extractable text; marking COMPLETED.")
                    await _update_document_status(file_key, "COMPLETED")

                else:
                    # File extension matched none of image/PDF/text — nothing above ever
                    # ran, so without this the document would sit in PROCESSING forever
                    # with no status update at all.
                    log_error(f"Document {file_key} (type={doc_type}) matched no known processing branch; marking FAILED.")
                    await _update_document_status(file_key, "FAILED")

            except Exception as e:
                log_error(f"Error processing document.parsed event: {e}")
                # Whatever stage failed (JSON decode, field extraction, RAG ingestion —
                # the branches below this each already handle their own failures), the
                # document must still get a terminal status instead of being left stuck
                # in PROCESSING/AI_PROCESSING forever with no recovery path.
                if file_key:
                    await _update_document_status(file_key, "FAILED")
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
