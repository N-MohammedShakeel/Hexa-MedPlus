"""
Checks whether patient-identity fields (name/dob/gender) extracted from an
uploaded document actually match the patient record it's being attached to —
a safety net against wrong-patient uploads (dangerous clinically, and a
problem for insurance/billing).

Only fields the document actually yielded a value for are compared; missing
fields are never treated as mismatches. If nothing at all was extractable,
status is "insufficient_data" and no warning should be shown.
"""
import re
from datetime import date, datetime

import httpx
from rapidfuzz import fuzz

from app.core.config import settings
from app.utils.logger import log_error

NAME_MATCH_THRESHOLD = 80  # rapidfuzz token_sort_ratio, 0-100


def _clinical_service_base_url() -> str:
    return 'http://api-gateway:8080' if 'postgres' in settings.POSTGRES_HOST else 'http://localhost:8081'


def _normalize_name(name: str) -> str:
    return re.sub(r'\s+', ' ', name.strip().lower())


def _normalize_gender(gender: str) -> str:
    g = gender.strip().lower()
    if g in ('m', 'male'):
        return 'male'
    if g in ('f', 'female'):
        return 'female'
    return g


def _parse_date(value: str):
    if not value or not value.strip():
        return None
    value = value.strip()
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%d %b %Y', '%d %B %Y', '%b %d, %Y', '%B %d, %Y'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


async def _fetch_patient(mrn: str) -> dict:
    base_url = _clinical_service_base_url()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{base_url}/api/clinical/patients/mrn/{mrn}")
        resp.raise_for_status()
        return resp.json()


async def check_patient_identity(mrn: str, patient_info: dict) -> dict:
    """
    Returns {"status": "match"|"mismatch"|"insufficient_data", "mismatches": [...]}.
    Never raises — a lookup/parsing failure degrades to "insufficient_data" so it
    never blocks or mis-flags a document processing pipeline.
    """
    patient_info = patient_info or {}
    doc_name = (patient_info.get('name') or '').strip()
    doc_dob = (patient_info.get('dob') or '').strip()
    doc_gender = (patient_info.get('gender') or '').strip()

    if not doc_name and not doc_dob and not doc_gender:
        return {"status": "insufficient_data", "mismatches": []}

    try:
        patient = await _fetch_patient(mrn)
    except Exception as e:
        log_error(f"Identity check: failed to fetch patient record for MRN {mrn}: {e}")
        return {"status": "insufficient_data", "mismatches": []}

    mismatches = []

    if doc_name:
        patient_name = f"{patient.get('firstName', '')} {patient.get('lastName', '')}".strip()
        if patient_name:
            score = fuzz.token_sort_ratio(_normalize_name(doc_name), _normalize_name(patient_name))
            if score < NAME_MATCH_THRESHOLD:
                mismatches.append({
                    "field": "name",
                    "documentValue": doc_name,
                    "patientValue": patient_name,
                    "similarity": round(score, 1),
                })

    if doc_dob:
        parsed_doc_dob = _parse_date(doc_dob)
        patient_dob_raw = patient.get('dob')
        parsed_patient_dob = _parse_date(patient_dob_raw) if patient_dob_raw else None
        if parsed_doc_dob and parsed_patient_dob and parsed_doc_dob != parsed_patient_dob:
            mismatches.append({
                "field": "dob",
                "documentValue": doc_dob,
                "patientValue": patient_dob_raw,
                "similarity": 0,
            })

    if doc_gender:
        patient_gender = patient.get('gender') or ''
        if patient_gender and _normalize_gender(doc_gender) != _normalize_gender(patient_gender):
            mismatches.append({
                "field": "gender",
                "documentValue": doc_gender,
                "patientValue": patient_gender,
                "similarity": 0,
            })

    return {
        "status": "mismatch" if mismatches else "match",
        "mismatches": mismatches,
    }
