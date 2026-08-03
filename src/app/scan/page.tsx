"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface FrictionMechanism {
  type: string;
  severity: 'high' | 'medium' | 'low';
  detail: string;
}

interface ScanReport {
  domain: string;
  url: string;
  scannedAt: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  frictionScore: number;
  psError: string | null;
  metrics: {
    lcp: { ms: number; label: string; status: string };
    tbt: { ms: number; label: string; status: string };
    cls: { value: number; status: string };
    performanceScore: number;
    speedIndex: { ms: number; label: string };
  };
  signals: {
    platform: string | null;
    hasStripe: boolean;
    stripeAsync: boolean;
    scriptCount: number;
    missingOgTags: string[];
    hasCheckoutIndicator: boolean;
    hasLazyImages: boolean;
  };
  frictionMechanisms: FrictionMechanism[];
  abandonmentDelta: number;
}

type ScanPhase = 'idle' | 'scanning' | 'done' | 'gated' | 'unlocked';

const SCAN_STAGES = [
  { label: "Resolving domain...", ms: 800 },
  { label: "Connecting to PageSpeed Insights...", ms: 1200 },
  { label: "Analyzing mobile performance...", ms: 4000 },
  { label: "Scanning HTML signals...", ms: 1500 },
  { label: "Computing friction mechanisms...", ms: 600 },
];

const springConfig = { type: "spring" as const, stiffness: 120, damping: 22 };

const STATUS_COLOR: Record<string, string> = {
  good: "text-[#5C9A6B]",
  needs_improvement: "text-amber-400",
  poor: "text-[#C85C5C]",
};

const STATUS_LABEL: Record<string, string> = {
  good: "Good",
  needs_improvement: "Needs Work",
  poor: "Critical",
};

const SEVERITY_COLOR: Record<string, string> = {
  high: "border-[#C85C5C]/20 bg-[#C85C5C]/[0.04] text-[#C85C5C]",
  medium: "border-amber-500/20 bg-amber-500/[0.04] text-amber-400",
  low: "border-[#D4A853]/15 bg-[#D4A853]/[0.03] text-[#D4A853]",
};

// Phase 6.1 — functions/api/_scan.ts's own frictionMechanisms labeler
// derives these type strings straight from a technical threshold (e.g.
// LCP > 4s -> "Cognitive Load"), with no analyst evidence or judgment
// behind them. That's exactly why this same labeler was deliberately
// firewalled from ever reaching the paid scaffold/diagnosis pipeline
// (see src/domain/reasoning/ and the "no 7th mechanism" decision) — a
// technical signal alone is never allowed to stand in for a behavioral
// diagnosis anywhere else in this system. The free scanner was the one
// place still presenting it as if it were one. Relabeled here as an
// honest possibility, not a finding, matching the standard the rest of
// the product actually holds itself to. This does not change what
// _scan.ts computes — only how the same data is described.
const SIGNAL_DISPLAY_LABEL: Record<string, string> = {
  "Cognitive Load": "Possible Cognitive Load Signal",
  "Trust Deficit": "Possible Trust Deficit Signal",
  "Technical Friction": "Technical Performance Issue",
};
function signalDisplayLabel(type: string): string {
  return SIGNAL_DISPLAY_LABEL[type] ?? type;
}

