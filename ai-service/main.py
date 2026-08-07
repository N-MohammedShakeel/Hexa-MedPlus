import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.api.workflow import router as workflow_router
from app.api.audits import router as audits_router
from app.api.preferences import router as preferences_router
from app.api.vision import router as vision_router
from app.api.chat import router as chat_router
from app.api.rag import router as rag_router
from app.core.db import engine, Base, AsyncSessionLocal
import app.models.chat  # ensure chat tables are created
import app.models.document_analysis  # ensure document_analysis table is created
import app.models.ai_preference  # ensure ai_preferences table is created
import app.core.state as state
from app.models.ai_preference import AiPreferenceEntity

app = FastAPI(title="Hexa MedPlus AI Engine", version="1.0.0")

# The frontend authenticates via `Authorization: Bearer <jwt>` (see
# frontend/src/config/axios.js), never cookies/withCredentials, so credentialed
# CORS requests are never actually needed here. allow_credentials is left off
# accordingly, and allow_origins is configurable (mirroring api-gateway's
# CORS_EXTRA_ORIGIN pattern) instead of a bare wildcard.
_extra_origins = [o.strip() for o in os.environ.get("AI_SERVICE_CORS_ORIGINS", "").split(",") if o.strip()]
_default_origins = ["http://localhost:3000", "http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy import text
from app.core.kafka_consumer import start_kafka_consumers

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Each statement below gets its OWN transaction (not shared with create_all
    # or each other). Postgres aborts an entire transaction on any single
    # failed statement — sharing one transaction meant a single expected
    # failure (e.g. the langchain_pg_embedding ALTER below, on a fresh DB
    # where that table doesn't exist yet because LangChain only creates it
    # lazily on first ingestion) would silently roll back everything else in
    # the same transaction, INCLUDING the create_all above — which is exactly
    # how document_analysis/chat_sessions/ai_preferences went missing on a
    # fresh database despite create_all "running successfully."
    for stmt in [
        "ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS needs_blur_annotation BOOLEAN DEFAULT FALSE",
        "ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS document_id VARCHAR",
        "ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS identity_check_status VARCHAR",
        "ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS identity_mismatches JSON",
        "ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS identity_confirmed BOOLEAN DEFAULT FALSE",
        "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS mode VARCHAR NOT NULL DEFAULT 'general'",
        "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS context_id VARCHAR",
        "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS context_label VARCHAR",
        "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS created_by VARCHAR",
        # Hybrid RAG: full-text index backing the BM25/keyword half of hybrid
        # search (see app/core/rag.py's _keyword_search_raw). GENERATED ALWAYS
        # ... STORED backfills every existing row automatically at ALTER TABLE
        # time — no separate migration/backfill script needed. This only
        # succeeds once langchain_pg_embedding exists (i.e. after at least one
        # document has been ingested) — harmless no-op error otherwise, and it
        # lands on the next restart after the first ingestion.
        "ALTER TABLE langchain_pg_embedding ADD COLUMN IF NOT EXISTS content_tsv tsvector "
        "GENERATED ALWAYS AS (to_tsvector('english', coalesce(document, ''))) STORED",
        "CREATE INDEX IF NOT EXISTS idx_langchain_pg_embedding_content_tsv "
        "ON langchain_pg_embedding USING GIN (content_tsv)",
    ]:
        try:
            async with engine.begin() as stmt_conn:
                await stmt_conn.execute(text(stmt))
        except Exception as e:
            print(f"Migration error for '{stmt}': {e}")

    # Load the persisted LLM/vision preference (if any) into the in-memory
    # globals before serving traffic, so a restart doesn't silently reset a
    # previously-chosen provider back to the "aws_nova_pro" default.
    try:
        async with AsyncSessionLocal() as session:
            row = await session.get(AiPreferenceEntity, 1)
            if row:
                state.GLOBAL_LLM_PREFERENCE = row.llm_model
                state.GLOBAL_VISION_PREFERENCE = row.vision_model
    except Exception as e:
        print(f"Failed to load persisted AI preference, using defaults: {e}")

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
