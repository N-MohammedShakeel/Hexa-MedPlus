from gliner import GLiNER
from app.utils.logger import log_info

# Initialize model at module level so it loads only once on startup
# This will download the weights (1.2GB) on the very first run
log_info("Loading GLiNER PII model (this may take a moment on first run)...")
model = GLiNER.from_pretrained("urchade/gliner_multi_pii-v1")
log_info("GLiNER PII model loaded successfully!")

def redact_text(text: str):
    labels = ["person", "organization", "phone number", "email", "date of birth", "address", "medical record number", "social security number"]
    
    log_info("Running local PHI redaction...")
    entities = model.predict_entities(text, labels)
    
    redacted_text = text
    phi_mapping = {}
    
    # Sort entities in reverse order by start position to avoid shifting indices when replacing
    entities.sort(key=lambda x: x["start"], reverse=True)
    
    # Keep track of counts for placeholders e.g., PERSON_1, PERSON_2
    type_counts = {}
    
    # To handle multiple occurrences of the same string
    seen_texts = {}
    
    for entity in entities:
        label = entity["label"].upper().replace(" ", "_")
        original_text = entity["text"]
        
        # Determine placeholder
        if original_text not in seen_texts:
            type_counts[label] = type_counts.get(label, 0) + 1
            placeholder = f"[{label}_{type_counts[label]}]"
            phi_mapping[placeholder] = original_text
            seen_texts[original_text] = placeholder
        else:
            placeholder = seen_texts[original_text]
            
        # Replace in text manually using start/end indices for precision
        start = entity["start"]
        end = entity["end"]
        redacted_text = redacted_text[:start] + placeholder + redacted_text[end:]
        
    log_info(f"Redacted {len(entities)} PHI entities from note.")
    return redacted_text, phi_mapping

def unmask_json(obj, phi_mapping: dict):
    """
    Recursively unmasks tags in a JSON serializable object (dict/list/string).
    """
    if isinstance(obj, str):
        for placeholder, original in phi_mapping.items():
            obj = obj.replace(placeholder, original)
        return obj
    elif isinstance(obj, list):
        return [unmask_json(item, phi_mapping) for item in obj]
    elif isinstance(obj, dict):
        return {k: unmask_json(v, phi_mapping) for k, v in obj.items()}
    return obj
