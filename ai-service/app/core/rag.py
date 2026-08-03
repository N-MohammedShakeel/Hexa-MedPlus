import os
from langchain_community.vectorstores.pgvector import PGVector
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.utils.logger import log_info, log_error

# Synchronous connection string for psycopg2 (PGVector uses sync by default)
PGVECTOR_CONNECTION_STRING = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
COLLECTION_NAME = "hexamed_knowledge_base"

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
    """Search only hospital protocols (ignoring patient-specific data)"""
    vectorstore = get_vector_store()
    results = vectorstore.similarity_search(
        query=query, 
        k=k, 
        filter={"type": "hospital_protocol"}
    )
    
    context_chunks = []
    import re
    for doc in results:
        file_key = doc.metadata.get("file_key", "Unknown_Protocol")
        filename = file_key.split("/")[-1] if "/" in file_key else file_key
        # Strip UUID prefix if present
        filename = re.sub(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-', '', filename)
        context_chunks.append(f"[Source: {filename}]\n{doc.page_content}")
        
    return "\n\n".join(context_chunks)

def search_patient_history(query: str, patient_mrn: str, k: int = 3):
    """Search only documents belonging to a specific patient"""
    vectorstore = get_vector_store()
    results = vectorstore.similarity_search(
        query=query,
        k=k,
        filter={"type": "patient_document", "patient_id": patient_mrn}
    )
    return "\n\n".join([doc.page_content for doc in results])

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
    """Search only within one specific hospital protocol document (Chat 'Protocol Mode')"""
    vectorstore = get_vector_store()
    results = vectorstore.similarity_search(
        query=query,
        k=k,
        filter={"type": "hospital_protocol", "file_key": file_key}
    )
    return "\n\n".join([doc.page_content for doc in results])
