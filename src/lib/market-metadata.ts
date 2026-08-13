import type { Metadata } from "next";
import { getCountryMarket, type MarketCountryCode } from "@/lib/market-profiles";

const BASE = "https://signal-and-friction.com";
const LANGUAGES = {
  "x-default": `${BASE}/`,
  "en-US": `${BASE}/us`,
  "en-CA": `${BASE}/ca`,
  "en-GB": `${BASE}/uk`,
  "en-SG": `${BASE}/sg`,
  "en-AU": `${BASE}/au`,
} as const;

const OG_LOCALE: Record<Exclude<MarketCountryCode, "GLOBAL">, string> = {
  US: "en_US",
  CA: "en_CA",
  GB: "en_GB",
  SG: "en_SG",
  AU: "en_AU",
};

export function buildMarketMetadata(code: Exclude<MarketCountryCode, "GLOBAL">): Metadata {
  const profile = getCountryMarket(code);
  const url = `${BASE}${profile.route}`;
  return {
    title: `Signal & Friction — ${profile.label} B2B SaaS Diagnostic`,
    description: profile.heroSubhead,
    alternates: {
      canonical: url,
      languages: LANGUAGES,
    },
    openGraph: {
      title: `Signal & Friction — ${profile.label}`,
      description: profile.heroSubhead,
      url,
      siteName: "Signal & Friction",
      type: "website",
      locale: OG_LOCALE[code],
    },
    twitter: {
      card: "summary_large_image",
      title: `Signal & Friction — ${profile.label}`,
      description: profile.heroSubhead,
    },
  };
}
