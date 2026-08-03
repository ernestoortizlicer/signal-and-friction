"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DWY_LADDER, DFY_LADDER, formatPriceUsd, type OfferPhase } from "@/lib/offer-catalog";
import { SHOW_BANNER_EVENT } from "@/lib/cookieConsent";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });
const WireframeCanvas = dynamic(() => import("@/components/WireframeCanvas"), { ssr: false });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/* ═══════════════════════════════════════════════════════════════════════════════
   UTC CLOCK — same readout as the homepage top bar
   ═══════════════════════════════════════════════════════════════════════════════ */
function UtcClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-xs text-[#D4A853]/80 tracking-[0.2em] tabular-nums glow-text">
      UTC {time}
    </span>
  );
}

// Journey verb + concrete-action CTA per phase — marketing copy, deliberately
// kept out of offer-catalog.ts (that file is pricing/scope only). Keyed by
// the same priceId offer-catalog.ts already uses, so a missing entry here
// is a build-time TypeScript error, not a silent blank card. Diagnostic
// (order 1) is deliberately absent from both — it's rendered by
// DiagnosticCard/DIAGNOSTIC_COPY below instead, since it's the single
// visible entry point and carries far more copy than Fix/Monitor/Expand/
// Autonomy, which stay compact so they don't compete with it.
const JOURNEY_DWY: Record<string, { verb: string; cta: string }> = {
  price_dwy_intervention: { verb: "Fix", cta: "Get the fix plan" },
  price_dwy_monitoring: { verb: "Monitor", cta: "Start monitoring" },
  price_dwy_expansion: { verb: "Expand", cta: "Expand the diagnostic" },
  price_dwy_autonomy: { verb: "Own it", cta: "Get the Autonomy Kit" },
};

const JOURNEY_DFY: Record<string, { verb: string; cta: string }> = {
  price_dfy_intervention: { verb: "Fix", cta: "Build the fix" },
  price_dfy_monitoring: { verb: "Monitor", cta: "Start monitoring" },
  price_dfy_expansion: { verb: "Expand", cta: "Expand the diagnostic" },
  price_dfy_autonomy: { verb: "Own it", cta: "Hand off the method" },
};

// Full outcome / included / who-for / next-step copy — Diagnostic only,
// per the task's "single visible entry point" decision. dwy vs dfy differ
// in whoFor/nextStep/cta (who executes), same evidence-ranked diagnosis
// otherwise.
const DIAGNOSTIC_COPY: Record<"dwy" | "dfy", {
  outcome: string;
  included: string[];
  whoFor: string;
  nextStep: string;
  cta: string;
}> = {
  dwy: {
    outcome: "Know exactly which friction is costing you conversions — and the specific decision to fix it.",
    included: [
      "One dominant friction, isolated and evidence-ranked — measured, modeled, or marked unknown, never guessed",
      "The recommended decision: the specific action to take, not generic advice",
      "Delivered as a private deliverable page plus a short Loom walkthrough",
      "72 hours, fully async — no calls",
    ],
    whoFor: "Founders who want the diagnosis now and will execute the fix themselves.",
    nextStep: "Want it built, not just specified? Move to Intervention.",
    cta: "Diagnose my funnel",
  },
  dfy: {
    outcome: "Know exactly which friction is costing you conversions — we find it, and we're ready to build the fix.",
    included: [
      "One dominant friction, isolated and evidence-ranked — measured, modeled, or marked unknown, never guessed",
      "The recommended decision: the specific action to take, not generic advice",
      "Delivered as a private deliverable page plus a short Loom walkthrough",
      "72 hours, fully async — no calls",
    ],
    whoFor: "Founders who want the diagnosis and the execution, without adding it to their own team's plate.",
    nextStep: "Ready for us to build the fix too? Move to Intervention — we implement directly.",
    cta: "Diagnose my funnel — done for you",
  },
};

