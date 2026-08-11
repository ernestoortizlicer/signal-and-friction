"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";

interface CheckoutIntakeFormProps {
  offerPriceId: string;
  offerName: string;
  priceLabel: string;
}

interface IntakeState {
  companyName: string;
  contactName: string;
  contactEmail: string;
  industry: string;
  targetUrl: string;
  scopeBrief: string;
}

const EMPTY_INTAKE: IntakeState = {
  companyName: "",
  contactName: "",
  contactEmail: "",
  industry: "",
  targetUrl: "",
  scopeBrief: "",
};

const FIELD_CLASS =
  "mt-2 w-full rounded border border-[#D4A853]/15 bg-[#050403] px-3 py-3 font-mono text-sm text-[#F5F0EB] outline-none transition-colors placeholder:text-[#4E463F] focus:border-[#D4A853]/55";

export default function CheckoutIntakeForm({
  offerPriceId,
  offerName,
  priceLabel,
}: CheckoutIntakeFormProps) {
  const searchParams = useSearchParams();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const [requestId] = useState(() => crypto.randomUUID());
  const [intake, setIntake] = useState<IntakeState>(EMPTY_INTAKE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralCode = useMemo(
    () => searchParams.get("client_reference_id")?.trim() || null,
    [searchParams]
  );

  function update<K extends keyof IntakeState>(field: K, value: IntakeState[K]) {
    setIntake((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const turnstileToken = new FormData(event.currentTarget)
        .get("cf-turnstile-response")
        ?.toString()
        .trim();
      if (!turnstileToken) {
        throw new Error("Complete the human verification before continuing.");
      }
      const storedReferral = window.localStorage.getItem("sf_referral_ref")?.trim() || null;
      const response = await fetch("/api/commercial/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          offerPriceId,
          ...intake,
          referralCode: referralCode || storedReferral,
          turnstileToken,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { checkoutUrl?: string; error?: string }
        | null;

      if (!response.ok || !result?.checkoutUrl) {
        throw new Error(result?.error || "Checkout could not be prepared. Please try again.");
      }

      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout could not be prepared.");
      setSubmitting(false);
      const turnstile = (window as typeof window & { turnstile?: { reset: () => void } }).turnstile;
      turnstile?.reset();
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-[#D4A853]/20 bg-[#0E0C0A]/95 p-6 shadow-2xl shadow-black/30 sm:p-8"
    >
      <div className="mb-7 border-b border-[#D4A853]/10 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D4A853]/70">
          Engagement intake
        </p>
        <h2 className="mt-2 font-serif text-2xl font-bold text-white">Tell us what is real.</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6F65]">
          All fields are required. Payment opens only after the system has created
          a valid engagement for {offerName}.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B0A89E]">
          Company name
          <input
            required
            minLength={2}
            maxLength={120}
            autoComplete="organization"
            className={FIELD_CLASS}
            value={intake.companyName}
            onChange={(event) => update("companyName", event.target.value)}
            placeholder="Acme, Inc."
          />
        </label>

        <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B0A89E]">
          Your name
          <input
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className={FIELD_CLASS}
            value={intake.contactName}
            onChange={(event) => update("contactName", event.target.value)}
            placeholder="Full name"
          />
        </label>

        <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B0A89E]">
          Work email
          <input
            required
            type="email"
            maxLength={254}
            autoComplete="email"
            className={FIELD_CLASS}
            value={intake.contactEmail}
            onChange={(event) => update("contactEmail", event.target.value)}
            placeholder="you@company.com"
          />
        </label>

        <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#B0A89E]">
          Industry
          <input
            required
            minLength={2}
            maxLength={120}
            autoComplete="organization-title"
            className={FIELD_CLASS}
            value={intake.industry}
            onChange={(event) => update("industry", event.target.value)}
            placeholder="B2B SaaS"
          />
        </label>
      </div>

      <label className="mt-5 block font-mono text-[11px] uppercase tracking-[0.16em] text-[#B0A89E]">
        Funnel URL to diagnose
        <input
          required
          type="url"
          maxLength={2048}
          inputMode="url"
          autoComplete="url"
          pattern="https://.*"
          className={FIELD_CLASS}
          value={intake.targetUrl}
          onChange={(event) => update("targetUrl", event.target.value)}
          placeholder="https://your-product.com/pricing"
        />
        <span className="mt-1.5 block normal-case tracking-normal text-[#5F564E]">
          HTTPS only. Use the exact page or flow where the decision breaks down.
        </span>
      </label>

      <label className="mt-5 block font-mono text-[11px] uppercase tracking-[0.16em] text-[#B0A89E]">
        What decision or drop-off should we investigate?
        <textarea
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          className={`${FIELD_CLASS} resize-y leading-6`}
          value={intake.scopeBrief}
          onChange={(event) => update("scopeBrief", event.target.value)}
          placeholder="Describe the user decision, what you observe, and what remains unknown."
        />
      </label>

      {error && (
        <div role="alert" className="mt-5 rounded border border-[#C85C5C]/30 bg-[#C85C5C]/5 p-3 font-mono text-xs leading-5 text-[#E48B8B]">
          {error}
        </div>
      )}

      {turnstileSiteKey ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <div className="mt-6 flex justify-center">
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-action="commercial_checkout"
              data-theme="dark"
              data-size="flexible"
            />
          </div>
        </>
      ) : (
        <div role="alert" className="mt-6 rounded border border-[#C85C5C]/30 bg-[#C85C5C]/5 p-3 font-mono text-xs text-[#E48B8B]">
          Checkout is not configured for human verification.
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !turnstileSiteKey}
        className="mt-7 w-full rounded bg-[#D4A853] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#0A0908] transition-all hover:bg-[#E8C97A] disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Creating engagement…" : `Continue to secure payment · ${priceLabel}`}
      </button>

      <p className="mt-4 text-center font-mono text-[10px] leading-5 text-[#5F564E]">
        No charge occurs on this form. Stripe opens only after intake, offer,
        price, and analyst assignment pass server validation.
      </p>
    </form>
  );
}
