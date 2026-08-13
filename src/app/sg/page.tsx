import type { Metadata } from "next";
import MarketLandingV21 from "@/components/MarketLandingV21";
import { getMarketProfile } from "@/lib/market-profiles";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";

const apac = getMarketProfile("apac");
const description = `${apac.heroSubhead} ${PUBLIC_CLAIMS.abstention.copy}`;

export const metadata: Metadata = {
  title: `Signal & Friction — ${apac.label} Behavioral Diagnostic | Singapore & Australia`,
  description,
  openGraph: {
    title: `Signal & Friction — ${apac.label} Behavioral Diagnostic`,
    description,
    url: "https://signal-and-friction.com/sg",
    siteName: "Signal & Friction",
    images: ["https://signal-and-friction.com/opengraph-image"],
    type: "website",
    locale: "en_SG",
  },
  twitter: {
    card: "summary_large_image",
    title: `Signal & Friction — ${apac.label} Behavioral Diagnostic`,
    description,
    images: ["https://signal-and-friction.com/opengraph-image"],
  },
  alternates: {
    canonical: "https://signal-and-friction.com/sg",
  },
};

export default function SingaporePage() {
  return <MarketLandingV21 marketId="apac" />;
}
