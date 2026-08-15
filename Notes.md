### 📝 Entry 1: History Tab (`Tag: History`)
**Tag to select:** `History` (Yellow Badge)

**Content to enter:**
```text
70yo male with 10-year history of Type 2 Diabetes Mellitus, Essential Hypertension, and Mixed Dyslipidemia. No history of prior MI, TIA, or CVA. Non-smoker, denies alcohol. Known allergies: Penicillin (hives) and Sulfa drugs. Mother had ischemic stroke at age 72; father had coronary artery disease.
```

**Doctor Comment to add on this note:**
> *"Family history of stroke increases his overall ASCVD risk profile."*

---

### 📝 Entry 2: Clinical Note (`Tag: Clinical Note`)
**Tag to select:** `Clinical Note` (Blue Badge)

**Content to enter:**
```text
Patient presents for 3-month chronic disease follow-up. Reports mild episodic lightheadedness over the past 2 weeks, occurring mostly in the afternoon. Denies chest pain, palpitations, shortness of breath, dysarthria, facial asymmetry, or limb weakness. Home blood glucose logs show morning fasting levels ranging between 120-145 mg/dL. 

Exam: BP 138/84 mmHg, HR 72 regular, RR 16, SpO2 98% room air. Alert and oriented x 3. Heart: RRR, no murmurs. Lungs: Clear bilaterally. Neuro: CN II-XII intact, motor strength 5/5 all limbs, normal gait, bilateral pedal pulses 2+.
```

**Doctor Comment to add on this note:**
> *"Need to review recent lipid panel and check if statin dose needs escalation."*

---

### 📝 Entry 3: Prescription Note (`Tag: Prescription`)
**Tag to select:** `Prescription` (Purple/Primary Badge)

**Content to enter:**
```text
1. Metformin 500 mg PO BID with morning and evening meals (continue current dose).
2. Lisinopril 10 mg PO once daily in the morning (continue current dose).
3. Atorvastatin 40 mg PO once daily at bedtime (increased from 20mg for high-intensity lipid lowering).
4. Aspirin 81 mg PO once daily with breakfast (secondary cardiovascular prophylaxis).
```

**Doctor Comment to add on this note:**
> *"Patient educated on possible statin myalgia symptoms; liver enzymes and lipids scheduled for 8-week repeat."*


### 🛡️ Other Real-Time Safety Alerts Hexa MedPlus Detects:

| What Doctor Types in Note | Real-Time CDS Safety Alert Triggered |
|---|---|
| **`Warfarin` + `Aspirin / NSAID`** | ⚠️ **Drug Interaction Alert**: Concurrent use of Warfarin with NSAIDs/Aspirin significantly increases bleeding risk. Consider GI-protective therapy and INR monitoring per ACC guidelines. |
| **`NSAIDs` + `Hypertension / Heart Failure / CKD`** | ⚠️ **Clinical Alert**: NSAIDs should be used with caution in patients with hypertension, heart failure, or CKD. Consider acetaminophen as an alternative per ACC/AHA guidelines. |
| **`GLP-1` + `Metformin`** | ⚠️ **Guideline Alert**: ADA Standards of Care recommends verifying renal function (eGFR) prior to initiating GLP-1 agonists. |
| **`Penicillin / Amoxicillin` + `Allergy`** | 🚨 **Critical Alert**: Patient documentation mentions allergy — verify penicillin allergy status before prescribing any beta-lactam antibiotic. |
