"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

export default function PrivacyPolicy() {
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
            Privacy Policy
          </span>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight">
            How Signal &amp; Friction Handles Your Data
          </h1>
          <div className="text-[#B0A89E] text-xs uppercase tracking-wider">
            Effective date: July 30, 2026
          </div>
        </div>

        <p className="text-[#B0A89E] leading-relaxed text-sm">
          Signal &amp; Friction (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) provides B2B conversion diagnostic services. We are established in the European Union (currently Spain). This policy explains what personal information we collect, why, how it&apos;s stored, and your rights under the EU General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA/CPRA), and the Singapore Personal Data Protection Act (PDPA).
        </p>

        <Section num="1" title="Who We Are">
          <p>
            Ernesto Ortiz Licer, operating as an individual (sole trader; registration as autónomo pending initial clients).
          </p>
          <p className="text-[#D4A853]">
            Calle González Palencia n° 13, 44110 Gea de Albarracín, Teruel, Spain
          </p>
          <p>
            Contact: <a href="mailto:ernestoortizlicer@gmail.com" className="text-[#D4A853] hover:underline">ernestoortizlicer@gmail.com</a>
          </p>
          <p>
            We are the data controller for the personal information described below. As we are established in the EU, we are not required to appoint a separate EU representative (that requirement applies only to controllers established outside the EU). Given the scale of our processing, we are not required to appoint a Data Protection Officer.
          </p>
        </Section>

        <Section num="2" title="Information We Collect">
          <p className="text-[#F5F0EB] font-semibold">a. Information you provide directly:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>Email address and product URL, submitted through our diagnostic scan form or checkout.</li>
            <li>If you purchase a service: your name, email, and any product, funnel, or analytics data you choose to share with us to complete the diagnostic.</li>
            <li>Payment information: processed entirely by Stripe, our payment processor. We do not receive or store your full card number. We do retain transaction metadata (amount, product purchased, email, date) associated with your payment.</li>
          </ul>
          <p className="text-[#F5F0EB] font-semibold pt-2">b. Information collected automatically (only with your consent for analytics — see Section 5):</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>We use PostHog, a product analytics tool, to understand how visitors use our site (pages viewed, general interaction events, device/browser type, approximate location such as country). PostHog uses cookies and browser local storage to distinguish visitor sessions. This only runs if you accept analytics cookies via the banner shown on your first visit.</li>
            <li>Our hosting and CDN provider (Cloudflare) processes standard technical data (e.g., IP address) as part of delivering the site and for security/abuse prevention — this is strictly necessary and doesn&apos;t require separate consent.</li>
          </ul>
        </Section>

        <Section num="3" title="Legal Basis for Processing (GDPR)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D4A853]/15 text-[#D4A853] text-left">
                  <th className="py-2 pr-4 font-semibold">Processing activity</th>
                  <th className="py-2 font-semibold">Legal basis (GDPR Art. 6)</th>
                </tr>
              </thead>
              <tbody className="text-[#B0A89E]">
                {[
                  ["Delivering a diagnostic you purchased", "Performance of a contract"],
                  ["Responding to an inquiry you submitted", "Performance of a contract / your request"],
                  ["Processing payment via Stripe", "Performance of a contract"],
                  ["Analytics (PostHog)", "Your consent (opt-in, revocable anytime)"],
                  ["Basic security/abuse prevention (Cloudflare)", "Legitimate interest — keeping the service secure and available"],
                  ["Sending you service-related communications", "Performance of a contract / legitimate interest"],
                ].map(([activity, basis]) => (
                  <tr key={activity} className="border-b border-white/[0.04] align-top">
                    <td className="py-2 pr-4">{activity}</td>
                    <td className="py-2">{basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pt-2">
            Where we rely on consent, you may withdraw it at any time without affecting the lawfulness of processing before withdrawal (see Section 6, and the &quot;Cookie Settings&quot; link in the footer).
          </p>
        </Section>

        <Section num="4" title="Where Your Data Is Stored / International Transfers">
          <p>
            Application data (leads, client records, diagnostic content) is stored with Supabase, our database provider. Payment processing is handled by Stripe. Site hosting and delivery is handled by Cloudflare. These providers may process data outside the European Economic Area. Where that happens, we rely on appropriate safeguards — such as Standard Contractual Clauses or the provider&apos;s participation in a recognized transfer framework (e.g. the EU-U.S. Data Privacy Framework) — to ensure your data remains protected.
          </p>
        </Section>

        <Section num="5" title="Cookies &amp; Analytics">
          <p>We use two categories of cookies/storage:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-white">Strictly necessary:</strong> e.g. the session cookie used to keep an authenticated admin logged in. These don&apos;t require consent because the site can&apos;t function without them for the person who set them.</li>
            <li><strong className="text-white">Analytics (PostHog):</strong> only loaded and only sets cookies/local storage if you click &quot;Accept&quot; on the cookie banner shown on your first visit. If you click &quot;Reject,&quot; or make no choice, PostHog never initializes and no analytics cookies are set. You can change your choice at any time via the &quot;Cookie Settings&quot; link in the footer.</li>
          </ul>
        </Section>

        <Section num="6" title="Your Rights">
          <p>
            <strong className="text-white">If you are in the European Economic Area (GDPR),</strong> you have the right to: access the personal data we hold about you; request correction (rectification) of inaccurate data; request erasure (&quot;right to be forgotten&quot;); restrict how we process your data; receive your data in a portable format; object to processing based on legitimate interest; and withdraw consent at any time for consent-based processing (e.g. analytics), without affecting processing carried out before withdrawal. You also have the right to lodge a complaint with your local data protection authority, or with our current lead supervisory authority, the Spanish data protection agency (Agencia Española de Protección de Datos, AEPD) — this will be updated once our EU establishment moves to Finland.
          </p>
          <p>
            <strong className="text-white">If you are a California resident (CCPA/CPRA),</strong> you have the right to: know what personal information we&apos;ve collected about you; request access to it; request deletion; request correction of inaccurate information; and not be discriminated against for exercising these rights. We do not sell or share personal information for cross-context behavioral advertising, so no opt-out-of-sale request is necessary.
          </p>
          <p>
            <strong className="text-white">If you are located in Singapore (PDPA),</strong> you have the right to: withdraw consent for our collection/use of your personal data at any time; request access to personal data we hold about you; request correction of inaccurate personal data; and lodge a complaint with the Personal Data Protection Commission (PDPC) if you believe we&apos;ve mishandled your data.
          </p>
          <p>
            To exercise any of these rights, email <a href="mailto:ernestoortizlicer@gmail.com" className="text-[#D4A853] hover:underline">ernestoortizlicer@gmail.com</a> with your request. We will respond within 30 days (or as required under applicable law).
          </p>
        </Section>

        <Section num="7" title="Retention">
          <p>
            We retain contact and lead information for as long as reasonably necessary to respond to your inquiry or deliver a purchased service, and generally no longer than 24 months of inactivity, after which it is deleted or anonymized — whichever is sooner, unless you request earlier deletion or we&apos;re required to retain it longer for tax, accounting, or legal reasons (e.g., payment records).
          </p>
        </Section>

        <Section num="8" title="Children&apos;s Privacy">
          <p>
            Our services are directed at businesses and business owners, not children. We do not knowingly collect personal information from anyone under 18.
          </p>
        </Section>

        <Section num="9" title="Security">
          <p>
            We use reasonable technical and organizational measures to protect your information. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section num="10" title="Changes to This Policy">
          <p>
            We may update this policy from time to time. The &quot;Effective date&quot; above reflects the most recent revision. Material changes will be reflected on this page.
          </p>
        </Section>

        <Section num="11" title="Contact">
          <p>Ernesto Ortiz Licer</p>
          <p className="text-[#D4A853]">Calle González Palencia n° 13, 44110 Gea de Albarracín, Teruel, Spain</p>
          <p><a href="mailto:ernestoortizlicer@gmail.com" className="text-[#D4A853] hover:underline">ernestoortizlicer@gmail.com</a></p>
        </Section>

        <div className="border border-[#D4A853]/15 bg-[#D4A853]/5 p-4 rounded text-xs text-[#D4A853] leading-relaxed">
          Related: <Link href="/legal/terms" className="hover:underline">Terms of Service</Link> · <Link href="/legal/guarantee" className="hover:underline">Specificity Guarantee Terms</Link>
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
