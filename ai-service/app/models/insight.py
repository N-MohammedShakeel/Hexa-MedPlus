from sqlalchemy import Column, String, JSON, DateTime
from app.core.db import Base
from datetime import datetime, timezone
import uuid

class EncounterAiInsightEntity(Base):
    __tablename__ = 'ai_insights'
    
    encounter_id = Column(String, primary_key=True)
    ai_summary = Column(JSON, nullable=True)
    ai_diagnosis = Column(JSON, nullable=True)
    ai_codes = Column(JSON, nullable=True)
    ai_pathway = Column(JSON, nullable=True)
    hitl_status = Column(String, default="NONE")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class AiAuditEntity(Base):
    __tablename__ = 'ai_audit_log'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    encounter_id = Column(String, nullable=True)
    patient_mrn = Column(String, nullable=True, index=True)   # NEW: track which patient record was accessed
    actor_id = Column(String, nullable=True)                  # NEW: user id who performed the action
    actor_name = Column(String)
    actor_type = Column(String)                               # USER | SYSTEM | AI
    action = Column(String)                                   # e.g. PATIENT_CHART_VIEWED, NOTE_CREATED
    event_category = Column(String, nullable=True)            # NEW: PHI_ACCESS | AUTH | CLINICAL_DATA | LIFECYCLE | DATA_EXPORT | AI
    code_ref = Column(String, nullable=True)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
