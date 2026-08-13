import type { Metadata } from "next";
import MarketPricing from "@/components/MarketPricing";

export const metadata: Metadata = {
  title: "Signal & Friction — Pricing",
  description: "Canonical Done For You and Done With You diagnostic offer ladders for Signal & Friction.",
  alternates: {
    canonical: "https://signal-and-friction.com/pricing",
  },
};

export default function PricingPage() {
  return <MarketPricing countryCode="GLOBAL" />;
}
