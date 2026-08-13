"use client";

import Link from "next/link";
import { getMarketProfile, type MarketSurfaceId } from "@/lib/market-profiles";

export default function MarketLanding({ marketId }: { marketId: MarketSurfaceId }) {
  const profile = getMarketProfile(marketId);
  return (
    <main className="min-h-screen bg-bg text-text-primary">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
        <Link href={profile.route}>Signal &amp; Friction</Link>
        <nav className="flex gap-4">
          <Link href="/scan">Free scan</Link>
          <Link href="/portfolio">Method samples</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
      </header>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <p>{profile.heroEyebrow}</p>
        <h1>{profile.heroHeadline}</h1>
        <p>{profile.heroSubhead}</p>
      </section>
    </main>
  );
}
