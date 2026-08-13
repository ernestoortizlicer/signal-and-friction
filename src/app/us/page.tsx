import type { Metadata } from "next";
import MarketLanding from "../../components/MarketLanding";

export const metadata: Metadata = {
  title: "Signal & Friction — US B2B SaaS Diagnostic",
  description: "Evidence-ranked behavioral diagnosis for US B2B SaaS and digital-service teams. 72h async delivery.",
  alternates: {
    canonical: "https://signal-and-friction.com/us",
    languages: {
      "x-default": "https://signal-and-friction.com/",
      "en-US": "https://signal-and-friction.com/us",
      "en-CA": "https://signal-and-friction.com/ca",
      "en-GB": "https://signal-and-friction.com/uk",
      "en-SG": "https://signal-and-friction.com/sg",
      "en-AU": "https://signal-and-friction.com/au",
    },
  },
};

export default function Page() {
  return <MarketLanding countryCode="US" />;
}
