"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

export default function GuaranteeTerms() {
  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] overflow-x-hidden relative flex flex-col justify-between font-sans">
      <HexGrid />
      
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.01) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      <header className="px-6 py-4 flex items-center justify-between border-b border-[#D4A853]/10 bg-[#0A0908]/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 8L8 15L1 8Z" stroke="#D4A853" strokeWidth="1.5" />
          </svg>
          <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.35em] uppercase font-bold">
            S&amp;F Legal Console
          </span>
        </div>
        <Link
          href="/"
          className="font-mono text-xs sm:text-sm font-semibold text-[#D4A853] border border-[#D4A853]/40 hover:border-[#D4A853] hover:bg-[#D4A853]/10 transition-all tracking-wide uppercase px-3 py-2 sm:px-4 rounded-full"
        >
          ← Back home
        </Link>
      </header>

      <div className="flex-1 max-w-[800px] mx-auto w-full px-6 py-16 relative z-10 space-y-8 font-mono">
        <div className="space-y-3">
          <span className="text-[#D4A853] text-xs tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
            Specificity Guarantee Protocol
          </span>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight">
            Signal &amp; Friction Specificity Guarantee Terms
          </h1>
          <div className="text-[#B0A89E] text-xs uppercase tracking-wider">
            Version 5.1 // Evidence-Tiered Diagnostics
          </div>
        </div>

        <p className="text-[#F5F0EB] text-base leading-relaxed border-l-2 border-[#D4A853]/40 pl-4">
          If the diagnosis doesn&apos;t surface a friction point specific to your product — something I observed in your actual funnel, not generic advice — you don&apos;t pay.
        </p>

        <p className="text-[#B0A89E] leading-relaxed text-sm">
          I don&apos;t promise a fixed conversion or revenue number. I don&apos;t have access to your analytics, session recordings, or internal funnel data unless you provide or authorize that access. What I do guarantee is the specificity of the work itself. If the evidence is insufficient for a defensible finding, I say so rather than manufacturing certainty. This document establishes the framework governing that guarantee.
        </p>

        <div className="border border-[#D4A853]/8 bg-[#D4A853]/[0.03] p-5 rounded space-y-6">
          <div className="space-y-2">
            <h3 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">1. The Core Specificity Covenant</h3>
            <p className="text-[#B0A89E] leading-relaxed text-sm">
              I guarantee that any diagnostic finding I deliver will be <strong className="text-[#F5F0EB]">specific to your product</strong> and grounded in the evidence available for your case. Factual claims must be distinguished by evidence status rather than presented with invented certainty. Any projected impact range I include must be case-specific, assumption-labelled, and presented as an estimate rather than a promised outcome. If the available evidence does not justify a defensible finding or projection, I abstain from asserting one.
            </p>
          </div>

          <div className="space-y-2 border-t border-[#D4A853]/8 pt-4">
            <h3 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">2. What Voids Specificity</h3>
            <p className="text-[#B0A89E] leading-relaxed text-sm">
              A diagnostic fails the specificity standard, and qualifies for a refund, if it exhibits any of the following:
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-[#B0A89E] text-sm">
              <li>
                <strong className="text-white">Generic Figure Gate:</strong> A projected impact range is presented without case-specific assumptions, evidence, or a stated basis.
              </li>
              <li>
                <strong className="text-white">Boilerplate Gate:</strong> The recommended decision does not identify the product, surface, or specific observed facts that led to it — i.e. it could be handed unchanged to a different company in the same category.
              </li>
              <li>
                <strong className="text-white">Untiered Claim Gate:</strong> A factual claim is presented without its evidence status, or a modeled/inferred claim is presented as if directly measured.
              </li>
              <li>
                <strong className="text-white">Fabricated Data Access Gate:</strong> The diagnostic asserts access to data I do not have — such as session recordings, internal analytics, or private funnel data — unless you explicitly provided or authorized that access.
              </li>
            </ul>
          </div>

          <div className="space-y-2 border-t border-[#D4A853]/8 pt-4">
            <h3 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">3. Refund Process</h3>
            <p className="text-[#B0A89E] leading-relaxed text-sm">
              If, within 7 days of delivery, you believe your diagnostic fails the specificity standard above, contact <a href="mailto:hello@signal-and-friction.com" className="text-[#D4A853] hover:underline">hello@signal-and-friction.com</a> and identify the gate you believe it fails. I review the request against the criteria in Section 2 and, if substantiated, issue a full refund of the diagnostic fee back to your originating Stripe payment method within 5 business days.
            </p>
          </div>
        </div>

        <div className="border border-[#D4A853]/15 bg-[#D4A853]/5 p-4 rounded text-xs text-[#D4A853] leading-relaxed">
          <strong>WHAT THIS DOES NOT COVER:</strong> Business outcomes after implementation depend on execution, market conditions, traffic, and other factors outside the diagnostic itself. The Specificity Guarantee covers the quality and honesty of the finding I deliver, not your resulting conversion rate, revenue, or other business outcome.
        </div>

        <div className="border border-[#D4A853]/15 bg-[#D4A853]/5 p-4 rounded text-xs text-[#D4A853] leading-relaxed">
          Related: <Link href="/legal/privacy" className="hover:underline">Privacy Policy</Link> · <Link href="/legal/terms" className="hover:underline">Terms of Service</Link>
        </div>
      </div>

      <footer className="border-t border-[#D4A853]/[0.06] py-6 px-6 text-center text-xs font-mono text-[#7A6F65] relative z-10">
        © 2026 Signal &amp; Friction. All rights reserved.
      </footer>
    </main>
  );
}
