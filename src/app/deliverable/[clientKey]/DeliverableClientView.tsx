/**
 * AIR-GAPPED CLIENT DELIVERABLE — LOCALE: en (American Business English)
 *
 * ARCHITECTURAL CONTRACT:
 *   - This component is intentionally isolated from the admin LanguageContext.
 *   - It MUST NOT import useLanguage(), LanguageProvider, or any admin-layer
 *     i18n mechanism. Locale is hardcoded to "en" at the data-model level.
 *   - All copy is sourced from the client's DeliverableData JSON (English-only
 *     schema) or the fallback constants in fallback.ts (English-only).
 *   - Future changes to the admin ES/EN toggle will have zero effect here by
 *     structural design: LanguageProvider is mounted only inside AdminLayout,
 *     which governs /admin/** and no other route tree.
 *
 * DO NOT add any admin context imports to this file.
 */
"use client";

import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DeliverableData, BeforeAfterData } from "../fallback";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 100, damping: 18 },
  },
};

interface Props {
  data: DeliverableData;
  staticClientKey?: string;
}

export default function DeliverableClientView({ data: staticData, staticClientKey }: Props) {
  const pathname = usePathname();
  // Derive real clientKey from URL — works even when served via _redirects wildcard
  const urlClientKey = pathname.split("/").filter(Boolean).pop() ?? staticClientKey ?? "acme-corp";

  const [d, setD] = useState<DeliverableData>(staticData);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch(`/api/deliverable/${urlClientKey}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((live: DeliverableData | null) => {
        if (live) setD(live);
      })
      .catch(() => {/* use staticData already set */})
      .finally(() => setFetching(false));
  }, [urlClientKey]);

  const isMicrodosing = d.segment === "microdosing";

  // Dynamic values (previously hardcoded)
  const founderFocusScore = d.founderFocusScore ?? 85;
  const daysRemaining = d.daysRemaining ?? 23;
  const guaranteeStatus = d.guaranteeStatus ?? "20% Growth Guarantee Active";
  const telemetryStatus = d.telemetryStatus ?? "✓ Traffic & Baseline Confirmed";
  const ba: BeforeAfterData = d.beforeAfter ?? {
    beforeTitle: "Verify Billing & Setup Server",
    beforeIssue: "Cognitive Load — multiple decision variables before dashboard access",
    beforeFields: ["Phone Number", "Company Size", "Industry Type", "CRM Version", "AWS Region", "Billing Email"],
    beforeBounce: "Bounce Probability: ~88%",
    afterTitle: "Access Your Workspace",
    afterDomain: `${urlClientKey}.signal-and-friction.app`,
    afterGain: "Calculated Conversion Gain: +350%",
  };

  const [checklist, setChecklist] = useState(d.checklist || []);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(d.learningModules?.[0]?.id || null);

  // Sync checklist when live data arrives
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (d.checklist) setChecklist(d.checklist);
    if (d.learningModules?.[0]) setSelectedModuleId(d.learningModules[0].id);
  }, [d]);

  const toggleCheck = (id: string) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const doneCount = checklist.filter((c) => c.done).length;
  const totalCount = checklist.length;
  const dynamicProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const activeModule = d.learningModules?.find((m) => m.id === selectedModuleId);

  // Loading skeleton
  if (fetching && !d.clientName) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#B0A89E] animate-pulse">
        Initializing diagnostic runtime...
      </div>
    );
  }

  if (isMicrodosing) {
    return (
      <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] overflow-x-hidden">
        {/* Nav */}
        <nav className="w-full fixed top-0 z-50 bg-[#0A0908]/90 backdrop-blur-xl border-b border-[#D4A853]/10">
          <div className="max-w-[1000px] mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-serif text-[#D4A853] text-lg tracking-tight font-bold glow-text">
                Signal &amp; Friction
              </span>
              <span className="text-xs text-[#7A6F65] font-mono">/ Client Portal</span>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#D4A853]/70 border border-[#D4A853]/25 px-3 py-1 rounded bg-[#D4A853]/5">
              Autonomy Track
            </span>
          </div>
        </nav>

        {/* Hero */}
        <motion.section
          className="pt-24 pb-12 px-6 border-b border-[#D4A853]/10"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]">
                  Methodology &amp; Handover
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]/30" />
                <span className="font-mono text-xs text-[#7A6F65]">{d.date}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#F5F0EB] font-serif">
                {d.clientName} Optimization Console
              </h1>
              <p className="text-sm text-[#B0A89E] leading-relaxed max-w-[60ch]">
                Welcome to your self-serve optimization workspace. Analyze your custom diagnostic Loom, master the learning modules, and complete the checklist to resolve your conversion friction.
              </p>
            </div>

            <div className="space-y-4">
              {/* Autonomy Progress */}
              <div className="bg-[#110F0D] border border-[#D4A853]/15 p-5 rounded-lg space-y-4 glow-border">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#B0A89E]">Autonomy Progress</span>
                  <span className="text-[#D4A853] font-bold">{dynamicProgress}%</span>
                </div>
                <div className="w-full bg-[#2A2218] h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-[#D4A853] h-full rounded-full"
                    animate={{ width: `${dynamicProgress}%` }}
                    transition={{ type: "spring", stiffness: 80 }}
                  />
                </div>
                <div className="flex justify-between font-mono text-xs text-[#7A6F65]">
                  <span>{doneCount} of {totalCount} completed</span>
                  <span>{dynamicProgress === 100 ? "Ready for Handover" : "In Progress"}</span>
                </div>
              </div>

              {/* Founder Focus Tracker — dynamic */}
              <div className="bg-[#110F0D] border border-[#C85C5C]/15 p-5 rounded-lg space-y-3 glow-border-red">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#B0A89E]">Founder Focus Score</span>
                  <span className="text-[#5C9A6B] font-bold">{founderFocusScore} / 100</span>
                </div>
                <div className="w-full bg-[#2A2218] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#5C9A6B] h-full rounded-full" style={{ width: `${founderFocusScore}%` }} />
                </div>
                <div className="font-mono text-xs text-[#7A6F65] leading-relaxed">
                  Cognitive load index: {100 - founderFocusScore}/100 — Execution adherence: high-confidence threshold.
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Diagnostic Loom */}
        <section className="py-12 px-6 border-b border-[#D4A853]/5">
          <div className="max-w-[1000px] mx-auto">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853] mb-5">
              01 — Playbook Video Walkthrough
            </h2>
            <div className="aspect-video bg-[#110F0D] border border-[#D4A853]/10 rounded-lg overflow-hidden relative glow-border">
              {d.loomUrl && !d.loomUrl.includes("placeholder") ? (
                <iframe
                  src={d.loomUrl.includes("embed") ? d.loomUrl : d.loomUrl.replace("/share/", "/embed/")}
                  frameBorder="0"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-[#D4A853]/10 flex items-center justify-center mx-auto border border-[#D4A853]/20 animate-pulse">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <polygon points="5 3 19 12 5 21 5 3" fill="#D4A853" />
                      </svg>
                    </div>
                    <p className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-widest">
                      Briefing Runtime Pending
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Modules & Checklist */}
        <section className="py-12 px-6 max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]">
              02 — Implementation Checklist
            </h2>
            <div className="space-y-3 bg-[#110F0D]/40 border border-[#D4A853]/5 p-5 rounded-lg">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`flex items-start gap-4 p-4 border rounded transition-all duration-300 cursor-pointer ${
                    item.done ? "bg-[#5C9A6B]/5 border-[#5C9A6B]/20" : "bg-[#110F0D]/60 border-[#D4A853]/10 hover:border-[#D4A853]/30"
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.done ? "bg-[#5C9A6B] border-[#5C9A6B]" : "border-[#D4A853]/40"
                  }`}>
                    {item.done && <span className="text-xs text-[#0A0908] font-bold">✓</span>}
                  </div>
                  <div className="space-y-1 select-none">
                    <p className={`text-xs font-mono font-medium ${item.done ? "line-through text-[#7A6F65]" : "text-[#F5F0EB]"}`}>
                      {item.task}
                    </p>
                    <p className="text-xs text-[#B0A89E] leading-relaxed">{item.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]">
              03 — Learning Curriculum
            </h2>
            <div className="space-y-2">
              {d.learningModules?.map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => setSelectedModuleId(mod.id)}
                  className={`p-4 border transition-all duration-300 cursor-pointer rounded text-left ${
                    selectedModuleId === mod.id ? "bg-[#D4A853]/5 border-[#D4A853]/30" : "bg-[#110F0D]/30 border-[#D4A853]/5 hover:border-[#D4A853]/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs text-[#D4A853]/80 uppercase tracking-widest">{mod.title}</span>
                    {mod.completed && (
                      <span className="font-mono text-xs uppercase tracking-wider text-[#5C9A6B] bg-[#5C9A6B]/10 px-1.5 py-0.5 rounded border border-[#5C9A6B]/20">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#B0A89E] leading-relaxed">{mod.description}</p>
                </div>
              ))}
            </div>
            {activeModule && (
              <div className="border border-[#D4A853]/15 bg-[#110F0D]/60 p-5 rounded-lg space-y-3 mt-4">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-wider uppercase block">
                  Diagnostic Module — Intervention Brief
                </span>
                <h4 className="text-xs font-bold font-mono text-[#F5F0EB]">{activeModule.title}</h4>
                <p className="text-xs text-[#B0A89E] leading-relaxed font-mono">{activeModule.content}</p>
              </div>
            )}
          </div>
        </section>

        <footer className="py-12 border-t border-[#D4A853]/10 text-center bg-[#0A0908] mt-16">
          <p className="font-mono text-xs tracking-[0.15em] text-[#7A6F65]">
            {d.consultant} · CONFIDENTIAL CLIENT HUB · ALL RIGHTS RESERVED
          </p>
        </footer>
      </main>
    );
  }

  // ── High-Ticket / Concierge View ──────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0A0908] text-[#B0A89E] overflow-x-hidden grain">
      <nav className="w-full fixed top-0 z-50 bg-[#0A0908]/90 backdrop-blur-xl border-b border-[#D4A853]/8">
        <div className="max-w-[900px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-serif text-[#F5F0EB] text-lg tracking-tight">
            Signal &amp; Friction
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#7A6F65] border border-[#D4A853]/8 px-3 py-0.5 rounded">
            Confidential Diagnostic Portal
          </span>
        </div>
      </nav>

      <motion.section
        className="pt-28 pb-16 px-6 border-b border-[#D4A853]/8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className="max-w-[900px] mx-auto">
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#B0A89E]">
              Revenue Friction Diagnostic
            </span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#7A6F65]">{d.date}</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl font-serif text-[#F5F0EB] tracking-tight leading-[1.05] mb-6"
          >
            {d.clientName}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-[#B0A89E] max-w-[55ch] leading-relaxed font-light"
          >
            This dashboard displays your custom Signal &amp; Friction diagnostic brief. Below is the clinical breakdown of your funnel signal, the dominant cognitive friction mechanism, and three strategic decisions.
          </motion.p>

          {/* S&F Guarantee Monitor — dynamic */}
          <motion.div
            variants={itemVariants}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 border border-[#D4A853]/8 bg-[#110F0D]/60 p-5 rounded select-none"
          >
            <div className="space-y-1">
              <div className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">Guarantee Status</div>
              <div className="font-serif text-[#F5F0EB] text-xs font-semibold">{guaranteeStatus}</div>
            </div>
            <div className="space-y-1">
              <div className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">Telemetry Validation</div>
              <div className="font-mono text-xs text-[#5C9A6B] font-semibold">{telemetryStatus}</div>
            </div>
            <div className="space-y-1">
              <div className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">Testing Runway</div>
              <div className="font-mono text-xs text-[#D4A853] font-bold">{daysRemaining} Days Remaining</div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Loom Video Embed */}
      <motion.section
        className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#B0A89E] mb-6">
            Video Walkthrough
          </h2>
          <div className="aspect-video bg-[#110F0D] border border-[#D4A853]/8 rounded-lg overflow-hidden relative glow-accent">
            {d.loomUrl && !d.loomUrl.includes("placeholder") ? (
              <iframe
                src={d.loomUrl.includes("embed") ? d.loomUrl : d.loomUrl.replace("/share/", "/embed/")}
                frameBorder="0"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#110F0D]/80 pointer-events-none">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#D4A853]/10 flex items-center justify-center mx-auto mb-4 border border-[#D4A853]/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <polygon points="5 3 19 12 5 21 5 3" fill="#D4A853" />
                    </svg>
                  </div>
                  <p className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">
                    Async briefing stream pending...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Signal Section */}
      <motion.section
        className="py-16 px-6 border-b border-[#D4A853]/8"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-[900px] mx-auto">
          <motion.div variants={itemVariants}>
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#B0A89E] mb-4">
              01 — The Funnel Signal
            </h2>
            <p className="text-lg text-[#F5F0EB] leading-relaxed max-w-[65ch] font-serif font-light">
              {d.diagnosis?.signal}
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Friction Mechanism */}
      <motion.section
        className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-[900px] mx-auto">
          <motion.div variants={itemVariants}>
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#B0A89E] mb-4">
              02 — The Friction Bottleneck
            </h2>
            <h3 className="text-3xl font-serif text-[#C85C5C] tracking-tight mb-4 font-normal">
              {d.diagnosis?.friction?.mechanism}
            </h3>
            <p className="text-base text-[#B0A89E] leading-relaxed max-w-[60ch] font-light">
              {d.diagnosis?.friction?.rootCause}
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Before / After Slider — dynamic data */}
      <motion.section
        className="py-20 px-6 border-b border-[#D4A853]/8 bg-[#0A0908]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#B0A89E] mb-8">
            Visualization — Interface Overhaul (Drag to Compare)
          </h2>
          <BeforeAfterSlider data={ba} clientName={d.clientName} />
        </div>
      </motion.section>

      {/* 3 Decisions */}
      <motion.section
        className="py-24 px-6 border-b border-[#D4A853]/8"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-[900px] mx-auto">
          <motion.h2
            variants={itemVariants}
            className="font-mono text-xs uppercase tracking-[0.15em] text-[#B0A89E] mb-12"
          >
            03 — Three Strategic Growth Decisions
          </motion.h2>
          <div className="space-y-8">
            {d.diagnosis?.decisions?.map((decision, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="border border-[#D4A853]/8 bg-[#110F0D]/20 p-8 md:p-10 hover:border-[#C85C5C]/20 transition-all duration-500 group rounded"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#7A6F65] border border-[#D4A853]/8 px-2.5 py-0.5 rounded-full">
                    Option {decision.type}
                  </span>
                </div>
                <h3 className="text-2xl font-serif text-[#F5F0EB] mb-4 group-hover:text-[#C85C5C] transition-colors font-medium">
                  {decision.label}
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-[#B0A89E] leading-relaxed">
                    <strong className="text-[#F5F0EB] font-medium font-mono text-xs uppercase tracking-wider mr-2">Action:</strong>
                    {decision.action}
                  </p>
                  <p className="text-sm text-[#B0A89E] leading-relaxed">
                    <strong className="text-[#F5F0EB] font-medium font-mono text-xs uppercase tracking-wider mr-2">Reasoning:</strong>
                    {decision.reasoning}
                  </p>
                  <p className="text-sm text-[#B0A89E] leading-relaxed border-t border-[#D4A853]/8 pt-4 mt-4">
                    <strong className="text-[#7A6F65] font-medium font-mono text-xs uppercase tracking-wider mr-2">Trade-off:</strong>
                    {decision.tradeoff}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <footer className="py-16 px-6 text-center border-t border-[#D4A853]/8 bg-[#0A0908]">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#7A6F65]">
          {d.consultant} · CONFIDENTIAL ARTIFACT · ALL RIGHTS RESERVED
        </p>
      </footer>
    </main>
  );
}

// ── Before/After Slider — now receives dynamic data ──────────────────────────
function BeforeAfterSlider({ data: ba, clientName }: { data: BeforeAfterData; clientName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSliderPosition(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current || e.touches.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSliderPosition(Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100)));
    };
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[450px] bg-[#0A0908] border border-[#D4A853]/8 rounded-lg overflow-hidden select-none"
    >
      {/* Before Panel */}
      <div className="absolute inset-0 w-full h-full p-6 flex flex-col justify-between">
        <div className="w-full h-full flex flex-col justify-between opacity-80 pointer-events-none">
          <div className="flex items-center gap-1.5 border-b border-[#C85C5C]/20 pb-2 mb-2 font-mono text-xs text-[#C85C5C]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C85C5C]/20 border border-[#C85C5C]/50" />
            <span>ORIGINAL FLOW (HIGH FRICTION)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1 py-4">
            <div className="space-y-2">
              <span className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block">Intake Form V1</span>
              <h4 className="font-serif text-lg text-[#F5F0EB]">{ba.beforeTitle}</h4>
              <div className="border border-[#C85C5C]/20 bg-[#C85C5C]/5 p-3 rounded space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {ba.beforeFields.map((val, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="h-1 w-8 bg-[#7A6F65]" />
                      <div className="h-6 bg-[#110F0D] border border-[#C85C5C]/20 rounded flex items-center px-1.5 text-xs text-[#C85C5C]">
                        {val} *
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border border-[#C85C5C]/30 bg-[#C85C5C]/10 p-2 rounded text-xs text-[#C85C5C] font-mono flex items-center gap-2">
                  <span>🔒</span>
                  <span>Credit Card details required for validation.</span>
                </div>
              </div>
            </div>
            <div className="border border-[#D4A853]/8 p-4 rounded bg-[#110F0D]/50 space-y-2 border-l-2 border-[#C85C5C]/40">
              <span className="font-mono text-xs text-[#C85C5C] uppercase tracking-widest block">Cognitive Load</span>
              <p className="text-xs text-[#B0A89E] leading-relaxed">{ba.beforeIssue}</p>
              <div className="font-mono text-xs text-[#C85C5C]">{ba.beforeBounce}</div>
            </div>
          </div>
          <div className="text-xs font-mono text-[#7A6F65] text-right mt-2">
            {clientName} · Baseline Setup Flow
          </div>
        </div>
      </div>

      {/* After Panel */}
      <div
        className="absolute inset-y-0 left-0 h-full overflow-hidden z-20 border-r border-[#D4A853]/30"
        style={{ width: `${sliderPosition}%` }}
      >
        <div
          className="absolute inset-y-0 left-0 h-full p-6 flex flex-col justify-between bg-[#110F0D]"
          style={{ width: containerWidth }}
        >
          <div className="w-full h-full flex flex-col justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 border-b border-[#D4A853]/20 pb-2 mb-2 font-mono text-xs text-[#D4A853]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4A853]/20 border border-[#D4A853]" />
              <span>OPTIMIZED INTERFACE (MENDED FLOW)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1 py-4">
              <div className="space-y-2">
                <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider block">Mended Intake</span>
                <h4 className="font-serif text-lg text-[#F5F0EB]">{ba.afterTitle}</h4>
                <div className="border border-[#D4A853]/20 bg-[#D4A853]/5 p-3 rounded space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#B0A89E] block">Workspace Domain</label>
                    <div className="h-7 bg-[#0A0908] border border-[#D4A853]/20 rounded flex items-center px-2 text-xs text-[#F5F0EB]">
                      {ba.afterDomain}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#5C9A6B] bg-[#5C9A6B]/10 px-2 py-1 rounded border border-[#5C9A6B]/20">
                    <span>✓</span>
                    <span>No credit card required. Config deferred to dashboard.</span>
                  </div>
                </div>
              </div>
              <div className="border border-[#D4A853]/8 p-4 rounded bg-[#0A0908] space-y-2 border-l-2 border-[#D4A853]/40">
                <span className="font-mono text-xs text-[#D4A853] uppercase tracking-widest block">Friction Mended</span>
                <p className="text-xs text-[#B0A89E] leading-relaxed">
                  Subtracted all secondary inputs. User lands on simulated workspace with dummy data immediately. Habit builds, conversion scales.
                </p>
                <div className="font-mono text-xs text-[#5C9A6B]">{ba.afterGain}</div>
              </div>
            </div>
            <div className="text-xs font-mono text-[#B0A89E] text-right mt-2">
              Signal &amp; Friction Design Recommendation
            </div>
          </div>
        </div>
      </div>

      {/* Drag Handle */}
      <div
        className="absolute inset-y-0 z-30 w-1 bg-[#D4A853] cursor-ew-resize group"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#110F0D] border border-[#D4A853] shadow-lg flex items-center justify-center cursor-ew-resize transition-transform group-hover:scale-105 select-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5F0EB" strokeWidth="2.5">
            <path d="m8 18-6-6 6-6M16 6l6 6-6 6" />
          </svg>
        </div>
        <div className="absolute top-4 right-4 pointer-events-none font-mono text-xs uppercase tracking-widest bg-[#110F0D] text-[#D4A853] border border-[#D4A853]/20 px-2.5 py-0.5 rounded shadow">
          After
        </div>
        <div className="absolute top-4 -translate-x-[calc(100%+8px)] pointer-events-none font-mono text-xs uppercase tracking-widest bg-[#0A0908] text-[#C85C5C] border border-[#C85C5C]/20 px-2.5 py-0.5 rounded shadow">
          Before
        </div>
      </div>
    </div>
  );
}
