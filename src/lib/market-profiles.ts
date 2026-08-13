export type MarketSurfaceId = 'global' | 'apac';
export type SupportedCommercialCountry = 'US' | 'CA' | 'GB' | 'SG' | 'AU';
export type MarketCountryCode = SupportedCommercialCountry | 'GLOBAL';

export interface MarketProfile {
  id: MarketSurfaceId;
  label: string;
  countries: readonly SupportedCommercialCountry[];
  analyticsRegionLegacy: 'US' | 'APAC';
}

export interface CountryMarketProfile {
  code: MarketCountryCode;
  marketSurface: MarketSurfaceId;
  label: string;
  shortLabel: string;
  route: '/' | '/us' | '/ca' | '/uk' | '/sg' | '/au';
  locale: 'en' | 'en-US' | 'en-CA' | 'en-GB' | 'en-SG' | 'en-AU';
  hreflang: 'x-default' | 'en-US' | 'en-CA' | 'en-GB' | 'en-SG' | 'en-AU';
  heroEyebrow: string;
  heroHeadline: string;
  heroSubhead: string;
  marketNote: string;
  contextLabel: string;
  locationLabel: string;
  responseWindow: string;
}

export const MARKET_PROFILES: Record<MarketSurfaceId, MarketProfile> = {
  global: {
    id: 'global',
    label: 'Global',
    countries: ['US', 'CA', 'GB'],
    analyticsRegionLegacy: 'US',
  },
  apac: {
    id: 'apac',
    label: 'APAC',
    countries: ['SG', 'AU'],
    analyticsRegionLegacy: 'APAC',
  },
} as const;

