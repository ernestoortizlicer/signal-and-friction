"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const Oscilloscope = dynamic(() => import("@/components/Oscilloscope"), { ssr: false });

/* ═══════════════════════════════════════════════════════════════════════════════
   TELEMETRY SCREEN — Satellite Ground Station
   ═══════════════════════════════════════════════════════════════════════════════ */

const PHASES = [
  { id: "RCV", label: "Signal Received", status: "complete" as const },
  { id: "QUE", label: "Queued for Analysis", status: "complete" as const },
  { id: "SCN", label: "Funnel Scan Active", status: "active" as const },
  { id: "RPT", label: "Report Compilation", status: "pending" as const },
  { id: "TXM", label: "Transmission to Inbox", status: "pending" as const },
];

function ConfirmedContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";
  const segment = searchParams.get("segment") || "high_ticket";
  const isMicrodosing = segment === "microdosing" || segment === "autonomy";
  const amount = isMicrodosing ? 350 : 2000;

  const [timeLeft, setTimeLeft] = useState(72 * 60 * 60);
  const [refId] = useState(() => Math.random().toString(36).substring(2, 10).toUpperCase());
  // No fallback URL — a fake one is worse than none, since it renders as a
  // clickable button that silently fails at Stripe. null means "not ready
  // yet" or "failed to load," both rendered as a non-broken waiting/error
  // state instead of a dead link.
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentLinkError, setPaymentLinkError] = useState(false);

  // Carry the inbound referral (stored as `sf_referral_ref` on landing) into Stripe.
  // Stripe Payment Links surface `client_reference_id` on the webhook's checkout
  // session, which is how the referral actually reaches our payment infrastructure.
  // Resolved on the client at click time to avoid an SSR/CSR hydration mismatch.
  const buildCheckoutHref = () => {
    if (!paymentLink) return null;
    if (typeof window === "undefined") return paymentLink;
    const inboundRef = localStorage.getItem("sf_referral_ref");
    if (!inboundRef) return paymentLink;
    const sep = paymentLink.includes("?") ? "&" : "?";
    return `${paymentLink}${sep}client_reference_id=${encodeURIComponent(inboundRef)}`;
  };

  useEffect(() => {
    async function fetchLink() {
      try {
        const priceId = isMicrodosing ? "price_dwy_beta_diagnostic" : "price_dfy_beta_diagnostic";
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        const res = await fetch(`${supabaseUrl}/rest/v1/stripe_payment_links?price_id=eq.${priceId}&select=payment_link_url`, {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          const url = data?.[0]?.payment_link_url;
          // A link containing "mock" is a seed placeholder, not a real Stripe
          // link — never present it as clickable. Treat it the same as "not found."
          if (url && !url.includes("mock")) {
            setPaymentLink(url);
          } else {
            console.error(`Stripe payment link for ${priceId} is missing or still a mock placeholder.`);
            setPaymentLinkError(true);
          }
        } else {
          setPaymentLinkError(true);
        }
      } catch (err) {
        console.warn("Failed to fetch Stripe payment link from database.", err);
        setPaymentLinkError(true);
      }
    }
    fetchLink();
  }, [isMicrodosing]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hrs = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
  const mins = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="h-screen w-screen bg-[#0A0908] text-[#F5F0EB] overflow-hidden relative crt-lines flex">

      {/* LEFT COLUMN — Mission Parameters */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-64 border-r border-[#D4A853]/8 bg-[#0A0908] flex flex-col py-6 px-5 flex-shrink-0 hidden md:flex overflow-y-auto"
      >
        <div className="font-mono text-xs text-[#D4A853]/70 tracking-[0.35em] uppercase mb-6">
          Mission Parameters
        </div>

        {/* Ref ID */}
        <div className="mb-4">
          <div className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase mb-1">Ref ID</div>
          <div className="font-mono text-xs text-[#D4A853]/70 tracking-wider">{refId}</div>
        </div>

        {/* Email */}
        <div className="mb-4">
          <div className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase mb-1">Target</div>
          <div className="font-mono text-xs text-[#F5F0EB] tracking-wide break-all">{email}</div>
        </div>

        {/* Protocol — Phase 6.1: was "MICRODOSING DWY" / "HIGH-TICKET DFY",
            leaking an internal-only label ("microdosing") onto a
            customer-facing page. Both lines start with the identical
            Diagnostic; the only real difference at this exact purchase is
            who executes the eventual fix. */}
        <div className="mb-6">
          <div className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase mb-1">Protocol</div>
          <div className="font-mono text-xs text-[#D4A853]">
            {isMicrodosing ? "DWY — YOU EXECUTE" : "DFY — WE EXECUTE"}
          </div>
        </div>

        {/* Phase timeline */}
        <div className="flex-1">
          <div className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase mb-3">Phases</div>
          {PHASES.map((phase, i) => (
            <div key={phase.id} className="flex items-start gap-3 mb-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${
                    phase.status === "complete"
                      ? "bg-[#5C9A6B]"
                      : phase.status === "active"
                      ? "bg-[#D4A853] pulse-cyan"
                      : "bg-[#2A2218]"
                  }`}
                />
                {i < PHASES.length - 1 && (
                  <div className={`w-px h-5 ${phase.status === "complete" ? "bg-[#5C9A6B]/20" : "bg-[#2A2218]/40"}`} />
                )}
              </div>
              <div className="pb-3">
                <span className="font-mono text-xs text-[#7A6F65] tracking-[0.15em] uppercase mr-2">
                  {phase.id}
                </span>
                <span className={`font-mono text-xs ${
                  phase.status === "active" ? "text-[#D4A853]" : phase.status === "complete" ? "text-[#7A6F65]" : "text-[#7A6F65]"
                }`}>
                  {phase.label}
                  {phase.status === "active" && <span className="animate-blink ml-1">▊</span>}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Link href="/" className="font-mono text-xs text-[#7A6F65] hover:text-[#B0A89E] transition-colors tracking-[0.15em] uppercase">
          ← Return
        </Link>
      </motion.div>

      {/* MAIN — Telemetry Screen */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-y-auto py-8">
        {/* Faint grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(212,168,83,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="z-10 flex flex-col items-center gap-8 max-w-2xl w-full px-6"
        >
          {/* Status */}
          <div className="text-center space-y-2">
            <div className="font-mono text-xs text-[#5C9A6B] tracking-[0.3em] uppercase glow-text-green">
              {isMicrodosing ? "Intake Completed" : "Protocol Active"}
            </div>
            {/* Phase 6.1 — this page fires for the first purchase on
                either line (price_dwy_beta_diagnostic /
                price_dfy_beta_diagnostic, see fetchLink below): always a
                Diagnostic. The DWY branch previously said "Autonomy
                Portal Pending Activation," describing a completely
                different, later, $1,500 purchase — factually wrong for
                what was just bought. */}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Diagnostic <span className="text-[#D4A853] glow-text">Initiated</span>
            </h1>
          </div>

          {/* Oscilloscope */}
          <div className="w-full border border-[#D4A853]/8 bg-[#0A0908]/80 p-4">
            <div className="font-mono text-xs text-[#B0A89E] tracking-[0.25em] uppercase mb-2">
              Signal Monitor — Live Trace
            </div>
            <Oscilloscope width={560} height={140} color="#D4A853" />
          </div>

          {/* Payment Card / Direct CTA */}
          <div className="border border-[#D4A853]/10 bg-[#0A0908]/95 px-8 py-6 max-w-md text-center space-y-5 glow-border">
            <div className="font-mono text-xs text-[#B0A89E] tracking-[0.2em] uppercase">
              Secure Payment Pending
            </div>
            {/* Phase 6.1 — two real contradictions fixed here:
                (1) the DWY branch described "full conversion framework —
                interactive modules, self-paced checklists," which is the
                Autonomy Kit's scope (a later, $1,500 purchase), not what
                a $350 Diagnostic delivers.
                (2) the DFY branch promised "three specific friction
                points," directly contradicting the actual product and
                guarantee — one dominant friction, not several — stated
                everywhere else (pricing page, offer-catalog.ts scope
                text, the Specificity Guarantee itself). */}
            <p className="text-sm text-[#B0A89E] font-mono leading-relaxed">
              The diagnostic fee activates your 72-hour clinical window. You receive one
              evidence-ranked dominant friction, the recommended decision, what not to do, and a
              Loom walkthrough — no calls, no meetings. If the finding isn&apos;t specific to
              your product, you pay nothing.
            </p>
            <div className="pt-2">
              {paymentLink ? (
                <a
                  href={paymentLink}
                  onClick={(e) => {
                    const href = buildCheckoutHref();
                    if (href && href !== paymentLink) {
                      e.preventDefault();
                      window.location.href = href;
                    }
                  }}
                  className="inline-block w-full py-3 bg-[#D4A853] text-[#0A0908] font-mono text-xs font-bold uppercase tracking-[0.25em] transition-all hover:bg-[#E8C97A] active:scale-[0.98] glow-accent"
                >
                  Pay Diagnostic Fee (${amount}) →
                </a>
              ) : paymentLinkError ? (
                <div className="w-full py-3 border border-[#C85C5C]/30 bg-[#C85C5C]/5 font-mono text-xs text-[#C85C5C] tracking-wide">
                  Payment link unavailable right now. Email{" "}
                  <a href="mailto:hello@signal-and-friction.com" className="underline">
                    hello@signal-and-friction.com
                  </a>{" "}
                  and we&apos;ll send it directly.
                </div>
              ) : (
                <div className="w-full py-3 bg-[#D4A853]/20 text-[#D4A853]/60 font-mono text-xs font-bold uppercase tracking-[0.25em] text-center">
                  Preparing secure payment link…
                </div>
              )}
            </div>
          </div>

          {/* Time to Delivery Countdown (DFY Only) */}
          {!isMicrodosing && (
            <div className="border border-[#D4A853]/8 bg-[#0A0908]/80 px-8 py-5 glow-border">
              <div className="font-mono text-xs text-[#B0A89E] tracking-[0.3em] uppercase mb-3 text-center">
                Time to Delivery (Post-Payment)
              </div>
              <div className="flex items-center justify-center gap-1 font-mono">
                {[
                  { val: hrs, unit: "HRS" },
                  { val: mins, unit: "MIN" },
                  { val: secs, unit: "SEC" },
                ].map((block, i) => (
                  <div key={block.unit} className="flex items-center">
                    <div className="text-center px-2">
                      <div className="text-[2.5rem] md:text-[3.2rem] font-bold text-[#5C9A6B] leading-none tabular-nums glow-text-green">
                        {block.val}
                      </div>
                      <div className="text-xs text-[#7A6F65] tracking-[0.3em] mt-1">{block.unit}</div>
                    </div>
                    {i < 2 && <span className="text-xl text-[#7A6F65] font-light pb-4 animate-blink">:</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Protocol details — Phase 6.1: the DWY branch previously
              claimed "Full conversion modules." / "Complete self-serve
              autonomy.", both Autonomy Kit scope, not Diagnostic. Both
              lines get the same three facts now — accurate for either,
              since Diagnostic's scope doesn't differ by line. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            {[
              "Zero calls. Zero meetings. Fully async.",
              "One evidence-ranked dominant friction, not a checklist.",
              "Clinical report + Loom in your inbox.",
            ].map((item, i) => (
              <div key={i} className="border border-[#D4A853]/5 px-3 py-2.5 font-mono text-xs text-[#B0A89E] leading-relaxed">
                <span className="text-[#5C9A6B] mr-1.5">●</span>{item}
              </div>
            ))}
          </div>

          {/*
            Referral Engine — removed 2026-07-31, not disabled-and-hidden.
            This widget promised a specific $500 credit to every lead with a
            working "Copy Link" button, but nothing behind it could honor
            that: REFERRALS_LIVE is false (functions/api/_referral-credit.ts)
            so the webhook never writes to the referrals table, which
            doesn't exist live anyway (same unapplied-migration pattern as
            Learning's hyper_leap_sessions). Worse, refId above is a
            client-side Math.random() string never registered against this
            lead's identity anywhere — even flipping REFERRALS_LIVE on
            wouldn't answer "who does $500 actually go to." Re-add only
            after: (1) the referrals migration is applied and the flag is
            flipped, and (2) refId (or an equivalent) is persisted
            server-side against the referring lead, not just embedded in a
            URL. Inbound-referral capture (buildCheckoutHref above) is
            unaffected — that's silent attribution tracking, not a promise
            to anyone, and works today independent of this widget.
          */}
        </motion.div>
      </div>
    </div>
  );
}

export default function ConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-[#0A0908] flex items-center justify-center">
          <div className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-ping" />
            Loading telemetry...
          </div>
        </div>
      }
    >
      <ConfirmedContent />
    </Suspense>
  );
}
