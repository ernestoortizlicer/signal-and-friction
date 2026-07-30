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

// Journey verb + one-line desire hook per phase — marketing copy, deliberately
// kept out of offer-catalog.ts (that file is pricing/scope only). Keyed by
// the same priceId offer-catalog.ts already uses, so a missing entry here
// is a build-time TypeScript error, not a silent blank card. Two separate
// maps (not one shared one) because the hook itself differs by who's doing
// the work — same 5-step journey, different voice.
const JOURNEY_DWY: Record<string, { verb: string; hook: string }> = {
  price_dwy_beta_diagnostic: { verb: "Diagnose", hook: "We find it. Then you'll want it fixed." },
  price_dwy_intervention: { verb: "Fix", hook: "The fix, mapped step by step." },
  price_dwy_monitoring: { verb: "Monitor", hook: "Proof it worked — and what's next." },
  price_dwy_expansion: { verb: "Expand", hook: "Now the next leak." },
  price_dwy_autonomy: { verb: "Own it", hook: "Run the whole method yourself." },
};

const JOURNEY_DFY: Record<string, { verb: string; hook: string }> = {
  price_dfy_beta_diagnostic: { verb: "Diagnose", hook: "We find it. You don't lift a finger." },
  price_dfy_intervention: { verb: "Fix", hook: "We build the fix. You watch it ship." },
  price_dfy_monitoring: { verb: "Monitor", hook: "Proof it worked — we keep watching." },
  price_dfy_expansion: { verb: "Expand", hook: "Now the next leak. We handle that too." },
  price_dfy_autonomy: { verb: "Own it", hook: "Hand the method to your team." },
};

function PhaseCard({
  phase,
  verb,
  hook,
  link,
  linksLoaded,
}: {
  phase: OfferPhase;
  verb: string;
  hook: string;
  link: string | null;
  linksLoaded: boolean;
}) {
  return (
    <div className="flex-1 border border-[#D4A853]/15 bg-[#0A0908]/95 rounded p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-[#D4A853]/35 transition-colors">
      <div className="pricing-card-scanline" style={{ animationDelay: `${(phase.order - 1) * 0.6}s` }} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4A853]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-[#D4A853]/70 tracking-[0.3em] uppercase">
          Step {phase.order} · {verb}
        </span>
      </div>
      <h3 className="font-serif text-lg text-white font-bold tracking-tight leading-tight">
        {phase.name}
      </h3>
      <div className="font-mono text-2xl font-bold text-[#D4A853] glow-text tabular-nums">
        {formatPriceUsd(phase)}
      </div>
      <p className="text-xs text-[#B0A89E] font-mono leading-relaxed flex-1">
        {phase.scope}
      </p>
      <p className="text-xs italic text-[#D4A853]/80 font-mono border-t border-[#D4A853]/8 pt-3">
        &ldquo;{hook}&rdquo;
      </p>
      {linksLoaded && link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 w-full text-center py-2.5 border border-[#D4A853]/40 text-[#D4A853] font-mono text-xs uppercase tracking-[0.15em] hover:bg-[#D4A853] hover:text-[#0A0908] transition-all rounded"
        >
          Start — {formatPriceUsd(phase)} →
        </a>
      ) : linksLoaded ? (
        <span className="mt-1 w-full text-center py-2.5 border border-white/10 text-[#6A5F55] font-mono text-xs uppercase tracking-[0.15em] rounded cursor-not-allowed">
          Link unavailable
        </span>
      ) : (
        <span className="mt-1 w-full text-center py-2.5 border border-white/5 text-[#6A5F55] font-mono text-xs uppercase tracking-[0.15em] rounded">
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
  links,
  linksLoaded,
  divider,
}: {
  id: string;
  eyebrow: string;
  headline?: string;
  badge?: string;
  ladder: OfferPhase[];
  journey: Record<string, { verb: string; hook: string }>;
  links: Record<string, string>;
  linksLoaded: boolean;
  divider?: boolean;
}) {
  const sorted = ladder.slice().sort((a, b) => a.order - b.order);
  return (
    <section
      id={id}
      className={`w-full max-w-6xl mx-auto px-6 py-16 relative z-10 space-y-8 ${divider ? "border-t border-[#D4A853]/8" : ""}`}
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
        {headline ? (
          <>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif text-white tracking-tight max-w-2xl mx-auto leading-snug">
              {headline}
            </h2>
            <p className="font-mono text-sm text-[#B0A89E]/70">
              Diagnose <span className="text-[#D4A853]/40">→</span> Fix{" "}
              <span className="text-[#D4A853]/40">→</span> Monitor{" "}
              <span className="text-[#D4A853]/40">→</span> Expand{" "}
              <span className="text-[#D4A853]/40">→</span> Own it
            </p>
          </>
        ) : (
          <h2 className="text-xl sm:text-2xl font-serif text-white tracking-tight">
            Diagnose <span className="text-[#D4A853]/40">→</span> Fix{" "}
            <span className="text-[#D4A853]/40">→</span> Monitor{" "}
            <span className="text-[#D4A853]/40">→</span> Expand{" "}
            <span className="text-[#D4A853]/40">→</span> Own it
          </h2>
        )}
      </div>

      <div className="flex flex-col lg:flex-row items-stretch">
        {sorted.map((phase, i, arr) => {
          const j = journey[phase.priceId];
          return (
            <div key={phase.priceId} className="flex flex-col lg:flex-row flex-1">
              <PhaseCard
                phase={phase}
                verb={j?.verb ?? phase.name}
                hook={j?.hook ?? ""}
                link={links[phase.priceId] ?? null}
                linksLoaded={linksLoaded}
              />
              {i < arr.length - 1 && <Connector />}
            </div>
          );
        })}
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

  const dfyPrices = DFY_LADDER.map((p) => p.priceUsd);
  const dfyRange = `$${Math.min(...dfyPrices).toLocaleString("en-US")}–$${Math.max(...dfyPrices).toLocaleString("en-US")}`;

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
          Your funnel is leaking revenue at{" "}
          <span className="text-[#D4A853] glow-text">exactly one point.</span>
          <br />
          You feel it every month. You can&apos;t name it.
        </motion.h1>
        <p className="text-sm sm:text-base text-[#B0A89E] leading-relaxed font-mono max-w-2xl mx-auto">
          We find the one friction. Then we help you fix it — or fix it for you.
        </p>
      </section>

      {/* ── DWY — the hero ladder, your path ──────────────── */}
      <LadderSection
        id="dwy-pricing"
        eyebrow="Done-With-You — the path"
        ladder={DWY_LADDER}
        journey={JOURNEY_DWY}
        links={links}
        linksLoaded={linksLoaded}
      />

      {/* ── DFY — its own full, premium section, sequenced after DWY ── */}
      <LadderSection
        id="dfy-pricing"
        eyebrow="Done-For-You — the path"
        badge={`${dfyRange} · high-ticket`}
        headline="No time to do it yourself? We become your conversion team."
        ladder={DFY_LADDER}
        journey={JOURNEY_DFY}
        links={links}
        linksLoaded={linksLoaded}
        divider
      />

      {/* ── Honest close ──────────────────────────────────── */}
      <section className="w-full max-w-3xl mx-auto px-6 pb-24 relative z-10 border-t border-[#D4A853]/8 pt-16 text-center">
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
