"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

interface CommercialStatus {
  engagementId: string;
  offerName: string;
  offerLine: "dwy" | "dfy";
  offerPhase: string;
  billingState: string;
  deliveryState: string;
  headline: string;
  message: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; status: CommercialStatus }
  | { kind: "error"; message: string };

export default function CheckoutStatus() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id")?.trim() || "";
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/commercial/status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        const result = (await response.json().catch(() => null)) as
          | (CommercialStatus & { pending?: boolean; error?: string })
          | null;

        if (cancelled) return;

        if (response.status === 202 || result?.pending) {
          if (attempts < 16) {
            timer = setTimeout(load, 2000);
            return;
          }
          setState({
            kind: "error",
            message: "Payment is still being verified. Keep this page and check again shortly; no delivery claim has been made yet.",
          });
          return;
        }

        if (!response.ok || !result?.engagementId) {
          throw new Error(result?.error || "We could not verify this checkout yet.");
        }

        setState({ kind: "ready", status: result });
      } catch (cause) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: cause instanceof Error ? cause.message : "We could not verify this checkout yet.",
          });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <StatusShell eyebrow="Verification incomplete" tone="error">
        <h1 className="font-serif text-3xl font-bold text-white">No checkout session was provided.</h1>
        <p className="mt-4 text-sm leading-7 text-[#B0A89E]">
          This page only reports state for a Stripe redirect tied to a real commercial engagement.
        </p>
      </StatusShell>
    );
  }

  if (state.kind === "loading") {
    return (
      <StatusShell eyebrow="Verifying payment" tone="pending">
        <h1 className="font-serif text-3xl font-bold text-white">Waiting for durable confirmation.</h1>
        <p className="mt-4 text-sm leading-7 text-[#B0A89E]">
          Stripe has redirected you, but this page will not claim success until the
          payment and its exact engagement are committed.
        </p>
      </StatusShell>
    );
  }

  if (state.kind === "error") {
    return (
      <StatusShell eyebrow="Verification incomplete" tone="error">
        <h1 className="font-serif text-3xl font-bold text-white">No false success state.</h1>
        <p className="mt-4 text-sm leading-7 text-[#B0A89E]">{state.message}</p>
        <p className="mt-5 font-mono text-xs leading-6 text-[#7A6F65]">
          If Stripe shows a charge and this remains unresolved, email{" "}
          <a className="text-[#D4A853] underline" href="mailto:hello@signal-and-friction.com">
            hello@signal-and-friction.com
          </a>{" "}
          with the Checkout Session ID shown in your browser URL.
        </p>
      </StatusShell>
    );
  }

  const { status } = state;
  const isPaid = status.billingState === "paid";

  return (
    <StatusShell eyebrow={isPaid ? "Payment and entitlement verified" : "Payment status recorded"} tone={isPaid ? "success" : "pending"}>
      <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">{status.headline}</h1>
      <p className="mt-4 text-sm leading-7 text-[#B0A89E]">{status.message}</p>
      <dl className="mt-7 grid gap-3 border-y border-[#D4A853]/10 py-5 font-mono text-xs sm:grid-cols-2">
        <div>
          <dt className="uppercase tracking-[0.18em] text-[#5F564E]">Engagement</dt>
          <dd className="mt-1 break-all text-[#B0A89E]">{status.engagementId}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-[#5F564E]">Offer</dt>
          <dd className="mt-1 text-[#B0A89E]">{status.offerLine.toUpperCase()} · {status.offerName}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-[#5F564E]">Billing</dt>
          <dd className="mt-1 text-[#B0A89E]">{status.billingState}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-[#5F564E]">Delivery</dt>
          <dd className="mt-1 text-[#B0A89E]">{status.deliveryState}</dd>
        </div>
      </dl>
      <Link
        href="/"
        className="mt-7 inline-block font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853] hover:underline"
      >
        Return home →
      </Link>
    </StatusShell>
  );
}

function StatusShell({
  eyebrow,
  tone,
  children,
}: {
  eyebrow: string;
  tone: "success" | "pending" | "error";
  children: ReactNode;
}) {
  const toneClass =
    tone === "success" ? "text-[#5C9A6B]" : tone === "error" ? "text-[#E48B8B]" : "text-[#D4A853]";

  return (
    <section className="w-full max-w-2xl rounded-lg border border-[#D4A853]/15 bg-[#0E0C0A]/95 p-7 shadow-2xl shadow-black/40 sm:p-10">
      <p className={`mb-4 font-mono text-[10px] uppercase tracking-[0.3em] ${toneClass}`}>
        {eyebrow}
      </p>
      {children}
    </section>
  );
}
