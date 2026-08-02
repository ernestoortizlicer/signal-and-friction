import type { Metadata } from "next";

// pricing/page.tsx is a client component ("use client"), which can't export
// metadata directly — Next only reads metadata from server components. This
// layout is the correct place for it. No `images` set on openGraph/twitter
// here deliberately: leaving it unset lets Next's file-convention
// opengraph-image.tsx (src/app/opengraph-image.tsx) resolve automatically,
// rather than duplicating that URL by hand here too.
export const metadata: Metadata = {
  title: "Diagnostic Pricing — Signal & Friction",
  description:
    "One friction, evidence-ranked. One decision. DWY from $350, DFY from $2,000 — new clients start with a Diagnostic.",
  openGraph: {
    title: "Diagnostic Pricing — Signal & Friction",
    description:
      "One friction. One decision. New clients start with a Diagnostic — evidence-ranked, never generic.",
    url: "https://signal-and-friction.com/pricing",
    siteName: "Signal & Friction",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diagnostic Pricing — Signal & Friction",
    description: "One friction. One decision. New clients start with a Diagnostic.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
