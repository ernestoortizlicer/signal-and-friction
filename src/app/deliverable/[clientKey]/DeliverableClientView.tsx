/**
 * CLIENT DELIVERABLE — LOCALE: en (American Business English)
 *
 * All copy is sourced from the client's DeliverableData JSON (English-only schema)
 * or the fallback constants in fallback.ts. This component has no dependency on
 * the admin layer and no i18n mechanism of any kind.
 *
 * EPISTEMICS: every figure a client sees here must be honestly tagged —
 * MEASURED (directly observed), MODELED (a benchmark applied to a measured
 * value), or PENDING (requires the client's own data). We can only ever see
 * a prospect's public surface (PageSpeed + raw HTML) unless they grant
 * access to their own funnel data. See EvidenceBadge / ImpactRangeBlock /
 * ConfidenceBadge below — never let a MODELED figure render as if measured.
 *
 * TYPE SCALE — shared identically by both segment branches below:
 *   1. Hero title   — text-5xl md:text-6xl, font-serif font-semibold, leading-[1.05]
 *   2. Hero lede     — text-lg, font-serif font-light, leading-relaxed, max-w-60ch
 *   3. Section header — text-xs, font-mono font-semibold, uppercase, tracked (eyebrow label — small by design)
 *   4. Card title    — text-xl, font-serif font-medium, leading-snug
 *   5. Card body     — text-base, leading-relaxed, font-light, max-w guarded (Inter, never mono)
 *   6. Label / meta  — text-xs, font-mono, uppercase where applicable (floor — nothing renders smaller)
 */
"use client";

import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DeliverableData, BeforeAfterData, Decision, EvidenceItem, EvidenceTier, ImpactRange, AvoidItem } from "../fallback";

// Phase 4.1 — analyst-authored uncertainty, shown in every service tier.
// Deliberately plain and un-alarming: this is a trust signal ("we're
// telling you what we don't know"), not an apology or a defect report.
function UnknownsSection({ text }: { text: string }) {
  return (
    <div className="border border-[#7A6F65]/20 bg-[#7A6F65]/[0.03] p-6 md:p-8 rounded space-y-3">
      <span className="font-mono text-xs uppercase tracking-wider text-[#7A6F65]">Remaining Uncertainty</span>
      <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch] whitespace-pre-line">{text}</p>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 100, damping: 18 },
  },
};

// ── Epistemics primitives — shared by both segment views ───────────────────

function tierColor(tier: EvidenceTier): { bg: string; border: string; text: string } {
  if (tier === "measured") return { bg: "rgba(92,154,107,0.1)", border: "rgba(92,154,107,0.35)", text: "#5C9A6B" };
  if (tier === "modeled") return { bg: "rgba(212,168,83,0.1)", border: "rgba(212,168,83,0.35)", text: "#D4A853" };
  return { bg: "rgba(122,111,101,0.1)", border: "rgba(122,111,101,0.35)", text: "#B0A89E" };
}

function EvidenceBadge({ tier }: { tier: EvidenceTier }) {
  const c = tierColor(tier);
  return (
    <span
      className="font-mono text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0"
      style={{ background: c.bg, borderColor: c.border, color: c.text }}
    >
      {tier}
    </span>
  );
}

function EvidenceSection({ items }: { items: EvidenceItem[] }) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="flex items-start justify-between gap-4 border-b border-[#D4A853]/5 py-3.5">
          <div className="flex-1 min-w-0">
            <p className="text-base text-[#F5F0EB] leading-relaxed max-w-[70ch]">
              {item.label}: <span className="text-[#D4A853] font-medium">{item.value}</span>
            </p>
            <p className="text-xs text-[#7A6F65] mt-1 font-mono">{item.source}</p>
          </div>
          <EvidenceBadge tier={item.tier} />
        </div>
      ))}
    </div>
  );
}

function confidenceLabel(level: number): { text: string; label: string } {
  if (level >= 65) return { text: "#5C9A6B", label: "High" };
  if (level >= 40) return { text: "#D4A853", label: "Moderate" };
  return { text: "#C85C5C", label: "Low" };
}

function ConfidenceBadge({ level, reason }: { level: number; reason?: string }) {
  const c = confidenceLabel(level);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5 font-mono text-xs">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.text }} />
        <span className="uppercase tracking-wider font-bold" style={{ color: c.text }}>
          {c.label} Confidence
        </span>
        <span className="text-[#7A6F65]">{level}/100</span>
      </div>
      {reason && <p className="text-base text-[#B0A89E] leading-relaxed pl-4 max-w-[65ch]">{reason}</p>}
    </div>
  );
}

