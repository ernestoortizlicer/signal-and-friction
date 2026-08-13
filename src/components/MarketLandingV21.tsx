"use client";

import Link from "next/link";
import { getMarketProfile, type MarketSurfaceId } from "@/lib/market-profiles";
import { PUBLIC_CLAIMS } from "@/lib/public-claims";

export default function MarketLandingV21({ marketId }: { marketId: MarketSurfaceId }) {
  const profile = getMarketProfile(marketId);

  return (
    <main className="min-h-screen bg-bg text-text-primary">
      <header className="border-b border-border-hi">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            Signal &amp; Friction
          </span>
          <nav className="flex items-center gap-5 font-mono text-xs text-text-muted">
            <Link href="/portfolio" className="hover:text-text-primary">Method</Link>
            <Link href="/scan" className="hover:text-text-primary">Free scan</Link>
            <Link href="/pricing" className="hover:text-text-primary">Pricing</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[72vh] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-7">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">{profile.heroEyebrow}</p>
          <h1 className="max-w-3xl text-balance font-hero text-5xl font-bold leading-[0.98] tracking-[-0.04em] lg:text-6xl">
            {profile.heroHeadline}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-text-body">{profile.heroSubhead}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/scan" className="rounded-md bg-accent px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-bg">
              Run the free scan
            </Link>
            <Link href="/pricing" className="rounded-md border border-border-accent px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-accent">
              See diagnostic options
            </Link>
          </div>
          <div className="max-w-2xl space-y-2 font-mono text-xs leading-relaxed text-text-muted">
            <p>I&apos;m Ernesto Ortiz Licer. I run Signal &amp; Friction independently.</p>
            <p>{profile.marketNote}</p>
          </div>
        </div>

        <aside className="rounded-xl border border-border-accent bg-surface/80 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">Evidence boundary</p>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-text-body">
            <p>{PUBLIC_CLAIMS.evidenceRanked.copy}</p>
            <p>{PUBLIC_CLAIMS.abstention.copy}</p>
            <p>{PUBLIC_CLAIMS.specificityGuarantee.copy}</p>
          </div>
          <div className="mt-6 border-t border-border-hi pt-5">
            <Link href="/scan" className="font-mono text-xs text-accent hover:underline">
              Free Scan = technical observation, not the paid diagnosis →
            </Link>
          </div>
        </aside>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center font-mono text-xs text-text-muted">
        {PUBLIC_CLAIMS.async72h.copy} · {profile.label}
      </footer>
    </main>
  );
}
