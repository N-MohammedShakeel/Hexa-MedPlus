# Hexa MedPlus: Future Roadmap & System Actors

## 1. Immediate Roadmap & Pending Work



### E. Intelligent RAG Guideline Lifecycle Management [🔮 Planned]
- **Goal**: Automated CRON job to retire old guidelines and regenerate embeddings for new versions.



## 3. System Actors
The Hexa MedPlus platform is designed to serve distinct user roles, ensuring a seamless flow from patient intake to medical billing.

1. **Physician / Doctor**: Primary care provider.
2. **Medical Coder / Billing Specialist**: Financial and compliance expert.
3. **Hospital Administrator**: Operations and compliance oversight.
4. **Hexa MedPlus AI System (Autonomous Actor)**: The intelligent orchestrator.

---

## 4. Educational / Not Planned for Implementation
The following are advanced concepts mapped out for architectural knowledge, but will **not** be implemented in the current scope:

### F. Vision AI & Automated Imaging Reports (Not Planned)
- **Reason**: Current open-source vision models cannot accurately output exact spatial coordinates.

### G. Aggressive Redis Application Caching (Not Planned)
- **Reason**: Current scale does not require it.

### H. HL7 FHIR / EHR Interoperability Writeback (Not Planned)
- **Reason**: Requires complex enterprise integration layers.

---

## 5. Does the current workflow make sense medically?
**Yes, absolutely.** 
The flow perfectly mirrors what billion-dollar HealthTech companies are building. Doctors type messy notes, Hexa MedPlus structures them, cross-references hospital guidelines, and generates billing codes with a "Human-in-the-Loop" safety net.