function ImpactRangeBlock({
  range,
  confidenceLevel,
  confidenceReason,
}: {
  range: ImpactRange;
  confidenceLevel?: number;
  confidenceReason?: string;
}) {
  const prefix = range.unit === "$" ? "$" : "";
  const suffix = range.unit === "%" ? "%" : "";
  const conf = confidenceLevel !== undefined ? confidenceLabel(confidenceLevel) : null;
  return (
    <div className="border border-[#D4A853]/15 bg-[#D4A853]/[0.03] p-6 rounded space-y-3.5">
      <div className="flex items-center gap-2">
        <EvidenceBadge tier="modeled" />
        <span className="font-mono text-xs uppercase tracking-wider text-[#7A6F65]">Projected Impact</span>
      </div>
      <p className="text-xl text-[#F5F0EB] leading-snug font-serif font-medium">
        {prefix}{range.low}–{prefix}{range.high}{suffix} on {range.step}
      </p>
      <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch]">
        Modeled from {range.modeledFrom}. <strong className="text-[#F5F0EB] font-normal">Not measured against your funnel.</strong>
      </p>
      {conf && (
        <p className="text-base text-[#7A6F65] leading-relaxed max-w-[65ch]">
          Confidence: <span style={{ color: conf.text }}>{conf.label.toLowerCase()}</span>
          {confidenceReason ? ` — ${confidenceReason}` : ""}.
        </p>
      )}
      <p className="text-base leading-relaxed max-w-[65ch] border-t border-[#D4A853]/10 pt-3.5" style={{ color: "#5C9A6B" }}>
        This range narrows once we see {range.narrowsWith}.
      </p>
    </div>
  );
}

function AvoidSection({ items }: { items: AvoidItem[] }) {
  return (
    <div className="space-y-5">
      {items.map((item, i) => (
        <div key={i} className="border-l-2 border-[#C85C5C]/30 pl-4 py-0.5">
          <p className="text-base text-[#F5F0EB] leading-relaxed max-w-[65ch]">
            <span className="text-[#C85C5C] mr-1.5">✗</span>
            {item.action}
          </p>
          <p className="text-base text-[#7A6F65] leading-relaxed mt-1.5 max-w-[65ch]">{item.reason}</p>
        </div>
      ))}
    </div>
  );
}

// Rendered in place of the recommendation when this tier withholds
// the_decision/what_to_avoid (e.g. Beta Diagnostic) — an intentional,
// designed boundary, never a blank section that reads as broken.
function RecommendationWithheldCard({ mechanism }: { mechanism?: string }) {
  return (
    <div className="border border-[#D4A853]/20 bg-[#D4A853]/[0.03] p-8 md:p-10 rounded space-y-4">
      <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">Included in Intervention</span>
      <h3 className="text-xl font-serif text-[#F5F0EB] font-medium leading-snug">
        The fix is one tier away.
      </h3>
      <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch]">
        This diagnostic identifies exactly where{mechanism ? ` the ${mechanism.toLowerCase()} occurs and` : ""} why
        it&apos;s blocking conversion. The specific recommendation, the exact action to take, and what to avoid
        while you fix it are delivered with the Intervention tier.
      </p>
    </div>
  );
}

function FinalDecisionCard({ decision }: { decision: Decision }) {
  return (
    <div className="border border-[#D4A853]/8 bg-[#110F0D]/20 p-8 md:p-10 rounded">
      <h3 className="text-xl font-serif text-[#F5F0EB] mb-4 font-medium leading-snug">{decision.label}</h3>
      <div className="space-y-4">
        <p className="text-base text-[#B0A89E] leading-relaxed max-w-[68ch]">
          <strong className="text-[#F5F0EB] font-medium font-mono text-xs uppercase tracking-wider mr-2">Action:</strong>
          {decision.action}
        </p>
        <p className="text-base text-[#B0A89E] leading-relaxed max-w-[68ch]">
          <strong className="text-[#F5F0EB] font-medium font-mono text-xs uppercase tracking-wider mr-2">Reasoning:</strong>
          {decision.reasoning}
        </p>
        <p className="text-base text-[#B0A89E] leading-relaxed max-w-[68ch] border-t border-[#D4A853]/8 pt-4 mt-4">
          <strong className="text-[#7A6F65] font-medium font-mono text-xs uppercase tracking-wider mr-2">Trade-off:</strong>
          {decision.tradeoff}
        </p>
      </div>
    </div>
  );
}

