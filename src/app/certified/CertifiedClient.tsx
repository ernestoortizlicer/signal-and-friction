"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

const springConfig = { type: "spring" as const, stiffness: 100, damping: 18 };

const MODULES = [
  {
    id: "01",
    title: "The Signal & Friction Method™ Core",
    subtitle: "The Diagnostic Paradigm",
    duration: "8 hours · Weeks 1–2",
    format: "Loom walkthroughs + Interactive Framework",
    objectives: [
      "Define the Signal/Friction distinction operationally — not conceptually.",
      "Map any B2B SaaS funnel into Signal Zones and Friction Points using the 5-layer audit protocol.",
      "Apply the Isolation Gate Framework to identify the single highest-leverage intervention point.",
      "Explain why correlation-based audits fail and how causal isolation changes outcomes.",
      "Produce a Friction Hypothesis document indistinguishable from an S&F diagnostic.",
      "Deploy PostHog, Amplitude, and Mixpanel for diagnostic data collection.",
    ],
  },
  {
    id: "02",
    title: "Clinical Diagnostic Application",
    subtitle: "Hands on a real patient",
    duration: "12 hours · Weeks 3–5",
    format: "72-Hour Live Client Simulation",
    objectives: [
      "Conduct a full S&F diagnostic on a B2B SaaS client in 72 hours or less.",
      "Deploy and interpret PostHog session recordings, heatmaps, and funnel analytics for causal isolation.",
      "Produce the complete 3-layer deliverable: Diagnosis + Interface Brief + Executive Cover.",
      "Write a cover email that renders a follow-up call unnecessary.",
      "Scope and price engagements using DWY ($350) or DFY ($2,000) pricing models.",
      "Handle client pushback on a single-finding methodology without defensiveness.",
    ],
  },
  {
    id: "03",
    title: "Case Study Library",
    subtitle: "Deep Reverse Engineering",
    duration: "8 hours · Weeks 6–7",
    format: "5 Annotated Diagnostic Autopsies",
    objectives: [
      "Reverse-engineer 5 real conversion collapses with full diagnostic reasoning.",
      "Identify patterns across client types: SaaS onboarding, enterprise trial, B2B checkout, OTP flows.",
      "Reduce diagnostic time from 72h to under 24h on familiar patterns.",
      "Build your own anonymized case study as a portfolio and sales asset.",
    ],
  },
  {
    id: "04",
    title: "Certification Exam",
    subtitle: "No multiple-choice. Real work.",
    duration: "72-hour window · Weeks 8–9",
    format: "Live Diagnostic Simulation · 3 Documents · 100-Point Rubric",
    objectives: [
      "Receive a real anonymized client brief with funnel data and PostHog export.",
      "Produce 3 documents: Diagnosis (600w) + Intervention Brief (400w) + Executive Cover (200w).",
      "Score ≥75 out of 100 on the S&F grading rubric to receive certification.",
      "Remediation available for scores 60–74 with a new brief. Fail below 60.",
    ],
  },
  {
    id: "05",
    title: "Business Architecture Layer",
    subtitle: "How to run the S&F certified practice",
    duration: "8 hours · Weeks 10–11",
    format: "Loom + Legal Templates + Tax Framework + LinkedIn Playbook",
    objectives: [
      "Structure your practice using the Wyoming LLC + offshore banking model.",
      "Price DWY and DFY engagements with script-level objection handling language.",
      "Apply tax optimization logic to your first $50K in consulting revenue.",
      "Use AI tools as assistants without becoming replaceable by them.",
      "Implement the S&F LinkedIn Sniper Protocol to close your first 3 clients.",
      "Build a 90-day launch plan to reach $8K/month.",
    ],
  },
  {
    id: "06",
    title: "Quarterly Signal Drops",
    subtitle: "Ongoing Education & Recertification",
    duration: "2 hours/quarter · Year-round",
    format: "Async Loom · New Case Studies · Annual Recertification",
    objectives: [
      "1 new friction pattern per quarter — observed in real client work, with data.",
      "1 new anonymized case study added to the library each quarter.",
      "AI tool assessment: which tools help diagnostics and which create false signal.",
      "Annual recertification: submit 1 real diagnostic summary to renew your license.",
    ],
  },
];

