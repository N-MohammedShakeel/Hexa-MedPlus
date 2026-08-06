import React, { useState } from "react";
import {
  Activity,
  Shield,
  Brain,
  Code2,
  FileText,
  CheckCircle,
  Zap,
  Stethoscope,
  Microscope,
  Lock,
  ChevronRight,
  FileSignature,
  Sparkles,
  Database,
  Globe,
} from "lucide-react";

/* ─── Data ───────────────────────────────────────────────────── */
const capabilities = [
  {
    icon: FileText,
    title: "Clinical Note Summarization",
    description: "Instantly transform unstructured patient history, labs, and vitals into concise actionable summaries using Hexa AI.",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "hover:border-blue-300 hover:shadow-blue-100 dark:hover:border-blue-700 dark:hover:shadow-none",
    tag: "NLP",
    tagColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  },
  {
    icon: Stethoscope,
    title: "Differential Diagnosis Engine",
    description: "AI-driven differential diagnoses based on holistic patient data, reducing cognitive load and diagnostic errors.",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    accent: "hover:border-indigo-300 hover:shadow-indigo-100 dark:hover:border-indigo-700 dark:hover:shadow-none",
    tag: "RAG",
    tagColor: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  },
  {
    icon: Code2,
    title: "ICD-10 / CPT Coding",
    description: "Accurate medical billing codes automatically mapped to clinical narratives with 95%+ accuracy and HIPAA compliance.",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "hover:border-emerald-300 hover:shadow-emerald-100 dark:hover:border-emerald-700 dark:hover:shadow-none",
    tag: "AI Coding",
    tagColor: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  },
  {
    icon: Activity,
    title: "Treatment Pathways",
    description: "Evidence-based treatment recommendations tailored to the patient's unique medical profile and clinical guidelines.",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    accent: "hover:border-violet-300 hover:shadow-violet-100 dark:hover:border-violet-700 dark:hover:shadow-none",
    tag: "Clinical AI",
    tagColor: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  },
  {
    icon: Microscope,
    title: "Explainability & Citations",
    description: "Every recommendation includes confidence scores and direct citations to ADA, JNC, WHO, and other clinical guidelines.",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400",
    accent: "hover:border-rose-300 hover:shadow-rose-100 dark:hover:border-rose-700 dark:hover:shadow-none",
    tag: "XAI",
    tagColor: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  },
  {
    icon: FileSignature,
    title: "Physician-in-the-Loop",
    description: "Providers maintain full control to review, edit, and approve all AI suggestions before submission. Always.",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "hover:border-amber-300 hover:shadow-amber-100 dark:hover:border-amber-700 dark:hover:shadow-none",
    tag: "Human AI",
    tagColor: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  },
];

const solutionPillars = [
  { name: "AI Clinical Insights", icon: Brain, bg: "bg-indigo-100 dark:bg-indigo-900/30", color: "text-indigo-700 dark:text-indigo-400" },
  { name: "Automated Workflows", icon: Activity, bg: "bg-emerald-100 dark:bg-emerald-900/30", color: "text-emerald-700 dark:text-emerald-400" },
  { name: "EHR Interoperability", icon: Database, bg: "bg-blue-100 dark:bg-blue-900/30", color: "text-blue-700 dark:text-blue-400" },
  { name: "HIPAA Compliant", icon: Lock, bg: "bg-red-100 dark:bg-red-900/30", color: "text-red-700 dark:text-red-400" },
  { name: "Real-time Processing", icon: Zap, bg: "bg-orange-100 dark:bg-orange-900/30", color: "text-orange-700 dark:text-orange-400" },
  { name: "Provider Workspace", icon: Globe, bg: "bg-cyan-100 dark:bg-cyan-900/30", color: "text-cyan-700 dark:text-cyan-400" },
];

const workflowSteps = [
  {
    step: 1,
    title: "Data Ingestion",
    desc: "Patient notes, labs, vitals, and history are securely ingested via the clinical service.",
    icon: Database,
    gradient: "from-blue-500 to-cyan-500",
    badge: "FHIR Ready",
    badgeColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  },
  {
    step: 2,
    title: "AI Analysis",
    desc: "Hexa AI analyzes the full clinical context, cross-referencing uploaded guidelines via RAG.",
    icon: Brain,
    gradient: "from-violet-500 to-purple-500",
    badge: "Hexa AI",
    badgeColor: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  },
  {
    step: 3,
    title: "Structured Output",
    desc: "SOAP summaries, ICD/CPT codes, and differential diagnoses are generated with confidence scores.",
    icon: FileText,
    gradient: "from-indigo-500 to-blue-500",
    badge: "Structured JSON",
    badgeColor: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  },
  {
    step: 4,
    title: "Provider Review",
    desc: "Approve, edit, or reject each suggestion. Every decision is audit-logged for HIPAA compliance.",
    icon: CheckCircle,
    gradient: "from-emerald-500 to-green-500",
    badge: "HIPAA Logged",
    badgeColor: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  },
];


