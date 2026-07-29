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
    images: [
      {
        url: "https://signal-and-friction.com/sf_og_image.png",
        width: 1200,
        height: 630,
        alt: "Signal & Friction APAC — Singapore & Southeast Asia Diagnostic Portal",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal & Friction — Singapore & APAC Diagnostic Portal",
    description:
      "Isolate APAC checkout friction in 72h. Specific to your product, or you don't pay.",
    images: ["https://signal-and-friction.com/sf_og_image.png"],
  },
  alternates: {
    canonical: "https://signal-and-friction.com/sg",
  },
};

export default function SingaporePage() {
  return <SingaporeClient />;
}
