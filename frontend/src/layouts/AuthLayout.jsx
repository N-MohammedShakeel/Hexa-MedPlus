import React from "react";
import { Outlet, Navigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Hexagon } from "lucide-react";

export default function AuthLayout() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side: Brand/Image */}
      <div className="hidden lg:flex w-1/2 bg-neutral-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-900/90"></div>

        <div className="relative z-10 px-12 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3 flex items-center justify-center shadow-lg shadow-primary-500/30 border-t border-primary-300">
              <div className="flex items-start">
                <span className="text-white text-3xl font-black font-sans leading-none tracking-tighter">H</span>
                <span className="text-primary-100 text-sm font-bold ml-0.5 mt-0.5 leading-none">+</span>
              </div>
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">Hexa MedPlus</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            AI-Powered Clinical Decision Support.
          </h1>
          <p className="text-lg text-neutral-300 mb-8 leading-relaxed">
            Streamline patient encounters, automate ICD/CPT coding, and get evidence-based treatment pathways with full auditability.
          </p>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-neutral-900 bg-neutral-700 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="avatar" />
                </div>
              ))}
            </div>
            <div className="text-sm text-neutral-300">
              <span className="font-bold text-white">4,000+</span> providers trust Hexa MedPlus
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative bg-white">
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2 flex items-center justify-center shadow-inner border-t border-primary-300">
            <div className="flex items-start">
              <span className="text-white text-xl font-black font-sans leading-none tracking-tighter">H</span>
              <span className="text-primary-100 text-[10px] font-bold ml-0.5 mt-0.5 leading-none">+</span>
            </div>
          </div>
          <span className="text-xl font-bold text-neutral-900 tracking-tight">Hexa MedPlus</span>
        </div>

        <div className="w-full max-w-md animate-fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
