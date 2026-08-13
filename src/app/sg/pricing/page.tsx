import type { Metadata } from "next";
import MarketPricing from "../../../components/MarketPricing";

export const metadata: Metadata = { title: "Signal & Friction — Singapore Pricing", alternates: { canonical: "https://signal-and-friction.com/sg/pricing" } };
export default function Page() { return <MarketPricing countryCode="SG" />; }
