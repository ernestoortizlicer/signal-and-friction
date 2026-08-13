"use client";

import { useState } from "react";
import DailyTrainingPlan from "./DailyTrainingPlan";
import VisualDiagnosticCoach from "./VisualDiagnosticCoach";
import DiagnosticCalibration from "./DiagnosticCalibration";
import ReasoningActivities from "./ReasoningActivities";

type Tab = "daily" | "visual" | "calibration" | "reasoning" | "archive";

export default function LearningDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("daily");

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] p-4 md:p-6 font-mono relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="max-w-[1400px] mx-auto space-y-5 relative z-10">
        <header className="flex flex-wrap justify-between items-start gap-4 border-b border-[#D4A853]/15 pb-5">
          <div>
            <span className="font-mono text-[10px] text-[#D4A853]/70 tracking-[0.35em] uppercase block">Learning OS v2 · Deliberate Practice</span>
            <h1 className="text-3xl font-serif tracking-tight mt-1">Engineer skill, don’t collect course completion.</h1>
            <p className="text-xs text-[#7A6F65] mt-2 max-w-3xl leading-relaxed">
              External courses feed the system. Visual discrimination, retrieval, applied builds, traces, and staged diagnostic work create evidence. Premium authorization remains a separate fail-closed gate.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[#5C9A6B] border border-[#5C9A6B]/25 bg-[#5C9A6B]/5 px-2.5 py-1 rounded-full">Evidence-driven</span>
            <span className="text-[10px] uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/25 bg-[#D4A853]/5 px-2.5 py-1 rounded-full">Canonical v2</span>
          </div>
        </header>

        <nav className="flex gap-5 border-b border-[#D4A853]/10 overflow-x-auto">
          {([
            { key: "daily", label: "Today" },
            { key: "visual", label: "Visual Lab" },
            { key: "calibration", label: "Diagnostic Calibration" },
            { key: "reasoning", label: "Reasoning Lab" },
            { key: "archive", label: "Archive" },
          ] as { key: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 whitespace-nowrap text-xs uppercase tracking-widest border-b-2 transition-colors ${activeTab === tab.key ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#B0A89E]"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "daily" && (
          <DailyTrainingPlan
            onOpenCalibration={() => setActiveTab("calibration")}
            onOpenReasoning={() => setActiveTab("reasoning")}
          />
        )}
        {activeTab === "visual" && <VisualDiagnosticCoach />}
        {activeTab === "calibration" && <DiagnosticCalibration />}
        {activeTab === "reasoning" && <ReasoningActivities />}

        {activeTab === "archive" && (
          <section className="border border-[#D4A853]/12 bg-[#110F0D]/30 rounded-xl p-6 space-y-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7A6F65]">Historical learning surfaces</span>
              <h2 className="font-serif text-xl mt-1">Legacy data preserved; legacy pedagogy retired from the active control surface.</h2>
            </div>
            <p className="text-sm text-[#B0A89E] leading-relaxed max-w-4xl">
              Hyper Leap, the older Combat Mode, IP Lab drafts, and the legacy Socratic path remain in repository history and their historical database tables are not deleted. They no longer participate in today’s plan, practice calibration, or premium-readiness decisions. This removes parallel authorities while preserving auditability.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <ArchiveCard title="hyper_leap_sessions" detail="Historical sessions only · non-gating" />
              <ArchiveCard title="education_content / drafts" detail="Historical curriculum/IP records · non-gating" />
              <ArchiveCard title="learning-socratic-tutor" detail="Legacy runtime · do not extend for new training" />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ArchiveCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border border-[#D4A853]/10 rounded p-3 bg-[#0A0908]/30">
      <span className="font-mono text-[#F5F0EB] block">{title}</span>
      <span className="text-[#7A6F65] mt-1 block">{detail}</span>
    </div>
  );
}
