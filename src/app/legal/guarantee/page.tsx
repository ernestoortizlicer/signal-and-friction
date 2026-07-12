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
            Specificity Guarantee Protocol
          </span>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight">
            Signal &amp; Friction Specificity Guarantee Terms
          </h1>
          <div className="text-[#B0A89E] text-xs uppercase tracking-wider">
            Version 5.0 // Evidence-Tiered Diagnostics
          </div>
        </div>

        <p className="text-[#B0A89E] leading-relaxed text-sm">
          We don&apos;t promise you a fixed conversion or revenue number. Anyone promising a fixed percentage hasn&apos;t looked at your funnel — we don&apos;t have access to your analytics, session recordings, or checkout data unless you grant it, and no diagnostic firm honestly can from a public scan alone. What we do guarantee is the specificity of the work itself. This document establishes the legally binding framework governing that guarantee.
        </p>

        <div className="border border-[#D4A853]/8 bg-[#D4A853]/[0.03] p-5 rounded space-y-6">
          <div className="space-y-2">
            <h3 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">1. The Core Specificity Covenant</h3>
            <p className="text-[#B0A89E] leading-relaxed text-sm">
              S&amp;F covenants that the diagnostic finding delivered will be <strong className="text-[#F5F0EB]">specific to your product</strong> — grounded in your own measured page structure, performance metrics, and stated context, with every claim tagged as measured, modeled, or pending against your own data. Each diagnostic ships with a projected impact range specific to your product and a stated confidence level, not a fixed outcome promise.
            </p>
          </div>

          <div className="space-y-2 border-t border-[#D4A853]/8 pt-4">
            <h3 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">2. What Voids Specificity</h3>
            <p className="text-[#B0A89E] leading-relaxed text-sm">
              A diagnostic fails the specificity standard, and qualifies for a refund, if it exhibits any of the following:
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-[#B0A89E] text-sm">
              <li>
                <strong className="text-white">Generic Figure Gate:</strong> The projected impact range is not derived from your own scanned page and evidence tiers — e.g. a round percentage with no stated source or benchmark.
              </li>
              <li>
                <strong className="text-white">Boilerplate Gate:</strong> The recommended decision does not name your product, domain, or the specific measured facts that led to it — i.e. it could be handed unchanged to a different company in your category.
              </li>
              <li>
                <strong className="text-white">Untiered Claim Gate:</strong> Any factual claim in the deliverable is not tagged measured, modeled, or pending, or a modeled claim is presented as if it were measured.
              </li>
              <li>
                <strong className="text-white">Fabricated Data Access Gate:</strong> The diagnostic asserts access to data we do not have — your session recordings, internal analytics, or funnel data — unless you explicitly provided it.
              </li>
            </ul>
          </div>

          <div className="space-y-2 border-t border-[#D4A853]/8 pt-4">
            <h3 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">3. Refund Process</h3>
            <p className="text-[#B0A89E] leading-relaxed text-sm">
              If, within 7 days of delivery, you believe your diagnostic fails the specificity standard above, contact <a href="mailto:hello@signal-and-friction.com" className="text-[#D4A853] hover:underline">hello@signal-and-friction.com</a> citing which gate it fails. We review against the criteria in Section 2 and, if substantiated, issue a full refund of the diagnostic fee back to your originating Stripe payment method within 5 business days. No forms, no hoops.
            </p>
          </div>
        </div>

        <div className="border border-[#D4A853]/15 bg-[#D4A853]/5 p-4 rounded text-xs text-[#D4A853] leading-relaxed">
          <strong>WHAT THIS DOES NOT COVER:</strong> Business outcomes after implementation depend on execution, market conditions, and traffic — factors outside a diagnostic&apos;s control. The Specificity Guarantee covers the quality and honesty of the finding we deliver, not your resulting conversion rate or revenue.
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#D4A853]/[0.06] py-6 px-6 text-center text-xs font-mono text-[#7A6F65] relative z-10">
        © 2026 Signal &amp; Friction Method™ Certified. All rights reserved.
      </footer>
    </main>
  );
}
