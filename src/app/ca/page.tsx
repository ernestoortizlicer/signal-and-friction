import MarketLanding from "../../components/MarketLanding";
const market = "CA" as const;
export default function Page() { return <MarketLanding countryCode={market} />; }
