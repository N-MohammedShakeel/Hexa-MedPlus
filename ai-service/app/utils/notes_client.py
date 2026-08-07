"""
Single shared path for pushing AI-processed document content into a patient's
Notes tab (clinical-service's PatientTagNote). Replaces four previously
scattered, uncoordinated auto-push call sites (Kafka RAG-ingestion, the image
branch, the text/office branch, and /reanalyze) with one trigger point, called
from vision.py's update_vision_result exactly when a doctor verifies a
document — so notes reflect real, doctor-reviewed content instead of
whatever the AI produced first, and re-verifying an edited document updates
the existing note instead of duplicating it (via documentFileKey upsert on
the clinical-service side).
"""
import httpx

from app.core.config import settings
from app.utils.logger import log_info, log_error


def _clinical_service_base_url() -> str:
    return 'http://api-gateway:8080' if 'postgres' in settings.POSTGRES_HOST else 'http://localhost:8081'


async def push_document_note(mrn: str, tag: str, custom_tag: str, content: str, file_key: str) -> None:
    if not mrn or not content:
        return
    try:
        base_url = _clinical_service_base_url()
        payload = {
            "tag": tag,
            "customTag": custom_tag,
            "content": content,
            "documentFileKey": file_key,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{base_url}/api/clinical/patients/{mrn}/notes", json=payload)
            if resp.status_code < 300:
                log_info(f"Pushed verified document note for MRN {mrn} (tag={tag}, fileKey={file_key})")
            else:
                log_error(f"Push document note failed ({resp.status_code}): {resp.text}")
    except Exception as e:
        log_error(f"Push document note exception: {repr(e)}")
