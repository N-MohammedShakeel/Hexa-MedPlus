import React from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, ArrowRight, HeartPulse } from "lucide-react";

export default function Footer() {
  const navigate = useNavigate();
  return (
    <>
      {/* ── CTA ── */}
      <section className="py-28 bg-gradient-to-br from-primary-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: "50px 50px" }} />
          <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-white/10 blur-[80px] rounded-full" />
          <div className="absolute bottom-0 -left-40 w-[400px] h-[400px] bg-indigo-900/30 blur-[80px] rounded-full" />
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-white mb-6">
              <TrendingUp className="w-3.5 h-3.5" /> Get Started Today
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
              The Future of Clinical<br />Intelligence is Here.
            </h2>
            <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
              Join the healthcare teams reducing admin burden by 60% and focus on what truly matters — your patients.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate("/register")}
                className="group w-full sm:w-auto px-10 py-5 rounded-xl bg-white text-primary-700 font-black text-xl flex items-center justify-center gap-2 hover:bg-primary-50 transition-all shadow-2xl shadow-indigo-900/30"
              >
                Request Early Access
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto px-10 py-5 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xl hover:bg-white/20 transition-all"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-200 bg-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <HeartPulse className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-neutral-900 tracking-tight">
                Hexa <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">MedPlus</span>
              </span>
            </div>
            <div className="flex gap-6 text-sm font-medium text-neutral-400">
              {["Privacy Policy", "Terms of Service", "HIPAA Compliance", "Security", "Contact"].map((l) => (
                <a key={l} href="#" className="hover:text-primary-600 transition-colors">{l}</a>
              ))}
            </div>
            <div className="text-sm font-medium text-neutral-400">
              © {new Date().getFullYear()} Hexa MedPlus AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
