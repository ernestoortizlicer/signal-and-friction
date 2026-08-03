/**
 * Shared deliverable rendering primitives.
 * ════════════════════════════════════════════════════════════════════════════
 * Extracted from DeliverableClientView.tsx (Phase 4.3) so both the
 * original two-template rendering AND the new PolicyComposedDeliverable
 * can import the same components without the two files importing from
 * each other — a straight circular-import risk the previous arrangement
 * would have had (DeliverableClientView renders PolicyComposedDeliverable
 * for new deliverables; PolicyComposedDeliverable reuses these same
 * primitives for old-template compatibility of look-and-feel).
 *
 * Every component here is presence-safe by itself; policy/tier gating
 * happens at the call site in each of the two composition layers, not
 * here.
 */
"use client";

import { useRef, useState, useEffect } from "react";
import type { BeforeAfterData, Decision, EvidenceItem, EvidenceTier, ImpactRange, AvoidItem } from "../fallback";

// Phase 4.1 — analyst-authored uncertainty, shown in every service tier.
// Deliberately plain and un-alarming: this is a trust signal ("we're
// telling you what we don't know"), not an apology or a defect report.
// Phase 4.2 — at most one dominant interpretation, at most one ruled-out
// alternative, both already fully client-safe by the time they reach
// here (see src/lib/hypothesis-translation.ts). This component has no
// access to a mechanism id, a rationale, or an evidence badge — there is
// nothing here that COULD leak internal reasoning, not just a rule not to.
export function BehavioralInterpretationSection({
  dominant,
  ruledOutAlternative,
}: {
  dominant: { label: string; sentence: string };
  ruledOutAlternative?: { label: string; sentence: string } | null;
}) {
  return (
    <div className="space-y-3">
      <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch] font-light">{dominant.sentence}</p>
      {ruledOutAlternative && (
        <p className="text-sm text-[#7A6F65] leading-relaxed max-w-[65ch] italic">
          We also considered {ruledOutAlternative.label.toLowerCase()}, but the evidence points more specifically
          to {dominant.label.toLowerCase()}.
        </p>
      )}
    </div>
  );
}

export function UnknownsSection({ text }: { text: string }) {
  return (
    <div className="border border-[#7A6F65]/20 bg-[#7A6F65]/[0.03] p-6 md:p-8 rounded space-y-3">
      <span className="font-mono text-xs uppercase tracking-wider text-[#7A6F65]">Remaining Uncertainty</span>
      <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch] whitespace-pre-line">{text}</p>
    </div>
  );
}

// ── Epistemics primitives — shared by every rendering path ─────────────────

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

export function EvidenceSection({ items }: { items: EvidenceItem[] }) {
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

export function ConfidenceBadge({ level, reason }: { level: number; reason?: string }) {
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

export function ImpactRangeBlock({
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

export function AvoidSection({ items }: { items: AvoidItem[] }) {
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
export function RecommendationWithheldCard({ mechanism }: { mechanism?: string }) {
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

export function FinalDecisionCard({ decision }: { decision: Decision }) {
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
export function LegacyDecisionsGrid({ decisions }: { decisions: Decision[] }) {
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

// One consistent Loom state across every rendering path — a numbered
// section must never silently vanish when the URL is a placeholder. Real
// or pending, the section always renders.
export function LoomSection({ url, label, dense }: { url?: string; label: string; dense?: boolean }) {
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

// ── Before/After Slider — fully data-driven, no hardcoded per-client copy ──
export function BeforeAfterSlider({ data: ba, clientName }: { data: BeforeAfterData; clientName: string }) {
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
