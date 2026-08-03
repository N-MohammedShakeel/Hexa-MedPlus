from pydantic import BaseModel, Field
from typing import List, Optional

class SummarySchema(BaseModel):
    subjective: str = Field(description="Patient complaints and history")
    objective: str = Field(description="Vital signs and lab findings")
    assessment: str = Field(description="Clinical assessment summary")
    plan: str = Field(description="Treatment plan")
    keyFindings: List[str] = Field(description="List of key clinical findings")
    criticalAlerts: List[str] = Field(description="Any critical alerts or red flags")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")

class DiagnosisSchema(BaseModel):
    primaryDiagnosis: str = Field(description="The primary diagnosis")
    differentialDiagnoses: List[str] = Field(description="List of differential diagnoses")
    reasoning: str = Field(description="Clinical reasoning for the diagnosis")
    citations: List[str] = Field(description="Citations or guidelines referenced")

class CodeItem(BaseModel):
    code: str = Field(description="The ICD-10 or CPT code")
    description: str = Field(description="Description of the code")
    type: str = Field(description="Type of code: 'ICD10' or 'CPT'")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    evidence: List[str] = Field(description="Evidence from the clinical note supporting this code")

class CodingSchema(BaseModel):
    suggestedCodes: List[CodeItem] = Field(description="List of suggested codes")

class PathwayStep(BaseModel):
    stepName: str = Field(description="Name of the treatment step")
    description: str = Field(description="Description of the treatment step")
    reasoning: str = Field(description="Reasoning for this step based on the diagnosis")

class PathwaySchema(BaseModel):
    pathwayId: str = Field(description="A unique identifier for the pathway")
    pathwayName: str = Field(description="The name of the suggested clinical pathway")
    steps: List[PathwayStep] = Field(description="Ordered list of steps in the pathway")

class LabTrendInsightSchema(BaseModel):
    insight: str = Field(description="A short 1-2 sentence clinical insight about how this lab test's values have trended over time, relative to its reference range")
