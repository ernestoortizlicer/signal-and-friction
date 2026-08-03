"use client";

// ════════════════════════════════════════════════════════════
// DIAGNOSTIC CALIBRATION SYSTEM v3
// ════════════════════════════════════════════════════════════
// A professional diagnostic simulator, not a quiz: no points, no streak
// pressure, no celebratory animations, no opaque pass/fail score. The
// analyst works through a fixed 10-stage sequence on a REAL, cited
// historical case; the reference consultancy's verdict is server-side
// hidden (functions/api/training/attempt.ts + _shared.ts's
// visibleCaseFields — this component never even receives the hidden
// fields in its API responses until the reveal action succeeds, so there
// is nothing here for a client-side bug to leak).
//
// Stage order matches src/lib/training-workflow.ts's STAGE_ORDER exactly
// (duplicated here as display data only — the actual gate is server-
// side, so a UI-side mistake here cannot leak a hidden verdict, only
// mis-render the stepper).
import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

type Stage =
  | "observation" | "evidence_review" | "hypothesis" | "counter_hypothesis"
  | "socratic_challenge" | "revision" | "judgment" | "recommendation"
  | "verdict_revealed" | "reflection_complete";

const STAGE_ORDER: Stage[] = [
  "observation", "evidence_review", "hypothesis", "counter_hypothesis",
  "socratic_challenge", "revision", "judgment", "recommendation",
  "verdict_revealed", "reflection_complete",
];

const STAGE_LABELS: Record<Stage, string> = {
  observation: "Observation",
  evidence_review: "Evidence Review",
  hypothesis: "Behavioral Hypothesis",
  counter_hypothesis: "Counter-Hypothesis",
  socratic_challenge: "Socratic Challenge",
  revision: "Analyst Revision",
  judgment: "Judgment",
  recommendation: "Recommendation",
  verdict_revealed: "Reference Verdict",
  reflection_complete: "Comparative Reflection",
};

type Mechanism =
  | "cognitive_load" | "trust_deficit" | "commitment_anxiety"
  | "ordering_error" | "identity_friction" | "value_uncertainty";

const MECHANISMS: Mechanism[] = [
  "cognitive_load", "trust_deficit", "commitment_anxiety",
  "ordering_error", "identity_friction", "value_uncertainty",
];

const MECHANISM_LABELS: Record<Mechanism, string> = {
  cognitive_load: "Cognitive Load",
  trust_deficit: "Trust Deficit",
  commitment_anxiety: "Commitment Anxiety",
  ordering_error: "Ordering Error",
  identity_friction: "Identity Friction",
  value_uncertainty: "Value Uncertainty",
};

const REFLECTION_QUESTIONS: { key: string; question: string }[] = [
  { key: "agreement", question: "Where did your diagnosis agree with the reference diagnosis?" },
  { key: "difference", question: "Where did it differ?" },
  { key: "defensible", question: "If it differed, was your reasoning genuinely weaker, or was it a defensible alternative interpretation the consultancy may have overlooked?" },
  { key: "confidence_appropriate", question: "Was your confidence level appropriate given the outcome?" },
  { key: "undervalued", question: "Which evidence did you undervalue that the reference consultancy considered decisive?" },
  { key: "overweighted", question: "Which evidence did you overweight?" },
  { key: "next_hour", question: "What would you investigate next if given another hour?" },
];

interface ObservableCase {
  id: string;
  caseKey: string;
  title: string;
  companyName: string | null;
  sourceType: "primary" | "practitioner_account" | "secondary_vendor" | "internal_sf_resolved";
  sourceUrl: string | null;
  sourceNote: string | null;
  landingPage: string | null;
  pricingPage: string | null;
  onboardingFlow: string | null;
  checkoutFlow: string | null;
  technicalFindings: string | null;
  contextualInfo: string | null;
  // Present ONLY after reveal — the type is honest about that by making
  // every one of these optional; absence, not a placeholder, is the
  // pre-reveal state.
  referenceMechanism?: Mechanism;
  referenceMechanismNote?: string | null;
  referenceDiagnosis?: string;
  referenceRecommendation?: string;
  referenceResult?: string | null;
}

