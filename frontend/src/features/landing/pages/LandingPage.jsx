import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse } from "lucide-react";

import HeroSection from "../components/HeroSection";
import FeatureShowcase from "../components/FeatureShowcase";
import Testimonials from "../components/Testimonials";
import Footer from "../components/Footer";

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans overflow-x-hidden selection:bg-primary-100">

      {/* ── Global CSS ── */}
      <style>{`
        @keyframes lp-float {
          from { transform: translateY(0px); }
          to   { transform: translateY(-18px); }
        }
        @keyframes lp-ecg {
          0%   { stroke-dashoffset: 1200; opacity: 0; }
          8%   { opacity: 1; }
          60%  { stroke-dashoffset: 0; opacity: 1; }
          80%  { stroke-dashoffset: 0; opacity: 0.8; }
          100% { stroke-dashoffset: -1200; opacity: 0; }
        }
        @keyframes lp-slide-up {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lp-ping-slow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50%      { transform: scale(1.4); opacity: 0; }
        }
        .lp-slide-up { animation: lp-slide-up 0.7s ease both; }
        .lp-fade-in  { animation: lp-fade-in 1s ease both; }
      `}</style>

      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-100 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-md shadow-primary-200">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-neutral-900">
              Hexa <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">MedPlus</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-500">
            {[["#features", "Capabilities"], ["#workflow", "Workflow"], ["#ecosystem", "Ecosystem"], ["#testimonials", "Testimonials"]].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-primary-600 transition-colors">{label}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-2 rounded-lg hover:bg-neutral-100">
              Sign In
            </button>
            <button
              onClick={() => navigate("/register")}
              className="text-sm font-bold bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl hover:from-primary-500 hover:to-indigo-500 transition-all shadow-md shadow-primary-200 hover:shadow-primary-300"
            >
              Request Access
            </button>
          </div>
        </div>
      </nav>

      {/* ── Extracted Sections ── */}
      <HeroSection scrollY={scrollY} />
      <FeatureShowcase />
      <Testimonials />
      <Footer />

    </div>
  );
}