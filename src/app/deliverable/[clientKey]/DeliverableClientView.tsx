"use client";

import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { DeliverableData } from "../fallback";

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

export default function DeliverableClientView({ data }: { data: DeliverableData }) {
  const d = data;
  const isMicrodosing = d.segment === "microdosing";

  // Microdosing States
  const [checklist, setChecklist] = useState(d.checklist || []);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(d.learningModules?.[0]?.id || null);

  const toggleCheck = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const doneCount = checklist.filter(c => c.done).length;
  const totalCount = checklist.length;
  const dynamicProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const activeModule = d.learningModules?.find(m => m.id === selectedModuleId);

  if (isMicrodosing) {
    return (
      <main className="min-h-screen bg-[#070b19] text-[#F5F0EB] overflow-x-hidden font-sans">
        {/* Nav */}
        <nav className="w-full fixed top-0 z-50 bg-[#070b19]/80 backdrop-blur-xl border-b border-[#D4A853]/10">
          <div className="max-w-[1000px] mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-serif text-[#D4A853] text-lg tracking-tight font-bold glow-text">
                Signal &amp; Friction
              </span>
              <span className="text-xs text-[#6A5F55] font-mono">/ Client Portal</span>
            </div>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[#D4A853]/60 border border-[#D4A853]/25 px-3 py-1 rounded bg-[#D4A853]/5">
              Autonomy Track
            </span>
          </div>
        </nav>

        {/* Hero */}
        <motion.section 
          className="pt-28 pb-12 px-6 border-b border-[#D4A853]/10 bg-gradient-to-b from-[#09152b]/30 to-transparent"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#D4A853]">
                  Methodology &amp; Handover
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]/30" />
                <span className="font-mono text-[0.6rem] text-[#6A5F55]">
                  {d.date}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#f8fafc]">
                {d.clientName} Optimization Console
              </h1>
              <p className="text-sm text-[#94a3b8] leading-relaxed max-w-[60ch]">
                Welcome to your self-serve optimization workspace. Analyze your custom diagnostic Loom, master the learning modules, and complete the checklist to resolve your conversion friction.
              </p>
            </div>

            <div className="space-y-4">
              {/* Progress Card */}
              <div className="bg-[#110F0D]/60 border border-[#D4A853]/15 p-5 rounded-lg space-y-4 glow-border">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#94a3b8]">Autonomy Progress</span>
                  <span className="text-[#D4A853] font-bold">{dynamicProgress}%</span>
                </div>
                <div className="w-full bg-[#2A2218] h-2 rounded-full overflow-hidden">
                  <motion.div 
                    className="bg-[#D4A853] h-full"
                    animate={{ width: `${dynamicProgress}%` }}
                    transition={{ type: "spring", stiffness: 80 }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[0.55rem] text-[#6A5F55]">
                  <span>{doneCount} of {totalCount} completed</span>
                  <span>{dynamicProgress === 100 ? "Ready for Handover" : "In Progress"}</span>
                </div>
              </div>

              {/* Founder Fatigue Tracker Card */}
              <div className="bg-[#110F0D]/60 border border-[#EF4444]/15 p-5 rounded-lg space-y-3 glow-border-red">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#94a3b8]">Founder Mental Capacity</span>
                  <span className="text-[#EF4444] font-bold">85%</span>
                </div>
                <div className="w-full bg-[#2A2218] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#EF4444] h-full w-[85%]" />
                </div>
                <div className="font-mono text-[0.52rem] text-[#807870] leading-relaxed">
                  Status: Healthy runway. Cognitive fatigue score: 15/100. Adherence probability high. Managed by the Founder&apos;s Mind Architect.
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Diagnostic Loom */}
        <section className="py-12 px-6 border-b border-[#D4A853]/5">
          <div className="max-w-[1000px] mx-auto">
            <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#D4A853] mb-5">
              01 — Playbook Video Walkthrough
            </h2>
            <div className="aspect-video bg-[#110F0D] border border-[#D4A853]/10 rounded-lg overflow-hidden relative glow-border">
              {d.loomUrl && !d.loomUrl.includes("placeholder") ? (
                <iframe
                  src={d.loomUrl.includes('embed') ? d.loomUrl : d.loomUrl.replace('/share/', '/embed/')}
                  frameBorder="0"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#091124] pointer-events-none">
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-[#D4A853]/10 flex items-center justify-center mx-auto border border-[#D4A853]/20 animate-pulse">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <polygon points="5 3 19 12 5 21 5 3" fill="#D4A853" />
                      </svg>
                    </div>
                    <p className="font-mono text-[0.6rem] text-[#D4A853]/60 uppercase tracking-widest">
                      Loom Video Briefing Active
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Modules & Checklist */}
        <section className="py-12 px-6 max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left: Interactive Checklist */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#D4A853]">
              02 — Implementation Checklist
            </h2>
            <div className="space-y-3 bg-[#110F0D]/40 border border-[#D4A853]/5 p-5 rounded-lg">
              {checklist.map(item => (
                <div 
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`flex items-start gap-4 p-4 border rounded transition-all duration-300 cursor-pointer ${
                    item.done 
                      ? "bg-[#092c30]/20 border-[#22c55e]/25" 
                      : "bg-[#110F0D]/60 border-[#D4A853]/10 hover:border-[#D4A853]/30"
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.done ? "bg-[#22c55e] border-[#22c55e]" : "border-[#D4A853]/40"
                  }`}>
                    {item.done && <span className="text-[0.6rem] text-[#0A0908] font-bold">✓</span>}
                  </div>
                  <div className="space-y-1 select-none">
                    <p className={`text-xs font-mono font-medium ${item.done ? "line-through text-[#6A5F55]" : "text-[#f1f5f9]"}`}>
                      {item.task}
                    </p>
                    <p className="text-[0.65rem] text-[#94a3b8] leading-relaxed">
                      {item.tip}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Learning Modules */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#D4A853]">
              03 — Learning Curriculum
            </h2>
            <div className="space-y-2">
              {d.learningModules?.map(mod => (
                <div 
                  key={mod.id}
                  onClick={() => setSelectedModuleId(mod.id)}
                  className={`p-4 border transition-all duration-300 cursor-pointer rounded text-left ${
                    selectedModuleId === mod.id
                      ? "bg-[#D4A853]/5 border-[#D4A853]/30"
                      : "bg-[#110F0D]/30 border-[#D4A853]/5 hover:border-[#D4A853]/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[0.55rem] text-[#D4A853]/80 uppercase tracking-widest">
                      {mod.title}
                    </span>
                    {mod.completed && (
                      <span className="font-mono text-[0.5rem] uppercase tracking-wider text-[#22c55e] bg-[#22c55e]/10 px-1.5 py-0.5 rounded">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="text-[0.7rem] text-[#94a3b8] leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Display Module Detail */}
            {activeModule && (
              <div className="border border-[#D4A853]/15 bg-[#09152d]/40 p-5 rounded-lg space-y-3 mt-4 animate-pulse-slow">
                <span className="font-mono text-[0.5rem] text-[#D4A853]/40 tracking-wider uppercase block">
                  Module Summary &amp; Insight
                </span>
                <h4 className="text-xs font-bold font-mono text-[#f1f5f9]">{activeModule.title}</h4>
                <p className="text-[0.68rem] text-[#94a3b8] leading-relaxed font-mono">
                  {activeModule.content}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-[#D4A853]/10 text-center bg-[#050814] mt-16">
          <p className="font-mono text-[0.55rem] tracking-[0.15em] text-[#6A5F55]">
            {d.consultant} · CONFIDENTIAL CUSTOMER HUB · ALL RIGHTS RESERVED
          </p>
        </footer>
      </main>
    );
  }

  // Segment A: High-Ticket / Concierge View
  return (
    <main className="min-h-screen bg-[#0A0908] text-[#B8B0A8] overflow-x-hidden grain">
      {/* Minimal Nav */}
      <nav className="w-full fixed top-0 z-50 bg-[#0A0908]/80 backdrop-blur-xl border-b border-[#D4A853]/8">
        <div className="max-w-[900px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-serif text-[#F5F0EB] text-lg tracking-tight">
            Signal &amp; Friction
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[#5A524A] border border-[#D4A853]/8 px-3 py-0.5 rounded">
            Confidential Diagnostic Portal
          </span>
        </div>
      </nav>

      {/* Header */}
      <motion.section
        className="pt-28 pb-16 px-6 border-b border-[#D4A853]/8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className="max-w-[900px] mx-auto">
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[#807870]">
              Revenue Friction Diagnostic
            </span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[#5A524A]">
              {d.date}
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl font-serif text-[#F5F0EB] tracking-tight leading-[1.05] mb-6"
          >
            {d.clientName}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-[#807870] max-w-[55ch] leading-relaxed font-light"
          >
            This dashboard displays your custom Signal &amp; Friction diagnostic brief. Below is the clinical breakdown of your funnel signal, the dominant cognitive friction mechanism, and three strategic decisions.
          </motion.p>

          {/* S&F Guarantee Monitor */}
          <motion.div 
            variants={itemVariants}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 border border-[#D4A853]/8 bg-[#121110]/60 p-5 rounded select-none"
          >
            <div className="space-y-1">
              <div className="font-mono text-[0.5rem] text-[#5A524A] uppercase tracking-wider">Guarantee Status</div>
              <div className="font-serif text-[#F5F0EB] text-xs font-semibold">20% Growth Guarantee Active</div>
            </div>
            <div className="space-y-1">
              <div className="font-mono text-[0.5rem] text-[#5A524A] uppercase tracking-wider">Telemetry Validation</div>
              <div className="font-mono text-[0.58rem] text-[#22C55E] font-semibold">✓ Traffic &amp; Baseline Confirmed</div>
            </div>
            <div className="space-y-1">
              <div className="font-mono text-[0.5rem] text-[#5A524A] uppercase tracking-wider">Testing Runway</div>
              <div className="font-mono text-[0.58rem] text-[#D4A853] font-bold">23 Days Remaining</div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Loom Video Embed */}
      <motion.section
        className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#121110]/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#807870] mb-6">
            Video Walkthrough
          </h2>
          <div className="aspect-video bg-[#1A1816] border border-[#D4A853]/8 rounded-lg overflow-hidden relative glow-accent">
            {d.loomUrl && !d.loomUrl.includes("placeholder") ? (
              <iframe
                src={d.loomUrl.includes('embed') ? d.loomUrl : d.loomUrl.replace('/share/', '/embed/')}
                frameBorder="0"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1A1816]/80 pointer-events-none">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#B85C38]/10 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <polygon points="5 3 19 12 5 21 5 3" fill="#B85C38" />
                    </svg>
                  </div>
                  <p className="font-mono text-xs text-[#5A524A] uppercase tracking-wider">
                    Loom video briefing loading...
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
            <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#807870] mb-4">
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
        className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#121110]/40"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-[900px] mx-auto">
          <motion.div variants={itemVariants}>
            <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#807870] mb-4">
              02 — The Friction Bottleneck
            </h2>
            <h3 className="text-3xl font-serif text-[#B85C38] tracking-tight mb-4 font-normal">
              {d.diagnosis?.friction?.mechanism}
            </h3>
            <p className="text-base text-[#B8B0A8] leading-relaxed max-w-[60ch] font-light">
              {d.diagnosis?.friction?.rootCause}
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Before / After Slider Section */}
      <motion.section
        className="py-20 px-6 border-b border-[#D4A853]/8 bg-[#0d0c0b]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#807870] mb-8">
            Visualization — Interface Overhaul (Drag to Compare)
          </h2>
          <BeforeAfterSlider />
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
            className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#807870] mb-12"
          >
            03 — Three Strategic Growth Decisions
          </motion.h2>

          <div className="space-y-8">
            {d.diagnosis?.decisions?.map((decision, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="border border-[#D4A853]/8 bg-[#121110]/20 p-8 md:p-10 hover:border-[#B85C38]/20 transition-all duration-500 group rounded"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[#5A524A] border border-[#D4A853]/8 px-2.5 py-0.5 rounded-full">
                    Option {decision.type}
                  </span>
                </div>
                <h3 className="text-2xl font-serif text-[#F5F0EB] mb-4 group-hover:text-[#D4764E] transition-colors font-medium">
                  {decision.label}
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-[#B8B0A8] leading-relaxed">
                    <strong className="text-[#F5F0EB] font-medium font-mono text-[0.7rem] uppercase tracking-wider mr-2">Action:</strong>{" "}
                    {decision.action}
                  </p>
                  <p className="text-sm text-[#B8B0A8] leading-relaxed">
                    <strong className="text-[#F5F0EB] font-medium font-mono text-[0.7rem] uppercase tracking-wider mr-2">Reasoning:</strong>{" "}
                    {decision.reasoning}
                  </p>
                  <p className="text-sm text-[#807870] leading-relaxed border-t border-[#D4A853]/8 pt-4 mt-4">
                    <strong className="text-[#5A524A] font-medium font-mono text-[0.7rem] uppercase tracking-wider mr-2">Trade-off:</strong>{" "}
                    {decision.tradeoff}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-16 px-6 text-center border-t border-[#D4A853]/8 bg-[#0A0908]">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[#5A524A]">
          {d.consultant} · CONFIDENTIAL ARTIFACT · ALL RIGHTS RESERVED
        </p>
      </footer>
    </main>
  );
}

function BeforeAfterSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 to 100)
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMoveWindow = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    };
    
    const handleTouchMoveWindow = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current || e.touches.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMoveWindow);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMoveWindow);
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMoveWindow);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMoveWindow);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[450px] bg-[#0A0908] border border-[#D4A853]/8 rounded-lg overflow-hidden select-none"
    >
      {/* Before Panel (Background) */}
      <div className="absolute inset-0 w-full h-full p-6 flex flex-col justify-between">
        {/* Before Content */}
        <div className="w-full h-full flex flex-col justify-between opacity-80 pointer-events-none">
          {/* Simulated Browser chrome */}
          <div className="flex items-center gap-1.5 border-b border-[#D4A853]/8 pb-2 mb-2 font-mono text-[0.6rem] text-red-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-950 border border-red-900/50" />
            <span>ORIGINAL FLOW (HIGH FRICTION)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1 py-4">
            {/* Cluttered onboarding checklist */}
            <div className="space-y-2">
              <span className="font-mono text-[0.55rem] text-[#5A524A] uppercase tracking-wider block">Intake Form V1</span>
              <h4 className="font-serif text-lg text-[#F5F0EB]">Verify Billing &amp; Setup Server</h4>
              <div className="border border-red-950/20 bg-red-950/5 p-3 rounded space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {["Phone Number", "Company Size", "Industry Type", "CRM Version", "AWS Region", "Billing Email"].map((val, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="h-1 w-8 bg-[#5A524A]" />
                      <div className="h-6 bg-[#121110] border border-red-900/20 rounded flex items-center px-1.5 text-[0.55rem] text-red-400">
                        {val} *
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border border-red-900/30 bg-red-900/10 p-2 rounded text-[0.55rem] text-red-400 font-mono flex items-center gap-2">
                  <span>🔒</span>
                  <span>Credit Card details required for validation.</span>
                </div>
              </div>
            </div>

            {/* Diagnostic callout before */}
            <div className="border border-[#D4A853]/8 p-4 rounded bg-[#121110]/50 space-y-2 border-l-2 border-red-800/60">
              <span className="font-mono text-[0.55rem] text-red-400 uppercase tracking-widest block">Cognitive load</span>
              <p className="text-[0.7rem] text-[#807870] leading-relaxed">
                Users are forced to solve 6 separate decision variables, estimate billing tiers, and integrate databases before seeing the dashboard.
              </p>
              <div className="font-mono text-[0.6rem] text-red-400">
                Bounce Probability: ~88%
              </div>
            </div>
          </div>

          <div className="text-[0.55rem] font-mono text-[#5A524A] text-right mt-2">
            Acme Corp Portal · Baseline Setup Flow
          </div>
        </div>
      </div>

      {/* After Panel (Revealed Slide Overlay) */}
      <div 
        className="absolute inset-y-0 left-0 h-full overflow-hidden z-20 border-r border-[#B85C38]/20"
        style={{ width: `${sliderPosition}%` }}
      >
        {/* Child with fixed container width to prevent squishing */}
        <div 
          className="absolute inset-y-0 left-0 h-full p-6 flex flex-col justify-between bg-[#121110]"
          style={{ width: containerWidth }}
        >
          {/* After Content */}
          <div className="w-full h-full flex flex-col justify-between pointer-events-none">
            {/* Simulated Browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-[#B85C38]/20 pb-2 mb-2 font-mono text-[0.6rem] text-[#B85C38]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B85C38]/20 border border-[#B85C38]" />
              <span>OPTIMIZED INTERFACE (MENDED FLOW)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1 py-4">
              {/* Clean single-click onboarding */}
              <div className="space-y-2">
                <span className="font-mono text-[0.55rem] text-[#807870] uppercase tracking-wider block">Mended Intake</span>
                <h4 className="font-serif text-lg text-[#F5F0EB]">Access Your Workspace</h4>
                <div className="border border-[#B85C38]/20 bg-[#B85C38]/5 p-3 rounded space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[0.55rem] text-[#807870] block">Workspace Domain</label>
                    <div className="h-7 bg-[#1A1816] border border-[#B85C38]/30 rounded flex items-center px-2 text-xs text-[#F5F0EB]">
                      acme.signal-and-friction.app
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[0.55rem] text-emerald-400 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-950/30">
                    <span>✓</span>
                    <span>No credit card required. Config deferred to dashboard.</span>
                  </div>
                </div>
              </div>

              {/* Diagnostic callout after */}
              <div className="border border-[#D4A853]/8 p-4 rounded bg-[#1A1816] space-y-2 border-l-2 border-[#B85C38]">
                <span className="font-mono text-[0.55rem] text-[#B85C38] uppercase tracking-widest block">Friction Mended</span>
                <p className="text-[0.7rem] text-[#807870] leading-relaxed">
                  Subtracted all secondary inputs. User lands on simulated workspace with dummy data immediately. Habit builds, conversion scales.
                </p>
                <div className="font-mono text-[0.6rem] text-emerald-400">
                  Calculated Conversion Gain: +350%
                </div>
              </div>
            </div>

            <div className="text-[0.55rem] font-mono text-[#807870] text-right mt-2">
              Signal &amp; Friction Design Recommendation
            </div>
          </div>
        </div>
      </div>

      {/* Drag Slider Handle */}
      <div 
        className="absolute inset-y-0 z-30 w-1 bg-[#B85C38] cursor-ew-resize group"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#121110] border border-[#B85C38] shadow-lg flex items-center justify-center cursor-ew-resize transition-transform group-hover:scale-105 select-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5F0EB" strokeWidth="2.5">
            <path d="m8 18-6-6 6-6M16 6l6 6-6 6" />
          </svg>
        </div>
        {/* Label badges */}
        <div className="absolute top-4 right-4 pointer-events-none font-mono text-[0.55rem] uppercase tracking-widest bg-[#121110] text-[#B85C38] border border-[#B85C38]/20 px-2.5 py-0.5 rounded shadow">
          After
        </div>
        <div className="absolute top-4 -translate-x-[calc(100%+8px)] pointer-events-none font-mono text-[0.55rem] uppercase tracking-widest bg-[#0A0908] text-red-400 border border-red-900/20 px-2.5 py-0.5 rounded shadow">
          Before
        </div>
      </div>
    </div>
  );
}
