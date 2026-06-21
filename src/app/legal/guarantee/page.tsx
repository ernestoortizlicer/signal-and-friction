"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

export default function GuaranteeTerms() {
  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] overflow-x-hidden relative flex flex-col justify-between font-sans">
      <HexGrid />
      
      {/* Background Grids */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.01) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#D4A853]/10 bg-[#0A0908]/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 8L8 15L1 8Z" stroke="#D4A853" strokeWidth="1.5" />
          </svg>
          <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.35em] uppercase font-bold">
            S&amp;F Legal Console
          </span>
        </div>
        <Link href="/" className="font-mono text-xs text-[#7A6F65] hover:text-[#D4A853] transition-colors tracking-widest uppercase">
          ← Return to Console
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-[800px] mx-auto w-full px-6 py-16 relative z-10 space-y-8 font-mono">
        <div className="space-y-3">
          <span className="text-[#D4A853] text-xs tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
            Outcomes-Based Guarantee Protocol
          </span>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight">
            Signal &amp; Friction 20% Growth Guarantee™ Terms
          </h1>
          <div className="text-[#B0A89E] text-xs uppercase tracking-wider">
            Version 4.2 // Hardened Performance Gating
          </div>
        </div>

        <p className="text-[#B0A89E] leading-relaxed text-sm">
          This document establishes the legally binding framework governing the results-based refund protocol offered under the Done-For-You (DFY) Concierge model. Traditional marketing agencies operate on billing retainers with zero outcome accountability. The Signal &amp; Friction Method™ distributes risk by tying the diagnostic fee to telemetry-verified performance.
        </p>

        <div className="border border-[#D4A853]/8 bg-[#D4A853]/[0.03] p-5 rounded space-y-6">
          <div className="space-y-2">
            <h3 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">1. The Core Performance Covenant</h3>
            <p className="text-[#B0A89E] leading-relaxed text-sm">
              S&amp;F covenants that executing the single, Socratic diagnostic fix will yield a minimum <strong className="text-[#F5F0EB]">20.00% relative conversion rate lift</strong> (e.g., boosting a baseline conversion rate of 2.00% to 2.40%) within a 30-day monitoring window.
            </p>
          </div>

          <div className="space-y-2 border-t border-[#D4A853]/8 pt-4">
            <h3 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">2. Technical &amp; Environmental Gating Parameters</h3>
            <p className="text-[#B0A89E] leading-relaxed text-sm">
              To prevent client teams from compromising test environments, the guarantee is strictly gated by four telemetry parameters:
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-[#B0A89E] text-sm">
              <li>
                <strong className="text-white">Traffic Volume Gate:</strong> The test page/route must receive a minimum of <strong className="text-[#F5F0EB]">15,000 unique visitors</strong> during the 30-day testing window.
              </li>
              <li>
                <strong className="text-white">SLA Delivery Gate:</strong> The client developer team must implement the diagnostic fix within <strong className="text-[#F5F0EB]">72 hours</strong> of receiving S&amp;F specifications.
              </li>
              <li>
                <strong className="text-white">Isolation Gate:</strong> No parallel modifications to the layout, stylesheet, pricing, or checkout sequencing are permitted during the testing period.
              </li>
              <li>
                <strong className="text-white">Telemetry Integrity Gate:</strong> Active, uncompromised PostHog or equivalent analytics tracking must remain active throughout the baseline and intervention periods.
              </li>
            </ul>
          </div>

          <div className="space-y-2 border-t border-[#D4A853]/8 pt-4">
            <h3 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">3. Automated Settlement and Stripe Refund</h3>
            <p className="text-[#B0A89E] leading-relaxed text-sm">
              If all four gating criteria are fully met, and the verified 30-day conversion rate lift fails to exceed 20.00%, the performance guarantee is marked as failed. Upon state change, S&amp;F will automatically trigger a full refund of the diagnostic fee ($350.00 or localized equivalent) back to the client&apos;s originating Stripe card within 48 hours.
            </p>
          </div>
        </div>

        <div className="border border-[#D4A853]/15 bg-[#D4A853]/5 p-4 rounded text-xs text-[#D4A853] leading-relaxed">
          <strong>CRITICAL ADVISORY:</strong> Startups violating the Isolation Gate by deploying unauthorized front-end tweaks automatically void their guarantee protection. Telemetry audits are continuously logged in our ledger.
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#D4A853]/[0.06] py-6 px-6 text-center text-xs font-mono text-[#7A6F65] relative z-10">
        © 2026 Signal &amp; Friction Method™ Certified. All rights reserved.
      </footer>
    </main>
  );
}