export default function ScanPage() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [stageIndex, setStageIndex] = useState(0);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function runScan() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    setReport(null);
    setPhase('scanning');
    setStageIndex(0);

    // Animate through stages while the API call runs
    let i = 0;
    const stageInterval = setInterval(() => {
      i++;
      if (i < SCAN_STAGES.length) setStageIndex(i);
      else clearInterval(stageInterval);
    }, 1400);

    try {
      const res = await fetch('/api/scan-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      clearInterval(stageInterval);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || `Error ${res.status}`);
      }
      const data: ScanReport = await res.json();
      setReport(data);
      setPhase('done');
    } catch (err) {
      clearInterval(stageInterval);
      setError(err instanceof Error ? err.message : 'Scan failed. Try again.');
      setPhase('idle');
    }
  }

  async function unlockWithEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Valid business email required.");
      return;
    }
    setEmailError("");
    setEmailSubmitting(true);
    try {
      // Pass the already-computed scan report so leads.ts skips the re-scan
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          website: report?.url,
          company: report?.domain,
          segment: (report?.frictionScore ?? 0) >= 60 ? 'DFY' : 'DWY',
          source: 'scan_tool',
          scan_data: report ?? undefined,
        }),
      }).catch(() => {});
    } catch { /* non-fatal */ }
    setEmailSubmitting(false);
    setPhase('unlocked');
  }

  const gradeColor: Record<string, string> = {
    A: "text-[#5C9A6B]", B: "text-[#D4A853]", C: "text-amber-400", D: "text-orange-500", F: "text-[#C85C5C]",
  };

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] font-mono relative overflow-x-hidden">

      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.015) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      <div className="relative z-10 max-w-[800px] mx-auto px-6 py-16 md:py-24 space-y-12">

        {/* Header */}
        <header className="space-y-4">
          <Link href="/" className="inline-block font-mono text-xs text-[#D4A853]/70 hover:text-[#D4A853] transition-colors uppercase tracking-[0.3em] mb-6">
            ← Signal &amp; Friction
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            Checkout Friction Scan
          </h1>
          <p className="text-sm text-[#B0A89E] leading-relaxed max-w-[560px]">
            Enter your store URL. Get a clinical read of what was actually measured — LCP score, script
            bloat, layout instability — and the technical signals most likely feeding into a real
            conversion problem. This scan observes. It doesn&apos;t diagnose; that&apos;s the paid step.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {["Shopify", "WooCommerce", "BigCommerce", "Next.js", "Any stack"].map(p => (
              <span key={p} className="font-mono text-[10px] uppercase border border-[#D4A853]/15 px-2 py-0.5 rounded text-[#7A6F65]">{p}</span>
            ))}
          </div>
        </header>

        {/* URL Input */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A6F65] font-mono text-sm select-none">
                https://
              </span>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && phase === 'idle' && runScan()}
                placeholder="yourstore.com/checkout"
                disabled={phase === 'scanning'}
                className="w-full bg-[#110F0D] border border-[#D4A853]/20 focus:border-[#D4A853] focus:outline-none pl-[72px] pr-4 py-3.5 text-sm text-white rounded-xl transition-all placeholder:text-[#7A6F65] disabled:opacity-50"
              />
            </div>
            <button
              onClick={runScan}
              disabled={!url.trim() || phase === 'scanning'}
              className="px-6 py-3.5 bg-[#D4A853] text-[#0A0908] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#E8C97A] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {phase === 'scanning' ? 'Scanning...' : 'Scan →'}
            </button>
          </div>
          {error && (
            <p className="text-xs text-[#C85C5C] font-mono">{error}</p>
          )}
        </div>

        {/* Scanning state */}
        <AnimatePresence>
          {phase === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="border border-[#D4A853]/20 bg-[#110F0D] p-8 rounded-2xl space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#D4A853] rounded-full animate-ping" />
                <span className="font-mono text-xs text-[#D4A853] uppercase tracking-widest">
                  Friction scan active
                </span>
              </div>
              <div className="space-y-3">
                {SCAN_STAGES.map((stage, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      idx < stageIndex ? "bg-[#5C9A6B] border-[#5C9A6B]" :
                      idx === stageIndex ? "border-[#D4A853] bg-[#D4A853]/10" :
                      "border-[#3A3530]"
                    }`}>
                      {idx < stageIndex && <span className="text-white text-[8px]">✓</span>}
                      {idx === stageIndex && <div className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse" />}
                    </div>
                    <span className={`font-mono text-xs transition-colors duration-300 ${
                      idx < stageIndex ? "text-[#5C9A6B]" :
                      idx === stageIndex ? "text-white" :
                      "text-[#7A6F65]"
                    }`}>
                      {stage.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#7A6F65] font-mono">
                This may take 15–25 seconds. PageSpeed analyzes your mobile checkout path in real time.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {(phase === 'done' || phase === 'gated' || phase === 'unlocked') && report && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springConfig}
              className="space-y-6"
            >

              {/* Grade header */}
              <div className="border border-[#D4A853]/20 bg-[#110F0D] p-6 rounded-2xl flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest mb-1">Friction Report</p>
                  <h2 className="font-serif text-xl text-white font-bold">{report.domain}</h2>
                  <p className="font-mono text-xs text-[#7A6F65] mt-1">{new Date(report.scannedAt).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <div className={`font-serif text-5xl font-bold ${gradeColor[report.grade]}`}>{report.grade}</div>
                  <div className="font-mono text-[10px] text-[#7A6F65] uppercase mt-1">Friction Grade</div>
                </div>
              </div>

              {report.psError && (
                <div className="border border-amber-500/20 bg-amber-500/[0.04] p-4 rounded-xl font-mono text-xs text-amber-400">
                  PageSpeed scan limited: {report.psError}. HTML signals still analyzed.
                </div>
              )}

              {/* 3 Free Metrics */}
              <div>
                <p className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest mb-3">Core Metrics</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Largest Contentful Paint",
                      value: report.metrics.lcp.label,
                      sub: "Mobile checkout load",
                      status: report.metrics.lcp.status,
                      benchmark: "< 2.5s baseline",
                    },
                    {
                      label: "Performance Score",
                      value: `${report.metrics.performanceScore}/100`,
                      sub: "Lighthouse mobile",
                      status: report.metrics.performanceScore >= 90 ? 'good' : report.metrics.performanceScore >= 50 ? 'needs_improvement' : 'poor',
                      benchmark: "≥ 90 = good",
                    },
                    {
                      label: "Scripts Detected",
                      value: String(report.signals.scriptCount),
                      sub: "Total JS files loaded",
                      status: report.signals.scriptCount > 30 ? 'poor' : report.signals.scriptCount > 15 ? 'needs_improvement' : 'good',
                      benchmark: "< 15 = clean",
                    },
                  ].map(m => (
                    <div key={m.label} className="border border-[#D4A853]/10 bg-[#0A0908] p-4 rounded-xl space-y-2">
                      <p className="font-mono text-[10px] text-[#7A6F65] uppercase">{m.label}</p>
                      <p className={`font-serif text-2xl font-bold ${STATUS_COLOR[m.status]}`}>{m.value}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[9px] text-[#7A6F65]">{m.sub}</span>
                        <span className={`font-mono text-[9px] font-bold ${STATUS_COLOR[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                      </div>
                      <p className="font-mono text-[9px] text-[#7A6F65]">Benchmark: {m.benchmark}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform signal */}
              {report.signals.platform && (
                <div className="border border-[#D4A853]/10 bg-[#0A0908] p-4 rounded-xl flex items-center gap-3">
                  <span className="font-mono text-[10px] text-[#7A6F65] uppercase">Platform detected:</span>
                  <span className="font-mono text-xs text-[#D4A853] font-bold">{report.signals.platform}</span>
                  {report.signals.hasStripe && (
                    <>
                      <span className="text-[#7A6F65]">·</span>
                      <span className="font-mono text-[10px] text-[#B0A89E]">
                        Stripe.js {report.signals.stripeAsync ? '(async ✓)' : '(sync — blocking ✗)'}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Technical signals — always visible. Deliberately not
                  called "friction mechanisms" here — see
                  SIGNAL_DISPLAY_LABEL above for why. */}
              {report.frictionMechanisms.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest mb-3">
                    Technical Signals Observed ({report.frictionMechanisms.length})
                  </p>
                  <div className="space-y-2">
                    {report.frictionMechanisms.map((m, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...springConfig, delay: idx * 0.06 }}
                        className={`border p-4 rounded-xl ${SEVERITY_COLOR[m.severity]}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] uppercase font-bold">{signalDisplayLabel(m.type)}</span>
                          <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border border-current opacity-60`}>
                            {m.severity}
                          </span>
                        </div>
                        <p className="text-xs text-[#B0A89E] leading-relaxed">{m.detail}</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="border border-[#D4A853]/15 bg-[#D4A853]/[0.03] p-4 rounded-xl mt-3">
                    <p className="text-xs text-[#B0A89E] leading-relaxed">
                      <span className="text-[#D4A853] font-semibold">This is what was measured.</span> The
                      behavioral cause still requires diagnosis — a real analyst weighing this evidence
                      against what else could explain it. An automated scan can flag a pattern; it can&apos;t
                      own the call.
                    </p>
                  </div>
                </div>
              )}

              {report.frictionMechanisms.length === 0 && !report.psError && (
                <div className="border border-[#5C9A6B]/20 bg-[#5C9A6B]/[0.04] p-4 rounded-xl text-xs text-[#5C9A6B] font-mono">
                  No critical technical signals detected. Your checkout performance is above baseline.
                </div>
              )}

              {/* Gated metric — monthly cost */}
              <AnimatePresence mode="wait">
                {(phase === 'done' || phase === 'gated') && report.abandonmentDelta > 0 && (
                  <motion.div
                    key="gate"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="border border-[#D4A853]/30 bg-[#110F0D] p-6 rounded-2xl space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#110F0D]/0 to-[#110F0D] pointer-events-none rounded-2xl" />
                    <div className="relative">
                      <p className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest mb-2">
                        Estimated Monthly Friction Cost
                      </p>
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="font-serif text-4xl font-bold text-white blur-sm select-none">$X,XXX</span>
                        <span className="font-mono text-xs text-[#7A6F65]">per month at current friction level</span>
                      </div>
                      <p className="text-xs text-[#7A6F65] mb-5 leading-relaxed">
                        Based on your +{report.abandonmentDelta}% abandonment delta vs. the 2.5s LCP baseline. Enter your email to see the full breakdown with your actual numbers.
                      </p>

                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                          onKeyDown={e => e.key === 'Enter' && unlockWithEmail()}
                          placeholder="your@company.com"
                          className="flex-1 bg-black/40 border border-[#D4A853]/20 focus:border-[#D4A853] focus:outline-none px-4 py-2.5 text-xs text-white rounded-xl placeholder:text-[#7A6F65]"
                        />
                        <button
                          onClick={unlockWithEmail}
                          disabled={emailSubmitting}
                          className="px-5 py-2.5 bg-[#D4A853] text-[#0A0908] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#E8C97A] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        >
                          {emailSubmitting ? 'Unlocking...' : 'Unlock →'}
                        </button>
                      </div>
                      {emailError && <p className="text-[10px] text-[#C85C5C] font-mono mt-1">{emailError}</p>}
                      <p className="font-mono text-[9px] text-[#7A6F65] mt-2">
                        No spam. One diagnostic email, then direct access to the full friction report.
                      </p>
                    </div>
                  </motion.div>
                )}

                {phase === 'unlocked' && report.abandonmentDelta > 0 && (
                  <motion.div
                    key="unlocked"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={springConfig}
                    className="border border-[#5C9A6B]/25 bg-[#5C9A6B]/[0.04] p-6 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{ background: "rgba(212,168,83,0.1)", borderColor: "rgba(212,168,83,0.35)", color: "#D4A853" }}>
                        Modeled
                      </span>
                      <p className="font-mono text-[10px] text-[#5C9A6B] uppercase tracking-widest">Unlocked — Friction Signal</p>
                    </div>
                    <p className="text-sm text-[#F5F0EB] leading-relaxed">
                      +{report.abandonmentDelta}% modeled cart abandonment vs. baseline, from your {report.metrics.lcp.label} mobile LCP.
                    </p>
                    <p className="font-mono text-[10px] text-[#7A6F65]">
                      Modeled from a published LCP-to-abandonment coefficient — not measured against your actual funnel or traffic.
                    </p>
                    <div className="border-t border-[#5C9A6B]/10 pt-3 space-y-1">
                      <p className="font-mono text-[10px] text-[#7A6F65]">
                        TBT: {report.metrics.tbt.label} · CLS: {report.metrics.cls.value} · Speed Index: {report.metrics.speedIndex.label}
                      </p>
                      <p className="font-mono text-[10px] text-[#D4A853]">
                        A Signal &amp; Friction diagnostic will identify the exact fix, evidence-tiered against your own funnel.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA */}
              {phase === 'unlocked' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springConfig, delay: 0.2 }}
                  className="border border-[#D4A853]/20 bg-[#110F0D] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest mb-1">Next Step</p>
                    <p className="text-sm text-white font-serif">Get the full diagnosis with the precise fix.</p>
                    <p className="font-mono text-[10px] text-[#7A6F65] mt-1">Delivered in 72h. Async. No calls required.</p>
                  </div>
                  <Link
                    href="/"
                    className="px-6 py-3 bg-[#D4A853] text-[#0A0908] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#E8C97A] transition-all whitespace-nowrap"
                  >
                    Request Full Diagnostic →
                  </Link>
                </motion.div>
              )}

              {/* Scan another */}
              <button
                onClick={() => {
                  setPhase('idle');
                  setReport(null);
                  setUrl("");
                  setEmail("");
                  setError(null);
                }}
                className="font-mono text-xs text-[#7A6F65] hover:text-[#D4A853] transition-colors uppercase tracking-wider cursor-pointer"
              >
                ← Scan another URL
              </button>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state — cited external research, not this tool's own
            aggregate data. The three stats here used to be presented with
            no source at all ("Avg abandonment delta found," "Monthly
            friction cost per site") — worded exactly like results pulled
            from this tool's own scan history, when nothing computed them.
            Replaced with real, checkable numbers instead of removing the
            section outright, since the underlying persuasive point (speed
            and trust signals move conversion) is true and sourced — it
            just was never allowed to be presented as fabricated. */}
        {phase === 'idle' && (
          <div className="space-y-8 border-t border-[#D4A853]/8 pt-8">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { value: "+90%", label: "Mobile bounce increase, 1s→5s load" },
                { value: "53%", label: "Mobile visits abandoned past 3s load" },
                { value: "15–30%", label: "Avg conversion lift from trust signals" },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-serif text-2xl font-bold text-[#D4A853]">{s.value}</div>
                  <div className="font-mono text-[10px] text-[#7A6F65] mt-1 leading-snug">{s.label}</div>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-[#7A6F65] text-center">
              Industry research — Think with Google Mobile Site Speed Playbook; Baymard Institute, 147 sites studied. Not Signal &amp; Friction&apos;s own data. Your scan below is measured, not modeled.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