// Legacy 3-option grid — only used as a fallback for deliverables not yet
// migrated to a single finalDecision. Never used when finalDecision exists.
function LegacyDecisionsGrid({ decisions }: { decisions: Decision[] }) {
  return (
    <div className="space-y-8">
      {decisions.map((decision, i) => (
        <div
          key={i}
          className="border border-[#D4A853]/8 bg-[#110F0D]/20 p-8 md:p-10 hover:border-[#C85C5C]/20 transition-all duration-500 group rounded"
        >
          <div className="flex items-start justify-between mb-4">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#7A6F65] border border-[#D4A853]/8 px-2.5 py-0.5 rounded-full">
              Option {decision.type}
            </span>
          </div>
          <h3 className="text-xl font-serif text-[#F5F0EB] mb-4 group-hover:text-[#C85C5C] transition-colors font-medium leading-snug">
            {decision.label}
          </h3>
          <div className="space-y-4">
            <p className="text-base text-[#B0A89E] leading-relaxed max-w-[68ch]">
              <strong className="text-[#F5F0EB] font-medium font-mono text-xs uppercase tracking-wider mr-2">Action:</strong>
              {decision.action}
            </p>
            <p className="text-base text-[#B0A89E] leading-relaxed max-w-[68ch]">
              <strong className="text-[#F5F0EB] font-medium font-mono text-xs uppercase tracking-wider mr-2">Reasoning:</strong>
              {decision.reasoning}
            </p>
            <p className="text-base text-[#B0A89E] leading-relaxed max-w-[68ch] border-t border-[#D4A853]/8 pt-4 mt-4">
              <strong className="text-[#7A6F65] font-medium font-mono text-xs uppercase tracking-wider mr-2">Trade-off:</strong>
              {decision.tradeoff}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// One consistent Loom state across both segment views — a numbered section
// must never silently vanish when the URL is a placeholder. Real or
// pending, the section always renders.
function LoomSection({ url, label, dense }: { url?: string; label: string; dense?: boolean }) {
  const hasReal = !!url && !url.includes("placeholder");
  return (
    <div>
      <h2
        className={
          dense
            ? "font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853] mb-5"
            : "font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E] mb-6"
        }
      >
        {label}
      </h2>
      <div className="aspect-video bg-[#110F0D] border border-[#D4A853]/10 rounded-lg overflow-hidden relative glow-border">
        {hasReal ? (
          <iframe
            src={url!.includes("embed") ? url! : url!.replace("/share/", "/embed/")}
            frameBorder="0"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#110F0D]/80 pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#D4A853]/10 flex items-center justify-center mx-auto mb-4 border border-[#D4A853]/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <polygon points="5 3 19 12 5 21 5 3" fill="#D4A853" />
                </svg>
              </div>
              <p className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">
                Video walkthrough pending
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  data: DeliverableData;
  staticClientKey?: string;
}

export default function DeliverableClientView({ data: staticData, staticClientKey }: Props) {
  const pathname = usePathname();
  // Derive real clientKey from URL — works even when served via _redirects wildcard
  const urlClientKey = pathname.split("/").filter(Boolean).pop() ?? staticClientKey ?? "acme-corp";

  const [d, setD] = useState<DeliverableData>(staticData);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    // Real (non-demo) deliverable links carry ?cid=<clients.id> — the
    // capability token the API requires for anything but the bundled demos.
    const cid = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("cid") : null;
    const url = cid ? `/api/deliverable/${urlClientKey}?cid=${encodeURIComponent(cid)}` : `/api/deliverable/${urlClientKey}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((live: DeliverableData | null) => {
        if (live) setD(live);
      })
      .catch(() => {/* use staticData already set */})
      .finally(() => setFetching(false));
  }, [urlClientKey]);

  // Tracking pixel — fire-and-forget, non-blocking
  useEffect(() => {
    fetch(`/api/pixel?client=${encodeURIComponent(urlClientKey)}`, { keepalive: true }).catch(() => {});
  }, [urlClientKey]);

  const isMicrodosing = d.segment === "microdosing";

  // Command Center audit, 2026-07-31: these four fields and beforeAfter used
  // to fall back to specific, confident-looking fabricated values (85, 23,
  // "Specificity Guarantee Active", "✓ Traffic & Baseline Confirmed", and a
  // whole fake before/after example claiming "+350% Calculated Conversion
  // Gain") whenever a real deliverable's data was incomplete — indistinguishable
  // from real figures to the client looking at them. All five are optional on
  // DeliverableData; left undefined here and gated at each render site below
  // instead, matching the "renders only when present" pattern already used
  // for the confidence/evidence sections elsewhere in this file.
  const founderFocusScore = d.founderFocusScore;
  const daysRemaining = d.daysRemaining;
  const guaranteeStatus = d.guaranteeStatus;
  const telemetryStatus = d.telemetryStatus;
  const ba: BeforeAfterData | undefined = d.beforeAfter;

  const [checklist, setChecklist] = useState(d.checklist || []);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(d.learningModules?.[0]?.id || null);

  // Sync checklist when live data arrives
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (d.checklist) setChecklist(d.checklist);
    if (d.learningModules?.[0]) setSelectedModuleId(d.learningModules[0].id);
  }, [d]);

  const toggleCheck = (id: string) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const doneCount = checklist.filter((c) => c.done).length;
  const totalCount = checklist.length;
  const dynamicProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const activeModule = d.learningModules?.find((m) => m.id === selectedModuleId);

  // Loading skeleton
  if (fetching && !d.clientName) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#B0A89E] animate-pulse">
        Initializing diagnostic runtime...
      </div>
    );
  }

  // Explicit failure state — reached only when the fetch has finished and
  // still no content exists (the live-shell seed has no clientName, and
  // demo pages always have one from their bundled static data, so this
  // never fires for them). A blank shell rendering with empty sections is
  // a worse failure mode than a clear message: it looks broken rather than
  // denied. Deliberately generic — doesn't distinguish "no such client"
  // from "wrong/missing cid" so a guessed URL can't be used to confirm a
  // client exists.
  if (!fetching && !d.clientName) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#C85C5C]">
            Access Unavailable
          </p>
          <p className="text-base text-[#B0A89E] leading-relaxed">
            This link isn&apos;t active, or you don&apos;t have access to it.
          </p>
          <p className="text-sm text-[#7A6F65]">
            If you believe this is a mistake, contact{" "}
            <a href="mailto:hello@signal-and-friction.com" className="text-[#D4A853] hover:underline">
              hello@signal-and-friction.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  if (isMicrodosing) {
    return (
      <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] overflow-x-hidden">
        {/* Nav */}
        <nav className="w-full fixed top-0 z-50 bg-[#0A0908]/90 backdrop-blur-xl border-b border-[#D4A853]/10">
          <div className="max-w-[1000px] mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-serif text-[#D4A853] text-lg tracking-tight font-bold glow-text">
                Signal &amp; Friction
              </span>
              <span className="text-xs text-[#7A6F65] font-mono">/ Confidential Portal</span>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#D4A853]/70 border border-[#D4A853]/25 px-3 py-1 rounded bg-[#D4A853]/5">
              Operational Autonomy
            </span>
          </div>
        </nav>

        {/* Hero */}
        <motion.section
          className="pt-24 pb-12 px-6 border-b border-[#D4A853]/10"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]">
                  Methodology &amp; Operation
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]/30" />
                <span className="font-mono text-xs text-[#7A6F65]">{d.date}</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-[#F5F0EB] font-serif leading-[1.05]">
                {d.clientName}
              </h1>
              <p className="text-lg text-[#B0A89E] leading-relaxed max-w-[60ch] font-serif font-light">
                Your self-serve operating space. Complete the daily checklist, work through the training
                modules, and record the reference Loom when you&apos;re ready.
              </p>
            </div>

            <div className="space-y-4">
              {/* Autonomy Progress */}
              <div className="bg-[#110F0D] border border-[#D4A853]/15 p-5 rounded-lg space-y-4 glow-border">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#B0A89E]">Autonomy Progress</span>
                  <span className="text-[#D4A853] font-bold">{dynamicProgress}%</span>
                </div>
                <div className="w-full bg-[#2A2218] h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-[#D4A853] h-full rounded-full"
                    animate={{ width: `${dynamicProgress}%` }}
                    transition={{ type: "spring", stiffness: 80 }}
                  />
                </div>
                <div className="flex justify-between font-mono text-xs text-[#7A6F65]">
                  <span>{doneCount} of {totalCount} complete</span>
                  <span>{dynamicProgress === 100 ? "System Delivered" : "In Progress"}</span>
                </div>
              </div>

              {/* Founder Focus Tracker — renders only when real, not a guess */}
              {founderFocusScore !== undefined && (
                <div className="bg-[#110F0D] border border-[#C85C5C]/15 p-5 rounded-lg space-y-3 glow-border-red">
                  <div className="flex justify-between items-center font-mono text-xs">
                    <span className="text-[#B0A89E]">Founder Focus Index</span>
                    <span className="text-[#5C9A6B] font-bold">{founderFocusScore} / 100</span>
                  </div>
                  <div className="w-full bg-[#2A2218] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#5C9A6B] h-full rounded-full" style={{ width: `${founderFocusScore}%` }} />
                  </div>
                  <div className="font-mono text-xs text-[#7A6F65] leading-relaxed">
                    Cognitive load index: {100 - founderFocusScore}/100 — execution adherence at high-confidence threshold.
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Confidence + Evidence — renders only when present */}
        {(d.confidenceLevel !== undefined || d.evidence?.length || d.projectedImpact) && (
          <section className="py-10 px-6 border-b border-[#D4A853]/5">
            <div className="max-w-[1000px] mx-auto space-y-6">
              {d.confidenceLevel !== undefined && (
                <ConfidenceBadge level={d.confidenceLevel} reason={d.confidenceReason} />
              )}
              {d.evidence?.length ? <EvidenceSection items={d.evidence} /> : null}
              {d.projectedImpact && (
                <ImpactRangeBlock
                  range={d.projectedImpact}
                  confidenceLevel={d.confidenceLevel}
                  confidenceReason={d.confidenceReason}
                />
              )}
            </div>
          </section>
        )}

        {/* Diagnostic Loom — always renders, real embed or dignified pending state */}
        <section className="py-12 px-6 border-b border-[#D4A853]/5">
          <div className="max-w-[1000px] mx-auto">
            <LoomSection url={d.loomUrl} label="01 — System Walkthrough Video" dense />
          </div>
        </section>

        {/* Modules & Checklist */}
        <section className="py-12 px-6 max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">
              02 — Implementation Checklist
            </h2>
            <div className="space-y-3 bg-[#110F0D]/40 border border-[#D4A853]/5 p-5 rounded-lg">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`flex items-start gap-4 p-4 border rounded transition-all duration-300 cursor-pointer ${
                    item.done ? "bg-[#5C9A6B]/5 border-[#5C9A6B]/20" : "bg-[#110F0D]/60 border-[#D4A853]/10 hover:border-[#D4A853]/30"
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.done ? "bg-[#5C9A6B] border-[#5C9A6B]" : "border-[#D4A853]/40"
                  }`}>
                    {item.done && <span className="text-xs text-[#0A0908] font-bold">✓</span>}
                  </div>
                  <div className="space-y-1.5 select-none">
                    <p className={`text-xs font-mono font-medium ${item.done ? "line-through text-[#7A6F65]" : "text-[#F5F0EB]"}`}>
                      {item.task}
                    </p>
                    <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch]">{item.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">
              03 — Training Curriculum
            </h2>
            <div className="space-y-2">
              {d.learningModules?.map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => setSelectedModuleId(mod.id)}
                  className={`p-4 border transition-all duration-300 cursor-pointer rounded text-left ${
                    selectedModuleId === mod.id ? "bg-[#D4A853]/5 border-[#D4A853]/30" : "bg-[#110F0D]/30 border-[#D4A853]/5 hover:border-[#D4A853]/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs text-[#D4A853]/80 uppercase tracking-widest">{mod.title}</span>
                    {mod.completed && (
                      <span className="font-mono text-xs uppercase tracking-wider text-[#5C9A6B] bg-[#5C9A6B]/10 px-1.5 py-0.5 rounded border border-[#5C9A6B]/20">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="text-base text-[#B0A89E] leading-relaxed max-w-[60ch]">{mod.description}</p>
                </div>
              ))}
            </div>
            {activeModule && (
              <div className="border border-[#D4A853]/15 bg-[#110F0D]/60 p-5 rounded-lg space-y-3 mt-4">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-wider uppercase block">
                  Active Module — Content
                </span>
                <h4 className="text-xl font-serif font-medium text-[#F5F0EB] leading-snug">{activeModule.title}</h4>
                <p className="text-base text-[#B0A89E] leading-relaxed max-w-[68ch]">{activeModule.content}</p>
              </div>
            )}
          </div>
        </section>

        {/* What NOT to do — renders only when present */}
        {d.avoid?.length ? (
          <section className="py-12 px-6 border-t border-[#D4A853]/5">
            <div className="max-w-[1000px] mx-auto">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853] mb-6">
                04 — What Not To Do
              </h2>
              <AvoidSection items={d.avoid} />
            </div>
          </section>
        ) : null}

        {/* Remaining Uncertainty — renders only when the analyst wrote something */}
        {d.unknowns?.trim() ? (
          <section className="py-12 px-6 border-t border-[#D4A853]/5">
            <div className="max-w-[1000px] mx-auto">
              <UnknownsSection text={d.unknowns.trim()} />
            </div>
          </section>
        ) : null}

        <footer className="py-12 border-t border-[#D4A853]/10 text-center bg-[#0A0908] mt-16">
          <p className="font-mono text-xs tracking-[0.15em] text-[#7A6F65]">
            {d.consultant} · CONFIDENTIAL CLIENT PORTAL · ALL RIGHTS RESERVED
          </p>
        </footer>
      </main>
    );
  }

  // ── High-Ticket / Concierge View ──────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0A0908] text-[#B0A89E] overflow-x-hidden grain">
      <nav className="w-full fixed top-0 z-50 bg-[#0A0908]/90 backdrop-blur-xl border-b border-[#D4A853]/8">
        <div className="max-w-[900px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-serif text-[#F5F0EB] text-lg tracking-tight">
            Signal &amp; Friction
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#7A6F65] border border-[#D4A853]/8 px-3 py-0.5 rounded">
            Confidential Diagnostic Portal
          </span>
        </div>
      </nav>

      <motion.section
        className="pt-28 pb-16 px-6 border-b border-[#D4A853]/8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className="max-w-[900px] mx-auto">
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#B0A89E]">
              Revenue Friction Diagnostic
            </span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#7A6F65]">{d.date}</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl font-serif font-semibold text-[#F5F0EB] tracking-tight leading-[1.05] mb-6"
          >
            {d.clientName}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-[#B0A89E] max-w-[60ch] leading-relaxed font-serif font-light"
          >
            This dashboard displays your custom Signal &amp; Friction diagnostic brief. Below is the clinical
            breakdown of your funnel signal, the dominant cognitive friction mechanism, and the recommended
            intervention — with every figure tagged by how we know it.
          </motion.p>

          {/* Status strip — renders only when this deliverable actually has
              guarantee/telemetry data; a partial or absent record shows
              nothing here rather than a fabricated "active" claim. */}
          {(guaranteeStatus !== undefined || telemetryStatus !== undefined || daysRemaining !== undefined) && (
            <motion.div
              variants={itemVariants}
              className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 border border-[#D4A853]/8 bg-[#110F0D]/60 p-5 rounded select-none"
            >
              {guaranteeStatus !== undefined && (
                <div className="space-y-1">
                  <div className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">Guarantee Status</div>
                  <div className="font-serif text-[#F5F0EB] text-xs font-semibold">{guaranteeStatus}</div>
                </div>
              )}
              {telemetryStatus !== undefined && (
                <div className="space-y-1">
                  <div className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">Telemetry Validation</div>
                  <div className="font-mono text-xs text-[#5C9A6B] font-semibold">{telemetryStatus}</div>
                </div>
              )}
              {daysRemaining !== undefined && (
                <div className="space-y-1">
                  <div className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">Testing Runway</div>
                  <div className="font-mono text-xs text-[#D4A853] font-bold">{daysRemaining} Days Remaining</div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* Confidence + Evidence — renders only when present */}
      {(d.confidenceLevel !== undefined || d.evidence?.length) && (
        <motion.section
          className="py-16 px-6 border-b border-[#D4A853]/8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="max-w-[900px] mx-auto space-y-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E] mb-2">
              00 — What We Know, and How
            </h2>
            {d.confidenceLevel !== undefined && (
              <ConfidenceBadge level={d.confidenceLevel} reason={d.confidenceReason} />
            )}
            {d.evidence?.length ? <EvidenceSection items={d.evidence} /> : null}
          </div>
        </motion.section>
      )}

      {/* Loom Video Embed — always renders */}
      <motion.section
        className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="max-w-[900px] mx-auto">
          <LoomSection url={d.loomUrl} label="Video Walkthrough" />
        </div>
      </motion.section>

      {/* Signal Section */}
      <motion.section
        className="py-16 px-6 border-b border-[#D4A853]/8"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-[900px] mx-auto">
          <motion.div variants={itemVariants}>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E] mb-4">
              01 — The Funnel Signal
            </h2>
            <p className="text-base text-[#F5F0EB] leading-relaxed max-w-[65ch] font-light">
              {d.diagnosis?.signal}
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Friction Mechanism */}
      <motion.section
        className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-[900px] mx-auto">
          <motion.div variants={itemVariants}>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E] mb-4">
              02 — The Friction Bottleneck
            </h2>
            <h3 className="text-xl font-serif text-[#C85C5C] tracking-tight mb-4 font-medium leading-snug">
              {d.diagnosis?.friction?.mechanism}
            </h3>
            <p className="text-base text-[#B0A89E] leading-relaxed max-w-[60ch] font-light">
              {d.diagnosis?.friction?.rootCause}
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Before / After Slider — renders only when this deliverable has real
          beforeAfter data. Used to fall back to a fake example (fictional
          fields, "+350% Calculated Conversion Gain") when absent — that
          example is gone, not replaced, since there's no honest generic
          substitute for a client-specific before/after comparison. */}
      {ba && (
        <motion.section
          className="py-20 px-6 border-b border-[#D4A853]/8 bg-[#0A0908]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="max-w-[900px] mx-auto">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E] mb-8">
              Visualization — Interface Overhaul (Drag to Compare)
            </h2>
            <BeforeAfterSlider data={ba} clientName={d.clientName} />
          </div>
        </motion.section>
      )}

      {/* The Recommendation — ONE synthesized decision, not three */}
      <motion.section
        className="py-24 px-6 border-b border-[#D4A853]/8"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="max-w-[900px] mx-auto space-y-8">
          <motion.h2
            variants={itemVariants}
            className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E]"
          >
            03 — The Recommendation
          </motion.h2>
          <motion.div variants={itemVariants}>
            {d.diagnosis?.finalDecision ? (
              <FinalDecisionCard decision={d.diagnosis.finalDecision} />
            ) : d.diagnosis?.decisions?.length ? (
              <LegacyDecisionsGrid decisions={d.diagnosis.decisions} />
            ) : (
              <RecommendationWithheldCard mechanism={d.diagnosis?.friction?.mechanism} />
            )}
          </motion.div>
          {d.projectedImpact && (
            <motion.div variants={itemVariants}>
              <ImpactRangeBlock
                range={d.projectedImpact}
                confidenceLevel={d.confidenceLevel}
                confidenceReason={d.confidenceReason}
              />
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* What NOT to do — renders only when present */}
      {d.avoid?.length ? (
        <motion.section
          className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="max-w-[900px] mx-auto">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E] mb-8">
              04 — What Not To Do
            </h2>
            <AvoidSection items={d.avoid} />
          </div>
        </motion.section>
      ) : null}

      {/* Remaining Uncertainty — renders only when the analyst wrote something */}
      {d.unknowns?.trim() ? (
        <motion.section
          className="py-16 px-6 border-b border-[#D4A853]/8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="max-w-[900px] mx-auto">
            <UnknownsSection text={d.unknowns.trim()} />
          </div>
        </motion.section>
      ) : null}

      {/* Implementation Checklist + Learning Modules — previously microdosing-only, now shown here too */}
      {(checklist.length > 0 || d.learningModules?.length) ? (
        <motion.section
          className="py-16 px-6 border-b border-[#D4A853]/8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="max-w-[900px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            {checklist.length > 0 && (
              <div className="space-y-6">
                <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E]">
                  05 — Implementation Checklist
                </h2>
                <div className="space-y-3">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`flex items-start gap-4 p-4 border rounded transition-all duration-300 cursor-pointer ${
                        item.done ? "bg-[#5C9A6B]/5 border-[#5C9A6B]/20" : "bg-[#110F0D]/40 border-[#D4A853]/8 hover:border-[#D4A853]/25"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.done ? "bg-[#5C9A6B] border-[#5C9A6B]" : "border-[#D4A853]/30"
                      }`}>
                        {item.done && <span className="text-xs text-[#0A0908] font-bold">✓</span>}
                      </div>
                      <div className="space-y-1.5 select-none">
                        <p className={`text-xs font-mono font-medium ${item.done ? "line-through text-[#7A6F65]" : "text-[#F5F0EB]"}`}>
                          {item.task}
                        </p>
                        <p className="text-base text-[#7A6F65] leading-relaxed max-w-[60ch]">{item.tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {d.learningModules?.length ? (
              <div className="space-y-6">
                <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E]">
                  06 — Implementation Detail
                </h2>
                <div className="space-y-2">
                  {d.learningModules.map((mod) => (
                    <div
                      key={mod.id}
                      onClick={() => setSelectedModuleId(mod.id)}
                      className={`p-4 border transition-all duration-300 cursor-pointer rounded text-left ${
                        selectedModuleId === mod.id ? "bg-[#D4A853]/5 border-[#D4A853]/25" : "bg-[#110F0D]/20 border-[#D4A853]/5 hover:border-[#D4A853]/15"
                      }`}
                    >
                      <span className="font-mono text-xs text-[#D4A853]/80 uppercase tracking-widest block mb-1.5">{mod.title}</span>
                      <p className="text-base text-[#7A6F65] leading-relaxed max-w-[60ch]">{mod.description}</p>
                    </div>
                  ))}
                </div>
                {activeModule && (
                  <div className="border border-[#D4A853]/12 bg-[#110F0D]/40 p-5 rounded-lg space-y-3">
                    <h4 className="text-xl font-serif font-medium text-[#F5F0EB] leading-snug">
                      {activeModule.title}
                    </h4>
                    <p className="text-base text-[#B0A89E] leading-relaxed max-w-[68ch] whitespace-pre-line">{activeModule.content}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.section>
      ) : null}

      <footer className="py-16 px-6 text-center border-t border-[#D4A853]/8 bg-[#0A0908]">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#7A6F65]">
          {d.consultant} · CONFIDENTIAL ARTIFACT · ALL RIGHTS RESERVED
        </p>
      </footer>
    </main>
  );
}

// ── Before/After Slider — fully data-driven, no hardcoded per-client copy ──
function BeforeAfterSlider({ data: ba, clientName }: { data: BeforeAfterData; clientName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSliderPosition(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current || e.touches.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSliderPosition(Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100)));
    };
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] bg-[#0A0908] border border-[#D4A853]/8 rounded-lg overflow-hidden select-none"
    >
      {/* Before Panel */}
      <div className="absolute inset-0 w-full h-full p-6 flex flex-col justify-between">
        <div className="w-full h-full flex flex-col justify-between opacity-80 pointer-events-none">
          <div className="flex items-center gap-1.5 border-b border-[#C85C5C]/20 pb-2 mb-2 font-mono text-xs text-[#C85C5C]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C85C5C]/20 border border-[#C85C5C]/50" />
            <span>ORIGINAL FLOW (HIGH FRICTION)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1 py-4">
            <div className="space-y-2">
              <span className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block">Current State</span>
              <h4 className="font-serif text-xl font-medium leading-snug text-[#F5F0EB]">{ba.beforeTitle}</h4>
              <div className="border border-[#C85C5C]/20 bg-[#C85C5C]/5 p-3 rounded space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {ba.beforeFields.map((val, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="h-1 w-8 bg-[#7A6F65]" />
                      <div className="h-6 bg-[#110F0D] border border-[#C85C5C]/20 rounded flex items-center px-1.5 text-xs text-[#C85C5C]">
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
                {ba.beforeWarning && (
                  <div className="border border-[#C85C5C]/30 bg-[#C85C5C]/10 p-2 rounded text-xs text-[#C85C5C] font-mono flex items-center gap-2">
                    <span>⚑</span>
                    <span>{ba.beforeWarning}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="border border-[#D4A853]/8 p-4 rounded bg-[#110F0D]/50 space-y-2 border-l-2 border-[#C85C5C]/40">
              <span className="font-mono text-xs text-[#C85C5C] uppercase tracking-widest block">Diagnosed Friction</span>
              <p className="text-base text-[#B0A89E] leading-relaxed max-w-[42ch]">{ba.beforeIssue}</p>
              <div className="font-mono text-xs text-[#C85C5C]">{ba.beforeBounce}</div>
            </div>
          </div>
          <div className="text-xs font-mono text-[#7A6F65] text-right mt-2">
            {clientName} · Current State
          </div>
        </div>
      </div>

      {/* After Panel */}
      <div
        className="absolute inset-y-0 left-0 h-full overflow-hidden z-20 border-r border-[#D4A853]/30"
        style={{ width: `${sliderPosition}%` }}
      >
        <div
          className="absolute inset-y-0 left-0 h-full p-6 flex flex-col justify-between bg-[#110F0D]"
          style={{ width: containerWidth }}
        >
          <div className="w-full h-full flex flex-col justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 border-b border-[#D4A853]/20 pb-2 mb-2 font-mono text-xs text-[#D4A853]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4A853]/20 border border-[#D4A853]" />
              <span>RECOMMENDED STATE</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1 py-4">
              <div className="space-y-2">
                <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider block">After the Fix</span>
                <h4 className="font-serif text-xl font-medium leading-snug text-[#F5F0EB]">{ba.afterTitle}</h4>
                <div className="border border-[#D4A853]/20 bg-[#D4A853]/5 p-3 rounded space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#B0A89E] block">Reference</label>
                    <div className="h-7 bg-[#0A0908] border border-[#D4A853]/20 rounded flex items-center px-2 text-xs text-[#F5F0EB]">
                      {ba.afterDomain}
                    </div>
                  </div>
                  {ba.afterConfirmation && (
                    <div className="flex items-center gap-1.5 text-xs text-[#5C9A6B] bg-[#5C9A6B]/10 px-2 py-1 rounded border border-[#5C9A6B]/20">
                      <span>✓</span>
                      <span>{ba.afterConfirmation}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="border border-[#D4A853]/8 p-4 rounded bg-[#0A0908] space-y-2 border-l-2 border-[#D4A853]/40">
                <span className="font-mono text-xs text-[#D4A853] uppercase tracking-widest block">What Changes</span>
                {ba.afterDescription && (
                  <p className="text-base text-[#B0A89E] leading-relaxed max-w-[42ch]">{ba.afterDescription}</p>
                )}
                <div className="font-mono text-xs text-[#5C9A6B]">{ba.afterGain}</div>
              </div>
            </div>
            <div className="text-xs font-mono text-[#B0A89E] text-right mt-2">
              Signal &amp; Friction Recommendation
            </div>
          </div>
        </div>
      </div>

      {/* Drag Handle */}
      <div
        className="absolute inset-y-0 z-30 w-1 bg-[#D4A853] cursor-ew-resize group"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#110F0D] border border-[#D4A853] shadow-lg flex items-center justify-center cursor-ew-resize transition-transform group-hover:scale-105 select-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5F0EB" strokeWidth="2.5">
            <path d="m8 18-6-6 6-6M16 6l6 6-6 6" />
          </svg>
        </div>
        <div className="absolute top-4 right-4 pointer-events-none font-mono text-xs uppercase tracking-widest bg-[#110F0D] text-[#D4A853] border border-[#D4A853]/20 px-2.5 py-0.5 rounded shadow">
          After
        </div>
        <div className="absolute top-4 -translate-x-[calc(100%+8px)] pointer-events-none font-mono text-xs uppercase tracking-widest bg-[#0A0908] text-[#C85C5C] border border-[#C85C5C]/20 px-2.5 py-0.5 rounded shadow">
          Before
        </div>
      </div>
    </div>
  );
}
