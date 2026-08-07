import os
import threading
from langchain_community.vectorstores.pgvector import PGVector
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.utils.logger import log_info, log_warn, log_error

# Synchronous connection string for psycopg2 (PGVector uses sync by default)
PGVECTOR_CONNECTION_STRING = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
COLLECTION_NAME = "hexamed_knowledge_base"

# Hybrid search tuning. Kept small/deliberate:
# - each of vector/keyword search pulls FUSION_CANDIDATE_K candidates
# - RRF fuses them into one ranked list
# - the top RERANK_CANDIDATE_K of that fused list get cross-encoder reranked
# - the caller's requested k is applied last, after reranking
FUSION_CANDIDATE_K = 15
RERANK_CANDIDATE_K = 12
RRF_K = 60  # standard Reciprocal Rank Fusion constant

def get_embeddings():
    if settings.NVIDIA_NIM_API_KEY:
        return NVIDIAEmbeddings(model="nvidia/nv-embed-v1", api_key=settings.NVIDIA_NIM_API_KEY)
    else:
        raise ValueError("No NVIDIA API Key found for embeddings")

def get_vector_store():
    embeddings = get_embeddings()
    return PGVector(
        connection_string=PGVECTOR_CONNECTION_STRING,
        embedding_function=embeddings,
        collection_name=COLLECTION_NAME,
        use_jsonb=True
    )

# ── Hybrid retrieval (BM25 + pgvector, fused with RRF, cross-encoder reranked) ──
#
# Ingestion (above/below) keeps using LangChain's PGVector wrapper — it's a
# write path, low-risk, and doesn't need changing. Retrieval instead queries
# `langchain_pg_embedding` directly with raw SQL (the same approach already
# used read-only in app/api/rag.py), because fusing a vector-similarity result
# set with a keyword result set requires a shared identity key (the row's
# `uuid`) that LangChain's `similarity_search` wrapper doesn't expose.

_embeddings_client = None

def _get_embeddings_client():
    global _embeddings_client
    if _embeddings_client is None:
        _embeddings_client = get_embeddings()
    return _embeddings_client


_pg_pool = None
_pg_pool_lock = threading.Lock()

def _get_pg_pool():
    global _pg_pool
    if _pg_pool is None:
        with _pg_pool_lock:
            if _pg_pool is None:
                from psycopg2 import pool as pg_pool
                _pg_pool = pg_pool.ThreadedConnectionPool(1, 5, PGVECTOR_CONNECTION_STRING)
    return _pg_pool


def _build_filter_clause(filter_metadata: dict):
    # Keys are always hardcoded internal strings ("type", "patient_id",
    # "file_key") — never user input — so the f-string key interpolation
    # below carries no injection risk; values are always parameterized.
    clauses = [f"cmetadata->>'{k}' = %s" for k in filter_metadata]
    return " AND ".join(clauses), list(filter_metadata.values())


def _vector_search_raw(query: str, filter_metadata: dict, k: int) -> list:
    from pgvector.psycopg2 import register_vector

    query_vec = _get_embeddings_client().embed_query(query)
    filter_sql, params = _build_filter_clause(filter_metadata)
    sql = f"""
        SELECT e.uuid::text, e.document, e.cmetadata
        FROM langchain_pg_embedding e
        JOIN langchain_pg_collection c ON e.collection_id = c.uuid
        WHERE c.name = %s AND {filter_sql}
        ORDER BY e.embedding <=> %s
        LIMIT %s
    """
    pool = _get_pg_pool()
    conn = pool.getconn()
    try:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(sql, [COLLECTION_NAME] + params + [query_vec, k])
            rows = cur.fetchall()
        return [{"uuid": r[0], "document": r[1], "metadata": r[2] or {}} for r in rows]
    finally:
        pool.putconn(conn)


def _keyword_search_raw(query: str, filter_metadata: dict, k: int) -> list:
    """BM25-style lexical search via Postgres full-text search (content_tsv,
    added by main.py's startup migration). Degrades to an empty result (pure
    vector search still applies) if the migration hasn't landed yet, rather
    than erroring the whole hybrid search out."""
    filter_sql, params = _build_filter_clause(filter_metadata)
    sql = f"""
        SELECT e.uuid::text, e.document, e.cmetadata,
               ts_rank_cd(e.content_tsv, plainto_tsquery('english', %s)) AS rank
        FROM langchain_pg_embedding e
        JOIN langchain_pg_collection c ON e.collection_id = c.uuid
        WHERE c.name = %s AND e.content_tsv @@ plainto_tsquery('english', %s)
          AND {filter_sql}
        ORDER BY rank DESC
        LIMIT %s
    """
    pool = _get_pg_pool()
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, [query, COLLECTION_NAME, query] + params + [k])
            rows = cur.fetchall()
        return [{"uuid": r[0], "document": r[1], "metadata": r[2] or {}} for r in rows]
    except Exception as e:
        conn.rollback()
        log_warn(f"Keyword search unavailable (falling back to vector-only): {e}")
        return []
    finally:
        pool.putconn(conn)