interface AttemptInputs {
  observation?: string;
  evidenceNotes?: string;
  hypothesisMechanism?: Mechanism;
  hypothesisReasoning?: string;
  counterHypothesisMechanism?: Mechanism;
  counterHypothesisReasoning?: string;
  socraticExchanges?: { question: string; response: string }[];
  revision?: string;
  judgmentMechanism?: Mechanism;
  judgmentConfidence?: "low" | "moderate" | "high";
  recommendation?: string;
  uncertaintyNotes?: string;
}

interface CalibrationProfile {
  evidence_evaluation: number;
  hypothesis_generation: number;
  uncertainty_estimation: number;
  prioritization: number;
  differential_diagnosis: number;
  confidence_calibration: number;
  recommendation_quality: number;
}

const SOURCE_TYPE_LABELS: Record<ObservableCase["sourceType"], string> = {
  primary: "Primary source",
  practitioner_account: "Practitioner account",
  secondary_vendor: "Vendor case study — treat outcome as directional",
  internal_sf_resolved: "Signal & Friction's own resolved case",
};

function SourceBadge({ c }: { c: ObservableCase }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
      <span className="uppercase tracking-wider text-[#7A6F65] border border-[#7A6F65]/30 px-2 py-0.5 rounded">
        {SOURCE_TYPE_LABELS[c.sourceType]}
      </span>
      {c.sourceUrl && (
        <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-[#D4A853]/80 hover:text-[#D4A853] underline underline-offset-2">
          source ↗
        </a>
      )}
      {c.sourceNote && <span className="text-[#7A6F65] italic">{c.sourceNote}</span>}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="text-[#D4A853] font-mono text-sm tracking-wider" aria-label={`${value} of 5`}>
      {"★".repeat(value)}
      <span className="text-[#D4A853]/25">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function Field({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-[#110F0D]/60 border border-[#D4A853]/15 focus:border-[#D4A853]/40 rounded p-3 text-sm text-[#F5F0EB] placeholder:text-[#7A6F65] outline-none resize-vertical leading-relaxed"
      />
    </div>
  );
}

function MechanismSelect({ label, value, onChange, exclude }: { label: string; value: Mechanism | undefined; onChange: (m: Mechanism) => void; exclude?: Mechanism }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">{label}</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {MECHANISMS.filter((m) => m !== exclude).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`font-mono text-xs uppercase tracking-wide px-2.5 py-2 rounded border text-left transition-colors ${
              value === m ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]" : "border-[#D4A853]/12 text-[#B0A89E] hover:border-[#D4A853]/30"
            }`}
          >
            {MECHANISM_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfidenceSelect({ value, onChange }: { value: "low" | "moderate" | "high" | undefined; onChange: (c: "low" | "moderate" | "high") => void }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">Confidence</label>
      <div className="flex gap-2">
        {(["low", "moderate", "high"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`font-mono text-xs uppercase px-3 py-1.5 rounded border transition-colors ${
              value === c ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]" : "border-[#D4A853]/12 text-[#B0A89E] hover:border-[#D4A853]/30"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function CaseDossier({ c }: { c: ObservableCase }) {
  const rows: [string, string | null][] = [
    ["Landing Page", c.landingPage],
    ["Pricing Page", c.pricingPage],
    ["Onboarding Flow", c.onboardingFlow],
    ["Checkout Flow", c.checkoutFlow],
    ["Technical Findings", c.technicalFindings],
    ["Context", c.contextualInfo],
  ].filter(([, v]) => !!v) as [string, string][];

  return (
    <div className="border border-[#D4A853]/12 bg-[#110F0D]/40 rounded-lg p-5 space-y-4">
      <div>
        <h3 className="font-serif text-lg text-[#F5F0EB]">{c.title}{c.companyName ? ` — ${c.companyName}` : ""}</h3>
        <div className="mt-1.5"><SourceBadge c={c} /></div>
      </div>
      <div className="space-y-3">
        {rows.map(([label, v]) => (
          <div key={label}>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block mb-1">{label}</span>
            <p className="text-sm text-[#B0A89E] leading-relaxed whitespace-pre-line">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DiagnosticCalibration() {
  const [view, setView] = useState<"list" | "case">("list");
  const [cases, setCases] = useState<ObservableCase[]>([]);
  const [mechanismCoverage, setMechanismCoverage] = useState<Record<string, number>>({});
  const [loadingCases, setLoadingCases] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCase, setActiveCase] = useState<ObservableCase | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("observation");
  const [inputs, setInputs] = useState<AttemptInputs>({});
  const [saving, setSaving] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const [socraticQuestion, setSocraticQuestion] = useState<string | null>(null);
  const [socraticResponse, setSocraticResponse] = useState("");
  const [socraticLoading, setSocraticLoading] = useState(false);
  const [exchanges, setExchanges] = useState<{ question: string; response: string }[]>([]);

  const [revealed, setRevealed] = useState<{ mechanismCorrect: boolean; disagreementDefensible: boolean | null; calibrationProfile: CalibrationProfile } | null>(null);
  const [revealedCase, setRevealedCase] = useState<ObservableCase | null>(null);
  const [revealing, setRevealing] = useState(false);

  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);

  const [readiness, setReadiness] = useState<{ ready: boolean; windowUsed: number; criteria: { id: string; label: string; passed: boolean; actual: number | string; threshold: number | string; detail: string }[] } | null>(null);
  const [confusionPairs, setConfusionPairs] = useState<{ reference: string; claimed: string; count: number }[]>([]);

  async function loadCases() {
    setLoadingCases(true);
    setError(null);
    try {
      const res = await fetch("/api/training/cases", { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load cases.");
      setCases(data.cases ?? []);
      setMechanismCoverage(data.mechanismCoverage ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cases.");
    } finally {
      setLoadingCases(false);
    }
  }

  async function loadReadiness() {
    try {
      const res = await fetch("/api/training/readiness", { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok) {
        setReadiness(data.readiness);
        setConfusionPairs(data.confusionPairs ?? []);
      }
    } catch {
      // Readiness is a supplementary panel — a failed fetch here shouldn't block training itself.
    }
  }

  useEffect(() => {
    async function loadInitial() {
      await loadCases();
      await loadReadiness();
    }
    loadInitial();
  }, []);

  async function startCase(c: ObservableCase) {
    setError(null);
    try {
      const res = await fetch("/api/training/attempt", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", caseId: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start case.");
      setActiveCase(data.case);
      setAttemptId(data.attempt.id);
      setStage(data.attempt.stage);
      setInputs({});
      setExchanges([]);
      setSocraticQuestion(null);
      setSocraticResponse("");
      setRevealed(null);
      setRevealedCase(null);
      setReflectionAnswers({});
      setCompleted(false);
      setBlockedReason(null);
      setView("case");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start case.");
    }
  }

  async function save(fields: Partial<AttemptInputs>) {
    if (!attemptId) return;
    setSaving(true);
    setBlockedReason(null);
    try {
      const res = await fetch("/api/training/attempt", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", attemptId, fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setInputs((prev) => ({ ...prev, ...fields }));
      setStage(data.attempt.stage);
      setBlockedReason(data.advanceBlockedReason ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function askSocratic() {
    if (!activeCase) return;
    setSocraticLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/diagnostic-calibration-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}` },
        body: JSON.stringify({ step: "socratic", observableCase: activeCase, inputs, priorExchanges: exchanges }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Socratic tutor request failed.");
      setSocraticQuestion(data.question);
      setSocraticResponse("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Socratic tutor request failed.");
    } finally {
      setSocraticLoading(false);
    }
  }

  function recordExchange() {
    if (!socraticQuestion || !socraticResponse.trim()) return;
    setExchanges((prev) => [...prev, { question: socraticQuestion, response: socraticResponse.trim() }]);
    setSocraticQuestion(null);
    setSocraticResponse("");
  }

  async function reveal() {
    if (!attemptId) return;
    setRevealing(true);
    try {
      const res = await fetch("/api/training/attempt", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal", attemptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reveal verdict.");
      setRevealed(data.attempt);
      setRevealedCase(data.case);
      setStage("verdict_revealed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reveal verdict.");
    } finally {
      setRevealing(false);
    }
  }

  async function submitReflection() {
    if (!attemptId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/training/attempt", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reflect", attemptId, reflectionAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit reflection.");
      setStage("reflection_complete");
      setCompleted(true);
      loadReadiness();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit reflection.");
    } finally {
      setSaving(false);
    }
  }

  const stageIdx = STAGE_ORDER.indexOf(stage);

  return (
    <div className="space-y-6">
      {error && (
        <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 p-3 rounded text-xs text-[#C85C5C] font-mono flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="uppercase tracking-wider">dismiss</button>
        </div>
      )}

      {/* ── Readiness panel — always visible, never a single opaque score ── */}
      {readiness && (
        <div className="border border-[#D4A853]/12 bg-[#110F0D]/30 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">Readiness for Real-Prospect Diagnosis</span>
            <span className={`font-mono text-xs uppercase px-2.5 py-1 rounded border ${readiness.ready ? "text-[#5C9A6B] border-[#5C9A6B]/40 bg-[#5C9A6B]/8" : "text-[#7A6F65] border-[#7A6F65]/30"}`}>
              {readiness.ready ? "Ready" : "Not yet ready"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {readiness.criteria.map((c) => (
              <div key={c.id} className={`text-xs p-2.5 rounded border ${c.passed ? "border-[#5C9A6B]/25 bg-[#5C9A6B]/5" : "border-[#D4A853]/15"}`}>
                <div className="flex items-center justify-between font-mono">
                  <span className={c.passed ? "text-[#5C9A6B]" : "text-[#B0A89E]"}>{c.passed ? "✓" : "○"} {c.label}</span>
                  <span className="text-[#7A6F65]">{c.actual} / {c.threshold}</span>
                </div>
                <p className="text-[#7A6F65] mt-1">{c.detail}</p>
              </div>
            ))}
          </div>
          {confusionPairs.length > 0 && (
            <div className="text-xs text-[#7A6F65] font-mono">
              Most-confused pair: {MECHANISM_LABELS[confusionPairs[0].reference as Mechanism]} mistaken for {MECHANISM_LABELS[confusionPairs[0].claimed as Mechanism]} ({confusionPairs[0].count}×)
            </div>
          )}
        </div>
      )}

      {view === "list" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {MECHANISMS.map((m) => (
              <div key={m} className={`text-xs font-mono p-2 rounded border ${mechanismCoverage[m] > 0 ? "border-[#D4A853]/15 text-[#B0A89E]" : "border-[#7A6F65]/20 text-[#7A6F65] italic"}`}>
                {MECHANISM_LABELS[m]}: {mechanismCoverage[m] > 0 ? `${mechanismCoverage[m]} case${mechanismCoverage[m] > 1 ? "s" : ""}` : "no verified case yet"}
              </div>
            ))}
          </div>

          {loadingCases ? (
            <p className="text-sm text-[#7A6F65]">Loading cases…</p>
          ) : cases.length === 0 ? (
            <div className="border border-[#D4A853]/12 bg-[#110F0D]/30 rounded-lg p-6 text-sm text-[#7A6F65] leading-relaxed">
              No verified training cases yet. This system never trains on fabricated reference cases — a case only
              appears here once it has real observable evidence, an original diagnosis, an implemented recommendation,
              and enough provenance to identify the source. Add one via <code className="text-[#D4A853]/70">POST /api/training/cases</code>.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => startCase(c)}
                  className="text-left border border-[#D4A853]/12 hover:border-[#D4A853]/30 bg-[#110F0D]/30 rounded-lg p-4 space-y-2 transition-colors"
                >
                  <h4 className="font-serif text-[#F5F0EB]">{c.title}</h4>
                  <SourceBadge c={c} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "case" && activeCase && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-4">
            <button onClick={() => setView("list")} className="font-mono text-xs uppercase tracking-wider text-[#7A6F65] hover:text-[#D4A853]">← Back to cases</button>
            <CaseDossier c={revealedCase ?? activeCase} />
          </div>

          <div className="space-y-4">
            {/* Stage stepper */}
            <div className="flex flex-wrap gap-1.5">
              {STAGE_ORDER.map((s, i) => (
                <span
                  key={s}
                  className={`font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded ${
                    i < stageIdx ? "text-[#5C9A6B] bg-[#5C9A6B]/8" : i === stageIdx ? "text-[#D4A853] bg-[#D4A853]/10 border border-[#D4A853]/30" : "text-[#7A6F65]/50"
                  }`}
                >
                  {i + 1}. {STAGE_LABELS[s]}
                </span>
              ))}
            </div>

            <div className="border border-[#D4A853]/15 bg-[#0A0908] rounded-lg p-6 space-y-4">
              {stage === "observation" && (
                <>
                  <Field label="Observation" value={inputs.observation ?? ""} onChange={(v) => setInputs((p) => ({ ...p, observation: v }))} placeholder="What is directly observable, before any interpretation?" />
                  {blockedReason && <p className="text-xs text-[#C85C5C]">{blockedReason}</p>}
                  <button disabled={saving} onClick={() => save({ observation: inputs.observation })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                    Save &amp; Continue
                  </button>
                </>
              )}

              {stage === "evidence_review" && (
                <>
                  <Field label="Evidence Review" value={inputs.evidenceNotes ?? ""} onChange={(v) => setInputs((p) => ({ ...p, evidenceNotes: v }))} placeholder="What evidence supports a conclusion? What contradicts one?" />
                  {blockedReason && <p className="text-xs text-[#C85C5C]">{blockedReason}</p>}
                  <button disabled={saving} onClick={() => save({ evidenceNotes: inputs.evidenceNotes })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                    Save &amp; Continue
                  </button>
                </>
              )}

              {stage === "hypothesis" && (
                <>
                  <MechanismSelect label="Behavioral Hypothesis — Mechanism" value={inputs.hypothesisMechanism} onChange={(m) => setInputs((p) => ({ ...p, hypothesisMechanism: m }))} />
                  <Field label="Reasoning" value={inputs.hypothesisReasoning ?? ""} onChange={(v) => setInputs((p) => ({ ...p, hypothesisReasoning: v }))} placeholder="Why this mechanism, from the evidence above?" />
                  {blockedReason && <p className="text-xs text-[#C85C5C]">{blockedReason}</p>}
                  <button disabled={saving} onClick={() => save({ hypothesisMechanism: inputs.hypothesisMechanism, hypothesisReasoning: inputs.hypothesisReasoning })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                    Save &amp; Continue
                  </button>
                </>
              )}

              {stage === "counter_hypothesis" && (
                <>
                  <p className="text-xs text-[#7A6F65] italic">What alternative explanation is equally plausible?</p>
                  <MechanismSelect label="Counter-Hypothesis — Mechanism" value={inputs.counterHypothesisMechanism} onChange={(m) => setInputs((p) => ({ ...p, counterHypothesisMechanism: m }))} exclude={inputs.hypothesisMechanism} />
                  <Field label="Reasoning" value={inputs.counterHypothesisReasoning ?? ""} onChange={(v) => setInputs((p) => ({ ...p, counterHypothesisReasoning: v }))} placeholder="Why might this be the real explanation instead?" />
                  {blockedReason && <p className="text-xs text-[#C85C5C]">{blockedReason}</p>}
                  <button disabled={saving} onClick={() => save({ counterHypothesisMechanism: inputs.counterHypothesisMechanism, counterHypothesisReasoning: inputs.counterHypothesisReasoning })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                    Save &amp; Continue
                  </button>
                </>
              )}

              {stage === "socratic_challenge" && (
                <div className="space-y-4">
                  {exchanges.map((ex, i) => (
                    <div key={i} className="space-y-1.5 border-l-2 border-[#D4A853]/20 pl-3">
                      <p className="text-sm text-[#D4A853]/90 italic">{ex.question}</p>
                      <p className="text-sm text-[#B0A89E]">{ex.response}</p>
                    </div>
                  ))}
                  {!socraticQuestion && (
                    <button disabled={socraticLoading} onClick={askSocratic} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                      {socraticLoading ? "Thinking…" : exchanges.length === 0 ? "Begin Socratic Challenge" : "Ask Another"}
                    </button>
                  )}
                  {socraticQuestion && (
                    <div className="space-y-2">
                      <p className="text-sm text-[#D4A853]/90 italic">{socraticQuestion}</p>
                      <textarea value={socraticResponse} onChange={(e) => setSocraticResponse(e.target.value)} rows={3} className="w-full bg-[#110F0D]/60 border border-[#D4A853]/15 focus:border-[#D4A853]/40 rounded p-3 text-sm text-[#F5F0EB] outline-none resize-vertical" placeholder="Your response…" />
                      <button disabled={!socraticResponse.trim()} onClick={recordExchange} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                        Respond
                      </button>
                    </div>
                  )}
                  {exchanges.length > 0 && !socraticQuestion && (
                    <button disabled={saving} onClick={() => save({ socraticExchanges: exchanges })} className="font-mono text-xs uppercase tracking-wider border border-[#5C9A6B]/40 text-[#5C9A6B] px-4 py-2 rounded hover:bg-[#5C9A6B]/10 disabled:opacity-40">
                      Save &amp; Continue
                    </button>
                  )}
                  {blockedReason && <p className="text-xs text-[#C85C5C]">{blockedReason}</p>}
                </div>
              )}

              {stage === "revision" && (
                <>
                  <Field label="Analyst Revision" value={inputs.revision ?? ""} onChange={(v) => setInputs((p) => ({ ...p, revision: v }))} placeholder="What, if anything, changed after the challenge? (State explicitly, even if the answer is 'nothing.')" />
                  {blockedReason && <p className="text-xs text-[#C85C5C]">{blockedReason}</p>}
                  <button disabled={saving} onClick={() => save({ revision: inputs.revision })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                    Save &amp; Continue
                  </button>
                </>
              )}

              {stage === "judgment" && (
                <>
                  <MechanismSelect label="Final Judgment — Mechanism" value={inputs.judgmentMechanism} onChange={(m) => setInputs((p) => ({ ...p, judgmentMechanism: m }))} />
                  <ConfidenceSelect value={inputs.judgmentConfidence} onChange={(c) => setInputs((p) => ({ ...p, judgmentConfidence: c }))} />
                  {blockedReason && <p className="text-xs text-[#C85C5C]">{blockedReason}</p>}
                  <button disabled={saving} onClick={() => save({ judgmentMechanism: inputs.judgmentMechanism, judgmentConfidence: inputs.judgmentConfidence })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                    Save &amp; Continue
                  </button>
                </>
              )}

              {stage === "recommendation" && (
                <>
                  <Field label="Recommendation" value={inputs.recommendation ?? ""} onChange={(v) => setInputs((p) => ({ ...p, recommendation: v }))} placeholder="What would you recommend, given your judgment?" />
                  <Field label="Unknowns" value={inputs.uncertaintyNotes ?? ""} onChange={(v) => setInputs((p) => ({ ...p, uncertaintyNotes: v }))} placeholder="What would change your mind? What don't you know?" rows={2} />
                  {blockedReason && <p className="text-xs text-[#C85C5C]">{blockedReason}</p>}
                  <div className="flex gap-2">
                    <button disabled={saving} onClick={() => save({ recommendation: inputs.recommendation, uncertaintyNotes: inputs.uncertaintyNotes })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                      Save
                    </button>
                    <button disabled={revealing} onClick={reveal} className="font-mono text-xs uppercase tracking-wider border border-[#5C9A6B]/40 text-[#5C9A6B] px-4 py-2 rounded hover:bg-[#5C9A6B]/10 disabled:opacity-40">
                      {revealing ? "Revealing…" : "Reveal Reference Verdict"}
                    </button>
                  </div>
                </>
              )}

              {stage === "verdict_revealed" && revealed && revealedCase && (
                <div className="space-y-5">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block mb-1">Reference Consultancy Judgment</span>
                    <div className={`p-3 rounded border font-mono text-xs mb-2 ${revealed.mechanismCorrect ? "border-[#5C9A6B]/30 bg-[#5C9A6B]/5 text-[#5C9A6B]" : "border-[#C85C5C]/30 bg-[#C85C5C]/5 text-[#C85C5C]"}`}>
                      {revealed.mechanismCorrect
                        ? `Agreement — reference mechanism: ${MECHANISM_LABELS[revealedCase.referenceMechanism!]}`
                        : revealed.disagreementDefensible
                        ? `Disagreement, assessed defensible — reference: ${MECHANISM_LABELS[revealedCase.referenceMechanism!]}, you: ${MECHANISM_LABELS[inputs.judgmentMechanism!]}`
                        : `Disagreement — reference: ${MECHANISM_LABELS[revealedCase.referenceMechanism!]}, you: ${MECHANISM_LABELS[inputs.judgmentMechanism!]}`}
                    </div>
                    <p className="text-sm text-[#B0A89E] leading-relaxed">{revealedCase.referenceDiagnosis}</p>
                    {revealedCase.referenceMechanismNote && <p className="text-xs text-[#7A6F65] italic mt-1">{revealedCase.referenceMechanismNote}</p>}
                    <p className="text-sm text-[#B0A89E] leading-relaxed mt-2"><span className="text-[#7A6F65]">Recommended: </span>{revealedCase.referenceRecommendation}</p>
                    {revealedCase.referenceResult && <p className="text-sm text-[#5C9A6B] mt-2">{revealedCase.referenceResult}</p>}
                  </div>

                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block mb-2">System-Generated Calibration Profile</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(Object.entries(revealed.calibrationProfile) as [string, number][]).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <span className="text-[#B0A89E] capitalize">{k.replace(/_/g, " ")}</span>
                          <Stars value={v} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-[#D4A853]/10">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block">Comparative Reflection — analyst-authored</span>
                    {REFLECTION_QUESTIONS.map((q) => (
                      <Field
                        key={q.key}
                        label={q.question}
                        value={reflectionAnswers[q.key] ?? ""}
                        onChange={(v) => setReflectionAnswers((p) => ({ ...p, [q.key]: v }))}
                        rows={2}
                      />
                    ))}
                    <button disabled={saving} onClick={submitReflection} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10 disabled:opacity-40">
                      Submit Reflection
                    </button>
                  </div>
                </div>
              )}

              {stage === "reflection_complete" && completed && (
                <div className="space-y-3">
                  <p className="text-sm text-[#5C9A6B]">Case complete. Recorded to your longitudinal calibration history.</p>
                  <button onClick={() => { setView("list"); loadCases(); loadReadiness(); }} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded hover:bg-[#D4A853]/10">
                    Back to Cases
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
