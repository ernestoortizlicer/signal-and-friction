"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

export default function TermsOfService() {
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
        <Link
          href="/"
          className="font-mono text-xs sm:text-sm font-semibold text-[#D4A853] border border-[#D4A853]/40 hover:border-[#D4A853] hover:bg-[#D4A853]/10 transition-all tracking-wide uppercase px-3 py-2 sm:px-4 rounded-full"
        >
          ← Back home
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-[800px] mx-auto w-full px-6 py-16 relative z-10 space-y-8 font-mono">
        <div className="space-y-3">
          <span className="text-[#D4A853] text-xs tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
            Terms of Service
          </span>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight">
            Signal &amp; Friction Terms of Service
          </h1>
          <div className="text-[#B0A89E] text-xs uppercase tracking-wider">
            Effective date: July 30, 2026
          </div>
        </div>

        <p className="text-[#B0A89E] leading-relaxed text-sm">
          These Terms govern your purchase and use of diagnostic services from Signal &amp; Friction (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;). By purchasing or using our services, you agree to these Terms.
        </p>

        <Section num="1" title="What We Provide">
          <p>
            Signal &amp; Friction sells clinical B2B conversion-friction diagnostics, offered across two tracks:
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-white">DWY (Done-With-You):</strong> we diagnose, you implement.</li>
            <li><strong className="text-white">DFY (Done-For-You):</strong> we diagnose and implement.</li>
          </ul>
          <p>
            Each track includes: <strong className="text-white">Beta Diagnostic</strong> (one-time — full diagnosis of one dominant friction point, evidence-tiered as measured, modeled, or pending, delivered as a web page plus a short Loom walkthrough), <strong className="text-white">Intervention</strong> (one-time — implementation of the diagnosed fix, guided for DWY or executed directly for DFY), <strong className="text-white">Monitoring</strong> (monthly subscription — ongoing measurement and the next friction point surfaced), <strong className="text-white">Expansion</strong> (one-time — the diagnostic repeated on another funnel area), and <strong className="text-white">Autonomy Kit</strong> (one-time — the method packaged for the client to run independently). Current pricing for each is posted at <Link href="/pricing" className="text-[#D4A853] hover:underline">signal-and-friction.com/pricing</Link> and reflects the price in effect at the time of purchase.
          </p>
        </Section>

        <Section num="2" title="Delivery">
          <p>
            Diagnostics are delivered asynchronously as a private web page (and, where applicable, a companion SLA page) plus a Loom video walkthrough. We aim to deliver within the timeframe stated at checkout; delivery timing depends in part on timely information/access from you.
          </p>
        </Section>

        <Section num="3" title="Payment &amp; Billing">
          <p>
            All payments are processed by Stripe. One-time services are billed in full at purchase. Monitoring is billed monthly and renews automatically until cancelled. You can cancel Monitoring at any time, effective at the end of the current billing period; we do not provide partial-period refunds for cancellation.
          </p>
        </Section>

        <Section num="4" title="The Specificity Guarantee">
          <p>
            Every diagnostic is covered by our Specificity Guarantee, in full at <Link href="/legal/guarantee" className="text-[#D4A853] hover:underline">signal-and-friction.com/legal/guarantee</Link>: if the diagnosis doesn&apos;t surface a friction point specific to your product — something we observed in your actual funnel, not generic advice — you don&apos;t pay. Refund requests must be made within 7 days of delivery per the process described there.
          </p>
        </Section>

        <Section num="5" title="No Guarantee of Business Results">
          <p>
            The Specificity Guarantee covers the quality and specificity of the finding we deliver — it is not a guarantee of any conversion rate, revenue outcome, or other business result. Outcomes after implementation depend on execution, market conditions, traffic, and other factors outside our control. Any projected impact range in a deliverable is a modeled estimate with a stated confidence level, not a promise.
          </p>
        </Section>

        <Section num="6" title="Your Responsibilities">
          <p>
            For DWY services, you are responsible for implementing the recommended fix — we diagnose and guide, we do not execute. Delivery timelines assume reasonably timely responses and, where relevant, access to the information needed to complete the diagnostic.
          </p>
        </Section>

        <Section num="7" title="Intellectual Property">
          <p>
            Deliverables (diagnostic reports, Autonomy Kit materials) are licensed to you for your own internal business use. We retain ownership of our underlying methodology and framework. You may not resell, relicense, or repackage our deliverables or methodology to third parties without our written consent.
          </p>
        </Section>

        <Section num="8" title="Confidentiality">
          <p>
            Any product, funnel, or analytics data you share with us is used solely to deliver your diagnostic and is not shared with third parties except the service providers necessary to operate our business (e.g., Supabase, Stripe, Cloudflare), each bound by their own confidentiality/security obligations.
          </p>
        </Section>

        <Section num="9" title="Limitation of Liability">
          <p>
            To the maximum extent permitted by law, our total liability for any claim arising from these Terms or our services is limited to the amount you paid for the specific service giving rise to the claim. We are not liable for indirect, incidental, consequential, or lost-profit damages, even if advised of the possibility.
          </p>
        </Section>

        <Section num="10" title="Disclaimer of Warranties">
          <p>
            Our services are provided &quot;as is.&quot; Other than the express Specificity Guarantee above, we disclaim all other warranties, express or implied, including merchantability and fitness for a particular purpose.
          </p>
        </Section>

        <Section num="11" title="Termination">
          <p>
            We may decline or discontinue an engagement at our discretion (including issuing a refund and ending a Monitoring subscription). You may cancel a Monitoring subscription at any time per Section 3.
          </p>
        </Section>

        <Section num="12" title="Governing Law">
          <p>
            These Terms are governed by the laws of Spain, our current place of establishment (to be updated when our EU establishment moves to Finland). Disputes will first be addressed informally by emailing <a href="mailto:ernestoortizlicer@gmail.com" className="text-[#D4A853] hover:underline">ernestoortizlicer@gmail.com</a>; if unresolved, through the competent courts of our place of domicile.
          </p>
        </Section>

        <Section num="13" title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. The &quot;Effective date&quot; above reflects the most recent revision. Continued use of our services after a change constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section num="14" title="Contact">
          <p>Ernesto Ortiz Licer</p>
          <p className="text-[#D4A853]">Calle González Palencia n° 13, 44110 Gea de Albarracín, Teruel, Spain</p>
          <p><a href="mailto:ernestoortizlicer@gmail.com" className="text-[#D4A853] hover:underline">ernestoortizlicer@gmail.com</a></p>
        </Section>

        <div className="border border-[#D4A853]/15 bg-[#D4A853]/5 p-4 rounded text-xs text-[#D4A853] leading-relaxed">
          Related: <Link href="/legal/privacy" className="hover:underline">Privacy Policy</Link> · <Link href="/legal/guarantee" className="hover:underline">Specificity Guarantee Terms</Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#D4A853]/[0.06] py-6 px-6 text-center text-xs font-mono text-[#7A6F65] relative z-10">
        © 2026 Signal &amp; Friction. All rights reserved.
      </footer>
    </main>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#D4A853]/8 bg-[#D4A853]/[0.03] p-5 rounded space-y-2">
      <h2 className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">{num}. {title}</h2>
      <div className="text-[#B0A89E] leading-relaxed text-sm space-y-2">{children}</div>
    </div>
  );
}
