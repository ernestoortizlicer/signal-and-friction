"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MarketSelector from "@/components/MarketSelector";
import { getCountryMarket, type MarketCountryCode } from "@/lib/market-profiles";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";

const COUNTRIES = new Set<MarketCountryCode>(["GLOBAL", "US", "CA", "GB", "SG", "AU"]);

function SuccessContent() {
  const params = useSearchParams();
  const [countryCode, setCountryCode] = useState<MarketCountryCode>("GLOBAL");
  const email = params.get("email") || "";

  useEffect(() => {
    const queryCountry = params.get("country") as MarketCountryCode | null;
    const storedCountry = localStorage.getItem("sf_market_country") as MarketCountryCode | null;
    const resolved = queryCountry && COUNTRIES.has(queryCountry)
      ? queryCountry
      : storedCountry && COUNTRIES.has(storedCountry)
        ? storedCountry
        : "GLOBAL";
    setCountryCode(resolved);
    localStorage.removeItem("sf_referral_ref");
  }, [params]);

  const profile = getCountryMarket(countryCode);
  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB]">
      <header className="border-b border-[#D4A853]/10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <Link href={profile.route} className="text-sm font-semibold">Signal &amp; Friction</Link>
          <MarketSelector active={countryCode} compact />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6B8F5E]/30 bg-[#6B8F5E]/8 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8FB482]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8FB482]" /> Payment confirmed
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">The engagement is active. Now the evidence work begins.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#92887F]">
            We do not display invented live-analysis states. Your payment has activated the engagement; the next verified state is the delivery itself.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ["01", "Payment recorded", "The commercial event is confirmed through Stripe and enters the delivery workflow."],
            ["02", "Evidence reviewed", "Observed signals, competing hypotheses, uncertainty and missing evidence are kept explicit."],
            ["03", "Decision delivered", "You receive the most defensible finding the evidence supports — or an abstention if it does not."],
          ].map(([id, title, copy]) => (
            <div key={id} className="rounded-xl border border-white/7 bg-white/[0.015] p-5">
              <div className="font-mono text-[9px] tracking-[0.18em] text-[#D4A853]">{id}</div>
              <h2 className="mt-3 text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#81786F]">{copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[#D4A853]/15 bg-[#11100E] p-6 sm:p-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4A853]">Delivery contract</div>
              <p className="mt-3 text-lg leading-7">{PUBLIC_CLAIMS.async72h.copy}</p>
              <p className="mt-3 text-sm leading-6 text-[#81786F]">No meeting dependency. The 72-hour commitment is a delivery SLA, not a promise of conversion or revenue outcome.</p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4A853]">Evidence boundary</div>
              <p className="mt-3 text-lg leading-7">{PUBLIC_CLAIMS.abstention.copy}</p>
              <p className="mt-3 text-sm leading-6 text-[#81786F]">Specificity is guaranteed; certainty is not fabricated. That boundary is part of the product.</p>
            </div>
          </div>
          {email && <div className="mt-6 border-t border-[#D4A853]/10 pt-5 text-sm text-[#8F857C]">Delivery contact: <span className="text-[#F5F0EB]">{email}</span></div>}
        </div>

        <div className="mt-8 flex flex-wrap gap-5 text-xs text-[#756C63]">
          <Link href={profile.route} className="hover:text-[#D4A853]">Return to {profile.shortLabel}</Link>
          <Link href="/legal/guarantee" className="hover:text-[#D4A853]">Guarantee</Link>
          <Link href="/legal/terms" className="hover:text-[#D4A853]">Terms</Link>
        </div>
      </section>
    </main>
  );
}

export default function SuccessPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0A0908]" />}><SuccessContent /></Suspense>;
}
