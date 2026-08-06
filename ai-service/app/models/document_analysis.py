from sqlalchemy import Column, String, Text, JSON, DateTime, Float, Boolean
from app.core.db import Base
from datetime import datetime, timezone
import uuid

class DocumentAnalysisEntity(Base):
    """Stores Vision AI analysis results per uploaded document."""
    __tablename__ = 'document_analysis'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_key = Column(String, nullable=False, index=True)
    patient_mrn = Column(String, nullable=False, index=True)
    document_type = Column(String, nullable=True)   # LAB_REPORT, IMAGING, etc.
    extracted_text = Column(Text, nullable=True)
    report_summary = Column(Text, nullable=True)
    native_extracted_text = Column(Text, nullable=True)   # Raw PDF text from PyMuPDF
    ai_heading = Column(String, nullable=True)             # Auto-generated or user-edited title
    clinical_findings = Column(JSON, nullable=True)        # [{finding, appearance, signal, location, size_estimate, severity, confidence}]
    image_metadata = Column(JSON, nullable=True)           # {modality, body_part_or_document_type, is_clinical_data, overall_quality, readability_confidence}
    blurry_regions = Column(JSON, nullable=True)           # [{x,y,w,h}]
    blur_doctor_inputs = Column(JSON, nullable=True)       # [{region_index, doctor_text, skipped}]
    image_width = Column(Float, nullable=True)
    image_height = Column(Float, nullable=True)
    model_used = Column(String, nullable=True)
    verified = Column(Boolean, default=False)
    needs_blur_annotation = Column(Boolean, default=False)
    document_id = Column(String, nullable=True, index=True)
    analyzed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
