from fastapi import APIRouter
from app.core.config import settings
from app.core.db import Base
import sqlalchemy as sa
from sqlalchemy import text

router = APIRouter()

@router.get("/status")
async def rag_status():
    """
    Returns the status of the RAG vector store.
    Called by the frontend Explainability modal to display citation sources.
    """
    from app.core.db import engine

    try:
        # Check if pgvector extension and our collection table exist
        async with engine.connect() as conn:
            # Check vector extension
            ext_result = await conn.execute(
                text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            )
            has_vector = ext_result.fetchone() is not None

            # Count documents in vector store
            doc_count = 0
            chunk_count = 0
            if has_vector:
                try:
                    count_result = await conn.execute(
                        text("SELECT COUNT(*) FROM langchain_pg_embedding")
                    )
                    chunk_count = count_result.scalar() or 0

                    coll_result = await conn.execute(
                        text("SELECT COUNT(DISTINCT (cmetadata->>'file_key')) FROM langchain_pg_embedding")
                    )
                    doc_count = coll_result.scalar() or 0
                except Exception:
                    pass  # Table doesn't exist yet (no docs ingested)

        return {
            "status": "ONLINE",
            "vectorExtension": has_vector,
            "documentCount": doc_count,
            "chunkCount": chunk_count,
            "embeddingModel": "nvidia/nv-embed-v1",
            "collectionName": "hexamed_knowledge_base"
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "error": str(e),
            "documentCount": 0,
            "chunkCount": 0
        }

@router.get("/documents")
async def list_rag_documents():
    """List all unique documents ingested into the RAG vector store."""
    from app.core.db import engine

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT 
                    cmetadata->>'file_key' as file_key,
                    cmetadata->>'type' as type,
                    cmetadata->>'document_category' as category,
                    cmetadata->>'patient_id' as patient_id,
                    COUNT(*) as chunk_count
                FROM langchain_pg_embedding
                GROUP BY 
                    cmetadata->>'file_key',
                    cmetadata->>'type',
                    cmetadata->>'document_category',
                    cmetadata->>'patient_id'
                ORDER BY file_key
            """))
            rows = result.fetchall()
            return [
                {
                    "fileKey": row[0],
                    "type": row[1],
                    "category": row[2],
                    "patientId": row[3],
                    "chunkCount": row[4]
                }
                for row in rows
            ]
    except Exception as e:
        return []