const COMPARISON = [
  { dim: "Licensed Methodology", sf: true, reforge: false, cxl: false, wharton: false, hbs: false },
  { dim: "72h Live Diagnostic Exam", sf: true, reforge: false, cxl: false, wharton: false, hbs: false },
  { dim: "Business Model Layer (LLC, Tax, Pricing)", sf: true, reforge: false, cxl: false, wharton: false, hbs: false },
  { dim: "AI-Proofing Protocol", sf: true, reforge: false, cxl: false, wharton: false, hbs: false },
  { dim: "100% Async — No Live Calls Required", sf: true, reforge: false, cxl: false, wharton: false, hbs: false },
  { dim: "Real Client Deliverable Standard", sf: true, reforge: false, cxl: false, wharton: false, hbs: false },
  { dim: "Telemetry Tools (PostHog, Amplitude)", sf: true, reforge: false, cxl: true, wharton: false, hbs: false },
  { dim: "Annual Recertification", sf: true, reforge: false, cxl: false, wharton: false, hbs: false },
  { dim: "Case Study Library", sf: true, reforge: true, cxl: true, wharton: true, hbs: true },
  { dim: "Cohort Community", sf: false, reforge: true, cxl: true, wharton: true, hbs: true },
];

export default function CertifiedClient() {
  const [tier, setTier] = useState<"annual" | "monthly">("annual");
  const [formData, setFormData] = useState({ name: "", email: "", agency: "", website: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        const name = params.get("name") || "";
        const email = params.get("email") || "";
        const agency = params.get("agency") || "";
        const website = params.get("website") || "";
        const selectedTier = (params.get("tier") as "annual" | "monthly") || "annual";

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData({ name, email, agency, website });
        setTier(selectedTier);
        setSubmitted(true);

        const activate = async () => {
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
            await fetch(`${supabaseUrl}/functions/v1/certification-onboarding`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseAnonKey,
                "Authorization": `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({ name, email, agency, website, tier: selectedTier, action: "activate" }),
            });
          } catch (err) {
            console.error("Failed to execute database activation:", err);
          }
        };
        activate();
      }
    }
  }, []);

  // Stripe Payment Links — updated 2026-06-21
  const PAYMENT_LINKS: Record<string, string> = {
    annual:  "https://buy.stripe.com/00wfZhasLaTG2gl9EK5sA0j",  // $4,500/year
    monthly: "https://buy.stripe.com/9B628rcATf9W7AF9EK5sA0k",  // $450/month
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const response = await fetch(`${supabaseUrl}/functions/v1/certification-onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ name: formData.name, email: formData.email, agency: formData.agency, website: formData.website, tier }),
      });
      if (!response.ok) throw new Error("Onboarding Edge Function failed");
      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      console.warn("Edge Function unreachable — routing to Stripe Payment Link:", err);
      const baseLink = PAYMENT_LINKS[tier] || PAYMENT_LINKS.annual;
      window.location.href = `${baseLink}?prefilled_email=${encodeURIComponent(formData.email)}`;
    } finally {
      setLoading(false);
    }
  };

  const CheckIcon = ({ value, gold }: { value: boolean; gold?: boolean }) =>
    value ? (
      <span className={gold ? "text-[#D4A853] font-bold" : "text-[#5C9A6B]"}>✓</span>
    ) : (
      <span className="text-[#3A3530]">—</span>
    );

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] overflow-y-auto relative flex flex-col font-sans">
      <HexGrid />

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#D4A853]/10 bg-[#0A0908]/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 8L8 15L1 8Z" stroke="#D4A853" strokeWidth="1.5" />
          </svg>
          <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.35em] uppercase font-bold">
            S&amp;F Certified™
          </span>
        </div>
        <Link href="/" className="font-mono text-xs text-[#7A6F65] hover:text-[#D4A853] transition-colors tracking-widest uppercase">
          ← Return to Console
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-[1100px] mx-auto w-full px-6 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative z-10">

        {/* Left — Value Proposition */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <span className="font-mono text-xs text-[#D4A853] tracking-[0.4em] uppercase border border-[#D4A853]/25 px-3 py-1 rounded bg-[#D4A853]/5 inline-block">
              Methodology Licensing Program
            </span>
            <h1 className="text-3xl lg:text-[2.6rem] font-bold leading-[1.15] tracking-tight">
              Become a Licensed<br />
              <span className="text-[#D4A853] glow-text">Signal &amp; Friction Certified™</span><br />
              Practitioner.
            </h1>
            <p className="text-sm text-[#B0A89E] leading-relaxed font-mono max-w-lg">
              The only certification where the exam is a real 72-hour client diagnostic — not multiple-choice.
              License the clinical methodology used by top B2B SaaS founders to charge premium fees with telemetry-backed guarantees.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "42h", label: "Curriculum" },
              { value: "5", label: "Deep Case Studies" },
              { value: "72h", label: "Live Exam Window" },
              { value: "$4,500", label: "Per Year" },
            ].map((s, i) => (
              <div key={i} className="border border-[#D4A853]/10 bg-[#110F0D]/60 p-3 rounded text-center">
                <span className="font-serif text-xl font-bold text-[#D4A853] block">{s.value}</span>
                <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>

          {/* 4 Key Differentiators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: "Licensed S&F Method™", desc: "Attach the clinical diagnostic framework to your agency's service offering. Not a course — a methodology license." },
              { title: "72h Live Exam", desc: "The exam is a real client brief with real funnel data. You produce the deliverable. We grade it." },
              { title: "Business Architecture", desc: "Wyoming LLC, Mercury banking, DWY/DFY pricing, LinkedIn outbound, and AI-proofing all included in the curriculum." },
              { title: "Annual Signal Drops", desc: "Quarterly updates with new friction patterns, new case studies, and AI tool assessments. Your license stays current." },
            ].map((b, idx) => (
              <div key={idx} className="border border-[#D4A853]/8 bg-white/[0.01] p-4 rounded space-y-1">
                <span className="text-xs font-serif font-bold text-[#F5F0EB] block">{b.title}</span>
                <p className="text-xs text-[#B0A89E] font-mono leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Pricing & Intake Form */}
        <div className="lg:col-span-5" id="apply">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={springConfig}
                className="border border-[#D4A853]/15 bg-[#0A0908]/95 p-8 rounded glow-border space-y-6"
              >
                <div className="text-center space-y-1.5 border-b border-[#D4A853]/10 pb-4">
                  <h3 className="text-lg font-serif font-bold text-white">License Intake Portal</h3>
                  <p className="text-xs text-[#B0A89E] font-mono uppercase tracking-wider">Select billing parameters</p>
                </div>

                {/* Billing Selector */}
                <div className="space-y-2">
                  <div className="flex bg-[#110F0D]/40 border border-[#D4A853]/8 p-1 rounded-full text-center text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setTier("annual")}
                      className={`flex-1 py-2 rounded-full cursor-pointer transition-all ${tier === "annual" ? "bg-[#D4A853] text-[#0A0908] font-bold" : "text-[#7A6F65] hover:text-white"}`}
                    >
                      Annual ($4,500)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTier("monthly")}
                      className={`flex-1 py-2 rounded-full cursor-pointer transition-all ${tier === "monthly" ? "bg-[#D4A853] text-[#0A0908] font-bold" : "text-[#7A6F65] hover:text-white"}`}
                    >
                      Monthly ($450/mo)
                    </button>
                  </div>
                  {tier === "annual" && (
                    <p className="text-center font-mono text-[10px] text-[#5C9A6B] tracking-wider">
                      ✓ Save $900 vs monthly · Renewal at $2,200 in Year 2
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
                  {[
                    { label: "Full Name", key: "name", type: "text", placeholder: "Ernesto Ortiz" },
                    { label: "Work Email", key: "email", type: "email", placeholder: "ernesto@agency.io" },
                    { label: "Agency / Company Name", key: "agency", type: "text", placeholder: "Divergent Optimization" },
                    { label: "Website URL", key: "website", type: "url", placeholder: "https://divergent-optimization.io" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-[#B0A89E] uppercase tracking-wider block">{field.label}</label>
                      <input
                        required
                        type={field.type}
                        value={formData[field.key as keyof typeof formData]}
                        onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-black/40 border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 rounded text-white placeholder:text-[#3A3530]"
                      />
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#D4A853] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] transition-all hover:bg-[#E8C97A] active:scale-[0.98] disabled:opacity-40 cursor-pointer glow-accent mt-2 rounded"
                  >
                    {loading ? "Routing to Stripe Secure Handshake..." : "Initiate Certification License →"}
                  </button>
                  <p className="text-center text-[10px] text-[#7A6F65] font-mono">
                    Stripe secured · Cancel anytime (monthly) · No calls required
                  </p>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springConfig}
                className="border border-[#5C9A6B]/20 bg-[#0A0908]/95 p-8 rounded glow-border-green space-y-6 text-center"
              >
                <div className="w-12 h-12 rounded-full border-2 border-[#5C9A6B] flex items-center justify-center mx-auto text-xl text-[#5C9A6B] animate-bounce">✓</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-serif font-bold text-white">Payment Confirmed</h3>
                  <p className="text-sm text-[#B0A89E] font-mono leading-relaxed">
                    License activated for <strong className="text-white">{formData.agency}</strong> ({tier === "annual" ? "Annual Plan" : "Monthly Plan"}).
                  </p>
                </div>
                <div className="border border-[#D4A853]/8 bg-[#110F0D]/25 p-4 rounded text-left space-y-3 font-mono text-xs">
                  <span className="text-[#D4A853] font-semibold block uppercase tracking-wider">Automated Onboarding Kit:</span>
                  <p className="text-[#B0A89E] leading-relaxed">
                    Your S&amp;F Certified™ curriculum access, exam brief protocol, and badge vector assets have been dispatched to{" "}
                    <strong className="text-[#F5F0EB]">{formData.email}</strong>.
                  </p>
                  <a
                    href="/sf_logo.png"
                    download
                    className="inline-block py-2 px-3 border border-[#D4A853]/30 text-[#D4A853] rounded hover:bg-[#D4A853]/5 text-center w-full uppercase tracking-wider"
                  >
                    Download S&amp;F Certified™ Badge Asset
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="w-full py-2.5 border border-[#7A6F65] text-xs text-[#B0A89E] hover:text-white transition-colors cursor-pointer rounded"
                >
                  Return to License Form
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Curriculum: 6 Expandable Module Cards ── */}
      <section className="max-w-[1100px] mx-auto w-full px-6 py-16 border-t border-[#D4A853]/8 relative z-10 space-y-8">
        <div className="space-y-2">
          <span className="font-mono text-xs text-[#D4A853] tracking-[0.3em] uppercase block">World-Class Curriculum</span>
          <h2 className="text-2xl font-bold font-serif text-white tracking-tight">6 Modules · 42 Hours · 12 Weeks</h2>
          <p className="text-xs text-[#7A6F65] font-mono">Click any module to expand learning objectives.</p>
        </div>

        <div className="space-y-3">
          {MODULES.map((mod) => (
            <motion.div
              key={mod.id}
              layout
              className="border border-[#D4A853]/10 bg-[#110F0D]/40 rounded overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                className="w-full text-left p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span className="font-mono text-xs text-[#D4A853] font-bold mt-0.5 shrink-0">M{mod.id}</span>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-serif font-bold text-[#F5F0EB]">{mod.title}</h4>
                    <p className="font-mono text-xs text-[#7A6F65] italic">{mod.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:block text-right">
                    <span className="font-mono text-[10px] text-[#B0A89E] block">{mod.duration}</span>
                    <span className="font-mono text-[10px] text-[#5C9A6B] block">{mod.format}</span>
                  </div>
                  <span className={`text-[#D4A853] font-mono text-sm transition-transform duration-200 ${expandedModule === mod.id ? "rotate-45" : ""}`}>+</span>
                </div>
              </button>

              <AnimatePresence>
                {expandedModule === mod.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 border-t border-[#D4A853]/8 space-y-4">
                      <div className="flex gap-4 flex-wrap">
                        <span className="font-mono text-[10px] text-[#B0A89E] border border-[#D4A853]/10 px-2 py-0.5 rounded">{mod.duration}</span>
                        <span className="font-mono text-[10px] text-[#5C9A6B] border border-[#5C9A6B]/15 px-2 py-0.5 rounded">{mod.format}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="font-mono text-[10px] text-[#D4A853] uppercase tracking-widest block">Learning Objectives</span>
                        <ul className="space-y-1.5">
                          {mod.objectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2 font-mono text-xs text-[#B0A89E] leading-relaxed">
                              <span className="text-[#D4A853] mt-0.5 shrink-0">→</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="max-w-[1100px] mx-auto w-full px-6 py-16 border-t border-[#D4A853]/8 relative z-10 space-y-8">
        <div className="space-y-2">
          <span className="font-mono text-xs text-[#D4A853] tracking-[0.3em] uppercase block">Benchmark Analysis</span>
          <h2 className="text-2xl font-bold font-serif text-white tracking-tight">S&amp;F Certified™ vs. The Market</h2>
          <p className="text-xs text-[#7A6F65] font-mono">Reforge · CXL · Wharton Executive Education · HBS Online</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs border border-[#D4A853]/10 rounded overflow-hidden">
            <thead>
              <tr className="border-b border-[#D4A853]/10 bg-[#110F0D]/60">
                <th className="text-left py-3 px-4 text-[#7A6F65] uppercase tracking-wider font-normal">Dimension</th>
                <th className="py-3 px-3 text-[#D4A853] font-bold uppercase tracking-wider text-center">S&amp;F™</th>
                <th className="py-3 px-3 text-[#7A6F65] font-normal uppercase tracking-wider text-center">Reforge</th>
                <th className="py-3 px-3 text-[#7A6F65] font-normal uppercase tracking-wider text-center">CXL</th>
                <th className="py-3 px-3 text-[#7A6F65] font-normal uppercase tracking-wider text-center">Wharton</th>
                <th className="py-3 px-3 text-[#7A6F65] font-normal uppercase tracking-wider text-center">HBS</th>
              </tr>
              <tr className="border-b border-[#D4A853]/8 bg-[#110F0D]/40">
                <th className="text-left py-2 px-4 text-[#7A6F65] font-normal">Price</th>
                <th className="py-2 px-3 text-[#D4A853] font-bold text-center">$4,500/yr</th>
                <th className="py-2 px-3 text-[#7A6F65] font-normal text-center">$2,995/yr</th>
                <th className="py-2 px-3 text-[#7A6F65] font-normal text-center">$1,999/yr</th>
                <th className="py-2 px-3 text-[#7A6F65] font-normal text-center">$4,500–8K</th>
                <th className="py-2 px-3 text-[#7A6F65] font-normal text-center">$1,500–3K</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[#D4A853]/5 hover:bg-white/[0.008] transition-colors"
                >
                  <td className="py-3 px-4 text-[#B0A89E]">{row.dim}</td>
                  <td className="py-3 px-3 text-center text-base"><CheckIcon value={row.sf} gold /></td>
                  <td className="py-3 px-3 text-center text-base"><CheckIcon value={row.reforge} /></td>
                  <td className="py-3 px-3 text-center text-base"><CheckIcon value={row.cxl} /></td>
                  <td className="py-3 px-3 text-center text-base"><CheckIcon value={row.wharton} /></td>
                  <td className="py-3 px-3 text-center text-base"><CheckIcon value={row.hbs} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border border-[#D4A853]/15 bg-[#D4A853]/3 p-5 rounded font-mono text-xs space-y-1">
          <span className="text-[#D4A853] font-bold uppercase tracking-wider">The Irreplaceable Differentiator</span>
          <p className="text-[#B0A89E] leading-relaxed">
            Reforge teaches <em>frameworks</em>. CXL teaches <em>tactics</em>. Wharton teaches <em>theory</em>. HBS teaches <em>narrative</em>.
            <br />
            <strong className="text-white">S&amp;F Certified™ teaches precision.</strong> The only program where the exam is a real client deliverable and the business model is part of the curriculum.
          </p>
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section className="max-w-[1100px] mx-auto w-full px-6 py-12 border-t border-[#D4A853]/8 relative z-10">
        <div className="border border-[#D4A853]/20 bg-[#110F0D]/60 p-8 rounded flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-bold text-white">Ready to license the methodology?</h3>
            <p className="font-mono text-xs text-[#B0A89E]">$4,500/year · 42h curriculum · 72h live exam · No calls ever</p>
          </div>
          <a
            href="#apply"
            className="shrink-0 px-8 py-3 bg-[#D4A853] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded hover:bg-[#E8C97A] transition-all glow-accent"
          >
            Apply for License →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] py-6 px-6 text-center text-xs font-mono text-[#7A6F65] relative z-10">
        © 2026 Signal &amp; Friction Method™ Certified. All rights reserved.
      </footer>
    </main>
  );
}
