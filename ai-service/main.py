from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.api.workflow import router as workflow_router
from app.api.audits import router as audits_router
from app.api.preferences import router as preferences_router
from app.api.vision import router as vision_router
from app.api.chat import router as chat_router
from app.api.rag import router as rag_router
from app.core.db import engine, Base
import app.models.chat  # ensure chat tables are created
import app.models.document_analysis  # ensure document_analysis table is created

app = FastAPI(title="Hexa MedPlus AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy import text
from app.core.kafka_consumer import start_kafka_consumers

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in [
            "ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS needs_blur_annotation BOOLEAN DEFAULT FALSE",
            "ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS document_id VARCHAR",
            "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS mode VARCHAR NOT NULL DEFAULT 'general'",
            "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS context_id VARCHAR",
            "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS context_label VARCHAR",
        ]:
            try:
                await conn.execute(text(stmt))
            except Exception as e:
                print(f"Migration error for '{stmt}': {e}")
    await start_kafka_consumers()

app.include_router(workflow_router, prefix="/api/ai/workflow", tags=["workflow"])
app.include_router(audits_router, prefix="/api/ai/audits", tags=["audits"])
app.include_router(preferences_router, prefix="/api/ai/preferences", tags=["preferences"])
app.include_router(vision_router, prefix="/api/ai/vision", tags=["vision"])
app.include_router(chat_router, prefix="/api/ai/chat", tags=["chat"])
app.include_router(rag_router, prefix="/api/ai/rag", tags=["rag"])

@app.get("/health")
def health_check():
    return {"status": "UP"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8083, reload=True)
