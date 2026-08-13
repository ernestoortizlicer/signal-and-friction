import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-xl border border-border-accent bg-surface p-8 sm:p-10 space-y-7">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Checkout return received</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            We&apos;re verifying the payment server-side.
          </h1>
          <p className="text-text-body leading-relaxed">
            This page does not treat a browser redirect as payment evidence. Signal &amp; Friction starts the diagnostic delivery window only after the Stripe payment is recorded in our canonical payment state.
          </p>
        </div>

        <div className="rounded-md border border-border-hi bg-bg/50 p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">What happens next</p>
          <p className="text-sm leading-relaxed text-text-body">
            After the payment event is recorded, you receive the payment confirmation and the 72-hour delivery window begins. We do not display invented analysis phases or mark work complete based on elapsed time alone.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/" className="rounded-md bg-accent px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-bg">
            Return home
          </Link>
          <a href="mailto:hello@signal-and-friction.com" className="rounded-md border border-border-accent px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-accent">
            Payment support
          </a>
        </div>
      </section>
    </main>
  );
}
