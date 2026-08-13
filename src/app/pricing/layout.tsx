import type { Metadata } from "next";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";

const description = `New clients start with a Diagnostic. ${PUBLIC_CLAIMS.evidenceRanked.copy} ${PUBLIC_CLAIMS.abstention.copy}`;

export const metadata: Metadata = {
  title: "Diagnostic Pricing — Signal & Friction",
  description,
  openGraph: {
    title: "Diagnostic Pricing — Signal & Friction",
    description,
    url: "https://signal-and-friction.com/pricing",
    siteName: "Signal & Friction",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diagnostic Pricing — Signal & Friction",
    description,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
