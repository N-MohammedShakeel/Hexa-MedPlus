from pydantic import BaseModel
from typing import Optional, Any

class WorkflowResultDto(BaseModel):
    success: bool
    errorMessage: Optional[str] = None
    summary: Optional[Any] = None
    diagnosis: Optional[Any] = None
    codes: Optional[Any] = None
    pathway: Optional[Any] = None
    hitlStatus: Optional[str] = None

class WorkflowRequestDto(BaseModel):
    encounterId: str
    noteContent: str
    patientContext: str

class WorkflowUpdateDto(BaseModel):
    summary: Optional[Any] = None
    diagnosis: Optional[Any] = None
    codes: Optional[Any] = None
    pathway: Optional[Any] = None
    actorName: Optional[str] = None
    actorType: Optional[str] = None
