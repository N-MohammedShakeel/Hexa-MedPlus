from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.db import get_db
from app.models.insight import AiAuditEntity
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import csv
import io

router = APIRouter()


class AuditCreateRequest(BaseModel):
    action: str
    event_category: Optional[str] = "AI"
    actor_name: Optional[str] = "System"
    actor_type: Optional[str] = "USER"
    actor_id: Optional[str] = None
    encounter_id: Optional[str] = None
    patient_mrn: Optional[str] = None
    details: Optional[str] = None


@router.get("")
@router.get("/")
async def get_audits(
    category: Optional[str] = Query(None, description="Filter by event_category"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AiAuditEntity).order_by(AiAuditEntity.timestamp.desc())
    result = await db.execute(stmt)
    audits = result.scalars().all()

    response = []
    for audit in audits:
        if category and audit.event_category != category:
            continue
        response.append({
            "id": audit.id,
            "createdAt": audit.timestamp.isoformat() if audit.timestamp else None,
            "taskType": audit.action,
            "action": audit.action,
            "eventCategory": audit.event_category or "AI",
            "encounterId": audit.encounter_id,
            "patientMrn": audit.patient_mrn,
            "actorId": audit.actor_id,
            "actorName": audit.actor_name,
            "actorType": audit.actor_type,
            "modelUsed": audit.actor_name,
            "prompt": audit.code_ref,
            "response": audit.details,
            "details": audit.details or "",
            "latencyMs": 0
        })
    return response


@router.post("")
@router.post("/")
async def create_audit(payload: AuditCreateRequest, db: AsyncSession = Depends(get_db)):
    """Create a new audit log entry from any frontend or service."""
    entry = AiAuditEntity(
        id=str(uuid.uuid4()),
        action=payload.action,
        event_category=payload.event_category,
        actor_name=payload.actor_name or "Unknown",
        actor_type=payload.actor_type or "USER",
        actor_id=payload.actor_id,
        encounter_id=payload.encounter_id,
        patient_mrn=payload.patient_mrn,
        details=payload.details,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(entry)
    await db.commit()
    return {"id": entry.id, "status": "logged"}


@router.get("/export")
async def export_audits_csv(db: AsyncSession = Depends(get_db)):
    """Export all audit logs as a downloadable CSV file."""
    result = await db.execute(select(AiAuditEntity).order_by(AiAuditEntity.timestamp.desc()))
    audits = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp", "Event Category", "Action", "Actor Name", "Actor Type",
        "Patient MRN", "Encounter ID", "Details"
    ])
    for audit in audits:
        writer.writerow([
            audit.timestamp.isoformat() if audit.timestamp else "",
            audit.event_category or "AI",
            audit.action or "",
            audit.actor_name or "",
            audit.actor_type or "",
            audit.patient_mrn or "",
            audit.encounter_id or "",
            audit.details or "",
        ])

    output.seek(0)
    filename = f"audit-trail-{datetime.now().strftime('%Y-%m-%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
