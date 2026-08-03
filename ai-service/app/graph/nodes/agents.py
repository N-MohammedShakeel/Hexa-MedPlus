import json
import re
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.output_parsers import JsonOutputParser
from app.graph.state import AgentState
from app.core.config import settings
import app.core.state as state
from app.models.schemas import SummarySchema, DiagnosisSchema, CodingSchema, PathwaySchema
from app.prompts.templates import SUMMARIZATION_PROMPT, DIAGNOSTICS_PROMPT, CODING_PROMPT, PATHWAY_PROMPT
from app.utils.logger import log_info, log_warn, log_error
from app.core.redactor import redact_text, unmask_json
from tavily import TavilyClient
from app.core.rag import search_clinical_protocols

def get_llm():
    pref = state.GLOBAL_AI_PREFERENCE

    def get_custom():
        log_info(f"🤖 AI ROUTING: Executing with Qwen 2.5 (Custom Ngrok) - Preference: {pref}")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="qwen2.5:14b", base_url=settings.CUSTOM_LLM_BASE_URL, api_key="not-needed", temperature=0.2, max_tokens=1500)
    
    def get_nvidia():
        log_info(f"🤖 AI ROUTING: Executing with NVIDIA Llama 3.1 - Preference: {pref}")
        from langchain_nvidia_ai_endpoints import ChatNVIDIA
        return ChatNVIDIA(model="meta/llama-3.1-8b-instruct", api_key=settings.NVIDIA_NIM_API_KEY, temperature=0.2, max_tokens=1500)

    if pref == "qwen" and settings.CUSTOM_LLM_BASE_URL:
        return get_custom()
    elif pref == "nvidia" and settings.NVIDIA_NIM_API_KEY:
        return get_nvidia()
    
    # Auto / Fallback: Qwen first, then NVIDIA
    if settings.CUSTOM_LLM_BASE_URL:
        return get_custom()
    else:
        return get_nvidia()

def robust_json_invoke(prompt_template, llm, parser, input_dict, fallback_dict):
    """Executes prompt + llm and robustly extracts JSON, falling back cleanly if LLM generates preamble/malformed output."""
    chain = prompt_template | llm | parser
    try:
        return chain.invoke(input_dict)
    except Exception as parse_err:
        log_warn(f"Standard JsonOutputParser failed: {str(parse_err)}. Attempting regex raw output extraction...")
        try:
            raw_chain = prompt_template | llm
            raw_res = raw_chain.invoke(input_dict)
            raw_text = raw_res.content if hasattr(raw_res, 'content') else str(raw_res)

            # Look for markdown codeblock json block or first balanced json object
            match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
            if not match:
                match = re.search(r'(\{.*\})', raw_text, re.DOTALL)
                
            if match:
                clean_str = match.group(1).strip()
                return json.loads(clean_str)
        except Exception as fallback_err:
            log_error(f"Regex JSON extraction failed: {str(fallback_err)}")

        log_warn(f"Returning default fallback response structure due to parsing failure.")
        return fallback_dict

def sanitize_search_term(primary_term: str, fallback_note: str) -> str:
    """Filters out generic placeholder strings to prevent Tavily from receiving irrelevant search prompts."""
    invalid_patterns = [
        "not provided in clinical note",
        "not provided",
        "n/a",
        "none",
        "research failed",
        "no information",
        "clinical evaluation pending"
    ]
    term = primary_term.strip() if primary_term else ""
    if not term or any(p in term.lower() for p in invalid_patterns):
        term = fallback_note.strip() if fallback_note else ""
        if any(p in term.lower() for p in invalid_patterns):
            return ""
    return term[:200]

def redaction_node(state: AgentState):
    note = state.get('note_content', '')
    
    if not note:
        return {"redacted_note": "", "phi_mapping": {}}
        
    redacted_note, phi_mapping = redact_text(note)
    
    return {
        "redacted_note": redacted_note,
        "phi_mapping": phi_mapping
    }

def summarization_node(state: AgentState):
    llm = get_llm()
    parser = JsonOutputParser(pydantic_object=SummarySchema)
    
    fallback = {
        "subjective": state.get('note_content', 'Not provided'),
        "objective": "Not provided in clinical note",
        "assessment": state.get('note_content', 'Clinical evaluation required'),
        "plan": "Consult attending physician",
        "keyFindings": [state.get('note_content', 'Clinical note provided')],
        "criticalAlerts": [],
        "confidence": 0.8
    }

    summary = robust_json_invoke(
        SUMMARIZATION_PROMPT,
        llm,
        parser,
        {
            "patient_context": state.get('patient_context', ''),
            "note_content": state.get('redacted_note', state.get('note_content', '')),
            "format_instructions": parser.get_format_instructions()
        },
        fallback
    )
    
    hitl_status = "NONE"
    if summary.get("confidence", 1.0) < 0.85:
        hitl_status = "REQUIRES_REVIEW_LOW_CONFIDENCE"
        
    return {"summary": summary, "hitl_status": hitl_status}

