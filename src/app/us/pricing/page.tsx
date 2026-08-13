import type { Metadata } from "next";
import MarketPricing from "../../../components/MarketPricing";

export const metadata: Metadata = { title: "Signal & Friction — US Pricing", alternates: { canonical: "https://signal-and-friction.com/us/pricing" } };
export default function Page() { return <MarketPricing countryCode="US" />; }
