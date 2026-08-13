import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = "https://signal-and-friction.com";
const landingAlternates = {
  "x-default": `${BASE}/`,
  "en-US": `${BASE}/us`,
  "en-CA": `${BASE}/ca`,
  "en-GB": `${BASE}/uk`,
  "en-SG": `${BASE}/sg`,
  "en-AU": `${BASE}/au`,
};
const pricingAlternates = {
  "x-default": `${BASE}/pricing`,
  "en-US": `${BASE}/us/pricing`,
  "en-CA": `${BASE}/ca/pricing`,
  "en-GB": `${BASE}/uk/pricing`,
  "en-SG": `${BASE}/sg/pricing`,
  "en-AU": `${BASE}/au/pricing`,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const localizedLandingUrls = ["/", "/us", "/ca", "/uk", "/sg", "/au"].map((path) => ({
    url: `${BASE}${path === "/" ? "" : path}`,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.9,
    alternates: { languages: landingAlternates },
  }));

  const localizedPricingUrls = ["/pricing", "/us/pricing", "/ca/pricing", "/uk/pricing", "/sg/pricing", "/au/pricing"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
    alternates: { languages: pricingAlternates },
  }));

  return [
    ...localizedLandingUrls,
    ...localizedPricingUrls,
    { url: `${BASE}/portfolio`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/legal/terms`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/legal/privacy`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/legal/guarantee`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