export const COUNTRY_MARKETS: Record<MarketCountryCode, CountryMarketProfile> = {
  GLOBAL: {
    code: 'GLOBAL',
    marketSurface: 'global',
    label: 'Global',
    shortLabel: 'Global',
    route: '/',
    locale: 'en',
    hreflang: 'x-default',
    heroEyebrow: 'Evidence-ranked behavioral diagnosis',
    heroHeadline: 'Find the highest-confidence friction your evidence can actually defend.',
    heroSubhead:
      'Signal & Friction separates observed signals from hypotheses, uncertainty and judgment — then gives you one reviewable decision. If the evidence is insufficient, we say so.',
    marketNote: 'English-first B2B SaaS and digital-service teams. Choose a market for country-specific context.',
    contextLabel: 'Global commercial surface',
    locationLabel: 'International',
    responseWindow: '72h async delivery · no meeting dependency',
  },
  US: {
    code: 'US',
    marketSurface: 'global',
    label: 'United States',
    shortLabel: 'US',
    route: '/us',
    locale: 'en-US',
    hreflang: 'en-US',
    heroEyebrow: 'United States · evidence-ranked diagnosis',
    heroHeadline: 'Turn funnel uncertainty into one defensible conversion decision.',
    heroSubhead:
      'For US B2B SaaS and digital-service teams that want a specific diagnosis, evidence boundaries and a clear next move — without another generic audit or standing retainer.',
    marketNote: 'US market context. Canonical offers remain globally governed; checkout localizes presentment where Stripe supports it.',
    contextLabel: 'US market surface',
    locationLabel: 'United States',
    responseWindow: '72h async delivery · built for distributed teams',
  },
  CA: {
    code: 'CA',
    marketSurface: 'global',
    label: 'Canada',
    shortLabel: 'Canada',
    route: '/ca',
    locale: 'en-CA',
    hreflang: 'en-CA',
    heroEyebrow: 'Canada · evidence-ranked diagnosis',
    heroHeadline: 'Turn funnel uncertainty into one defensible conversion decision.',
    heroSubhead:
      'For Canadian B2B SaaS and digital-service teams that need a specific finding, explicit uncertainty and a practical decision — delivered fully async.',
    marketNote: 'Canadian market context. No tax, privacy or regulatory capability is implied by the commercial route.',
    contextLabel: 'Canada market surface',
    locationLabel: 'Canada',
    responseWindow: '72h async delivery · no call requirement',
  },
  GB: {
    code: 'GB',
    marketSurface: 'global',
    label: 'United Kingdom',
    shortLabel: 'UK',
    route: '/uk',
    locale: 'en-GB',
    hreflang: 'en-GB',
    heroEyebrow: 'United Kingdom · evidence-ranked diagnosis',
    heroHeadline: 'Turn funnel uncertainty into one defensible conversion decision.',
    heroSubhead:
      'For UK B2B SaaS and digital-service teams that want evidence-ranked diagnosis, explicit uncertainty and an accountable recommendation — without agency theatre.',
    marketNote: 'UK market context. Commercial localisation is separate from legal, tax and compliance capability.',
    contextLabel: 'UK market surface',
    locationLabel: 'United Kingdom',
    responseWindow: '72h async delivery · designed for remote buying',
  },
  SG: {
    code: 'SG',
    marketSurface: 'apac',
    label: 'Singapore',
    shortLabel: 'Singapore',
    route: '/sg',
    locale: 'en-SG',
    hreflang: 'en-SG',
    heroEyebrow: 'Singapore · APAC · evidence-ranked diagnosis',
    heroHeadline: 'Make the next funnel decision without importing another generic growth playbook.',
    heroSubhead:
      'For Singapore-based and APAC-serving B2B SaaS teams: measured signals, explicit hypotheses, uncertainty and one reviewable decision. Same diagnostic standard; market-specific buying context.',
    marketNote: 'Singapore commercial surface. We do not claim PayNow, JCB, PDPA or other regional checks unless the underlying workflow actually performs them.',
    contextLabel: 'Singapore / APAC market surface',
    locationLabel: 'Singapore',
    responseWindow: '72h async delivery · APAC-friendly by design',
  },
  AU: {
    code: 'AU',
    marketSurface: 'apac',
    label: 'Australia',
    shortLabel: 'Australia',
    route: '/au',
    locale: 'en-AU',
    hreflang: 'en-AU',
    heroEyebrow: 'Australia · APAC · evidence-ranked diagnosis',
    heroHeadline: 'Make the next funnel decision from evidence, not another stack of CRO opinions.',
    heroSubhead:
      'For Australian B2B SaaS and digital-service teams: isolate what the evidence supports, separate signal from story, and leave with one accountable decision — fully async.',
    marketNote: 'Australian commercial surface. No local regulatory, tax or payment capability is implied by localisation alone.',
    contextLabel: 'Australia / APAC market surface',
    locationLabel: 'Australia',
    responseWindow: '72h async delivery · no timezone theatre',
  },
} as const;

export const MARKET_SELECTOR_ORDER: readonly MarketCountryCode[] = ['GLOBAL', 'US', 'CA', 'GB', 'SG', 'AU'];

export function getMarketProfile(id: MarketSurfaceId): MarketProfile {
  return MARKET_PROFILES[id];
}

export function getCountryMarket(code: MarketCountryCode | null | undefined): CountryMarketProfile {
  if (!code) return COUNTRY_MARKETS.GLOBAL;
  return COUNTRY_MARKETS[code] ?? COUNTRY_MARKETS.GLOBAL;
}

export function getCountryMarketFromRoute(pathname: string): CountryMarketProfile {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return (
    Object.values(COUNTRY_MARKETS).find((profile) => profile.route === normalized) ??
    COUNTRY_MARKETS.GLOBAL
  );
}

export function isCommercialCountryForMarket(
  market: MarketSurfaceId,
  country: string | null | undefined,
): country is SupportedCommercialCountry {
  if (!country) return false;
  return MARKET_PROFILES[market].countries.includes(country.toUpperCase() as SupportedCommercialCountry);
}

export function countryToLegacyRegion(code: MarketCountryCode): 'US' | 'APAC' {
  return code === 'SG' || code === 'AU' ? 'APAC' : 'US';
}
