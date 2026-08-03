from typing import TypedDict, Optional, Any

class AgentState(TypedDict):
    encounter_id: str
    note_content: str
    patient_context: str
    redacted_note: Optional[str]
    phi_mapping: Optional[dict]
    clinical_context: Optional[str]
    coding_context: Optional[str]
    summary: Optional[Any]
    diagnosis: Optional[Any]
    codes: Optional[Any]
    pathway: Optional[Any]
    hitl_status: str
    error: Optional[str]
