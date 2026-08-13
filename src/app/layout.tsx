import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import { PHProvider } from "@/components/PostHogProvider";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Hero H1s only (/, /sg, /pricing) — the LCP element. `optional` means the
// browser paints with the metrically-matched fallback immediately and only
// uses the real webfont if it's already cached; it never swaps in later and
// re-triggers a second, later LCP the way `swap` does on a cold connection.
// Same family as `inter` above so a same-visit fallback→real-font swap
// (rare under `optional`) is still invisible.
const interHero = Inter({
  variable: "--font-inter-hero",
  subsets: ["latin"],
  display: "optional",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

// Phase 6.1 — "Revenue Friction Diagnostic" -> "Behavioral Diagnostic" in
// the title, matching the same eyebrow fix already made on the homepage
// (src/app/page.tsx) and /sg. This is the canonical <title> most search
// results and untagged shares fall back to; leaving it saying something
// different from what the homepage itself now says would be exactly the
// cross-touchpoint inconsistency Phase 6 exists to close.
export const metadata: Metadata = {
  title: "Signal & Friction — Behavioral Diagnostic for B2B SaaS",
  description:
    "I find where revenue breaks in your B2B SaaS product and give you exactly one defensible action to fix it. Clinical diagnostic delivered in 72 hours. 100% async. No calls.",
  keywords: [
    "B2B SaaS",
    "revenue friction",
    "behavioral diagnostics",
    "SaaS diagnostic",
    "cognitive friction",
    "revenue audit",
    "B2B SaaS pricing diagnostic",
  ],
  openGraph: {
    title: "Signal & Friction — Behavioral Diagnostic",
    description:
      "One Signal. One Friction. One Decision. Clinical B2B SaaS behavioral diagnostic delivered in 72 hours.",
    url: "https://signal-and-friction.com",
    siteName: "Signal & Friction",
    // No `images` here — resolved automatically from opengraph-image.tsx
    // (this same directory), which every page without its own override
    // inherits. Was pointing at the now-dead public/sf_og_image.png.
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal & Friction — Behavioral Diagnostic",
    description:
      "I find where revenue breaks in your B2B SaaS product. Clinical diagnostic in 72 hours. 100% async.",
  },
  metadataBase: new URL("https://signal-and-friction.com"),
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interHero.variable} ${newsreader.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>"
        />
        
        {/* 🔴 CRITICAL: JSON-LD Schema Markup for SEO */}
        
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Signal & Friction',
              url: 'https://signal-and-friction.com',
              logo: 'https://signal-and-friction.com/sf_logo.png',
              sameAs: [],
              // Phase 6.1 — "platform" implied self-serve software; this
              // is a practice with an accountable human analyst at the
              // center, not a tool a visitor operates alone. That
              // distinction is the entire long-term positioning bet (see
              // the Founding Constitution's defensibility argument), so
              // it belongs in the one description search engines
              // actually parse structurally.
              description:
                'B2B SaaS behavioral diagnostic practice. Isolates the single dominant friction mechanism blocking conversion, evidence-ranked and confidence-graded, in 72 hours.',
              foundingDate: '2026-03',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Service',
                email: 'hello@signal-and-friction.com',
              },
            }),
          }}
        />

        {/* Product Schema — Phase 6.1 fix: this previously labeled the
            $350 price "Done-With-You Autonomy (DWY)" with the Autonomy
            Kit's own description ("build internal capacity to run
            diagnostics yourself"), when $350 is actually the DWY
            Diagnostic — the entry tier, five steps and $1,150 away from
            Autonomy on the real ladder (src/lib/offer-catalog.ts). Every
            page on this site serves this same script in its <head>
            unconditionally, so this exact mislabel was being handed to
            every crawler indexing the site, not just the homepage. Both
            offers below now correctly describe the Diagnostic — the only
            thing either $350 or $2,000 actually buys — differing only in
            who executes the eventual fix, matching pricing/page.tsx's
            own DIAGNOSTIC_COPY. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              name: 'Signal & Friction Diagnostic',
              description:
                'Clinical B2B SaaS behavioral diagnostic. One dominant friction, evidence-ranked. 72h async delivery. If it isn\'t specific to your product, you don\'t pay.',
              provider: {
                '@type': 'Organization',
                name: 'Signal & Friction',
              },
              offers: [
                {
                  '@type': 'Offer',
                  priceCurrency: 'USD',
                  price: '2000',
                  name: 'Diagnostic — Done-For-You',
                  description: 'S&F finds the one dominant friction and is ready to build the fix directly. If it isn\'t specific to your product, you don\'t pay.',
                  url: 'https://signal-and-friction.com/pricing#dfy-pricing',
                },
                {
                  '@type': 'Offer',
                  priceCurrency: 'USD',
                  price: '350',
                  name: 'Diagnostic — Done-With-You',
                  description: 'S&F finds the one dominant friction and the decision to fix it; you execute. If it isn\'t specific to your product, you don\'t pay.',
                  url: 'https://signal-and-friction.com/pricing#dwy-pricing',
                },
              ],
            }),
          }}
        />

        {/* BreadcrumbList Schema — Phase 6.1: was labeling /scan (the
            free technical scanner) "Diagnostic," conflating it with the
            paid behavioral diagnosis in the exact same structured data
            Google reads. Added the real Diagnostic entry point as its
            own breadcrumb instead of overloading the scanner's. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: 'https://signal-and-friction.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Free Scan',
                  item: 'https://signal-and-friction.com/scan',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: 'Diagnostic Pricing',
                  item: 'https://signal-and-friction.com/pricing',
                },
              ],
            }),
          }}
        />

        {/* FAQPage Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What makes Signal & Friction different from generic AI audits?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'We don\'t promise you 20%. Anyone promising a fixed number hasn\'t looked at your funnel. Each diagnostic ships with a projected range specific to your product and a stated confidence level. If the diagnosis doesn\'t surface a friction point specific to your product — something we observed in your actual funnel, not generic advice — you don\'t pay.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How long does the diagnostic take?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Diagnostics are delivered in 72 hours, fully async. No calls required.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What if I don\'t see results?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'We guarantee our work\'s specificity, not your business outcome — actual results depend on execution, market conditions, and data we don\'t have access to. If the diagnosis doesn\'t surface a friction point specific to your product — something we observed in your actual funnel, not generic advice — you don\'t pay.',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans text-text-body bg-bg">
        <PHProvider>{children}</PHProvider>
        <CookieConsentBanner />
      </body>
    </html>
  );
}
