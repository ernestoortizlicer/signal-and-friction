"use client";

import { getMarketProfile, type MarketSurfaceId } from "@/lib/market-profiles";

export default function MarketLanding({ marketId }: { marketId: MarketSurfaceId }) {
  const profile = getMarketProfile(marketId);
  return (
    <main className="min-h-screen bg-bg text-text-primary">
      <section className="max-w-6xl mx-auto px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{profile.heroEyebrow}</p>
        <h1 className="mt-4 text-4xl font-bold">{profile.heroHeadline}</h1>
        <p className="mt-4 text-text-body">{profile.heroSubhead}</p>
      </section>
    </main>
  );
}
