"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MarketSelector from "@/components/MarketSelector";
import { countryToLegacyRegion, getCountryMarket, type MarketCountryCode } from "@/lib/market-profiles";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";
import { DFY_LADDER, DWY_LADDER, formatPriceUsd } from "@/lib/offer-catalog";

const FUNNEL = [
  ["landing_bounce", "Landing / acquisition", "Visitors arrive but do not meaningfully engage."],
  ["pricing_confusion", "Pricing / packaging", "Qualified users stall when the trade-off becomes explicit."],
  ["paywall_bounce", "Checkout / billing", "Intent exists, but commitment collapses at payment."],
  ["onboarding_dropout", "Onboarding / activation", "Customers start but fail to reach first value."],
  ["other", "Another funnel moment", "Describe it directly in the evidence brief."],
] as const;

const STAGES = [
  ["early_revenue", "Early revenue"],
  ["scaling", "Scaling"],
  ["established", "Established"],
] as const;

const TIMING = [["now", "Now"], ["quarter", "This quarter"], ["exploring", "Exploring"]] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#D4A853]/75">{children}</div>;
}

export default function MarketLanding({ countryCode }: { countryCode: MarketCountryCode }) {
  const profile = getCountryMarket(countryCode);
  const pricingHref = countryCode === "GLOBAL" ? "/pricing" : `${profile.route}/pricing`;
  const [url, setUrl] = useState("");
  const [funnelPain, setFunnelPain] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"dwy" | "dfy">("dfy");
  const [companyStage, setCompanyStage] = useState("");
  const [context, setContext] = useState("");
  const [email, setEmail] = useState("");
  const [urgency, setUrgency] = useState("now");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const diagnostic = useMemo(() => deliveryMode === "dfy" ? DFY_LADDER[0] : DWY_LADDER[0], [deliveryMode]);

  useEffect(() => {
    localStorage.setItem("sf_market_country", countryCode);
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[A-Z0-9]{6,16}$/.test(ref)) localStorage.setItem("sf_referral_ref", ref);
  }, [countryCode]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!url || !funnelPain || !companyStage || !context || !email) {
      setError("Complete the evidence-intake fields before continuing.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          funnelPain,
          segmentSelection: deliveryMode === "dfy" ? "concierge" : "autonomy",
          customAnswer: context,
          email,
          urgency,
          companyStage,
          marketSurface: profile.marketSurface,
          countryCode: countryCode === "GLOBAL" ? undefined : countryCode,
          language: profile.locale,
          acquisitionSource: document.referrer || "direct",
          region: countryToLegacyRegion(countryCode),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Diagnostic intake could not be submitted.");
      const params = new URLSearchParams({
        email,
        segment: result.segment || (deliveryMode === "dfy" ? "high_ticket" : "microdosing"),
        market: profile.marketSurface,
        country: countryCode,
      });
      window.location.assign(`/confirmed?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(circle at 15% 0%, rgba(212,168,83,.10), transparent 32%), radial-gradient(circle at 88% 20%, rgba(212,168,83,.05), transparent 28%)" }} />

      <header className="relative z-10 border-b border-[#D4A853]/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href={profile.route} className="flex items-center gap-3" aria-label="Signal & Friction home">
            <span className="grid h-8 w-8 place-items-center border border-[#D4A853]/35 bg-[#D4A853]/5"><span className="h-2.5 w-2.5 rotate-45 border border-[#D4A853]" /></span>
            <div><div className="text-sm font-semibold">Signal &amp; Friction</div><div className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#756C63]">Evidence → decision</div></div>
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><MarketSelector active={countryCode} compact /><Link href={pricingHref} className="rounded-full border border-[#D4A853]/25 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853] hover:bg-[#D4A853] hover:text-[#0A0908]">Pricing</Link></div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1fr_1fr] lg:px-8 lg:pt-20">
        <div>
          <Eyebrow>{profile.heroEyebrow}</Eyebrow>
          <h1 className="mt-5 text-balance font-hero text-[clamp(2.8rem,6vw,5.4rem)] font-semibold leading-[0.98] tracking-[-0.055em]">{profile.heroHeadline}</h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[#A1978E] sm:text-lg">{profile.heroSubhead}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[PUBLIC_CLAIMS.evidenceRanked.copy, PUBLIC_CLAIMS.abstention.copy, PUBLIC_CLAIMS.async72h.copy].map((claim) => <div key={claim} className="border-l border-[#D4A853]/25 pl-3 text-xs leading-5 text-[#7F756C]">{claim}</div>)}
          </div>
          <div className="mt-9 border-y border-[#D4A853]/10 py-4 text-sm text-[#9B9188]">{profile.responseWindow}</div>
          <p className="mt-5 text-xs leading-5 text-[#6F675F]">{profile.marketNote}</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-[#D4A853]/18 bg-[#11100E]/95 p-5 shadow-[0_32px_90px_rgba(0,0,0,.38)] sm:p-7">
          <div className="border-b border-[#D4A853]/10 pb-5"><Eyebrow>Scan my funnel · evidence intake</Eyebrow><h2 className="mt-2 text-xl font-semibold">Start with what can be observed.</h2><p className="mt-2 text-sm leading-6 text-[#81786F]">The scan gathers evidence. It does not auto-promote signals into a diagnosis; a named analyst owns the judgment.</p></div>
          <div className="mt-6 space-y-6">
            <label className="block"><span className="mb-2 block text-sm font-medium">1. Product or funnel URL</span><input type="url" required autoComplete="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-product.com" className="w-full rounded-lg border border-[#D4A853]/15 bg-[#0A0908] px-4 py-3 text-sm placeholder:text-[#514B45]" /></label>

            <fieldset><legend className="mb-3 text-sm font-medium">2. Where does the friction show up?</legend><div className="grid gap-2 sm:grid-cols-2">{FUNNEL.map(([value,label,detail]) => <label key={value} className={`cursor-pointer rounded-lg border p-3 ${funnelPain===value ? "border-[#D4A853]/50 bg-[#D4A853]/7" : "border-white/7"}`}><input className="sr-only" type="radio" name="funnel" checked={funnelPain===value} onChange={() => setFunnelPain(value)} /><div className="text-sm">{label}</div><div className="mt-1 text-xs leading-5 text-[#746C64]">{detail}</div></label>)}</div></fieldset>

            <fieldset><legend className="mb-3 text-sm font-medium">3. Who should execute the fix?</legend><div className="grid gap-2 sm:grid-cols-2">{([{value:"dfy" as const,label:"Done For You",price:DFY_LADDER[0]},{value:"dwy" as const,label:"Done With You",price:DWY_LADDER[0]}]).map((item) => <label key={item.value} className={`cursor-pointer rounded-lg border p-4 ${deliveryMode===item.value ? "border-[#D4A853]/50 bg-[#D4A853]/7" : "border-white/7"}`}><input className="sr-only" type="radio" name="delivery" checked={deliveryMode===item.value} onChange={() => setDeliveryMode(item.value)} /><div className="flex justify-between gap-3"><span className="text-sm font-semibold">{item.label}</span><span className="font-mono text-[10px] text-[#D4A853]">{formatPriceUsd(item.price)}</span></div><p className="mt-2 text-xs leading-5 text-[#746C64]">{item.value === "dfy" ? "S&F diagnoses and executes the intervention path." : "S&F diagnoses; your team owns execution."}</p></label>)}</div></fieldset>

            <fieldset><legend className="mb-3 text-sm font-medium">4. Company stage</legend><div className="grid gap-2 sm:grid-cols-3">{STAGES.map(([value,label]) => <label key={value} className={`cursor-pointer rounded-lg border p-3 text-xs ${companyStage===value ? "border-[#D4A853]/50 bg-[#D4A853]/7" : "border-white/7"}`}><input className="sr-only" type="radio" name="stage" checked={companyStage===value} onChange={() => setCompanyStage(value)} />{label}</label>)}</div></fieldset>

            <label className="block"><span className="mb-2 block text-sm font-medium">5. What changed, or what are you seeing?</span><textarea required rows={4} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Describe the signal, the decision you are stuck on, and evidence you already have." className="w-full resize-y rounded-lg border border-[#D4A853]/15 bg-[#0A0908] px-4 py-3 text-sm leading-6 placeholder:text-[#514B45]" /></label>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]"><label><span className="mb-2 block text-sm font-medium">Work email</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-lg border border-[#D4A853]/15 bg-[#0A0908] px-4 py-3 text-sm placeholder:text-[#514B45]" /></label><fieldset><legend className="mb-2 text-sm font-medium">Timing</legend><div className="flex rounded-lg border border-[#D4A853]/15 bg-[#0A0908] p-1">{TIMING.map(([value,label]) => <label key={value} className={`cursor-pointer rounded-md px-3 py-2.5 font-mono text-[9px] uppercase ${urgency===value ? "bg-[#D4A853] text-[#0A0908]" : "text-[#766D65]"}`}><input className="sr-only" type="radio" name="timing" checked={urgency===value} onChange={() => setUrgency(value)} />{label}</label>)}</div></fieldset></div>
          </div>
          {error && <div role="alert" className="mt-5 rounded-lg border border-[#C84B31]/30 bg-[#C84B31]/8 px-4 py-3 text-sm text-[#E8A99B]">{error}</div>}
          <button type="submit" disabled={submitting} className="mt-7 flex w-full items-center justify-between rounded-lg bg-[#D4A853] px-5 py-4 text-left text-[#0A0908] hover:bg-[#E8C97A] disabled:opacity-60"><span><span className="block text-sm font-bold">{submitting ? "Submitting evidence intake…" : "Start diagnostic intake"}</span><span className="mt-1 block text-[11px] opacity-70">{deliveryMode.toUpperCase()} Diagnostic · {formatPriceUsd(diagnostic)}</span></span><span aria-hidden="true">→</span></button>
          <div className="mt-4 flex justify-between gap-4 text-[11px] text-[#6F675F]"><span>{PUBLIC_CLAIMS.specificityGuarantee.copy}</span><Link href="/legal/guarantee" className="text-[#A9894D]">Terms →</Link></div>
        </form>
      </section>

      <section className="relative z-10 border-y border-[#D4A853]/10 bg-[#0D0C0B]"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><Eyebrow>Diagnostic standard</Eyebrow><h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.035em]">The product is the quality of the decision, not the volume of the report.</h2><div className="mt-10 grid gap-3 md:grid-cols-3">{[["Observe","Collect evidence without promoting a scan signal into a causal claim."],["Separate","Label what is measured, modelled, pending or unknown."],["Decide","Make one accountable recommendation, or abstain when the evidence cannot support it."]].map(([title,copy],i)=><div key={title} className="rounded-xl border border-white/7 p-5"><div className="font-mono text-[9px] text-[#D4A853]">0{i+1}</div><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#81786F]">{copy}</p></div>)}</div></div></section>

      <footer className="relative z-10 border-t border-[#D4A853]/10"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div><div className="text-sm font-semibold">Signal &amp; Friction</div><div className="mt-1 text-xs text-[#6F675F]">{profile.contextLabel} · canonical product engine</div></div><div className="flex flex-wrap gap-5 text-xs text-[#756C63]"><Link href={pricingHref}>Pricing</Link><Link href="/portfolio">Evidence</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link><Link href="/legal/guarantee">Guarantee</Link></div></div></footer>
    </main>
  );
}
