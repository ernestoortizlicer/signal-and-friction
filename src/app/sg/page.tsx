import type { Metadata } from "next";
import { getMarketProfile } from "@/lib/market-profiles";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";
import Home from "../page";

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

/**
 * Frontend OS v2.1 migration bridge.
 * APAC reuses the same landing implementation as Global. Market differences
 * belong in typed config; this route does not imply regional payment,
 * privacy, tax or compliance capability.
 */
export default function SingaporePage() {
  return <Home />;
}