function DiagnosticCard({
  phase,
  copy,
  link,
  linksLoaded,
}: {
  phase: OfferPhase;
  copy: (typeof DIAGNOSTIC_COPY)["dwy"];
  link: string | null;
  linksLoaded: boolean;
}) {
  return (
    <div className="border border-[#D4A853]/25 bg-[#0A0908]/95 rounded-lg p-6 sm:p-8 relative overflow-hidden group hover:border-[#D4A853]/45 transition-colors">
      <div className="pricing-card-scanline" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4A853]/50 to-transparent" />
      <div className="grid md:grid-cols-[1.1fr_1fr] gap-8">
        <div className="space-y-4">
          <span className="font-mono text-[10px] text-[#D4A853] tracking-[0.3em] uppercase border border-[#D4A853]/30 px-2 py-0.5 rounded bg-[#D4A853]/5 inline-block">
            Start here
          </span>
          <h3 className="font-serif text-2xl sm:text-3xl text-white font-bold tracking-tight leading-tight">
            {phase.name}
          </h3>
          <div className="font-mono text-3xl font-bold text-[#D4A853] glow-text tabular-nums">
            {formatPriceUsd(phase)}
          </div>
          <p className="text-sm text-[#F5F0EB] leading-relaxed font-serif">
            {copy.outcome}
          </p>
          <p className="text-xs text-[#B0A89E] font-mono leading-relaxed">
            <span className="text-[#D4A853]/80 uppercase tracking-wider">Who it&apos;s for — </span>
            {copy.whoFor}
          </p>
        </div>
        <div className="space-y-4 border-t md:border-t-0 md:border-l border-[#D4A853]/10 pt-6 md:pt-0 md:pl-8">
          <span className="font-mono text-[10px] text-[#D4A853]/70 tracking-[0.3em] uppercase block">
            What&apos;s included
          </span>
          <ul className="space-y-2.5">
            {copy.included.map((line) => (
              <li key={line} className="text-xs text-[#B0A89E] font-mono leading-relaxed flex gap-2">
                <span className="text-[#D4A853] shrink-0">—</span>
                {line}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#7A6F65] font-mono leading-relaxed border-t border-[#D4A853]/8 pt-3">
            <span className="text-[#D4A853]/80 uppercase tracking-wider">Next — </span>
            {copy.nextStep}
          </p>
        </div>
      </div>
      {linksLoaded && link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 w-full block text-center py-3.5 border border-[#D4A853]/40 text-[#D4A853] font-mono text-sm uppercase tracking-[0.15em] hover:bg-[#D4A853] hover:text-[#0A0908] transition-all rounded"
        >
          {copy.cta} — {formatPriceUsd(phase)} →
        </a>
      ) : linksLoaded ? (
        <span className="mt-6 w-full block text-center py-3.5 border border-white/10 text-[#6A5F55] font-mono text-sm uppercase tracking-[0.15em] rounded cursor-not-allowed">
          Link unavailable
        </span>
      ) : (
        <span className="mt-6 w-full block text-center py-3.5 border border-white/5 text-[#6A5F55] font-mono text-sm uppercase tracking-[0.15em] rounded">
          Loading…
        </span>
      )}
    </div>
  );
}

function PhaseCard({
  phase,
  verb,
  cta,
  link,
  linksLoaded,
}: {
  phase: OfferPhase;
  verb: string;
  cta: string;
  link: string | null;
  linksLoaded: boolean;
}) {
  return (
    <div className="flex-1 border border-[#D4A853]/12 bg-[#0A0908]/95 rounded p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-[#D4A853]/30 transition-colors">
      <div className="pricing-card-scanline" style={{ animationDelay: `${(phase.order - 1) * 0.6}s` }} />
      <span className="font-mono text-[10px] text-[#D4A853]/70 tracking-[0.3em] uppercase">
        Step {phase.order} · {verb}
      </span>
      <h3 className="font-serif text-base text-white font-bold tracking-tight leading-tight">
        {phase.name}
      </h3>
      <div className="font-mono text-lg font-bold text-[#D4A853] tabular-nums">
        {formatPriceUsd(phase)}
      </div>
      <p className="text-xs text-[#B0A89E] font-mono leading-relaxed flex-1">
        {phase.scope}
      </p>
      {linksLoaded && link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 w-full text-center py-2 border border-[#D4A853]/30 text-[#D4A853] font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-[#D4A853] hover:text-[#0A0908] transition-all rounded"
        >
          {cta} →
        </a>
      ) : linksLoaded ? (
        <span className="mt-1 w-full text-center py-2 border border-white/10 text-[#6A5F55] font-mono text-[11px] uppercase tracking-[0.1em] rounded cursor-not-allowed">
          Link unavailable
        </span>
      ) : (
        <span className="mt-1 w-full text-center py-2 border border-white/5 text-[#6A5F55] font-mono text-[11px] uppercase tracking-[0.1em] rounded">
          Loading…
        </span>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center py-1 lg:py-0 lg:px-1 shrink-0 text-[#D4A853]/30">
      <span className="hidden lg:inline text-lg">→</span>
      <span className="lg:hidden text-lg">↓</span>
    </div>
  );
}

// Shared full-weight ladder section — used for both DWY and DFY so neither
// tier's cards are visually smaller or lower-priority than the other's.
// The only things that differ between the two calls are copy, data, and an
// optional divider/badge — never card size, price emphasis, or CTA weight.
function LadderSection({
  id,
  eyebrow,
  headline,
  badge,
  ladder,
  journey,
  diagnosticCopy,
  links,
  linksLoaded,
  divider,
}: {
  id: string;
  eyebrow: string;
  headline?: string;
  badge?: string;
  ladder: OfferPhase[];
  journey: Record<string, { verb: string; cta: string }>;
  diagnosticCopy: (typeof DIAGNOSTIC_COPY)["dwy"];
  links: Record<string, string>;
  linksLoaded: boolean;
  divider?: boolean;
}) {
  const sorted = ladder.slice().sort((a, b) => a.order - b.order);
  const diagnostic = sorted.find((p) => p.order === 1)!;
  const rest = sorted.filter((p) => p.order !== 1);
  return (
    <section
      id={id}
      className={`w-full max-w-6xl mx-auto px-6 py-16 relative z-10 space-y-10 ${divider ? "border-t border-[#D4A853]/8" : ""}`}
    >
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.4em] uppercase">
            {eyebrow}
          </span>
          {badge && (
            <span className="font-mono text-[10px] text-[#D4A853] tracking-[0.2em] uppercase border border-[#D4A853]/30 px-2 py-0.5 rounded bg-[#D4A853]/5">
              {badge}
            </span>
          )}
        </div>
        {headline && (
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif text-white tracking-tight max-w-2xl mx-auto leading-snug">
            {headline}
          </h2>
        )}
      </div>

      <DiagnosticCard
        phase={diagnostic}
        copy={diagnosticCopy}
        link={links[diagnostic.priceId] ?? null}
        linksLoaded={linksLoaded}
      />

      <div className="space-y-4">
        <span className="font-mono text-[10px] text-[#7A6F65] tracking-[0.3em] uppercase block text-center">
          The path after Diagnostic
        </span>
        <div className="flex flex-col lg:flex-row items-stretch">
          {rest.map((phase, i, arr) => {
            const j = journey[phase.priceId];
            return (
              <div key={phase.priceId} className="flex flex-col lg:flex-row flex-1">
                <PhaseCard
                  phase={phase}
                  verb={j?.verb ?? phase.name}
                  cta={j?.cta ?? "Learn more"}
                  link={links[phase.priceId] ?? null}
                  linksLoaded={linksLoaded}
                />
                {i < arr.length - 1 && <Connector />}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center font-mono text-xs text-[#7A6F65]">
        By purchasing you agree to our{" "}
        <Link href="/legal/terms" className="text-[#D4A853] hover:underline">Terms</Link>
        {" "}and{" "}
        <Link href="/legal/guarantee" className="text-[#D4A853] hover:underline">Guarantee</Link>.
      </p>
    </section>
  );
}

export default function PricingPage() {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [linksLoaded, setLinksLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/stripe_payment_links?select=price_id,payment_link_url`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        if (res.ok) {
          const rows: Array<{ price_id: string; payment_link_url: string }> = await res.json();
          const map: Record<string, string> = {};
          rows.forEach((r) => {
            // A link containing "mock" is a seed placeholder, not a real
            // Stripe link — never hand it back as if it were usable.
            if (r.payment_link_url && !r.payment_link_url.includes("mock")) {
              map[r.price_id] = r.payment_link_url;
            }
          });
          setLinks(map);
        }
      } catch {
        /* linksLoaded still flips below — cards fall back to "Link unavailable" */
      } finally {
        setLinksLoaded(true);
      }
    })();
  }, []);

  const dwyPrices = DWY_LADDER.map((p) => p.priceUsd);
  const dwyRange = `$${Math.min(...dwyPrices).toLocaleString("en-US")}–$${Math.max(...dwyPrices).toLocaleString("en-US")}`;
  const dfyPrices = DFY_LADDER.map((p) => p.priceUsd);
  const dfyRange = `$${Math.min(...dfyPrices).toLocaleString("en-US")}–$${Math.max(...dfyPrices).toLocaleString("en-US")}`;
  const dwyDiagnosticPrice = formatPriceUsd(DWY_LADDER.find((p) => p.order === 1)!);
  const dfyDiagnosticPrice = formatPriceUsd(DFY_LADDER.find((p) => p.order === 1)!);

  return (
    <main className="min-h-screen w-screen bg-[#0A0908] text-[#F5F0EB] overflow-y-auto relative crt-lines flex flex-col justify-start">
      <HexGrid />
      <WireframeCanvas />

      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L15 8L8 15L1 8Z" stroke="#D4A853" strokeWidth="1.5" fill="none" />
              <path d="M8 4L12 8L8 12L4 8Z" fill="#D4A853" fillOpacity="0.15" />
            </svg>
            <div className="absolute inset-0 blur-md bg-[#D4A853]/20 rounded-full" />
          </div>
          <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.35em] uppercase font-semibold hidden sm:inline">
            Signal &amp; Friction
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-mono text-xs sm:text-sm font-semibold text-[#D4A853] border border-[#D4A853]/40 hover:border-[#D4A853] hover:bg-[#D4A853]/10 transition-all tracking-wide uppercase px-3 py-2 sm:px-4 rounded-full"
          >
            ← Home
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5C9A6B] pulse-cyan" style={{ boxShadow: "0 0 6px rgba(92,154,107,0.5)" }} />
            <span className="font-mono text-xs text-[#5C9A6B] tracking-[0.15em] uppercase">Online</span>
          </div>
          <UtcClock />
        </div>
      </div>

      {/* ── Hero: the uncomfortable question ─────────────── */}
      <section className="w-full max-w-4xl mx-auto px-6 pt-28 pb-16 relative z-10 text-center space-y-6">
        <span className="font-mono text-xs text-[#D4A853] tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
          Diagnostic Pricing
        </span>
        <motion.h1
          initial={{ opacity: 1, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-hero text-[2.2rem] sm:text-[2.8rem] lg:text-[3.4rem] font-bold leading-[1.08] tracking-[-0.03em]"
        >
          One friction is costing you revenue.{" "}
          <span className="text-[#D4A853] glow-text">We find it.</span>
          <br />
          You fix it, or we do.
        </motion.h1>
        <p className="text-sm sm:text-base text-[#B0A89E] leading-relaxed font-mono max-w-2xl mx-auto">
          One friction. One decision. New clients start with a Diagnostic.
        </p>
        <p className="font-mono text-sm text-[#B0A89E]/70 pt-2">
          Diagnose <span className="text-[#D4A853]/40">→</span> Fix{" "}
          <span className="text-[#D4A853]/40">→</span> Monitor{" "}
          <span className="text-[#D4A853]/40">→</span> Expand{" "}
          <span className="text-[#D4A853]/40">→</span> Own it
        </p>
        <p className="text-sm font-serif text-[#F5F0EB]/80 leading-relaxed max-w-xl mx-auto pt-4">
          A long list of findings is someone else&apos;s backlog and doubt about what
          matters first. One dominant friction, evidence-ranked, is something you
          can act on this week.
        </p>
      </section>

      {/* ── DWY vs DFY — one glance, before either ladder ─── */}
      <section className="w-full max-w-2xl mx-auto px-6 pb-16 relative z-10">
        <div className="border border-[#D4A853]/15 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D4A853]/15">
                <th className="p-4 font-mono text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase font-normal w-1/3">
                  &nbsp;
                </th>
                <th className="p-4 font-mono text-xs text-[#D4A853] tracking-[0.2em] uppercase font-semibold">
                  Done-With-You
                </th>
                <th className="p-4 font-mono text-xs text-[#D4A853] tracking-[0.2em] uppercase font-semibold">
                  Done-For-You
                </th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm text-[#F5F0EB]">
              <tr className="border-b border-[#D4A853]/8">
                <td className="p-4 text-[#7A6F65] text-xs uppercase tracking-wider">Who executes</td>
                <td className="p-4">You</td>
                <td className="p-4">We do</td>
              </tr>
              <tr className="border-b border-[#D4A853]/8">
                <td className="p-4 text-[#7A6F65] text-xs uppercase tracking-wider">Best for</td>
                <td className="p-4 text-[#B0A89E] text-xs leading-relaxed">
                  Teams with the bandwidth to build the fix themselves
                </td>
                <td className="p-4 text-[#B0A89E] text-xs leading-relaxed">
                  Founders who want it handled, not another project
                </td>
              </tr>
              <tr className="border-b border-[#D4A853]/8">
                <td className="p-4 text-[#7A6F65] text-xs uppercase tracking-wider">Entry price</td>
                <td className="p-4 tabular-nums">{dwyDiagnosticPrice}</td>
                <td className="p-4 tabular-nums">{dfyDiagnosticPrice}</td>
              </tr>
              <tr>
                <td className="p-4 text-[#7A6F65] text-xs uppercase tracking-wider">Full path</td>
                <td className="p-4 tabular-nums text-[#B0A89E]">{dwyRange}</td>
                <td className="p-4 tabular-nums text-[#B0A89E]">{dfyRange}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── DWY — the hero ladder, your path ──────────────── */}
      <LadderSection
        id="dwy-pricing"
        eyebrow="Done-With-You — you execute"
        ladder={DWY_LADDER}
        journey={JOURNEY_DWY}
        diagnosticCopy={DIAGNOSTIC_COPY.dwy}
        links={links}
        linksLoaded={linksLoaded}
      />

      {/* ── DFY — its own full, premium section, sequenced after DWY ── */}
      <LadderSection
        id="dfy-pricing"
        eyebrow="Done-For-You — we execute"
        badge={`${dfyRange} · high-ticket`}
        headline="No time to do it yourself? We become your conversion team."
        ladder={DFY_LADDER}
        journey={JOURNEY_DFY}
        diagnosticCopy={DIAGNOSTIC_COPY.dfy}
        links={links}
        linksLoaded={linksLoaded}
        divider
      />

      {/* ── Example Decision Card — the deliverable made tangible ── */}
      <section className="w-full max-w-3xl mx-auto px-6 pb-16 relative z-10 border-t border-[#D4A853]/8 pt-16">
        <div className="text-center space-y-2 mb-8">
          <span className="font-mono text-[10px] text-[#7A6F65] tracking-[0.4em] uppercase">
            What you actually receive
          </span>
          <h2 className="text-xl sm:text-2xl font-serif text-white tracking-tight">
            One page. One decision.
          </h2>
        </div>

        <div className="border border-[#D4A853]/20 rounded-lg overflow-hidden">
          <div className="bg-[#D4A853]/8 border-b border-[#D4A853]/20 px-6 py-3 flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono text-xs text-[#D4A853] tracking-[0.15em] uppercase font-semibold">
              Example deliverable — anonymized sample, not a real client finding
            </span>
          </div>
          <div className="p-6 sm:p-8 space-y-6 font-mono text-sm">
            <div>
              <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                Dominant friction
              </span>
              <p className="text-[#F5F0EB] font-serif text-base leading-relaxed">
                Trust deficit at the pricing page — no visible security or compliance
                signal before the checkout CTA.
              </p>
            </div>

            <div>
              <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                Why it blocks conversion
              </span>
              <p className="text-[#B0A89E] text-xs leading-relaxed">
                Visitors hit the pricing decision at exactly the moment trust matters
                most — and see nothing there to resolve it. The doubt isn&apos;t answered,
                so the default answer becomes no.
              </p>
            </div>

            <div>
              <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                How we read it
              </span>
              <p className="text-[#B0A89E] text-xs leading-relaxed">
                This reads as a case of trust deficit: visitors weigh an unfamiliar
                source&apos;s claims against the absence of any independent confirmation,
                and default to caution when nothing at the decision moment resolves
                that gap.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 border-t border-[#D4A853]/8 pt-5">
              <div>
                <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                  Friction location
                </span>
                <span className="text-[#5C9A6B] text-xs">● measured</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                  Impact size
                </span>
                <span className="text-[#D4A853] text-xs">● modeled</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                  Post-fix lift
                </span>
                <span className="text-[#7A6F65] text-xs">● pending</span>
              </div>
            </div>

            <div className="border-t border-[#D4A853]/8 pt-5">
              <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                Confidence
              </span>
              <p className="text-[#B0A89E] text-xs leading-relaxed">
                Moderate — the location is directly observed; the size of the effect is
                a benchmark estimate, not yet a measured one.
              </p>
            </div>

            <div className="border-t border-[#D4A853]/8 pt-5">
              <span className="text-[10px] text-[#D4A853]/80 tracking-[0.2em] uppercase block mb-1.5">
                The decision
              </span>
              <p className="text-[#F5F0EB] text-xs leading-relaxed">
                Add a compliance/security badge row directly above the CTA — not in the
                footer, where it currently sits unseen at the decision moment.
              </p>
            </div>

            <div>
              <span className="text-[10px] text-[#C85C5C]/80 tracking-[0.2em] uppercase block mb-1.5">
                What not to do
              </span>
              <p className="text-[#B0A89E] text-xs leading-relaxed">
                Don&apos;t add more testimonials here — the gap isn&apos;t social proof, it&apos;s
                security proof. Stacking more of the wrong reassurance adds clutter
                without resolving the actual doubt.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 border-t border-[#D4A853]/8 pt-5">
              <div>
                <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                  Expected signal
                </span>
                <p className="text-[#B0A89E] text-xs leading-relaxed">
                  Pricing-to-checkout rate moves; Monitoring confirms direction before
                  magnitude.
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                  Measurement window
                </span>
                <p className="text-[#B0A89E] text-xs leading-relaxed">
                  One full monthly cycle of real session data.
                </p>
              </div>
            </div>

            <div className="border-t border-[#D4A853]/8 pt-5">
              <span className="text-[10px] text-[#7A6F65] tracking-[0.2em] uppercase block mb-1.5">
                What we don&apos;t know yet
              </span>
              <p className="text-[#7A6F65] text-xs leading-relaxed">
                Whether this is the only friction at this stage, or the dominant one
                among several — that&apos;s what Expansion tests on adjacent pages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How we get to one finding — Phase 6.1: the reasoning-engine
          story, without exposing the internal registry or prompts. ── */}
      <section className="w-full max-w-3xl mx-auto px-6 pb-16 relative z-10 border-t border-[#D4A853]/8 pt-16">
        <div className="text-center space-y-2 mb-6">
          <span className="font-mono text-[10px] text-[#7A6F65] tracking-[0.4em] uppercase">
            The process, briefly
          </span>
        </div>
        <p className="text-sm font-serif text-[#F5F0EB]/85 leading-relaxed max-w-xl mx-auto text-center">
          Evidence comes first, always — a behavioral pattern only gets named once it&apos;s grounded
          in what we actually observed. Before we commit to one reading, we use AI to stress-test it:
          what else could explain this, what are we missing, does the evidence really support this.
          The AI proposes and challenges. The analyst decides. When two readings are both genuinely
          plausible, we say so instead of picking one to look more decisive than it is.
        </p>
      </section>

      {/* ── What we don't do / who it's for ─────────────────── */}
      <section className="w-full max-w-3xl mx-auto px-6 pb-16 relative z-10 border-t border-[#D4A853]/8 pt-16">
        <div className="grid sm:grid-cols-2 gap-10">
          <div className="space-y-3">
            <span className="font-mono text-[10px] text-[#7A6F65] tracking-[0.3em] uppercase block">
              What we don&apos;t do
            </span>
            <ul className="space-y-2.5 text-xs text-[#B0A89E] font-mono leading-relaxed">
              <li>— Promise a revenue or conversion number</li>
              <li>— Run a generic CRO checklist — one dominant friction, not twenty minor notes</li>
              <li>— Manufacture a finding to justify the fee</li>
              <li>— Claim access to data we don&apos;t have unless you grant it</li>
              <li>— Lock you into a retainer — every step after Diagnostic is opt-in</li>
              <li>— Let an AI system pick the diagnosis — a named analyst always makes the final call</li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="font-mono text-[10px] text-[#7A6F65] tracking-[0.3em] uppercase block">
              Who this is for — and isn&apos;t
            </span>
            <p className="text-xs text-[#B0A89E] font-mono leading-relaxed">
              <span className="text-[#5C9A6B]">For:</span> B2B SaaS founders with real
              traffic who want to know why conversion isn&apos;t higher — not generic
              advice, one evidence-backed answer.
            </p>
            <p className="text-xs text-[#B0A89E] font-mono leading-relaxed">
              <span className="text-[#C85C5C]">Not for:</span> pre-launch products with
              no traffic yet to observe, or anyone expecting a guaranteed revenue
              outcome.
            </p>
          </div>
        </div>
      </section>

      {/* ── Guarantee — quality and scope, never revenue ────── */}
      <section className="w-full max-w-3xl mx-auto px-6 pb-16 relative z-10">
        <div className="border border-[#D4A853]/20 bg-[#D4A853]/[0.03] rounded-lg p-6 sm:p-8 space-y-3">
          <span className="font-mono text-[10px] text-[#D4A853] tracking-[0.3em] uppercase block">
            Specificity Guarantee
          </span>
          <p className="text-sm text-[#F5F0EB] font-serif leading-relaxed">
            If the diagnosis doesn&apos;t surface a friction point specific to your
            product — something observed in your actual funnel, not generic advice —
            you don&apos;t pay. Full refund of the diagnostic fee, no forms.
          </p>
          <p className="text-xs text-[#7A6F65] font-mono leading-relaxed">
            This covers the quality and honesty of the finding — never your resulting
            conversion rate or revenue, which depend on execution and market
            conditions we don&apos;t control.{" "}
            <Link href="/legal/guarantee" className="text-[#D4A853] hover:underline">
              Full terms
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── If no sufficient friction is found ──────────────── */}
      <section className="w-full max-w-3xl mx-auto px-6 pb-16 relative z-10 text-center">
        <p className="text-sm text-[#B0A89E] font-mono leading-relaxed max-w-xl mx-auto">
          If the evidence doesn&apos;t support a clear, specific friction — we say so.
          You get an honest &ldquo;not enough signal yet&rdquo; and a refund, not a
          manufactured finding.
        </p>
      </section>

      {/* ── Honest close ──────────────────────────────────── */}
      <section className="w-full max-w-3xl mx-auto px-6 pb-24 relative z-10 pt-4 text-center">
        <p className="text-lg sm:text-xl font-serif text-white leading-relaxed">
          We don&apos;t promise you a number.
          <br />
          We tell you what we{" "}
          <span className="text-[#D4A853] glow-text">measured</span>, what we{" "}
          <span className="text-[#D4A853]/80">modeled</span>, and what we{" "}
          <span className="text-[#B0A89E]">can&apos;t see</span>.
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="w-full border-t border-white/[0.03] py-8 px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-[#B0A89E] relative z-10 bg-[#0A0908]">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <span>© {new Date().getFullYear()} Signal &amp; Friction Method™. All rights reserved.</span>
          <span className="hidden md:inline">|</span>
          <Link href="/portfolio" className="hover:text-white transition-colors uppercase tracking-wider">Clinical Portfolio</Link>
        </div>
        <div className="flex items-center gap-3 text-[#7A6F65]">
          <Link href="/legal/privacy" className="hover:text-white transition-colors uppercase tracking-wider">Privacy</Link>
          <span>·</span>
          <Link href="/legal/terms" className="hover:text-white transition-colors uppercase tracking-wider">Terms</Link>
          <span>·</span>
          <Link href="/legal/guarantee" className="hover:text-white transition-colors uppercase tracking-wider">Guarantee</Link>
          <span>·</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(SHOW_BANNER_EVENT))}
            className="hover:text-white transition-colors uppercase tracking-wider"
          >
            Cookie Settings
          </button>
        </div>
      </footer>
    </main>
  );
}
