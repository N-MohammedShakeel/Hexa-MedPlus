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
    encounter_id = Column(String)
    actor_name = Column(String)
    actor_type = Column(String)
    action = Column(String)
    code_ref = Column(String, nullable=True)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
