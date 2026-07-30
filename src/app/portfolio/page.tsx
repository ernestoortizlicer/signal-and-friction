"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

// Illustrative SAMPLE diagnostics only — fictional companies (Acme Corp,
// Growthly, PayFlux, StartupHub), not real clients, not real results.
// Every field below traces to the real sample deliverable JSON in
// public/deliverables/ — the evidence tier counts are computed from each
// file's actual `evidence` array, and every sharpened "friction"/"decision"
// line paraphrases that same file's real signal/decision text (the ~48 and
// ~110 data-point counts are the real numbers stated there, not invented).
// No percentage, no "verified" badge, no named real company anywhere here.
const ILLUSTRATIVE_SAMPLES = [
  {
    clientKey: "acme-corp",
    client: "Acme Corp",
    tag: "Pricing Page",
    friction: "4 plans. ~48 things to compare before anyone can choose. That's not a pricing page, that's a puzzle.",
    decision: "Cut it to 2 visible tiers. Hide the rest behind a sales conversation.",
    evidenceSummary: "4 measured · 1 modeled · 2 pending",
  },
  {
    clientKey: "growthly",
    client: "Growthly",
    tag: "Onboarding Flow",
    friction: "Users have to leave the product, fetch credentials, and come back — before they've seen a single result.",
    decision: "Let them skip the setup. Show value on borrowed data first, ask for the real integration after.",
    evidenceSummary: "2 measured · 1 modeled · 3 pending",
  },
  {
    clientKey: "payflux",
    client: "PayFlux",
    tag: "Pricing Page",
    friction: "5 plans. ~110 line items. For a payments product, that's a lot to ask someone to trust before they've trusted you with their money.",
    decision: "3 plans. 5 features each. Enterprise doesn't need to be visible — it needs to be earned.",
    evidenceSummary: "4 measured · 1 modeled · 2 pending",
  },
  {
    clientKey: "startuphub",
    client: "StartupHub",
    tag: "Checkout Page",
    friction: "No refund copy. No security badge. No testimonial. All missing at the exact moment someone's handing over a card number.",
    decision: "Put the guarantee, the badge, and one real testimonial exactly where the hesitation happens.",
    evidenceSummary: "6 measured · 1 modeled · 2 pending",
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
          ← Back home
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-[1000px] mx-auto w-full px-6 py-16 relative z-10 space-y-8">
        <div className="space-y-4 text-center">
          <span className="text-[#D4A853] text-xs tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
            The Honest Version
          </span>
          <h1 className="text-2xl lg:text-4xl font-serif text-white tracking-tight leading-snug">
            Everyone else shows you logos and percentages.
            <br />
            <span className="text-[#D4A853] glow-text">Most of them are made up.</span>
          </h1>
          <p className="text-sm text-[#B0A89E] font-mono max-w-lg mx-auto leading-relaxed">
            We&apos;d rather show you how we actually think.
          </p>
        </div>

        <div className="border border-[#D4A853]/25 bg-[#D4A853]/5 rounded-xl px-5 py-4 text-center">
          <p className="text-xs font-mono text-[#D4A853] leading-relaxed">
            <strong>Acme Corp, Growthly, PayFlux, and StartupHub aren&apos;t real clients</strong> — they&apos;re fictional, built to show the method. The numbers below aren&apos;t results. They&apos;re evidence counts: what we measured, what we modeled, what&apos;s still pending your data. That&apos;s the whole point — we don&apos;t skip that part.
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
                <span className="text-xs font-mono text-[#7A6F65] uppercase tracking-wider block mb-1">The Friction</span>
                <p className="text-sm text-[#F5F0EB] font-mono leading-relaxed">{sample.friction}</p>
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
              Get Your Diagnostic →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] py-6 px-6 text-center text-xs font-mono text-[#7A6F65] relative z-10">
        © 2026 Signal &amp; Friction Method. All rights reserved.
      </footer>
    </main>
  );
}
