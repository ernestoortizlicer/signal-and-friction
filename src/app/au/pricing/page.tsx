import type { Metadata } from "next";
import MarketPricing from "../../../components/MarketPricing";

export const metadata: Metadata = { title: "Signal & Friction — Australia Pricing", alternates: { canonical: "https://signal-and-friction.com/au/pricing" } };
export default function Page() { return <MarketPricing countryCode="AU" />; }
