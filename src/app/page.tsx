"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

// Lazy-load the heavy canvas — keeps SSR clean
const WireframeCanvas = dynamic(() => import("@/components/WireframeCanvas"), {
  ssr: false,
});

const HexGrid = dynamic(() => import("@/components/HexGrid"), {
  ssr: false,
});

/* ═══════════════════════════════════════════════════════════════════════════════
   UTC CLOCK — Real-time readout
   ═══════════════════════════════════════════════════════════════════════════════ */
function UtcClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-xs text-[#D4A853]/80 tracking-[0.2em] tabular-nums glow-text">
      UTC {time}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   STEP CONFIG & OPTIONS
   ═══════════════════════════════════════════════════════════════════════════════ */
const STEPS = [
  { id: 1, code: "SYS.CAL", label: "System Calibration", desc: "Enter target URL for diagnostic scan" },
  { id: 2, code: "SIG.DET", label: "Signal Detection", desc: "Identify primary friction zone" },
  { id: 3, code: "SEG.SEL", label: "Segment Selection", desc: "Choose diagnostic delivery method" },
  { id: 4, code: "MET.ISO", label: "Metric Isolation", desc: "Isolate segment-specific metrics" },
  { id: 5, code: "DX.EXEC", label: "Diagnostic Execution", desc: "Confirm and initiate protocol" },
];

const FUNNEL_OPTIONS = [
  { key: "landing_bounce", label: "Landing Bounce", sub: "Visitors exit before engagement" },
  { key: "paywall_bounce", label: "Billing Gate", sub: "Drop-off at checkout/paywall" },
  { key: "onboarding_dropout", label: "Onboarding Failure", sub: "Setup flow never completed" },
  { key: "pricing_confusion", label: "Pricing Paralysis", sub: "Users stall on pricing page" },
];

const SEGMENT_OPTIONS = [
  { key: "concierge", label: "Done-For-You Concierge", sub: "S&F executes diagnostic & implementations. Backed by the S&F 20% Growth Guarantee™." },
  { key: "autonomy", label: "Done-With-You Autonomy", sub: "Learn the S&F methodology, build internal capacity, and earn S&F Certified™ credentials." },
  { key: "elite_us", label: "🏆 Elite Partnership (USA)", sub: "White-glove account management + priority support. For US-based SaaS only." },
];

const SEGMENT_OPTIONS_APAC = [
  { key: "concierge", label: "Done-For-You Concierge", sub: "S&F executes diagnostic & implementations. Backed by the S&F 20% Growth Guarantee™." },
  { key: "autonomy", label: "Done-With-You Autonomy", sub: "Learn the S&F methodology, build internal capacity, and earn S&F Certified™ credentials." },
  { key: "elite_sg", label: "🏆 Elite Partnership (Singapore)", sub: "White-glove account management + priority support. Optimized for APAC market dynamics." },
];

const MRR_OPTIONS = [
  { key: "low", label: "Bootstrapped ($0 - $50k MRR)", sub: "Focus on early conversion efficiency" },
  { key: "mid", label: "Scaling ($50k - $150k MRR)", sub: "A/B testing, copy refinement, pricing validation" },
  { key: "high", label: "Enterprise ($150k+ MRR)", sub: "Complex workflows, sales cycle acceleration" },
];

const EXPERTISE_OPTIONS = [
  { key: "beginner", label: "Beginner level", sub: "Need basic templates and structured diagnostics" },
  { key: "intermediate", label: "Intermediate optimizer", sub: "Understand basic heuristics, need clinical tools" },
  { key: "advanced", label: "Advanced team", sub: "Internal engineering/growth team ready to execute" },
];

// Behavioral prioritization: implicitly qualifies urgency / willingness to pay.
const URGENCY_OPTIONS = [
  { key: "now", label: "Now" },
  { key: "quarter", label: "This quarter" },
  { key: "exploring", label: "Exploring" },
];

export default function Home() {
  const router = useRouter();
  const isAPAC = typeof window !== 'undefined' && window.location.pathname === '/sg';

  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [funnelPain, setFunnelPain] = useState("");
  const [segmentSelection, setSegmentSelection] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [glitch, setGlitch] = useState(false);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [urgency, setUrgency] = useState("");

  // Get correct segment options based on region
  const segmentOptions = isAPAC ? SEGMENT_OPTIONS_APAC : SEGMENT_OPTIONS;

  // Risk Reversal Calculator states
  const [calcVisitors, setCalcVisitors] = useState(20000);
  const [calcConvRate, setCalcConvRate] = useState(1.5);
  const [calcLtv, setCalcLtv] = useState(200);

  // Capture referral code from URL and persist across Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && /^[A-Z0-9]{6,16}$/.test(ref)) {
      localStorage.setItem('sf_referral_ref', ref);
    }
  }, []);

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const { data, error } = await supabase.from("testimonials").select("*").limit(3);
        if (!error && data) setTestimonials(data);
      } catch (err) {
        console.warn("Failed to load testimonials:", err);
      }
    }
    fetchTestimonials();
  }, []);

  const triggerGlitch = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !funnelPain || !segmentSelection || !customAnswer || !email) {
      setErrorMsg("All fields required to initiate diagnostic.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      // 🔴 CRITICAL: NEW DIRECT API ENDPOINT (no Tally)
      const response = await fetch('/api/leads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          funnelPain,
          segmentSelection,
          customAnswer,
          email,
          urgency: urgency || undefined,
          region: typeof window !== 'undefined' && window.location.pathname.includes('/sg') ? 'APAC' : 'US',
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Protocol failure.');
      }

      // Fire non-blocking background tasks
      // (No longer using Tally webhook)
      
      // Redirect to confirmation
      router.push(
        `/confirmed?email=${encodeURIComponent(email)}&segment=${encodeURIComponent(result.segment || 'high_ticket')}&region=${result.region || 'US'}`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !url) { setErrorMsg("Target URL required."); return; }
    if (step === 2 && !funnelPain) { setErrorMsg("Friction zone required."); return; }
    if (step === 3 && !segmentSelection) { setErrorMsg("Segment choice required."); return; }
    if (step === 4 && !customAnswer) { setErrorMsg("Detail metric isolation required."); return; }
    setErrorMsg(null);
    triggerGlitch();
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setErrorMsg(null);
    triggerGlitch();
    setStep((s) => s - 1);
  };

  const currentStep = STEPS[step - 1];

  return (
    <main className="min-h-screen w-screen bg-[#0A0908] text-[#F5F0EB] overflow-y-auto relative crt-lines flex flex-col justify-start">
      {/* 3D Wireframe Background & Hex Grid */}
      <HexGrid />
      <WireframeCanvas />

      {/* Glitch overlay */}
      {glitch && (
        <div
          className="fixed inset-0 z-50 pointer-events-none"
          style={{ animation: "glitch 0.15s ease" }}
        >
          <div className="absolute inset-0 bg-[#D4A853]/[0.02]" />
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Diamond logo with glow */}
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L15 8L8 15L1 8Z" stroke="#D4A853" strokeWidth="1.5" fill="none" />
              <path d="M8 4L12 8L8 12L4 8Z" fill="#D4A853" fillOpacity="0.15" />
            </svg>
            <div className="absolute inset-0 blur-md bg-[#D4A853]/20 rounded-full" />
          </div>
          <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.35em] uppercase font-semibold">
            Signal &amp; Friction
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5C9A6B] pulse-cyan" style={{ boxShadow: "0 0 6px rgba(92,154,107,0.5)" }} />
            <span className="font-mono text-xs text-[#5C9A6B] tracking-[0.15em] uppercase">
              Online
            </span>
          </div>
          <UtcClock />
        </div>
      </div>

      {/* ── Main Content — Split Screen ────────────────── */}
      <div className="min-h-screen flex items-center justify-center px-6 relative z-10 pt-24 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 max-w-6xl w-full">

          {/* LEFT: Headline + Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 max-w-lg space-y-6"
          >
            <div className="space-y-2">
              <div className="font-mono text-xs text-[#D4A853]/70 tracking-[0.4em] uppercase">
                Conversion Diagnostic System v4.5
              </div>
              <h1 className="text-[2.8rem] lg:text-[3.6rem] font-bold leading-[1.0] tracking-[-0.03em]">
                Isolate the{" "}
                <span className="text-[#D4A853] glow-text">
                  single friction
                </span>{" "}
                point killing your revenue.
              </h1>
            </div>

            <p className="text-sm text-[#B0A89E] leading-relaxed max-w-md font-mono">
              Clinical B2B SaaS diagnostic. 72h async delivery.
              One finding. One fix. Supported by the S&F 20% Growth Guarantee™.
            </p>

            {/* Step indicators */}
            <div className="flex gap-1 pt-2">
              {STEPS.map((s) => (
                <div key={s.id} className="flex items-center gap-1">
                  <div
                    className={`h-1 transition-all duration-500 ${
                      s.id === step
                        ? "w-10 bg-[#D4A853]"
                        : s.id < step
                        ? "w-4 bg-[#D4A853]/30"
                        : "w-4 bg-[#2A2218]"
                    }`}
                    style={
                      s.id === step
                        ? { boxShadow: "0 0 8px rgba(212,168,83,0.4)" }
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>

            {/* Testimonials */}
            {testimonials.length > 0 && (
              <div className="pt-4 space-y-2 hidden md:block">
                {testimonials.slice(0, 2).map((t, i) => (
                  <div key={i} className="border-l border-[#D4A853]/10 pl-3 py-1">
                    <p className="text-xs text-[#B0A89E] italic leading-relaxed">
                      &ldquo;{t.quote_text}&rdquo;
                    </p>
                    <span className="text-xs font-mono text-[#D4A853]/70 uppercase tracking-wider block mt-0.5">
                      Verified Client
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* RIGHT: Premium Diagnostic Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div className="premium-diagnostic-card">
              {/* Premium Header */}
              <div className="premium-card-header">
                <div className="premium-status-indicators">
                  <div className="premium-status-dot" />
                  <div className="premium-status-dot" />
                  <div className="premium-status-dot" />
                </div>
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.25em] uppercase ml-2">
                  {currentStep.code}
                </span>
                <span className="ml-auto font-mono text-xs text-[#7A6F65] tabular-nums">
                  Step {step} of 5
                </span>
              </div>

              {/* Premium Body */}
              <div className="premium-card-body">
                {/* Step label */}
                <div className="mb-6">
                  <span className="premium-step-label">
                    {currentStep.label}
                  </span>
                  <div className="premium-step-desc">
                    {currentStep.desc}
                  </div>
                </div>

                {/* Persistent trust anchor — visible on every step */}
                <div className="mb-6 flex items-center justify-center gap-2.5 border-y border-[#D4A853]/10 py-2.5">
                  <span
                    className="w-1 h-1 rounded-full bg-[#D4A853]"
                    style={{ boxShadow: "0 0 6px rgba(212,168,83,0.6)" }}
                  />
                  <span className="font-mono text-[0.65rem] text-[#D4A853]/90 tracking-[0.25em] uppercase">
                    72h Delivery · Results Guaranteed
                  </span>
                  <span
                    className="w-1 h-1 rounded-full bg-[#D4A853]"
                    style={{ boxShadow: "0 0 6px rgba(212,168,83,0.6)" }}
                  />
                </div>

                <form onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">
                    {/* Step 1: URL */}
                    {step === 1 && (
                      <motion.div
                        key="s1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-5"
                      >
                        <input
                          type="url"
                          required
                          autoFocus
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://your-product.com"
                          aria-label="Product URL for diagnostic scan"
                          className="premium-input w-full"
                          style={{ caretColor: "#D4A853" }}
                        />
                        <div className="font-mono text-xs text-[#B0A89E] tracking-wide flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-[#5C9A6B]/50" />
                          Join 50+ B2B SaaS founders who have diagnosed their funnel.
                        </div>
                        <button
                          type="button"
                          onClick={nextStep}
                          className="premium-button w-full"
                        >
                          Scan My Funnel →
                        </button>
                      </motion.div>
                    )}

                    {/* Step 2: Funnel Drop-off */}
                    {step === 2 && (
                      <motion.div
                        key="s2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-4"
                      >
                        {FUNNEL_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => { setFunnelPain(opt.key); setErrorMsg(null); }}
                            className={`premium-option-button ${funnelPain === opt.key ? "active" : ""}`}
                          >
                            <span className="premium-option-label">{opt.label}</span>
                            <span className="premium-option-sub">{opt.sub}</span>
                          </button>
                        ))}
                        <div className="premium-divider" />
                        <div className="premium-button-group">
                          <button type="button" onClick={prevStep} className="premium-button">
                            ← Back
                          </button>
                          <button type="button" onClick={nextStep} className="premium-button">
                            Proceed →
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3: Segment Selector */}
                    {step === 3 && (
                      <motion.div
                        key="s3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-4"
                      >
                        {segmentOptions.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => { setSegmentSelection(opt.key); setCustomAnswer(""); setErrorMsg(null); }}
                            className={`premium-option-button ${segmentSelection === opt.key ? "active" : ""}`}
                          >
                            <span className="premium-option-label">{opt.label}</span>
                            <span className="premium-option-sub">{opt.sub}</span>
                          </button>
                        ))}
                        <div className="premium-divider" />
                        <div className="premium-button-group">
                          <button type="button" onClick={prevStep} className="premium-button">
                            ← Back
                          </button>
                          <button type="button" onClick={nextStep} className="premium-button">
                            Proceed →
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 4: Metric Isolation */}
                    {step === 4 && (
                      <motion.div
                        key="s4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-4"
                      >
                        {segmentSelection === "concierge" ? (
                          MRR_OPTIONS.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => { setCustomAnswer(opt.label); setErrorMsg(null); }}
                              className={`premium-option-button ${customAnswer === opt.label ? "active" : ""}`}
                            >
                              <span className="premium-option-label">{opt.label}</span>
                              <span className="premium-option-sub">{opt.sub}</span>
                            </button>
                          ))
                        ) : (
                          EXPERTISE_OPTIONS.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => { setCustomAnswer(opt.label); setErrorMsg(null); }}
                              className={`premium-option-button ${customAnswer === opt.label ? "active" : ""}`}
                            >
                              <span className="premium-option-label">{opt.label}</span>
                              <span className="premium-option-sub">{opt.sub}</span>
                            </button>
                          ))
                        )}
                        <div className="premium-divider" />
                        <div className="premium-button-group">
                          <button type="button" onClick={prevStep} className="premium-button">
                            ← Back
                          </button>
                          <button type="button" onClick={nextStep} className="premium-button">
                            Proceed →
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 5: Email + Submit */}
                    {step === 5 && (
                      <motion.div
                        key="s5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-5"
                      >
                        {/* Behavioral prioritization — urgency / willingness-to-pay signal */}
                        <div className="space-y-2">
                          <div className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase">
                            How soon must this be fixed?
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {URGENCY_OPTIONS.map((opt) => (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => setUrgency(opt.key)}
                                className={`px-2 py-2.5 rounded font-mono text-xs tracking-wide border transition-all ${
                                  urgency === opt.key
                                    ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]"
                                    : "border-[#D4A853]/10 text-[#B0A89E] hover:border-[#D4A853]/30"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          aria-label="Email address for diagnostic report delivery"
                          className="premium-input w-full"
                          style={{ caretColor: "#D4A853" }}
                        />
                        <div className="font-mono text-xs text-[#B0A89E] tracking-wide">
                          Results in 72h. No marketing spam. No calls required.
                        </div>
                        <div className="border border-[#D4A853]/10 bg-[#D4A853]/[0.03] px-3 py-2 font-mono text-xs text-[#B0A89E] leading-relaxed flex items-center gap-2">
                          <span className="text-[#D4A853]">⚑</span>
                          20% growth guarantee or full refund via Stripe. 72h async. Zero sales calls.
                        </div>
                        <div className="premium-divider" />
                        <div className="premium-button-group">
                          <button type="button" disabled={loading} onClick={prevStep} className="premium-button disabled:opacity-50">
                            ← Back
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="premium-button w-auto flex-1 bg-[#D4A853] text-[#0A0908] hover:bg-[#E8C97A] disabled:opacity-50 font-bold"
                          >
                            {loading ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0908] animate-ping" />
                                Executing...
                              </span>
                            ) : (
                              "Find My Friction Point →"
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                {/* Error display */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="mt-4 py-2 px-3 border-l-2 border-[#C85C5C]/50 bg-[#C85C5C]/5 font-mono text-xs text-[#C85C5C]/80 tracking-wide rounded-sm"
                    >
                      ⚠ ERR: {errorMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Premium Footer */}
              <div className="border-t border-[#D4A853]/5 px-6 py-3 flex justify-between items-center text-xs font-mono text-[#7A6F65]">
                <span className="tracking-[0.15em] uppercase">
                  S&amp;F Diagnostic Engine v4.5
                </span>
                <span className="tracking-wider">
                  E2E Encrypted
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Section 2: S&F Results-Based Guarantee & Calculator ── */}
      <section className="w-full max-w-6xl mx-auto px-6 py-20 relative z-10 border-t border-[#D4A853]/8 space-y-12">
        <div className="text-center space-y-3">
          <span className="font-mono text-xs text-[#D4A853] tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
            Risk Reversal Engine
          </span>
          <h2 className="text-2xl lg:text-4xl font-serif text-white tracking-tight">
            Calculate your <span className="text-[#D4A853] glow-text">conversion revenue lift</span>.
          </h2>
          <p className="text-xs text-[#B0A89E] font-mono max-w-lg mx-auto leading-relaxed">
            Adjust the metrics to visualize how our guaranteed 20% relative conversion rate lift translates directly into recurring enterprise value.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sliders Left */}
          <div className="lg:col-span-7 border border-[#D4A853]/8 bg-[#0A0908]/95 p-6 rounded space-y-6 font-mono text-xs">
            {/* Visitors Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#B0A89E] uppercase">Monthly Unique Visitors:</span>
                <span className="text-[#D4A853] font-bold">{(calcVisitors).toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="100000"
                step="2500"
                value={calcVisitors}
                onChange={(e) => setCalcVisitors(Number(e.target.value))}
                className="w-full h-1 bg-[#2A2218] rounded appearance-none cursor-pointer accent-[#D4A853]"
              />
              <div className="flex justify-between text-xs text-[#B0A89E]">
                <span>5,000</span>
                <span>50,000</span>
                <span>100,000</span>
              </div>
            </div>

            {/* Current Conversion Rate Slider */}
            <div className="space-y-2 border-t border-[#D4A853]/8 pt-4">
              <div className="flex justify-between">
                <span className="text-[#B0A89E] uppercase">Current Conversion Rate:</span>
                <span className="text-[#D4A853] font-bold">{calcConvRate.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={calcConvRate}
                onChange={(e) => setCalcConvRate(Number(e.target.value))}
                className="w-full h-1 bg-[#2A2218] rounded appearance-none cursor-pointer accent-[#D4A853]"
              />
              <div className="flex justify-between text-xs text-[#B0A89E]">
                <span>0.5%</span>
                <span>2.5%</span>
                <span>5.0%</span>
              </div>
            </div>

            {/* Customer LTV Slider */}
            <div className="space-y-2 border-t border-[#D4A853]/8 pt-4">
              <div className="flex justify-between">
                <span className="text-[#B0A89E] uppercase">Customer LTV (ACV):</span>
                <span className="text-[#D4A853] font-bold">${calcLtv} USD</span>
              </div>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={calcLtv}
                onChange={(e) => setCalcLtv(Number(e.target.value))}
                className="w-full h-1 bg-[#2A2218] rounded appearance-none cursor-pointer accent-[#D4A853]"
              />
              <div className="flex justify-between text-xs text-[#B0A89E]">
                <span>$50</span>
                <span>$1,000</span>
                <span>$2,000</span>
              </div>
            </div>
          </div>

          {/* Readout Right */}
          <div className="lg:col-span-5 border border-[#D4A853]/15 bg-[#D4A853]/5 p-6 rounded relative glow-border space-y-6 font-mono text-xs">
            <h3 className="text-white font-serif text-sm font-bold border-b border-[#D4A853]/10 pb-2">Revenue Growth Projections</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#B0A89E]">Current Monthly Revenue:</span>
                <span className="text-white font-bold">${Math.round(calcVisitors * (calcConvRate / 100) * calcLtv).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#5C9A6B]">
                <span>Projected Revenue (+20%):</span>
                <span className="font-bold">${Math.round(calcVisitors * ((calcConvRate * 1.2) / 100) * calcLtv).toLocaleString()}</span>
              </div>
              <div className="border-t border-[#D4A853]/15 pt-3 flex justify-between text-[#D4A853] text-sm">
                <span className="font-bold">Monthly Revenue Lift:</span>
                <span className="font-bold glow-text">${Math.round(calcVisitors * ((calcConvRate * 0.2) / 100) * calcLtv).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#D4A853] text-sm">
                <span className="font-bold">Annual Revenue Lift:</span>
                <span className="font-bold glow-text">${Math.round(calcVisitors * ((calcConvRate * 0.2) / 100) * calcLtv * 12).toLocaleString()}</span>
              </div>
            </div>

            <div className="border border-[#D4A853]/25 bg-[#0A0908] p-3 rounded text-xs text-[#B0A89E] leading-relaxed">
              Calculations are based on a 20% relative increase in your current conversion rate (e.g. from {calcConvRate.toFixed(1)}% to {(calcConvRate * 1.2).toFixed(2)}%). Backed by the S&amp;F Results-Based Guarantee.
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Why Our Guarantee Beats AI ── */}
      <section className="w-full max-w-6xl mx-auto px-6 py-20 relative z-10 border-t border-[#D4A853]/8 space-y-12">
        <div className="text-center space-y-3">
          <span className="font-mono text-xs text-[#D4A853] tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
            Comparison Audit
          </span>
          <h2 className="text-2xl lg:text-4xl font-serif text-white tracking-tight">
            Why clinical diagnostics <span className="text-[#D4A853] glow-text">beats generic AI</span>.
          </h2>
          <p className="text-xs text-[#B0A89E] font-mono max-w-lg mx-auto leading-relaxed">
            Stop relying on automated audit scrapers that tell you to change colors. Compare our clinical guarantee parameters.
          </p>
        </div>

        <div className="border border-[#D4A853]/8 bg-[#0A0908]/95 rounded overflow-x-auto font-mono text-xs">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#D4A853]/8 bg-[#D4A853]/[0.02] text-[#D4A853] uppercase tracking-wider">
                <th className="p-4 font-semibold">Comparison Matrix</th>
                <th className="p-4 font-semibold">S&amp;F Clinical Guarantee</th>
                <th className="p-4 font-semibold">Standard AI Audits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[#B0A89E]">
              <tr>
                <td className="p-4 font-bold text-white uppercase text-xs">Risk Allocation</td>
                <td className="p-4 text-[#5C9A6B] font-bold">100% Refundable via Stripe if metrics fail.</td>
                <td className="p-4">Pay upfront with zero performance accountability.</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-white uppercase text-xs">Verification Engine</td>
                <td className="p-4">Hardened PostHog telemetry &amp; strict isolation gating.</td>
                <td className="p-4">Unverified self-reported screenshots.</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-white uppercase text-xs">Implementation</td>
                <td className="p-4">Done-For-You single surgical code/copy tweak.</td>
                <td className="p-4">Dozens of generic, low-impact suggestions.</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-white uppercase text-xs">Core Intelligence</td>
                <td className="p-4">21 Specialized Agent Mind consortium.</td>
                <td className="p-4">Single LLM API calls with generic template prompts.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-center font-mono text-xs text-[#B0A89E]">
          Read the complete legally binding covenant: <Link href="/legal/guarantee" className="text-[#D4A853] hover:underline">S&amp;F Performance Terms &amp; Conditions</Link>.
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="w-full border-t border-white/[0.03] py-8 px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-[#B0A89E] relative z-10 bg-[#0A0908]">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <span>© {new Date().getFullYear()} Signal &amp; Friction Method™. All rights reserved.</span>
          <span className="hidden md:inline">|</span>
          <Link href="/portfolio" className="hover:text-white transition-colors uppercase tracking-wider">Clinical Portfolio</Link>
          <span className="hidden md:inline">|</span>
          <Link href="/certified" className="hover:text-white transition-colors uppercase tracking-wider">Certified Licensing</Link>
        </div>
        <a href="/admin/login" className="hover:text-white transition-colors uppercase tracking-wider">
          Operator Console →
        </a>
      </footer>
    </main>
  );
}
