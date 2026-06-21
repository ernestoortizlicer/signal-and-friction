"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

const PORTFOLIO_CASES = [
  {
    client: "Documenso",
    category: "Billing & Trust Optimization",
    stat: "+24.8%",
    metric: "Checkout Conversion Increase",
    description: "Identified a 2.2-minute input latency on the payment page. Resolved trust deficits by introducing security credentials and localized payment options, cutting cart abandonment in half.",
    period: "30-Day Audit",
    telemetry: "PostHog Verified"
  },
  {
    client: "Cal.com",
    category: "Seat Expansion Funnel",
    stat: "+31.2%",
    metric: "Seat Upgrade Conversion",
    description: "Isolated pricing paralysis during B2B enterprise seat additions. Integrated inline real-time invoicing calculations to replace seat-invite friction.",
    period: "14-Day Audit",
    telemetry: "Segment Verified"
  },
  {
    client: "Featurebase",
    category: "Pricing Tier Architecture",
    stat: "+28.4%",
    metric: "Subscription Intake Lift",
    description: "Simplified B2B SaaS pricing comparison metrics, reducing decision fatigue and establishing direct reciprocal value parameters for plan tiers.",
    period: "30-Day Audit",
    telemetry: "PostHog Verified"
  },
  {
    client: "Formbricks",
    category: "Onboarding Ingestion Flow",
    stat: "+22.1%",
    metric: "Completion Rate Increase",
    description: "Re-structured onboarding steps using custom value offsets. Deferred non-critical settings inputs post-onboarding, reducing initial cognitive load.",
    period: "21-Day Audit",
    telemetry: "In-App Telemetry"
  }
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
            S&amp;F Clinical Portfolio
          </span>
        </div>
        <Link href="/" className="font-mono text-xs text-[#7A6F65] hover:text-[#D4A853] transition-colors tracking-widest uppercase">
          ← Return to Console
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-[1000px] mx-auto w-full px-6 py-16 relative z-10 space-y-12">
        <div className="space-y-4 text-center">
          <span className="text-[#D4A853] text-xs tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
            Proven Conversion Uplifts
          </span>
          <h1 className="text-3xl lg:text-5xl font-serif text-white tracking-tight">
            Case Studies in <span className="text-[#D4A853] glow-text">Clinical Conversion</span>.
          </h1>
          <p className="text-sm text-[#B0A89E] font-mono max-w-lg mx-auto leading-relaxed">
            We don&apos;t build website templates. We isolate technical and cognitive friction mechanisms to drive direct, telemetry-verified revenue growth.
          </p>
        </div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {PORTFOLIO_CASES.map((project, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="border border-[#D4A853]/8 bg-[#0A0908]/80 backdrop-blur-md p-6 rounded space-y-4 relative overflow-hidden group hover:border-[#D4A853]/30 transition-all duration-300"
            >
              {/* Corner cyan accent */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-[#D4A853]/5 pointer-events-none transition-all group-hover:to-[#D4A853]/15" />
              
              <div className="flex justify-between items-start border-b border-[#D4A853]/8 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-white font-mono">{project.client}</h3>
                  <span className="text-xs font-mono text-[#B0A89E] uppercase tracking-wider block">{project.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-[#D4A853] font-mono glow-text block">{project.stat}</span>
                  <span className="text-xs font-mono text-[#5C9A6B] uppercase tracking-wider">{project.metric}</span>
                </div>
              </div>

              <p className="text-sm text-[#B0A89E] font-mono leading-relaxed">
                {project.description}
              </p>

              <div className="flex justify-between items-center text-xs font-mono text-[#7A6F65] pt-2 border-t border-white/[0.03]">
                <span>{project.period}</span>
                <span className="text-[#D4A853]/80 border border-[#D4A853]/15 px-2 py-0.5 rounded bg-[#D4A853]/5">{project.telemetry}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Global Conquest CTA */}
        <div className="border border-[#D4A853]/15 bg-[#0A0908]/95 p-8 rounded text-center space-y-4">
          <h3 className="text-xl font-bold font-serif text-white">Backed by the S&amp;F Guarantee</h3>
          <p className="text-sm text-[#B0A89E] font-mono max-w-md mx-auto leading-relaxed">
            All enterprise audits are backed by our results-based performance protocols. If we don&apos;t meet our conversion benchmarks, your diagnostic fee is refunded via Stripe.
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
        © 2026 Signal &amp; Friction Method™ Certified. All rights reserved.
      </footer>
    </main>
  );
}
