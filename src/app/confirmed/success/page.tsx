"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Verification = {
  verified: boolean;
  canonicalRecorded: boolean;
  status: string | null;
  paymentStatus: string | null;
};

export default function SuccessPage() {
  return (
    <Suspense fallback={<VerificationShell title="Preparing payment verification…" body="Loading the checkout return state." />}>
      <CheckoutVerification />
    </Suspense>
  );
}

function CheckoutVerification() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [verification, setVerification] = useState<Verification | null>(null);
  const [checking, setChecking] = useState(Boolean(sessionId));

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}`);
        const result = await response.json();
        if (!cancelled) {
          setVerification(
            response.ok
              ? result
              : { verified: false, canonicalRecorded: false, status: null, paymentStatus: null },
          );
        }
      } catch {
        if (!cancelled) {
          setVerification({ verified: false, canonicalRecorded: false, status: null, paymentStatus: null });
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const stripeVerified = verification?.verified === true;
  const canonicalRecorded = verification?.canonicalRecorded === true;

  return (
    <main className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-xl border border-border-accent bg-surface p-8 sm:p-10 space-y-7">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Checkout return</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            {checking
              ? "Verifying your Checkout Session…"
              : canonicalRecorded
                ? "Payment recorded. Your delivery window can begin."
                : stripeVerified
                  ? "Stripe confirms the payment. Recording is still processing."
                  : "We can’t confirm a payment from this return link."}
          </h1>
          <p className="text-text-body leading-relaxed">
            {canonicalRecorded
              ? "The payment exists in Signal & Friction’s canonical payment state. Downstream workflow state must derive from that record, not from this browser redirect."
              : stripeVerified
                ? "Stripe reports the Checkout Session as paid, but our webhook-backed payment record is not visible yet. Do not treat the diagnostic as started until canonical recording completes."
                : "A success-page URL is not payment evidence. If you completed Checkout, use the exact redirect from Stripe or contact support so we can verify the canonical payment record."}
          </p>
        </div>

        <div className="rounded-md border border-border-hi bg-bg/50 p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Payment truth</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <State label="Stripe Checkout" value={checking ? "Checking" : stripeVerified ? "Paid" : "Unverified"} />
            <State label="Canonical payment record" value={checking ? "Checking" : canonicalRecorded ? "Recorded" : "Pending / unavailable"} />
          </div>
          <p className="text-sm leading-relaxed text-text-body">
            The 72-hour delivery commitment starts from canonical payment truth. Analysis stages and delivery status are never marked complete from elapsed time alone.
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

function VerificationShell({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-xl border border-border-accent bg-surface p-8 sm:p-10 space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Checkout return</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-text-body">{body}</p>
      </section>
    </main>
  );
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-hi p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{value}</p>
    </div>
  );
}
