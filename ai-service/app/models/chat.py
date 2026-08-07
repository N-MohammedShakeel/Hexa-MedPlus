from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.core.db import Base
from datetime import datetime, timezone
import uuid

class ChatSessionEntity(Base):
    __tablename__ = 'chat_sessions'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False, default="New Conversation")
    mode = Column(String, nullable=False, default="general")  # 'general' | 'patient' | 'protocol'
    context_id = Column(String, nullable=True)  # patient MRN (mode=patient) or document file_key (mode=protocol)
    context_label = Column(String, nullable=True)  # human-readable label for the picked context, e.g. patient name
    created_by = Column(String, nullable=True)  # X-User-Name of the user who started this chat — scopes visibility
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class ChatMessageEntity(Base):
    __tablename__ = 'chat_messages'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey('chat_sessions.id', ondelete='CASCADE'), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
