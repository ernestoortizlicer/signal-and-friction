import type { Metadata } from "next";
import SingaporeClient from "./SingaporeClient";

export const metadata: Metadata = {
  title: "Signal & Friction — APAC Diagnostic Portal | Singapore & Southeast Asia",
  description:
    "Clinical B2B SaaS conversion diagnostics localized for APAC. JCB & PayNow checks, SGD pricing, PDPA compliance. 72-hour async delivery. If it isn't specific to your product, you don't pay.",
  openGraph: {
    title: "Signal & Friction — APAC Diagnostic Portal | Singapore & SE Asia",
    description:
      "Isolate Southeast Asia checkout friction killing your APAC revenue. Clinical diagnostic in 72h. JCB & PayNow checks. If it isn't specific to your product, you don't pay.",
    url: "https://signal-and-friction.com/sg",
    siteName: "Signal & Friction",
    // Explicit, not left unset: verified live that a route with its own
    // openGraph object does NOT inherit the parent's file-convention image
    // (opengraph-image.tsx) — Next replaces the whole openGraph object per
    // segment rather than merging missing fields. Confirmed by shipping
    // this unset once and finding /sg had literally no og:image at all in
    // production. Pointing directly at the same generated route everyone
    // else resolves to, so it's one visual, never duplicated content.
    images: ["https://signal-and-friction.com/opengraph-image"],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal & Friction — Singapore & APAC Diagnostic Portal",
    description:
      "Isolate APAC checkout friction in 72h. Specific to your product, or you don't pay.",
    images: ["https://signal-and-friction.com/opengraph-image"],
  },
  alternates: {
    canonical: "https://signal-and-friction.com/sg",
  },
};

export default function SingaporePage() {
  return <SingaporeClient />;
}
