from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import app.core.state as state

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
def update_preference(pref: PreferenceUpdateDto):
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

    return {
        "message": "Preferences updated successfully",
        "llm_model": state.GLOBAL_LLM_PREFERENCE,
        "vision_model": state.GLOBAL_VISION_PREFERENCE
    }
