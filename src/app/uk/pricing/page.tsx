import type { Metadata } from "next";
import MarketPricing from "@/components/MarketPricing";

export const metadata: Metadata = {
  title: "Signal & Friction — UK Pricing",
  alternates: { canonical: "https://signal-and-friction.com/uk/pricing" },
};

export default function UnitedKingdomPricingPage() {
  return <MarketPricing countryCode="GB" />;
}
