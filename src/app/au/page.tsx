import type { Metadata } from "next";
import MarketLanding from "../../components/MarketLanding";

export const metadata: Metadata = {
  title: "Signal & Friction — Australia B2B SaaS Diagnostic",
  description: "Evidence-ranked behavioral diagnosis for Australian B2B SaaS and digital-service teams. 72h async delivery.",
  alternates: { canonical: "https://signal-and-friction.com/au" },
};

export default function AustraliaPage() {
  return <MarketLanding countryCode="AU" />;
}