def clinical_research_node(state: AgentState):
    log_info("Running Clinical Internet Research...")
    api_key = settings.TAVILY_API_KEY
    if not api_key:
        return {"clinical_context": "No Tavily API key provided."}
        
    client = TavilyClient(api_key=api_key)
    
    assessment = state.get("summary", {}).get("assessment", "")
    note_content = state.get('redacted_note', state.get('note_content', ''))
    search_term = sanitize_search_term(assessment, note_content)
    
    if not search_term:
        log_info("No valid clinical search term found; skipping internet research.")
        return {"clinical_context": "No specific findings available for research."}
        
    query = f"Clinical differential diagnosis and latest guidelines for: {search_term}"
    log_info(f"Searching Tavily for: {query}")
    
    try:
        # Search Tavily (Live Internet)
        response = client.search(query, max_results=2)
        tavily_context = "\n".join([result["content"] for result in response["results"]])
        
        # Search Local RAG (Hospital Guidelines)
        rag_context = ""
        try:
            rag_context = search_clinical_protocols(search_term, k=2)
            if rag_context:
                rag_context = "\n\n=== HOSPITAL CLINICAL GUIDELINES ===\n" + rag_context
        except Exception as rag_e:
            log_warn(f"RAG search failed (expected if DB is empty): {rag_e}")
            
        return {"clinical_context": tavily_context + rag_context}
    except Exception as e:
        log_error(f"Tavily search failed: {str(e)}")
        return {"clinical_context": "Research failed."}

def diagnostics_node(state: AgentState):
    llm = get_llm()
    parser = JsonOutputParser(pydantic_object=DiagnosisSchema)
    
    fallback = {
        "primaryDiagnosis": state.get('summary', {}).get('assessment', 'Clinical evaluation pending'),
        "differentialDiagnoses": [],
        "reasoning": "Based on provided note content.",
        "citations": ["Standard Clinical Guidelines"]
    }
    
    diagnosis = robust_json_invoke(
        DIAGNOSTICS_PROMPT,
        llm,
        parser,
        {
            "note_content": state.get('redacted_note', state.get('note_content', '')),
            "assessment": state.get('summary', {}).get('assessment', ''),
            "clinical_context": state.get('clinical_context', ''),
            "format_instructions": parser.get_format_instructions()
        },
        fallback
    )
    
    return {"diagnosis": diagnosis}

def coding_research_node(state: AgentState):
    log_info("Running Coding & Pathway Internet Research...")
    api_key = settings.TAVILY_API_KEY
    if not api_key:
        return {"coding_context": "No Tavily API key provided."}
        
    client = TavilyClient(api_key=api_key)
    
    disease = state.get("diagnosis", {}).get("primaryDiagnosis", "")
    note_content = state.get('redacted_note', state.get('note_content', ''))
    search_term = sanitize_search_term(disease, note_content)
    
    if not search_term:
        return {"coding_context": ""}
        
    query = f"Latest ICD-10 codes, CPT codes, and standard clinical treatment pathway for {search_term}"
    log_info(f"Searching Tavily for: {query}")
    
    try:
        response = client.search(query, max_results=3)
        context = "\n".join([result["content"] for result in response["results"]])
        return {"coding_context": context}
    except Exception as e:
        log_error(f"Tavily search failed: {str(e)}")
        return {"coding_context": "Research failed."}

def coding_node(state: AgentState):
    llm = get_llm()
    parser = JsonOutputParser(pydantic_object=CodingSchema)
    
    fallback = {
        "suggestedCodes": []
    }
    
    codes = robust_json_invoke(
        CODING_PROMPT,
        llm,
        parser,
        {
            "note_content": state.get('redacted_note', state.get('note_content', '')),
            "primary_diagnosis": state.get('diagnosis', {}).get('primaryDiagnosis', ''),
            "coding_context": state.get('coding_context', ''),
            "format_instructions": parser.get_format_instructions()
        },
        fallback
    )
    
    return {"codes": codes}

def pathway_node(state: AgentState):
    llm = get_llm()
    parser = JsonOutputParser(pydantic_object=PathwaySchema)
    
    fallback = {
        "pathwayId": "PATHWAY-DEFAULT",
        "pathwayName": "Standard Clinical Evaluation Pathway",
        "steps": [
            {
                "stepName": "Initial Assessment",
                "description": "Perform comprehensive clinical evaluation and patient assessment.",
                "reasoning": "Baseline protocol"
            }
        ]
    }
    
    pathway = robust_json_invoke(
        PATHWAY_PROMPT,
        llm,
        parser,
        {
            "primary_diagnosis": state.get('diagnosis', {}).get('primaryDiagnosis', ''),
            "coding_context": state.get('coding_context', ''),
            "format_instructions": parser.get_format_instructions()
        },
        fallback
    )
    
    return {"pathway": pathway}

def unmasking_node(state: AgentState):
    phi_mapping = state.get('phi_mapping', {})
    
    if phi_mapping:
        log_info("Unmasking generated AI insights...")
    
    return {
        "summary": unmask_json(state.get("summary"), phi_mapping),
        "diagnosis": unmask_json(state.get("diagnosis"), phi_mapping),
        "codes": unmask_json(state.get("codes"), phi_mapping),
        "pathway": unmask_json(state.get("pathway"), phi_mapping)
    }


