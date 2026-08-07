from sqlalchemy import Column, Integer, String
from app.core.db import Base

class AiPreferenceEntity(Base):
    """
    Single-row table persisting the global LLM/Vision provider preference so it
    survives an ai-service restart instead of resetting to the module-level
    default every time (the in-memory-only global was the bug). id is always 1 —
    preferences.py upserts this one row rather than tracking history.
    """
    __tablename__ = 'ai_preferences'

    id = Column(Integer, primary_key=True, default=1)
    llm_model = Column(String, nullable=False, default="aws_nova_pro")
    vision_model = Column(String, nullable=False, default="aws_nova_pro")
