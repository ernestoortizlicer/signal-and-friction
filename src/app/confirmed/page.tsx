"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MarketSelector from "@/components/MarketSelector";
import { DFY_LADDER, DWY_LADDER, formatPriceUsd } from "@/lib/offer-catalog";
import { getCountryMarket, type MarketCountryCode } from "@/lib/market-profiles";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";

const COUNTRIES = new Set<MarketCountryCode>(["GLOBAL", "US", "CA", "GB", "SG", "AU"]);

function ConfirmedContent() {
  const params = useSearchParams();
  const rawCountry = (params.get("country") || "GLOBAL") as MarketCountryCode;
  const countryCode: MarketCountryCode = COUNTRIES.has(rawCountry) ? rawCountry : "GLOBAL";
  const profile = getCountryMarket(countryCode);
  const email = params.get("email") || "";
  const rawSegment = params.get("segment") || "high_ticket";
  const deliveryMode = rawSegment === "microdosing" || rawSegment === "autonomy" ? "dwy" : "dfy";
  const diagnostic = deliveryMode === "dwy" ? DWY_LADDER[0] : DFY_LADDER[0];
  const priceId = diagnostic.priceId;
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState(false);

  const pricingHref = countryCode === "GLOBAL" ? "/pricing" : `${profile.route}/pricing`;

  useEffect(() => {
    async function loadPaymentLink() {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("stripe_payment_links")
          .select("payment_link_url")
          .eq("price_id", priceId)
          .maybeSingle();
        const link = data?.payment_link_url;
        if (error || !link || link.includes("mock")) {
          setPaymentError(true);
          return;
        }
        setPaymentLink(link);
      } catch {
        setPaymentError(true);
      }
    }
    loadPaymentLink();
  }, [priceId]);

  const checkoutHref = useMemo(() => {
    if (!paymentLink || typeof window === "undefined") return paymentLink;
    const ref = localStorage.getItem("sf_referral_ref");
    if (!ref) return paymentLink;
    return `${paymentLink}${paymentLink.includes("?") ? "&" : "?"}client_reference_id=${encodeURIComponent(ref)}`;
  }, [paymentLink]);

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB]">
      <header className="border-b border-[#D4A853]/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <Link href={profile.route} className="text-sm font-semibold">Signal &amp; Friction</Link>
          <MarketSelector active={countryCode} compact />
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[.85fr_1.15fr] lg:py-20">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#D4A853]">Evidence intake received · {profile.shortLabel}</div>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Your intake is recorded. Payment activates the diagnostic.</h1>
          <p className="mt-6 text-base leading-7 text-[#92887F]">
            Nothing has been diagnosed yet. The information you submitted is context for the evidence review; payment starts the engagement and the 72-hour delivery commitment.
          </p>

          <div className="mt-8 space-y-4 border-y border-[#D4A853]/10 py-6">
            <div className="flex items-center justify-between gap-5"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6F675F]">Market</span><span className="text-sm">{profile.locationLabel}</span></div>
            <div className="flex items-center justify-between gap-5"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6F675F]">Delivery model</span><span className="text-sm">{deliveryMode === "dfy" ? "Done For You" : "Done With You"}</span></div>
            <div className="flex items-center justify-between gap-5"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6F675F]">Diagnostic fee</span><span className="text-sm text-[#D4A853]">{formatPriceUsd(diagnostic)}</span></div>
            {email && <div className="flex items-start justify-between gap-5"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6F675F]">Contact</span><span className="break-all text-right text-sm">{email}</span></div>}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Payment", "Stripe confirms the commercial event."],
              ["02", "Evidence review", "Signals, hypotheses and unknowns stay separated."],
              ["03", "Decision", "You receive a reviewable finding or an explicit abstention."],
            ].map(([id, title, copy]) => (
              <div key={id} className="rounded-xl border border-white/7 p-4">
                <div className="font-mono text-[9px] text-[#D4A853]">{id}</div>
                <div className="mt-2 text-sm font-semibold">{title}</div>
                <p className="mt-1 text-xs leading-5 text-[#756C63]">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="self-start rounded-2xl border border-[#D4A853]/18 bg-[#11100E] p-6 sm:p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#D4A853]">Secure commercial handoff</div>
          <h2 className="mt-3 text-2xl font-semibold">{deliveryMode.toUpperCase()} Diagnostic</h2>
          <p className="mt-4 text-sm leading-6 text-[#8F857C]">{diagnostic.scope}</p>

          <div className="mt-6 rounded-xl border border-[#D4A853]/12 bg-[#0A0908] p-5">
            <div className="flex items-end justify-between gap-5">
              <div><div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#6F675F]">Canonical fee</div><div className="mt-1 text-3xl font-semibold text-[#D4A853]">{formatPriceUsd(diagnostic)}</div></div>
              <div className="text-right text-[11px] leading-5 text-[#6F675F]">Stripe may present a supported local currency at checkout.</div>
            </div>
          </div>

          {checkoutHref ? (
            <a href={checkoutHref} className="mt-6 flex w-full items-center justify-between rounded-lg bg-[#D4A853] px-5 py-4 font-semibold text-[#0A0908] hover:bg-[#E8C97A]">
              <span>Continue to secure payment</span><span aria-hidden="true">→</span>
            </a>
          ) : paymentError ? (
            <div className="mt-6 rounded-lg border border-[#C84B31]/30 bg-[#C84B31]/8 p-4 text-sm leading-6 text-[#E8A99B]">
              The payment link is unavailable. We will not substitute a guessed checkout URL. Contact <a className="underline" href="mailto:hello@signal-and-friction.com">hello@signal-and-friction.com</a>.
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-[#D4A853]/12 p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#766D65]">Resolving secure payment link…</div>
          )}

          <div className="mt-5 space-y-2 text-xs leading-5 text-[#716960]">
            <p>{PUBLIC_CLAIMS.specificityGuarantee.copy}</p>
            <p>{PUBLIC_CLAIMS.async72h.copy} Delivery timing begins after successful payment.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 border-t border-[#D4A853]/10 pt-5 text-xs text-[#756C63]">
            <Link href={pricingHref}>Review pricing</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/guarantee">Guarantee</Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function ConfirmedPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0A0908]" />}><ConfirmedContent /></Suspense>;
}
