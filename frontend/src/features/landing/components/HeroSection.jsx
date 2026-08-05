import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  CheckCircle,
  ArrowRight,
  Lock,
  Sparkles,
  Server,
  Play,
  ChevronDown,
  Brain,
  Code2,
  FileText,
  BarChart3
} from "lucide-react";

/* ─── Animated typing text ───────────────────────────────────── */
function TypingText({ phrases }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIndex];
    const delay = deleting ? 40 : 80;
    const timer = setTimeout(() => {
      if (!deleting) {
        if (charIndex < current.length) {
          setCharIndex((c) => c + 1);
        } else {
          setTimeout(() => setDeleting(true), 1800);
        }
      } else {
        if (charIndex > 0) {
          setCharIndex((c) => c - 1);
        } else {
          setDeleting(false);
          setPhraseIndex((p) => (p + 1) % phrases.length);
        }
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [charIndex, deleting, phraseIndex, phrases]);

  return (
    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
      {phrases[phraseIndex].slice(0, charIndex)}
      <span className="border-r-2 border-primary-600 ml-0.5 animate-pulse" />
    </span>
  );
}

/* ─── Floating particles background ─────────────────────────── */
function ParticleField() {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 5 + 3,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 4,
    opacity: Math.random() * 0.12 + 0.04,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-primary-400"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `lp-float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Animated ECG line ──────────────────────────────────────── */
function ECGLine() {
  return (
    <svg viewBox="0 0 500 80" className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ecgGradLight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0052cc" stopOpacity="0" />
          <stop offset="25%" stopColor="#0052cc" stopOpacity="0.8" />
          <stop offset="75%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,40 L80,40 L100,40 L115,12 L125,68 L135,12 L145,68 L155,40 L240,40 L260,40 L275,12 L285,68 L295,12 L305,68 L315,40 L400,40 L420,40 L435,12 L445,68 L455,12 L465,68 L475,40 L500,40"
        fill="none"
        stroke="url(#ecgGradLight)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 1200,
          strokeDashoffset: 1200,
          animation: "lp-ecg 3s ease-in-out 0.5s infinite",
        }}
      />
    </svg>
  );
}

