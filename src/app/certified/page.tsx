import type { Metadata } from "next";
import CertifiedClient from "./CertifiedClient";

export const metadata: Metadata = {
  title: "S&F Certified™ — License the Signal & Friction Diagnostic Methodology",
  description:
    "License the clinical cognitive conversion diagnostics framework. Enable your agency to deliver specificity-guaranteed audits — full refund if a finding isn't specific to the client's product — and secure high-ticket B2B SaaS clients.",
  openGraph: {
    title: "S&F Certified™ — License the Signal & Friction Diagnostic Methodology",
    description:
      "License the clinical cognitive conversion diagnostics framework for your agency. Methodology licensing, quarterly playbook updates, and the S&F Certified™ badge.",
    url: "https://signal-and-friction.com/certified",
    siteName: "Signal & Friction",
    images: [
      {
        url: "https://signal-and-friction.com/sf_og_image.png",
        width: 1200,
        height: 630,
        alt: "S&F Certified™ — Revenue Friction Diagnostic Methodology Licensing",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "S&F Certified™ — License the Diagnostic Methodology",
    description:
      "Clinical cognitive conversion diagnostics framework for agencies. Specificity-guaranteed audits.",
    images: ["https://signal-and-friction.com/sf_og_image.png"],
  },
  alternates: {
    canonical: "https://signal-and-friction.com/certified",
  },
};

export default function CertifiedPage() {
  return <CertifiedClient />;
}
