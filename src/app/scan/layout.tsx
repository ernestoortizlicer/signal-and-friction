import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Checkout Friction Audit — Signal & Friction",
  description:
    "Scan your Shopify, WooCommerce or any e-commerce checkout in 30 seconds. Get your LCP score, script bloat count, and the primary friction mechanism killing your conversion rate. Free. No login.",
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
    title: "Free Checkout Friction Audit — Signal & Friction",
    description:
      "Enter your store URL. See your LCP score, script count, and the exact friction mechanism losing you revenue. No login required.",
    url: "https://signal-and-friction.pages.dev/scan",
    siteName: "Signal & Friction",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Checkout Friction Audit",
    description: "Scan your checkout in 30 seconds. Find where revenue is leaking.",
  },
  alternates: {
    canonical: "https://signal-and-friction.pages.dev/scan",
  },
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
