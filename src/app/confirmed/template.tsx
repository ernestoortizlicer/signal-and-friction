"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ConfirmedTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname()?.replace(/\/$/, "") || "";

  // /confirmed/success has its own read-only Stripe + canonical-payment
  // verification flow. Only the legacy pre-payment /confirmed route is
  // intercepted here so its old hard-coded price/SLA UI never executes.
  if (pathname !== "/confirmed") return children;

  return (
    <main className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-xl border border-border-accent bg-surface p-8 sm:p-10 space-y-7">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Intake received</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            Your context is queued for review.
          </h1>
          <p className="text-text-body leading-relaxed">
            Intake is not payment and it is not a diagnosis. No 72-hour delivery clock starts on this page, and no analysis stage is presented as active until the underlying workflow records it.
          </p>
        </div>

        <div className="rounded-md border border-border-hi bg-bg/50 p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Commercial truth</p>
          <p className="text-sm leading-relaxed text-text-body">
            Current Diagnostic options, scope and price are maintained on the Pricing page. Stripe and the canonical payment record own payment truth; the delivery window begins only after that state exists.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/pricing" className="rounded-md bg-accent px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-bg">
            View current diagnostic options
          </Link>
          <Link href="/portfolio" className="rounded-md border border-border-accent px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-accent">
            Review the method
          </Link>
        </div>
      </section>
    </main>
  );
}
