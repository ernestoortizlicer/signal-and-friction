import { getLadder } from "@/lib/offer-catalog";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";

const SITE_URL = "https://signal-and-friction.com";

const dwyDiagnostic = getLadder("dwy").find((phase) => phase.order === 1);
const dfyDiagnostic = getLadder("dfy").find((phase) => phase.order === 1);

if (!dwyDiagnostic || !dfyDiagnostic) {
  throw new Error("Canonical Diagnostic offers are missing from offer-catalog.ts");
}

export const PUBLIC_SITE_COPY = {
  title: "Signal & Friction — Behavioral Diagnostic for B2B SaaS",
  description: `${PUBLIC_CLAIMS.evidenceRanked.copy} ${PUBLIC_CLAIMS.abstention.copy} ${PUBLIC_CLAIMS.async72h.copy}`,
  openGraphTitle: "Signal & Friction — Evidence-Ranked Behavioral Diagnostic",
  openGraphDescription: `${PUBLIC_CLAIMS.evidenceRanked.copy} ${PUBLIC_CLAIMS.abstention.copy}`,
  serviceDescription: `B2B SaaS behavioral diagnostic. ${PUBLIC_CLAIMS.evidenceRanked.copy} ${PUBLIC_CLAIMS.abstention.copy} ${PUBLIC_CLAIMS.async72h.copy}`,
} as const;

export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Signal & Friction",
  url: SITE_URL,
  logo: `${SITE_URL}/sf_logo.png`,
  sameAs: [],
  description: PUBLIC_SITE_COPY.serviceDescription,
  foundingDate: "2026-03",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Service",
    email: "hello@signal-and-friction.com",
  },
} as const;

export const SERVICE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Signal & Friction Diagnostic",
  description: `${PUBLIC_SITE_COPY.serviceDescription} ${PUBLIC_CLAIMS.specificityGuarantee.copy}`,
  provider: {
    "@type": "Organization",
    name: "Signal & Friction",
  },
  offers: [
    {
      "@type": "Offer",
      priceCurrency: "USD",
      price: String(dfyDiagnostic.priceUsd),
      name: `${dfyDiagnostic.name} — Done-For-You`,
      description: dfyDiagnostic.scope,
      url: `${SITE_URL}/pricing#dfy-pricing`,
    },
    {
      "@type": "Offer",
      priceCurrency: "USD",
      price: String(dwyDiagnostic.priceUsd),
      name: `${dwyDiagnostic.name} — Done-With-You`,
      description: dwyDiagnostic.scope,
      url: `${SITE_URL}/pricing#dwy-pricing`,
    },
  ],
} as const;

export const BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Free Scan", item: `${SITE_URL}/scan` },
    { "@type": "ListItem", position: 3, name: "Diagnostic Pricing", item: `${SITE_URL}/pricing` },
  ],
} as const;

export const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What makes Signal & Friction different from a generic AI audit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `${PUBLIC_CLAIMS.evidenceRanked.copy} ${PUBLIC_CLAIMS.abstention.copy} ${PUBLIC_CLAIMS.specificityGuarantee.copy}`,
      },
    },
    {
      "@type": "Question",
      name: "How long does the diagnostic take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: PUBLIC_CLAIMS.async72h.copy,
      },
    },
    {
      "@type": "Question",
      name: "What does the guarantee cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `${PUBLIC_CLAIMS.specificityGuarantee.copy} The guarantee covers specificity of the work, not a conversion or revenue outcome.`,
      },
    },
  ],
} as const;
