"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DWY_LADDER,
  DFY_LADDER,
  formatPriceUsd,
  type OfferPhase,
} from "@/lib/offer-catalog";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default function PricingV21() {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [linksLoaded, setLinksLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/stripe_payment_links?select=price_id,payment_link_url`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
        );
        if (!response.ok) return;
        const rows = await response.json() as Array<{ price_id: string; payment_link_url: string }>;
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const row of rows) {
          if (row.payment_link_url && !row.payment_link_url.includes("mock")) next[row.price_id] = row.payment_link_url;
        }
        setLinks(next);
      } finally {
        if (!cancelled) setLinksLoaded(true);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen bg-bg text-text-primary">
      <header className="border-b border-border-hi">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <Link href="/" className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Signal &amp; Friction
          </Link>
          <nav className="flex items-center gap-5 font-mono text-xs text-text-muted">
            <Link href="/portfolio" className="hover:text-text-primary">Method</Link>
            <Link href="/scan" className="hover:text-text-primary">Free scan</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-14 text-center space-y-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Diagnostic pricing</p>
        <h1 className="font-hero text-4xl sm:text-5xl font-bold tracking-[-0.035em]">
          Start with evidence. Choose who executes.
        </h1>
        <p className="mx-auto max-w-2xl text-text-body leading-relaxed">
          {PUBLIC_CLAIMS.evidenceRanked.copy} {PUBLIC_CLAIMS.abstention.copy} New clients start with a Diagnostic; every later step is opt-in.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 grid gap-8 lg:grid-cols-2">
        <Track
          title="Done-With-You"
          subtitle="Signal & Friction diagnoses and guides; your team executes."
          phases={DWY_LADDER}
          links={links}
          linksLoaded={linksLoaded}
        />
        <Track
          title="Done-For-You"
          subtitle="Signal & Friction diagnoses; execution is handled for you where the selected phase includes it."
          phases={DFY_LADDER}
          links={links}
          linksLoaded={linksLoaded}
        />
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-xl border border-border-accent bg-surface p-6 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Specificity guarantee</p>
          <p className="text-sm leading-relaxed text-text-body">{PUBLIC_CLAIMS.specificityGuarantee.copy}</p>
          <p className="text-xs leading-relaxed text-text-muted">
            This guarantee covers specificity of the work, not a conversion or revenue outcome. If the evidence does not support a defensible finding, the diagnostic abstains rather than manufacturing one.
          </p>
          <Link href="/legal/guarantee" className="font-mono text-xs text-accent hover:underline">Read guarantee terms →</Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-7">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 font-mono text-xs text-text-muted">
          <span>{PUBLIC_CLAIMS.async72h.copy}</span>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-text-primary">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-text-primary">Privacy</Link>
            <Link href="/legal/guarantee" className="hover:text-text-primary">Guarantee</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Track({
  title,
  subtitle,
  phases,
  links,
  linksLoaded,
}: {
  title: string;
  subtitle: string;
  phases: OfferPhase[];
  links: Record<string, string>;
  linksLoaded: boolean;
}) {
  return (
    <section className="rounded-xl border border-border-accent bg-surface p-6 sm:p-7 space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-body">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {phases.slice().sort((a, b) => a.order - b.order).map((phase) => (
          <OfferCard
            key={phase.priceId}
            phase={phase}
            link={links[phase.priceId] ?? null}
            linksLoaded={linksLoaded}
          />
        ))}
      </div>
    </section>
  );
}

function OfferCard({
  phase,
  link,
  linksLoaded,
}: {
  phase: OfferPhase;
  link: string | null;
  linksLoaded: boolean;
}) {
  const isDiagnostic = phase.order === 1;
  const description = isDiagnostic
    ? `${PUBLIC_CLAIMS.evidenceRanked.copy} ${PUBLIC_CLAIMS.abstention.copy}`
    : phase.scope;

  return (
    <article className={`rounded-lg border p-5 space-y-3 ${isDiagnostic ? "border-border-accent bg-accent-glow" : "border-border-hi bg-bg/35"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">Step {phase.order}</p>
          <h3 className="mt-1 font-serif text-xl font-bold">{phase.name}</h3>
        </div>
        <span className="font-mono text-lg font-semibold tabular-nums text-accent">{formatPriceUsd(phase)}</span>
      </div>
      <p className="text-sm leading-relaxed text-text-body">{description}</p>
      {isDiagnostic && (
        <p className="font-mono text-[11px] leading-relaxed text-text-muted">Start here · no later phase is required.</p>
      )}
      {linksLoaded && link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-md border border-border-accent px-4 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-accent hover:bg-accent-glow"
        >
          {isDiagnostic ? "Purchase Diagnostic" : `Purchase ${phase.name}`} →
        </a>
      ) : linksLoaded ? (
        <p className="font-mono text-xs text-text-muted">Checkout link unavailable. Contact hello@signal-and-friction.com.</p>
      ) : (
        <p className="font-mono text-xs text-text-muted">Loading checkout…</p>
      )}
    </article>
  );
}
