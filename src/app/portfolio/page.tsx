"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

// Illustrative SAMPLE diagnostics only — fictional companies (Acme Corp,
// Growthly, PayFlux, StartupHub), not real clients, not real results.
// Every field below is pulled directly from the real sample deliverable
// JSON in public/deliverables/ — the evidence tier counts are computed
// from each file's actual `evidence` array, not invented. No percentage,
// no "verified" badge, no named real company anywhere on this page.
const ILLUSTRATIVE_SAMPLES = [
  {
    clientKey: "acme-corp",
    client: "Acme Corp",
    tag: "Pricing Page",
    mechanism: "Cognitive Overload — Choice Paralysis",
    evidenceSummary: "4 measured · 1 modeled · 2 pending",
    decision: "Collapse pricing from 4 plans to 2 visible tiers.",
  },
  {
    clientKey: "growthly",
    client: "Growthly",
    tag: "Onboarding Flow",
    mechanism: "Context-Switch Cascade — Pre-Value Integration Gate",
    evidenceSummary: "2 measured · 1 modeled · 3 pending",
    decision: "Add a demo-data bypass at the integration step.",
  },
  {
    clientKey: "payflux",
    client: "PayFlux",
    tag: "Pricing Page",
    mechanism: "Pricing Paralysis via Feature Overload",
    evidenceSummary: "4 measured · 1 modeled · 2 pending",
    decision: "Collapse to 3 plans with 5 features each.",
  },
  {
    clientKey: "startuphub",
    client: "StartupHub",
    tag: "Checkout Page",
    mechanism: "Trust Deficit at the Financial Gate",
    evidenceSummary: "6 measured · 1 modeled · 2 pending",
    decision: "Add trust signals above and below the payment button.",
  },
];

export default function PublicPortfolio() {
  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] overflow-x-hidden relative flex flex-col justify-between font-sans">
      <HexGrid />

      {/* Background Grids */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.02) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#D4A853]/10 bg-[#0A0908]/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 8L8 15L1 8Z" stroke="#D4A853" strokeWidth="1.5" />
          </svg>
          <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.35em] uppercase font-bold">
            S&amp;F Method Walkthrough
          </span>
        </div>
        <Link href="/" className="font-mono text-xs text-[#7A6F65] hover:text-[#D4A853] transition-colors tracking-widest uppercase">
          ← Home
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-[1000px] mx-auto w-full px-6 py-16 relative z-10 space-y-8">
        <div className="space-y-4 text-center">
          <span className="text-[#D4A853] text-xs tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
            How It Works
          </span>
          <h1 className="text-3xl lg:text-5xl font-serif text-white tracking-tight">
            The method, <span className="text-[#D4A853] glow-text">not a sales pitch</span>.
          </h1>
          <p className="text-sm text-[#B0A89E] font-mono max-w-lg mx-auto leading-relaxed">
            Four sample diagnostics showing how we isolate one friction mechanism, tier every claim as measured, modeled, or pending, and land on a single decision — no invented numbers, no client we haven&apos;t actually worked with.
          </p>
        </div>

        <div className="border border-[#D4A853]/25 bg-[#D4A853]/5 rounded-xl px-5 py-4 text-center">
          <p className="text-xs font-mono text-[#D4A853] leading-relaxed">
            <strong>These are illustrative samples, not client results.</strong> Acme Corp, Growthly, PayFlux, and StartupHub are fictional companies used to demonstrate the method. No percentages below are outcomes — they&apos;re evidence-tier counts, pulled directly from each sample&apos;s own data.
          </p>
        </div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {ILLUSTRATIVE_SAMPLES.map((sample, idx) => (
            <motion.div
              key={sample.clientKey}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="border border-[#D4A853]/8 bg-[#0A0908]/80 backdrop-blur-md p-6 rounded space-y-4 relative overflow-hidden group hover:border-[#D4A853]/30 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-[#D4A853]/5 pointer-events-none transition-all group-hover:to-[#D4A853]/15" />

              <div className="flex justify-between items-start border-b border-[#D4A853]/8 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-white font-mono">{sample.client}</h3>
                  <span className="text-xs font-mono text-[#B0A89E] uppercase tracking-wider block">{sample.tag}</span>
                </div>
                <span className="font-mono text-[9px] font-bold uppercase text-[#D4A853] border border-[#D4A853]/30 px-2 py-1 rounded bg-[#D4A853]/10 shrink-0">
                  Illustrative Sample
                </span>
              </div>

              <div>
                <span className="text-xs font-mono text-[#7A6F65] uppercase tracking-wider block mb-1">Friction Mechanism</span>
                <p className="text-sm text-[#F5F0EB] font-mono leading-relaxed">{sample.mechanism}</p>
              </div>

              <div>
                <span className="text-xs font-mono text-[#7A6F65] uppercase tracking-wider block mb-1">The Decision</span>
                <p className="text-sm text-[#B0A89E] font-mono leading-relaxed">{sample.decision}</p>
              </div>

              <div className="flex justify-between items-center text-xs font-mono text-[#7A6F65] pt-2 border-t border-white/[0.03]">
                <span className="text-[#5C9A6B]">{sample.evidenceSummary}</span>
                <Link href={`/deliverable/${sample.clientKey}`} className="text-[#D4A853] hover:underline">
                  See the full sample →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Guarantee CTA */}
        <div className="border border-[#D4A853]/15 bg-[#0A0908]/95 p-8 rounded text-center space-y-4">
          <h3 className="text-xl font-bold font-serif text-white">Backed by the S&amp;F Specificity Guarantee</h3>
          <p className="text-sm text-[#B0A89E] font-mono max-w-md mx-auto leading-relaxed">
            If the diagnosis doesn&apos;t surface a friction point specific to your product — something we observed in your actual funnel, not generic advice — you don&apos;t pay.
          </p>
          <div className="pt-2">
            <Link href="/" className="inline-block py-3 px-6 bg-[#D4A853] text-[#0A0908] font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#E8C97A] transition-all">
              Initiate Funnel Diagnostic
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] py-6 px-6 text-center text-xs font-mono text-[#7A6F65] relative z-10">
        © 2026 Signal &amp; Friction Method™. All rights reserved.
      </footer>
    </main>
  );
}
