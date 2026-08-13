"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MarketSelector from "@/components/MarketSelector";
import { DFY_LADDER, DWY_LADDER, formatPriceUsd, type OfferPhase } from "@/lib/offer-catalog";
import { getCountryMarket, type MarketCountryCode } from "@/lib/market-profiles";

function OfferRow({ phase, link }: { phase: OfferPhase; link?: string }) {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    if (!link) return setHref(null);
    const ref = localStorage.getItem("sf_referral_ref");
    if (!ref) return setHref(link);
    setHref(`${link}${link.includes("?") ? "&" : "?"}client_reference_id=${encodeURIComponent(ref)}`);
  }, [link]);
  return (
    <div className="grid gap-4 border-t border-white/7 py-5 md:grid-cols-[90px_160px_1fr_auto] md:items-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6F675F]">Step {phase.order}</div>
      <div><div className="font-semibold">{phase.name}</div><div className="mt-1 font-mono text-[11px] text-[#D4A853]">{formatPriceUsd(phase)}</div></div>
      <p className="text-sm leading-6 text-[#81786F]">{phase.scope}</p>
      {href ? <a href={href} className="rounded-full border border-[#D4A853]/30 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-[#D4A853] hover:bg-[#D4A853] hover:text-[#0A0908]">Select →</a> : <span className="font-mono text-[10px] uppercase text-[#5D554E]">Checkout loading</span>}
    </div>
  );
}

function Ladder({ title, note, phases, links }: { title: string; note: string; phases: OfferPhase[]; links: Record<string,string> }) {
  return <section className="rounded-2xl border border-[#D4A853]/14 bg-[#0D0C0B] p-5 sm:p-7"><div className="border-b border-[#D4A853]/12 pb-5"><div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#D4A853]">{title}</div><p className="mt-2 text-sm leading-6 text-[#81786F]">{note}</p></div>{phases.map((phase) => <OfferRow key={phase.priceId} phase={phase} link={links[phase.priceId]} />)}</section>;
}

export default function MarketPricing({ countryCode }: { countryCode: MarketCountryCode }) {
  const profile = getCountryMarket(countryCode);
  const [links, setLinks] = useState<Record<string,string>>({});

  useEffect(() => {
    localStorage.setItem("sf_market_country", countryCode);
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[A-Z0-9]{6,16}$/.test(ref)) localStorage.setItem("sf_referral_ref", ref);
    async function load() {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase.from("stripe_payment_links").select("price_id,payment_link_url");
        if (error || !data) return;
        setLinks(Object.fromEntries(data.filter((row) => row.payment_link_url && !row.payment_link_url.includes("mock")).map((row) => [row.price_id, row.payment_link_url])));
      } catch {
        // Fail closed: unavailable checkout is safer than a guessed URL.
      }
    }
    load();
  }, [countryCode]);

  return <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB]">
    <header className="border-b border-[#D4A853]/10"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8"><Link href={profile.route} className="text-sm font-semibold">Signal &amp; Friction</Link><MarketSelector active={countryCode} compact /></div></header>
    <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20"><div className="max-w-4xl"><div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#D4A853]">{profile.locationLabel} · canonical offers</div><h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">Choose who owns execution. Keep the diagnostic standard fixed.</h1><p className="mt-6 max-w-3xl text-base leading-7 text-[#92887F]">The product architecture is global; the buying context is local. Prices below are the canonical USD offer authority. Stripe-hosted checkout can present local currency where supported without creating a second price source of truth.</p></div><div className="mt-12 space-y-5"><Ladder title="Done For You · DFY" note="Signal & Friction owns the diagnostic and execution path." phases={DFY_LADDER} links={links} /><Ladder title="Done With You · DWY" note="Signal & Friction owns diagnosis; your team executes with our implementation guidance." phases={DWY_LADDER} links={links} /></div><div className="mt-8 flex flex-col gap-3 border-t border-[#D4A853]/10 pt-6 text-xs leading-5 text-[#6F675F] sm:flex-row sm:justify-between"><span>Specificity Guarantee applies to diagnostic scope; it is not a promise of conversion or revenue outcome.</span><div className="flex gap-4"><Link href="/legal/terms">Terms</Link><Link href="/legal/guarantee">Guarantee</Link></div></div></section>
  </main>;
}
