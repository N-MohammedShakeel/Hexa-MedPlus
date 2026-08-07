from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
import app.core.state as state
from app.core.db import AsyncSessionLocal
from app.models.ai_preference import AiPreferenceEntity
from app.utils.logger import log_error

router = APIRouter(redirect_slashes=False)

class PreferenceUpdateDto(BaseModel):
    llm_model: Optional[str] = None
    vision_model: Optional[str] = None
    model: Optional[str] = None # Legacy single model param

@router.get("/")
def get_preference():
    return {
        "llm_model": state.GLOBAL_LLM_PREFERENCE,
        "vision_model": state.GLOBAL_VISION_PREFERENCE,
        "model": state.GLOBAL_LLM_PREFERENCE
    }

@router.put("/")
async def update_preference(pref: PreferenceUpdateDto):
    valid_llm = ["nvidia", "aws_nova_pro", "aws_nova", "qwen", "gemini"]
    valid_vision = ["nvidia", "aws_nova_pro", "aws_nova", "gemini"]

    # Handle legacy single model updates if provided
    if pref.model and not pref.llm_model:
        pref.llm_model = pref.model
        pref.vision_model = pref.model

    if pref.llm_model in valid_llm:
        state.GLOBAL_LLM_PREFERENCE = pref.llm_model

    if pref.vision_model in valid_vision:
        state.GLOBAL_VISION_PREFERENCE = pref.vision_model

    # Write through to the DB so the preference survives a restart — the
    # in-memory globals above remain the fast synchronous read path for every
    # LLM/vision call site, this just keeps them from resetting on reboot.
    try:
        async with AsyncSessionLocal() as session:
            row = await session.get(AiPreferenceEntity, 1)
            if row is None:
                row = AiPreferenceEntity(id=1, llm_model=state.GLOBAL_LLM_PREFERENCE, vision_model=state.GLOBAL_VISION_PREFERENCE)
                session.add(row)
            else:
                row.llm_model = state.GLOBAL_LLM_PREFERENCE
                row.vision_model = state.GLOBAL_VISION_PREFERENCE
            await session.commit()
    except Exception as e:
        log_error(f"Failed to persist AI preference to DB (in-memory value still updated for this process): {e}")

    return {
        "message": "Preferences updated successfully",
        "llm_model": state.GLOBAL_LLM_PREFERENCE,
        "vision_model": state.GLOBAL_VISION_PREFERENCE
    }
