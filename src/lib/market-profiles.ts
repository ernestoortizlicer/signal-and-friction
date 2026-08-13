export type MarketSurfaceId = 'global' | 'apac';
export type SupportedCommercialCountry = 'US' | 'CA' | 'GB' | 'SG' | 'AU';

export interface MarketProfile {
  id: MarketSurfaceId;
  label: string;
  route: '/' | '/sg';
  language: 'en';
  timezoneLabel: 'UTC' | 'SGT';
  timezone: 'UTC' | 'Asia/Singapore';
  countries: readonly SupportedCommercialCountry[];
  defaultCountry?: SupportedCommercialCountry;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubhead: string;
  intakeUrlLabel: string;
  marketNote: string;
  analyticsRegionLegacy: 'US' | 'APAC';
}

export const MARKET_PROFILES: Record<MarketSurfaceId, MarketProfile> = {
  global: {
    id: 'global',
    label: 'Global',
    route: '/',
    language: 'en',
    timezoneLabel: 'UTC',
    timezone: 'UTC',
    countries: ['US', 'CA', 'GB'],
    heroEyebrow: 'Evidence-ranked behavioral diagnosis',
    heroHeadline: 'Isolate the highest-confidence friction your evidence can actually defend.',
    heroSubhead:
      'Measured signals, explicit hypotheses, uncertainty and one reviewable decision. If the evidence is insufficient, I say so. 72h async delivery.',
    intakeUrlLabel: 'Enter target URL for diagnostic intake',
    marketNote: 'Serving English-first B2B SaaS and digital-service companies in the US, Canada and UK.',
    analyticsRegionLegacy: 'US',
  },
  apac: {
    id: 'apac',
    label: 'APAC',
    route: '/sg',
    language: 'en',
    timezoneLabel: 'SGT',
    timezone: 'Asia/Singapore',
    countries: ['SG', 'AU'],
    heroEyebrow: 'APAC · Evidence-ranked behavioral diagnosis',
    heroHeadline: 'Isolate the highest-confidence friction your evidence can actually defend.',
    heroSubhead:
      'The same Signal & Friction diagnostic discipline for English-first APAC teams: measured signals, explicit hypotheses, uncertainty and one reviewable decision. 72h async delivery.',
    intakeUrlLabel: 'Enter target product URL for diagnostic intake',
    marketNote: 'Initial APAC surface: Singapore and Australia. No regional compliance/payment capability is implied by this market route.',
    analyticsRegionLegacy: 'APAC',
  },
} as const;

export function getMarketProfile(id: MarketSurfaceId): MarketProfile {
  return MARKET_PROFILES[id];
}

export function isCommercialCountryForMarket(
  market: MarketSurfaceId,
  country: string | null | undefined,
): country is SupportedCommercialCountry {
  if (!country) return false;
  return MARKET_PROFILES[market].countries.includes(country.toUpperCase() as SupportedCommercialCountry);
}
