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
  const [referralCopied, setReferralCopied] = useState(false);
  const referralLink = `https://signal-and-friction.com/?ref=${refId}`;
  const [paymentLink, setPaymentLink] = useState(
    isMicrodosing
      ? "https://buy.stripe.com/mock_microdosing_beta_diagnostic"
      : "https://buy.stripe.com/mock_high_ticket_beta_diagnostic"
  );

  // Carry the inbound referral (stored as `sf_referral_ref` on landing) into Stripe.
  // Stripe Payment Links surface `client_reference_id` on the webhook's checkout
  // session, which is how the referral actually reaches our payment infrastructure.
  // Resolved on the client at click time to avoid an SSR/CSR hydration mismatch.
  const buildCheckoutHref = () => {
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
          if (data && data.length > 0) {
            setPaymentLink(data[0].payment_link_url);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch Stripe payment link from database, using fallback.", err);
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
        className="w-64 border-r border-[#D4A853]/8 bg-[#0A0908] flex flex-col py-6 px-5 flex-shrink-0 hidden md:flex"
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

        {/* Protocol */}
        <div className="mb-6">
          <div className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase mb-1">Protocol</div>
          <div className="font-mono text-xs text-[#D4A853]">
            {isMicrodosing ? "MICRODOSING DWY" : "HIGH-TICKET DFY"}
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
      <div className="flex-1 flex flex-col items-center justify-center relative">
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {isMicrodosing ? (
                <>
                  Autonomy Portal <span className="text-[#D4A853] glow-text">Pending Activation</span>
                </>
              ) : (
                <>
                  Diagnostic <span className="text-[#D4A853] glow-text">Initiated</span>
                </>
              )}
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
            <p className="text-sm text-[#B0A89E] font-mono leading-relaxed">
              {isMicrodosing
                ? "The diagnostic fee unlocks your full conversion framework — interactive modules, self-paced checklists, and a Loom walkthrough. Completely async, starting immediately."
                : "The diagnostic fee activates your 72-hour clinical window. You receive a precision friction report and Loom walkthrough — no calls, no meetings. If we don’t identify three specific friction points, you pay nothing."
              }
            </p>
            <div className="pt-2">
              <a
                href={paymentLink}
                onClick={(e) => {
                  const href = buildCheckoutHref();
                  if (href !== paymentLink) {
                    e.preventDefault();
                    window.location.href = href;
                  }
                }}
                className="inline-block w-full py-3 bg-[#D4A853] text-[#0A0908] font-mono text-xs font-bold uppercase tracking-[0.25em] transition-all hover:bg-[#E8C97A] active:scale-[0.98] glow-accent"
              >
                Pay Diagnostic Fee (${amount}) →
              </a>
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

          {/* Protocol details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            {[
              isMicrodosing ? "Interactive checklist." : "Zero calls. Zero meetings. Fully async.",
              isMicrodosing ? "Full conversion modules." : "Manual funnel audit: landing → checkout.",
              isMicrodosing ? "Complete self-serve autonomy." : "Clinical report + Loom in your inbox.",
            ].map((item, i) => (
              <div key={i} className="border border-[#D4A853]/5 px-3 py-2.5 font-mono text-xs text-[#B0A89E] leading-relaxed">
                <span className="text-[#5C9A6B] mr-1.5">●</span>{item}
              </div>
            ))}
          </div>

          {/* Referral Engine */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="w-full border border-[#D4A853]/10 bg-[#D4A853]/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-[#D4A853] tracking-[0.2em] uppercase mb-1">
                  Referral Protocol
                </p>
                <p className="font-mono text-xs text-[#F5F0EB] leading-relaxed mb-0.5">
                  Refer a founder. Earn a $500 Diagnostic Credit.
                </p>
                <p className="font-mono text-xs text-[#B0A89E] leading-relaxed">
                  Share your link. Credit activates when they complete a paid phase. Valid on orders $750 and above.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-2 border border-[#D4A853]/15 px-2.5 py-1.5 bg-[#0A0908]">
                  <span className="font-mono text-xs text-[#B0A89E] truncate max-w-[160px]">
                    {referralLink}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink).then(() => {
                      setReferralCopied(true);
                      setTimeout(() => setReferralCopied(false), 2000);
                    });
                  }}
                  className="font-mono text-xs tracking-[0.15em] uppercase px-3 py-1.5 bg-[#D4A853] text-[#0A0908] hover:bg-[#E8C97A] transition-colors duration-150"
                >
                  {referralCopied ? "Copied." : "Copy Link"}
                </button>
              </div>
            </div>
          </motion.div>
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
