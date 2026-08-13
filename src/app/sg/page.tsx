import type { Metadata } from "next";
import Home from "../page";

export const metadata: Metadata = {
  title: "Signal & Friction — APAC Behavioral Diagnostic | Singapore & Australia",
  description:
    "Evidence-ranked B2B SaaS behavioral diagnosis for English-first APAC teams. Measured signals, explicit hypotheses and uncertainty. 72-hour async delivery.",
  openGraph: {
    title: "Signal & Friction — APAC Behavioral Diagnostic",
    description:
      "Evidence-ranked behavioral diagnosis for English-first teams in Singapore and Australia. If evidence is insufficient, we say so.",
    url: "https://signal-and-friction.com/sg",
    siteName: "Signal & Friction",
    images: ["https://signal-and-friction.com/opengraph-image"],
    type: "website",
    locale: "en_SG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal & Friction — APAC Behavioral Diagnostic",
    description:
      "Measured signals, explicit hypotheses, uncertainty and a reviewable decision. 72h async delivery.",
    images: ["https://signal-and-friction.com/opengraph-image"],
  },
  alternates: {
    canonical: "https://signal-and-friction.com/sg",
  },
};

/**
 * Frontend OS v2 migration bridge.
 *
 * /sg previously maintained a near-copy of the Global landing with regional
 * capability claims (JCB/PayNow/PDPA) that were not backed by dedicated
 * product tools/evals. Until MarketLanding is extracted, APAC intentionally
 * reuses the canonical landing engine. The client page already routes lead
 * submissions as APAC when pathname === /sg.
 */
export default function SingaporePage() {
  return <Home />;
}