/* ─── Inline stat counter ────────────────────────────────────── */
function StatCounter({ target, suffix }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTime = null;
    const duration = 2000;
    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function HeroSection({ scrollY }) {
  const navigate = useNavigate();
  return (
    <>
      <section className="relative pt-36 pb-24 md:pt-52 md:pb-32 px-6 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(rgba(0,82,204,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,82,204,1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
              transform: `translateY(${scrollY * 0.08}px)`,
            }}
          />
          {/* Pastel glow orbs */}
          <div className="absolute top-16 left-1/4 w-[500px] h-[500px] bg-primary-200/40 blur-[120px] rounded-full" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-200/30 blur-[100px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-200/30 blur-[80px] rounded-full" />
          <ParticleField />
        </div>

        <div className="container mx-auto relative z-10 text-center max-w-5xl">

          {/* Live badge */}
          <div className="lp-slide-up inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary-50 border border-primary-200 text-sm font-semibold text-primary-700 mb-8 shadow-sm" style={{ animationDelay: "0.1s" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            Intelligent clinical workflows with evidence-based diagnostics
          </div>

          {/* Headline */}
          <h1 className="lp-slide-up text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.06] text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 to-neutral-600" style={{ animationDelay: "0.2s" }}>
            Clinical Intelligence<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600">
              Reimagined.
            </span>
          </h1>

          {/* Typing subtitle */}
          <div className="lp-slide-up text-2xl md:text-3xl font-bold mb-6 h-10" style={{ animationDelay: "0.3s" }}>
            <TypingText phrases={[
              "Automate SOAP documentation",
              "Suggest ICD-10 codes instantly",
              "Generate differential diagnoses",
              "Power physician review workflows",
            ]} />
          </div>

          <p className="lp-slide-up text-lg md:text-xl text-neutral-500 mb-10 max-w-2xl mx-auto leading-relaxed" style={{ animationDelay: "0.4s" }}>
            The physician-in-the-loop AI platform that ingests patient data, generates clinical summaries,
            recommends diagnostic pathways, and automates medical billing — all with full explainability.
          </p>

          {/* CTAs */}
          <div className="lp-slide-up flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: "0.5s" }}>
            <button
              onClick={() => navigate("/register")}
              className="group w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all"
            >
              Start Building Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white border border-neutral-200 text-neutral-800 font-bold text-lg flex items-center justify-center gap-2 hover:bg-neutral-50 hover:border-neutral-300 shadow-sm hover:shadow-md transition-all"
            >
              <Play className="w-4 h-4 text-primary-500" />
              View Live Demo
            </button>
          </div>

          {/* Trust badges */}
          <div className="lp-fade-in flex flex-wrap justify-center gap-6 mt-12" style={{ animationDelay: "0.8s" }}>
            {[
              { icon: Lock, label: "HIPAA Compliant" },
              { icon: Shield, label: "SOC 2 Type II" },
              { icon: CheckCircle, label: "HL7 FHIR Ready" },
              { icon: Server, label: "99.9% Uptime SLA" },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                <b.icon className="w-4 h-4 text-emerald-500" />
                {b.label}
              </div>
            ))}
          </div>
        </div>

        {/* ECG animation strip */}
        <div className="container mx-auto mt-16 max-w-4xl px-6 relative z-10 lp-fade-in" style={{ animationDelay: "0.7s" }}>
          <div className="h-16 opacity-70">
            <ECGLine />
          </div>
        </div>

        {/* App Mockup */}
        <div className="container mx-auto mt-6 max-w-5xl relative z-10 lp-slide-up" style={{ animationDelay: "0.6s" }}>
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_60px_rgba(0,82,204,0.12)] overflow-hidden hover:shadow-[0_16px_80px_rgba(0,82,204,0.18)] transition-shadow duration-500">
            {/* Browser bar */}
            <div className="h-12 border-b border-neutral-100 flex items-center px-4 gap-2 bg-neutral-50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="ml-4 px-3 py-1 rounded-md bg-white border border-neutral-200 text-xs text-neutral-400 flex items-center gap-2 shadow-sm">
                <Lock className="w-3 h-3 text-neutral-300" />
                https://app.hexamedplus.ai/workspace
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-bold">
                  ● LIVE AI
                </div>
              </div>
            </div>

            {/* Workspace content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50/50">
              {/* Patient list */}
              <div className="col-span-1 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4">Active Patients</div>
                {[
                  { name: "James Wilson", mrn: "MRN-849201", status: "In Progress", dot: "bg-amber-500", bar: "bg-amber-400", pct: "65%" },
                  { name: "Maria Garcia", mrn: "MRN-339201", status: "Pending Review", dot: "bg-blue-500", bar: "bg-blue-400", pct: "40%" },
                  { name: "Robert Chen", mrn: "MRN-112948", status: "Signed", dot: "bg-emerald-500", bar: "bg-emerald-400", pct: "100%" },
                ].map((p, i) => (
                  <div key={i} className={`p-3 rounded-xl bg-white border flex flex-col gap-2 ${i === 0 ? 'border-primary-200 shadow-sm shadow-primary-100' : 'border-neutral-100'}`}>
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-semibold text-neutral-800">{p.name}</div>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                        <div className="text-[9px] font-medium text-neutral-400">{p.status}</div>
                      </div>
                    </div>
                    <div className="text-[9px] text-neutral-400 font-mono">{p.mrn}</div>
                    <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-1 rounded-full ${p.bar}`} style={{ width: p.pct }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Main workspace */}
              <div className="col-span-1 md:col-span-2 rounded-xl bg-white border border-neutral-100 p-4 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-neutral-900">James Wilson — Encounter</div>
                    <div className="text-[10px] text-neutral-400">Office Visit · Today · Dr. Sarah Chen</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-7 px-3 rounded-lg bg-neutral-100 text-[10px] text-neutral-500 flex items-center font-medium">Save Draft</div>
                    <div className="h-7 px-3 rounded-lg bg-primary-600 text-[10px] text-white font-semibold flex items-center">Sign Encounter</div>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3 h-3 text-violet-500" />
                      <div className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">AI SOAP Summary</div>
                    </div>
                    <div className="h-2 w-full bg-violet-200 rounded mb-1.5" />
                    <div className="h-2 w-4/5 bg-violet-100 rounded mb-1.5" />
                    <div className="h-2 w-full bg-violet-200 rounded" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Code2 className="w-3 h-3 text-blue-500" />
                        <div className="text-[10px] font-bold text-blue-600">ICD-10 Codes</div>
                      </div>
                      <div className="text-[9px] font-mono text-neutral-500 bg-white p-1.5 rounded border border-blue-100">E11.9 · I10</div>
                      <div className="mt-2 flex gap-1.5">
                        <div className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">✓ 98%</div>
                        <div className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">✓ 95%</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Brain className="w-3 h-3 text-amber-500" />
                        <div className="text-[10px] font-bold text-amber-600">Diagnoses</div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-full bg-amber-200 rounded" />
                        <div className="h-2 w-3/4 bg-amber-100 rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <BarChart3 className="w-3 h-3 text-rose-500" />
                      <div className="text-[10px] font-bold text-rose-600">Critical Lab Values</div>
                    </div>
                    <div className="flex gap-3 text-[9px]">
                      <span className="text-rose-700 font-mono">HbA1c: <span className="font-bold">8.2% ↑</span></span>
                      <span className="text-amber-700 font-mono">Glucose: <span className="font-bold">145 mg/dL ↑</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-neutral-300 lp-fade-in" style={{ animationDelay: "1.2s" }}>
          <span className="text-xs font-medium">Scroll to explore</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-indigo-600">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            {[
              { target: 95, suffix: "%", label: "AI Coding Accuracy" },
              { target: 60, suffix: "%", label: "Reduction in Admin Time" },
              { target: 50000, suffix: "+", label: "Clinical Notes Processed" },
              { target: 10, suffix: "x", label: "Faster Documentation" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-black mb-1 tabular-nums">
                  <StatCounter target={s.target} suffix={s.suffix} />
                </div>
                <div className="text-sm font-medium text-primary-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}