import type { Metadata } from "next";
import MarketPricing from "@/components/MarketPricing";

export const metadata: Metadata = {
  title: "Signal & Friction — Canada Pricing",
  alternates: { canonical: "https://signal-and-friction.com/ca/pricing" },
};

export default function CanadaPricingPage() {
  return <MarketPricing countryCode="CA" />;
}
