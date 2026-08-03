from fastapi import APIRouter
from pydantic import BaseModel
import app.core.state as state

router = APIRouter(redirect_slashes=False)

class PreferenceUpdateDto(BaseModel):
    model: str

@router.get("/")
def get_preference():
    return {"model": state.GLOBAL_AI_PREFERENCE}

@router.put("/")
def update_preference(pref: PreferenceUpdateDto):
    valid_models = ["auto", "qwen", "nvidia", "gemini"]
    if pref.model not in valid_models:
        return {"error": "Invalid model choice"}, 400
    state.GLOBAL_AI_PREFERENCE = pref.model
    return {"message": "Preference updated", "model": state.GLOBAL_AI_PREFERENCE}
