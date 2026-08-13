import MarketLanding from "../../components/MarketLanding";
const market = "GB" as const;
export default function Page() { return <MarketLanding countryCode={market} />; }
