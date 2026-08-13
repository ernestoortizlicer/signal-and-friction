import type { Metadata } from "next";
import MarketLanding from "@/components/MarketLanding";

const alternates = {
  canonical: "https://signal-and-friction.com/",
  languages: {
    "x-default": "https://signal-and-friction.com/",
    "en-US": "https://signal-and-friction.com/us",
    "en-CA": "https://signal-and-friction.com/ca",
    "en-GB": "https://signal-and-friction.com/uk",
    "en-SG": "https://signal-and-friction.com/sg",
    "en-AU": "https://signal-and-friction.com/au",
  },
} as const;

export const metadata: Metadata = {
  title: "Signal & Friction — Evidence-Ranked B2B SaaS Diagnostic",
  description:
    "Evidence-ranked behavioral diagnosis for B2B SaaS and digital-service teams. Measured signals, explicit hypotheses, uncertainty and one reviewable decision. 72h async delivery.",
  alternates,
  openGraph: {
    title: "Signal & Friction — Evidence-Ranked Behavioral Diagnosis",
    description:
      "Separate measured signal from hypothesis and uncertainty, then make one reviewable conversion decision.",
    url: "https://signal-and-friction.com/",
    siteName: "Signal & Friction",
    type: "website",
    locale: "en_US",
  },
};

export default function HomePage() {
  return <MarketLanding countryCode="GLOBAL" />;
}
