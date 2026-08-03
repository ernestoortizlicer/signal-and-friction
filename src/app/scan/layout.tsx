import type { Metadata } from "next";

// Phase 6.1 — title/description/OG copy brought in line with the page's
// own new H1 and boundary language ("this scan observes, it doesn't
// diagnose"). `keywords` is left untouched on purpose: it's invisible
// SEO search-intent capture, not a claim a visitor reads, and this exact
// terminology (including "audit") was audited and deliberately kept —
// see the Phase 5 Commercial Identity Audit's Part 2 finding.
export const metadata: Metadata = {
  title: "Free Checkout Friction Scan — Signal & Friction",
  description:
    "Scan your Shopify, WooCommerce or any e-commerce checkout in 30 seconds. Get your LCP score, script bloat count, and the technical signals feeding your conversion problem. Free. No login. The behavioral diagnosis itself is the paid step.",
  keywords: [
    "shopify checkout audit",
    "checkout friction analysis",
    "pagespeed checkout optimization",
    "reduce cart abandonment",
    "ecommerce conversion audit",
    "shopify lcp score",
    "checkout performance test",
    "woocommerce conversion rate",
    "b2b saas friction audit",
    "checkout speed test free",
  ],
  openGraph: {
    title: "Free Checkout Friction Scan — Signal & Friction",
    description:
      "Enter your store URL. See your LCP score, script count, and the technical signals behind your conversion problem. No login required.",
    url: "https://signal-and-friction.pages.dev/scan",
    siteName: "Signal & Friction",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Checkout Friction Scan",
    description: "Scan your checkout in 30 seconds. Find where revenue is leaking.",
  },
  alternates: {
    canonical: "https://signal-and-friction.pages.dev/scan",
  },
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
