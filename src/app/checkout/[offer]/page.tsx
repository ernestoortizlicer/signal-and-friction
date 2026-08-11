import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ALL_LADDERS, formatPriceUsd } from "@/lib/offer-catalog";
import CheckoutIntakeForm from "./CheckoutIntakeForm";

const PUBLIC_DIAGNOSTICS = ALL_LADDERS.filter((phase) => phase.order === 1);

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLIC_DIAGNOSTICS.map((phase) => ({ offer: phase.priceId }));
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ offer: string }>;
}) {
  const { offer } = await params;
  const phase = PUBLIC_DIAGNOSTICS.find((candidate) => candidate.priceId === offer);

  if (!phase) notFound();

  return (
    <main className="min-h-screen bg-[#0A0908] px-5 py-12 text-[#F5F0EB] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-center justify-between gap-4 border-b border-[#D4A853]/10 pb-5">
          <Link
            href="/pricing"
            className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]/80 transition-colors hover:text-[#D4A853]"
          >
            ← Pricing
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5C9A6B]">
            Secure intake · payment follows
          </span>
        </header>

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <section className="space-y-6 lg:sticky lg:top-10">
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[#D4A853]/70">
                {phase.segment.toUpperCase()} · Diagnostic
              </p>
              <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">
                Start with the real context.
              </h1>
              <p className="mt-5 font-mono text-sm leading-7 text-[#B0A89E]">
                We create the engagement before Stripe. The details below become the
                intake record your assigned analyst works from; nothing is guessed from
                an email address or hostname.
              </p>
            </div>

            <div className="rounded border border-[#D4A853]/15 bg-[#D4A853]/[0.03] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#7A6F65]">
                    {phase.name}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#D4A853]">
                    {formatPriceUsd(phase)}
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5C9A6B]">
                  One-time
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#B0A89E]">{phase.scope}</p>
            </div>

            <ul className="space-y-3 font-mono text-xs leading-6 text-[#7A6F65]">
              <li><span className="mr-2 text-[#D4A853]">01</span> Real intake is recorded before checkout.</li>
              <li><span className="mr-2 text-[#D4A853]">02</span> One accountable analyst is assigned.</li>
              <li><span className="mr-2 text-[#D4A853]">03</span> Payment activates this exact engagement only.</li>
            </ul>
          </section>

          <Suspense
            fallback={
              <div className="rounded-lg border border-[#D4A853]/15 p-8 font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]/70">
                Preparing intake…
              </div>
            }
          >
            <CheckoutIntakeForm
              offerPriceId={phase.priceId}
              offerName={`${phase.segment.toUpperCase()} ${phase.name}`}
              priceLabel={formatPriceUsd(phase)}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
