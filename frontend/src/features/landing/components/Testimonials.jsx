import React from "react";
import { Users, Star } from "lucide-react";

const testimonials = [
  {
    quote: "Hexa MedPlus cut our coding time by 60%. The ICD suggestions are surprisingly accurate — our billing team is thrilled.",
    author: "Dr. Priya Nair",
    role: "Chief of Medicine, Apollo Hospitals",
    avatar: "PN",
    stars: 5,
    avatarBg: "from-blue-500 to-indigo-500",
  },
  {
    quote: "The explainability feature is a game-changer. I can see exactly why the AI suggested a diagnosis, which builds trust.",
    author: "Dr. James Okafor",
    role: "Hospitalist, Cleveland Clinic",
    avatar: "JO",
    stars: 5,
    avatarBg: "from-violet-500 to-purple-500",
  },
  {
    quote: "Finally, an AI that works with our workflow. The physician-in-the-loop design means we're always in control.",
    author: "Dr. Maria Chen",
    role: "Primary Care Physician, Johns Hopkins",
    avatar: "MC",
    stars: 5,
    avatarBg: "from-emerald-500 to-teal-500",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 mb-4">
            <Users className="w-3.5 h-3.5" /> Testimonials
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-neutral-100 mb-4 tracking-tight">
            Trusted by Clinicians
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg">
            Healthcare professionals across the country are transforming their workflows with Hexa MedPlus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <blockquote className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed flex-1 mb-6 italic">
                "{t.quote}"
              </blockquote>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarBg} flex items-center justify-center text-sm font-bold text-white shadow-md`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{t.author}</div>
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}