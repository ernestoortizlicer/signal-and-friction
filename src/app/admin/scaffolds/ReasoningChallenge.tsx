"use client";

// Phase 3.1 — the AI as an active reasoning partner, not a decision maker.
// This is deliberately separate from ReasoningPanel.tsx's deterministic
// mechanism picker: that widget is free, instant, and always available —
// a lookup against the registry. This component is a heavier, explicitly
// analyst-triggered LLM critique of the analyst's FULL judgment (not just
// the hypothesis field), asking what might be missing rather than
// asserting an answer. It never writes to the scaffold, never persists
// anything, and nothing it returns can be attached as a hypothesis
// directly — attaching still requires the analyst to use the mechanism
// picker above and write their own rationale by hand. Results are
// session-only: closing or refreshing the page discards them, same as
// asking a colleague a question rather than filing a report.

import { useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import { MECHANISMS, type DiagnosisHypothesis } from "@/domain/reasoning";

interface EvidenceRow {
  tier: "measured";
  label: string;
  value: string;
  source: string;
}

interface ChallengeResult {
  probing_question: string;
  alternative_hypotheses: string[];
  contradictions: string[];
  missing_evidence: string[];
  counterarguments: string[];
}

interface ReasoningChallengeProps {
  domain: string;
  targetUrl: string;
  evidence: EvidenceRow[];
  frictionMechanism: string;
  specificFrictionPoint: string;
  whyBlocksConversion: string;
  projectedImpact: string;
  theDecision: string;
  whatToAvoid: string;
  confidenceAndWhy: string;
  unknowns: string;
  attachedHypotheses: DiagnosisHypothesis[];
}

const RESULT_SECTIONS: Array<{ key: keyof Omit<ChallengeResult, "probing_question">; label: string }> = [
  { key: "alternative_hypotheses", label: "Alternative mechanisms worth considering" },
  { key: "contradictions", label: "Possible contradictions" },
  { key: "missing_evidence", label: "Evidence that's missing" },
  { key: "counterarguments", label: "Counterarguments to your recommendation" },
];

export default function ReasoningChallenge(props: ReasoningChallengeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChallengeResult | null>(null);

  const ready =
    props.frictionMechanism.trim().length > 0 &&
    props.specificFrictionPoint.trim().length > 0 &&
    props.whyBlocksConversion.trim().length > 0;

  async function challenge() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scaffolds/challenge-reasoning", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: props.domain,
          targetUrl: props.targetUrl,
          evidence: props.evidence.map((e) => ({ label: e.label, value: e.value, source: e.source })),
          frictionMechanism: props.frictionMechanism,
          specificFrictionPoint: props.specificFrictionPoint,
          whyBlocksConversion: props.whyBlocksConversion,
          projectedImpact: props.projectedImpact,
          theDecision: props.theDecision,
          whatToAvoid: props.whatToAvoid,
          confidenceAndWhy: props.confidenceAndWhy,
          unknowns: props.unknowns,
          attachedHypotheses: props.attachedHypotheses.map((h) => ({
            mechanismName: MECHANISMS.find((m) => m.id === h.mechanismId)?.name ?? h.mechanismId,
            analystRationale: h.analystRationale,
          })),
          canonicalMechanisms: MECHANISMS.map((m) => ({ id: m.id, name: m.name, definition: m.definition })),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error || `Request failed (HTTP ${res.status}).`);
        return;
      }
      setResult(body);
    } catch (err) {
      setError(`Request failed: ${err instanceof Error ? err.message : "network error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="font-mono text-[10px] text-[#5C8AA0] uppercase tracking-widest block">
            AI reasoning partner — advisory only, not evidence, not a diagnosis
          </span>
          <p className="text-xs text-[#7A6F65] font-mono mt-1">
            Asks what you might be missing. It never tells you what the diagnosis is — only you can attach a hypothesis or make the call.
          </p>
        </div>
        <button
          type="button"
          onClick={challenge}
          disabled={!ready || loading}
          className="font-mono text-[10px] uppercase tracking-wider text-[#5C8AA0] border border-[#5C8AA0]/30 rounded px-3 py-1.5 hover:bg-[#5C8AA0]/10 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? "Thinking…" : result ? "Ask again" : "Challenge this reasoning"}
        </button>
      </div>

      {!ready && (
        <p className="text-xs text-[#7A6F65] font-mono italic">
          Write your friction mechanism, specific friction point, and why-it-blocks-conversion above first.
        </p>
      )}

      {error && <p className="text-xs text-[#C85C5C]">{error}</p>}

      {result && (
        <div className="border-l-2 border-[#5C8AA0]/60 bg-[#5C8AA0]/[0.06] rounded-r p-3 space-y-3">
          <p className="font-serif text-sm text-white italic">&ldquo;{result.probing_question}&rdquo;</p>
          {RESULT_SECTIONS.map(({ key, label }) => {
            const items = result[key];
            if (!items.length) return null;
            return (
              <div key={key} className="space-y-1">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#5C8AA0] block">
                  {label}
                </span>
                <ul className="space-y-1 list-disc list-inside">
                  {items.map((item, i) => (
                    <li key={i} className="text-xs text-[#B0A89E] leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setResult(null)}
            className="font-mono text-[9px] text-[#7A6F65] uppercase tracking-wider hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
