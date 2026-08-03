from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.db import get_db
from app.models.insight import AiAuditEntity

router = APIRouter()

@router.get("")
@router.get("/")
async def get_audits(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AiAuditEntity).order_by(AiAuditEntity.timestamp.desc()))
    audits = result.scalars().all()
    
    # Map to frontend expectations
    response = []
    for audit in audits:
        response.append({
            "id": audit.id,
            "createdAt": audit.timestamp.isoformat() if audit.timestamp else None,
            "taskType": audit.action,
            "encounterId": audit.encounter_id,
            "modelUsed": audit.actor_name, # Mapping actor to model for UI
            "prompt": audit.code_ref, # Reusing fields for UI mapping
            "response": audit.details,
            "latencyMs": 0 # Not tracked currently
        })
    return response