def _reciprocal_rank_fusion(ranked_lists: list) -> list:
    """Standard RRF: score(doc) = sum over lists containing it of 1/(RRF_K + rank)."""
    scores = {}
    rows = {}
    for ranked in ranked_lists:
        for rank, row in enumerate(ranked, start=1):
            uid = row["uuid"]
            scores[uid] = scores.get(uid, 0.0) + 1.0 / (RRF_K + rank)
            rows.setdefault(uid, row)
    ordered = sorted(scores.keys(), key=lambda u: scores[u], reverse=True)
    return [rows[u] for u in ordered]


_reranker = None
_reranker_lock = threading.Lock()

def get_reranker():
    """Lazy singleton — loaded on first use, not at import time, so it doesn't
    add startup/reload latency to every ai-service boot for a model most
    requests won't need until the first RAG query comes in."""
    global _reranker
    if _reranker is None:
        with _reranker_lock:
            if _reranker is None:
                from sentence_transformers import CrossEncoder
                log_info("Loading cross-encoder reranker (cross-encoder/ms-marco-MiniLM-L-6-v2)...")
                _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)
    return _reranker


def _rerank(query: str, candidates: list, top_n: int) -> list:
    if len(candidates) <= 1:
        return candidates[:top_n]
    try:
        reranker = get_reranker()
        pairs = [[query, c["document"] or ""] for c in candidates]
        scores = reranker.predict(pairs)
        ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
        return [c for c, _ in ranked[:top_n]]
    except Exception as e:
        log_warn(f"Reranker unavailable, using RRF fusion order instead: {e}")
        return candidates[:top_n]


def _hybrid_search(query: str, filter_metadata: dict, final_k: int) -> list:
    vector_hits = _vector_search_raw(query, filter_metadata, FUSION_CANDIDATE_K)
    keyword_hits = _keyword_search_raw(query, filter_metadata, FUSION_CANDIDATE_K)
    fused = _reciprocal_rank_fusion([vector_hits, keyword_hits])
    return _rerank(query, fused[:RERANK_CANDIDATE_K], final_k)

def ingest_document(text: str, document_type: str, target_mrn: str, file_key: str):
    log_info(f"Ingesting document: {file_key} of type {document_type} for MRN {target_mrn}")
    
    try:
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = text_splitter.split_text(text)
        
        # Create metadata for each chunk
        metadata_type = "hospital_protocol" if target_mrn == "HOSPITAL_WIDE" else "patient_document"
        
        metadatas = [
            {
                "type": metadata_type,
                "document_category": document_type,
                "patient_id": target_mrn,
                "file_key": file_key
            }
            for _ in chunks
        ]
        
        vectorstore = get_vector_store()
        vectorstore.add_texts(texts=chunks, metadatas=metadatas)
        log_info(f"Successfully vectorized and stored {len(chunks)} chunks for {file_key} into PGVector.")
    except Exception as e:
        log_error(f"Failed to ingest document {file_key} into RAG: {str(e)}")

def search_clinical_protocols(query: str, k: int = 3):
    """Search only hospital protocols (ignoring patient-specific data).
    Hybrid (BM25 + pgvector, RRF-fused, cross-encoder reranked) under the hood —
    signature and return shape unchanged so callers need no changes."""
    results = _hybrid_search(query, {"type": "hospital_protocol"}, k)

    context_chunks = []
    import re
    for r in results:
        file_key = r["metadata"].get("file_key", "Unknown_Protocol")
        filename = file_key.split("/")[-1] if "/" in file_key else file_key
        # Strip UUID prefix if present
        filename = re.sub(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-', '', filename)
        context_chunks.append(f"[Source: {filename}]\n{r['document']}")

    return "\n\n".join(context_chunks)

def search_patient_history(query: str, patient_mrn: str, k: int = 3):
    """Search only documents belonging to a specific patient. Hybrid search, see
    search_clinical_protocols docstring above."""
    results = _hybrid_search(query, {"type": "patient_document", "patient_id": patient_mrn}, k)
    return "\n\n".join(r["document"] for r in results)

def delete_document_embeddings(file_key: str):
    """
    Deletes all pgvector rows ingested for a given file_key. Called when a
    guideline is retired (expired or superseded) so the AI stops retrieving
    outdated protocol content.
    """
    import psycopg2
    try:
        conn = psycopg2.connect(PGVECTOR_CONNECTION_STRING)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM langchain_pg_embedding WHERE cmetadata->>'file_key' = %s",
                    (file_key,)
                )
                deleted = cur.rowcount
            conn.commit()
            log_info(f"Deleted {deleted} embedding chunk(s) for retired guideline file_key={file_key}")
        finally:
            conn.close()
    except Exception as e:
        log_error(f"Failed to delete embeddings for file_key={file_key}: {str(e)}")

def search_specific_protocol(query: str, file_key: str, k: int = 3):
    """Search only within one specific hospital protocol document (Chat 'Protocol
    Mode'). Hybrid search, see search_clinical_protocols docstring above."""
    results = _hybrid_search(query, {"type": "hospital_protocol", "file_key": file_key}, k)
    return "\n\n".join(r["document"] for r in results)
