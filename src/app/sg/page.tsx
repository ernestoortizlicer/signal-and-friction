import MarketLanding from "@/components/MarketLanding";
import { buildMarketMetadata } from "@/lib/market-metadata";

export const metadata = buildMarketMetadata("SG");

export default function SingaporePage() {
  return <MarketLanding countryCode="SG" />;
}
