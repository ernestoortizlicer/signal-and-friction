import type { Metadata } from "next";
import PricingV21 from "@/components/PricingV21";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";

const description = `New clients start with a Diagnostic. ${PUBLIC_CLAIMS.evidenceRanked.copy} ${PUBLIC_CLAIMS.abstention.copy}`;

export const metadata: Metadata = {
  title: "Diagnostic Pricing — Signal & Friction",
  description,
  openGraph: {
    title: "Diagnostic Pricing — Signal & Friction",
    description,
    url: "https://signal-and-friction.com/pricing",
    siteName: "Signal & Friction",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diagnostic Pricing — Signal & Friction",
    description,
  },
};

/**
 * Frontend OS v2.1 migration bridge.
 *
 * The historical pricing page remains in the tree for rollback/provenance but
 * is intentionally not rendered. Remove it after the v2.1 pricing surface has
 * passed exact-head checkout smoke tests.
 */
export default function PricingLayout() {
  return <PricingV21 />;
}
