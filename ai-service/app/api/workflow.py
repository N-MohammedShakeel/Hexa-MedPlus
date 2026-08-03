from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.schemas.insight import WorkflowRequestDto, WorkflowResultDto, WorkflowUpdateDto
from app.graph.orchestrator import clinical_workflow
from app.models.insight import EncounterAiInsightEntity, AiAuditEntity
import uuid
from sqlalchemy.future import select
import asyncio

router = APIRouter()

@router.post("/execute", response_model=WorkflowResultDto)
async def execute_workflow(request: WorkflowRequestDto, db: AsyncSession = Depends(get_db)):
    try:
        initial_state = {
            "encounter_id": request.encounterId,
            "note_content": request.noteContent,
            "patient_context": request.patientContext
        }
        
        # Run LangGraph pipeline
        result_state = await asyncio.to_thread(clinical_workflow.invoke, initial_state)
        
        # Save or update DB
        insight_query = await db.execute(select(EncounterAiInsightEntity).filter_by(encounter_id=result_state["encounter_id"]))
        existing_insight = insight_query.scalars().first()
        
        if existing_insight:
            existing_insight.ai_summary = result_state.get("summary")
            existing_insight.ai_diagnosis = result_state.get("diagnosis")
            existing_insight.ai_codes = result_state.get("codes")
            existing_insight.ai_pathway = result_state.get("pathway")
            existing_insight.hitl_status = result_state.get("hitl_status", "NONE")
        else:
            insight = EncounterAiInsightEntity(
                encounter_id=result_state["encounter_id"],
                ai_summary=result_state.get("summary"),
                ai_diagnosis=result_state.get("diagnosis"),
                ai_codes=result_state.get("codes"),
                ai_pathway=result_state.get("pathway"),
                hitl_status=result_state.get("hitl_status", "NONE")
            )
            db.add(insight)
            
        import app.core.state as state
        actor = "NVIDIA Llama 3.1"
        if state.GLOBAL_AI_PREFERENCE == "qwen":
            actor = "Qwen 2.5"
            
        # Add Audit Log for Generation
        audit = AiAuditEntity(
            id=str(uuid.uuid4()),
            encounter_id=result_state["encounter_id"],
            actor_name=actor,
            actor_type="AI_MODEL",
            action="Generate Clinical Insights",
            code_ref="LangGraph Pipeline",
            details="Successfully generated clinical summary, diagnosis, codes, and pathway."
        )
        db.add(audit)
            
        await db.commit()
        
        return WorkflowResultDto(
            success=True,
            summary=result_state.get("summary"),
            diagnosis=result_state.get("diagnosis"),
            codes=result_state.get("codes"),
            pathway=result_state.get("pathway"),
            hitlStatus=result_state.get("hitl_status")
        )
    except Exception as e:
        return WorkflowResultDto(success=False, errorMessage=str(e))

@router.get("/{encounter_id}", response_model=WorkflowResultDto)
async def get_workflow_result(encounter_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EncounterAiInsightEntity).filter(EncounterAiInsightEntity.encounter_id == encounter_id))
    insight = result.scalars().first()
    
    if not insight:
        raise HTTPException(status_code=404, detail="No insights found for this encounter")
        
    return WorkflowResultDto(
        success=True,
        summary=insight.ai_summary,
        diagnosis=insight.ai_diagnosis,
        codes=insight.ai_codes,
        pathway=insight.ai_pathway,
        hitlStatus=insight.hitl_status
    )

@router.put("/{encounter_id}", response_model=WorkflowResultDto)
async def update_workflow_result(encounter_id: str, request: WorkflowUpdateDto, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EncounterAiInsightEntity).filter(EncounterAiInsightEntity.encounter_id == encounter_id))
    insight = result.scalars().first()
    
    if not insight:
        raise HTTPException(status_code=404, detail="No insights found for this encounter")
        
    if request.summary is not None:
        insight.ai_summary = request.summary
    if request.diagnosis is not None:
        insight.ai_diagnosis = request.diagnosis
    if request.codes is not None:
        insight.ai_codes = request.codes
    if request.pathway is not None:
        insight.ai_pathway = request.pathway
        
    # Add Audit Log for manual human override
    actor_name = request.actorName if request.actorName else "Dr. Chen"
    actor_type = request.actorType if request.actorType else "PHYSICIAN"
    
    audit = AiAuditEntity(
        id=str(uuid.uuid4()),
        encounter_id=encounter_id,
        actor_name=actor_name,
        actor_type=actor_type,
        action="Human Override: Clinical Insights",
        code_ref="HITL Edit Mode",
        details="Physician manually edited and saved AI insights."
    )
    db.add(audit)
        
    await db.commit()
    
    return WorkflowResultDto(
        success=True,
        summary=insight.ai_summary,
        diagnosis=insight.ai_diagnosis,
        codes=insight.ai_codes,
        pathway=insight.ai_pathway,
        hitlStatus=insight.hitl_status
    )