export default function FeatureShowcase() {
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <>
      {/* ── Capabilities ── */}
      <section id="features" className="py-24 bg-white dark:bg-neutral-950">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-xs font-bold text-primary-700 dark:text-primary-300 mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Core Capabilities
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-neutral-100 mb-4 tracking-tight">
              Every Tool a Clinician Needs
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-lg">
              Comprehensive AI assistance across the entire clinical encounter — from note entry to billing submission.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {capabilities.map((cap, i) => (
              <div
                key={i}
                className={`group relative p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default ${cap.accent}`}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full ${cap.tagColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  {cap.tag}
                </div>
                <div className={`w-12 h-12 rounded-xl ${cap.iconBg} flex items-center justify-center mb-5 transition-all duration-300 ${hoveredCard === i ? 'scale-110 shadow-md' : ''}`}>
                  <cap.icon className={`w-6 h-6 ${cap.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-3">{cap.title}</h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">{cap.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section id="workflow" className="py-24 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950 border-y border-neutral-100 dark:border-neutral-800">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-700 dark:text-amber-300 mb-4">
              <Zap className="w-3.5 h-3.5" /> AI Workflow
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-neutral-100 mb-4 tracking-tight">
              From Note to Billing in
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                Under 30 Seconds
              </span>
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-lg">
              A seamless clinical pipeline automating everything from patient intake to structured diagnostics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {workflowSteps.map((step, i) => (
              <div key={i} className="relative group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                {i < workflowSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 z-20">
                    <ChevronRight className="w-6 h-6 text-neutral-300 dark:text-neutral-700" />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs font-bold text-neutral-300 dark:text-neutral-600 uppercase tracking-widest mb-1">Step {step.step}</div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">{step.title}</h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">{step.desc}</p>
                <div className={`mt-4 text-[10px] font-bold px-2.5 py-1 rounded-full inline-block ${step.badgeColor}`}>
                  {step.badge}
                </div>
              </div>
            ))}
          </div>

          {/* Physician callout */}
          <div className="mt-16 max-w-4xl mx-auto bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-8 border border-amber-200 dark:border-amber-900 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 mb-2 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                  Physician-in-the-Loop
                </div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-2">AI Proposes. Providers Decide.</h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                  Every AI suggestion includes confidence scores, clinical citations, and one-click approvals. All decisions are HIPAA-compliant audit-logged in real time.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {["Full AI reasoning transparency", "One-click approve or edit", "Complete HIPAA audit trail"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Solution Ecosystem ── */}
      <section id="ecosystem" className="py-24 bg-white dark:bg-neutral-950">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-4">
              <Shield className="w-3.5 h-3.5" /> Platform Ecosystem
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-neutral-100 mb-4 tracking-tight">
              Enterprise-Grade Healthcare Solution
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-lg">
              Designed for clinical environments to seamlessly integrate with existing workflows while maintaining the highest security standards.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto mb-12">
            {solutionPillars.map((pillar, i) => (
              <div key={i} className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 text-center hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className={`w-10 h-10 rounded-xl ${pillar.bg} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <pillar.icon className={`w-5 h-5 ${pillar.color}`} />
                </div>
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 leading-snug">{pillar.name}</div>
              </div>
            ))}
          </div>

          {/* Workflow Map */}
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 text-center mb-8">Clinical Data Flow</div>
            <div className="flex flex-wrap justify-center items-center gap-3 mb-4">
              {[
                { label: "Patient Encounter", cls: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300" },
                null,
                { label: "Data Intake & Standardization", cls: "bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300" },
                null,
                { label: "Clinical AI Processing", cls: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" },
              ].map((item, i) =>
                item === null
                  ? <ChevronRight key={i} className="w-5 h-5 text-neutral-300 dark:text-neutral-700" />
                  : <div key={i} className={`px-4 py-2 rounded-lg border text-xs font-semibold ${item.cls}`}>{item.label}</div>
              )}
            </div>
            <div className="flex flex-wrap justify-center items-center gap-3">
              {[
                { label: "Structured Insights", cls: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300" },
                null,
                { label: "Physician Review", cls: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300" },
                null,
                { label: "EHR Sync & Billing", cls: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300" },
              ].map((item, i) =>
                item === null
                  ? <ChevronRight key={i} className="w-5 h-5 text-neutral-300 dark:text-neutral-700" />
                  : <div key={i} className={`px-4 py-2 rounded-lg border text-xs font-semibold ${item.cls}`}>{item.label}</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}