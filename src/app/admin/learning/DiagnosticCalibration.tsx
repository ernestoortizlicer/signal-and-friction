"use client";

/**
 * DIAGNOSTIC CALIBRATION SYSTEM
 *
 * Canonical pedagogy:
 * Observation -> Evidence Review -> Hypothesis -> Counter-Hypothesis ->
 * Socratic Challenge -> Revision -> Judgment -> Recommendation ->
 * Reference Verdict -> Comparative Reflection.
 *
 * Practice calibration and premium certification are deliberately separate.
 * A practice case may teach the method without contributing any evidence to
 * premium authorization. The UI must never collapse those states.
 */

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

type CaseDisposition =
  | "behavioral_diagnosis"
  | "technical_blocker"
  | "mixed_condition"
  | "insufficient_evidence"
  | "scope_change_required";

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

const DISPOSITION_LABELS: Record<CaseDisposition, string> = {
  behavioral_diagnosis: "Behavioral diagnosis",
  technical_blocker: "Technical blocker",
  mixed_condition: "Mixed condition",
  insufficient_evidence: "Insufficient evidence",
  scope_change_required: "Scope change required",
};

const DISPOSITIONS = Object.keys(DISPOSITION_LABELS) as CaseDisposition[];

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
  trainingUse?: "practice_only" | "certification_eligible";
  referenceDisposition?: CaseDisposition;
  referenceMechanism?: Mechanism | null;
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
  judgmentDisposition?: CaseDisposition;
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

interface RevealedAttempt {
  dispositionCorrect: boolean;
  mechanismCorrect: boolean;
  disagreementDefensible: boolean | null;
  aiDisagreementAssessment: boolean | null;
  adjudicationStatus: "adjudicated" | "not_adjudicated";
  calibrationProfile: CalibrationProfile;
  calibrationFeedback?: string | null;
  gateEligible: boolean;
}

interface Criterion {
  id: string;
  label: string;
  passed: boolean;
  actual: number | string;
  threshold: number | string;
  detail: string;
}

interface ReadinessPayload {
  practiceCalibration: {
    ready: boolean;
    windowUsed: number;
    criteria: Criterion[];
    certificationAuthority: false;
  };
  premiumReadiness: {
    available: boolean;
    ready: boolean;
    status: string;
    explanation: string;
    bankReady: boolean;
    bank: {
      eligibleCases: number;
      mechanismsCovered: number;
      minPerMechanism: number;
      eligibleAbstentionCases: number;
      provenanceAllowed: boolean;
      rightsOk: boolean;
      independenceOk: boolean;
      casesOk: boolean;
      sixMechanismsOk: boolean;
      perMechanismOk: boolean;
      abstentionOk: boolean;
    };
    gateTrack: Record<string, unknown> | null;
  };
  confusionPairs: { reference: string; claimed: string; count: number }[];
}

const SOURCE_TYPE_LABELS: Record<ObservableCase["sourceType"], string> = {
  primary: "Primary source",
  practitioner_account: "Practitioner account",
  secondary_vendor: "Vendor case study — directional outcome",
  internal_sf_resolved: "Signal & Friction resolved case",
};

function mechanismRequired(d: CaseDisposition | undefined) {
  return d === "behavioral_diagnosis" || d === "mixed_condition";
}

function SourceBadge({ c }: { c: ObservableCase }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
      <span className="uppercase tracking-wider text-[#7A6F65] border border-[#7A6F65]/30 px-2 py-0.5 rounded">
        {SOURCE_TYPE_LABELS[c.sourceType]}
      </span>
      <span className={`uppercase tracking-wider px-2 py-0.5 rounded border ${
        c.trainingUse === "certification_eligible"
          ? "text-[#5C9A6B] border-[#5C9A6B]/30"
          : "text-[#D4A853] border-[#D4A853]/25"
      }`}>
        {c.trainingUse === "certification_eligible" ? "Gate eligible" : "Practice only"}
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
      {"★".repeat(value)}<span className="text-[#D4A853]/25">{"★".repeat(Math.max(0, 5 - value))}</span>
    </span>
  );
}

function Field({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full bg-[#110F0D]/60 border border-[#D4A853]/15 focus:border-[#D4A853]/40 rounded p-3 text-sm text-[#F5F0EB] placeholder:text-[#7A6F65] outline-none resize-vertical leading-relaxed" />
    </div>
  );
}

function MechanismSelect({ label, value, onChange, exclude }: { label: string; value: Mechanism | undefined; onChange: (m: Mechanism) => void; exclude?: Mechanism }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">{label}</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {MECHANISMS.filter((m) => m !== exclude).map((m) => (
          <button key={m} type="button" onClick={() => onChange(m)}
            className={`font-mono text-xs uppercase tracking-wide px-2.5 py-2 rounded border text-left transition-colors ${value === m ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]" : "border-[#D4A853]/12 text-[#B0A89E] hover:border-[#D4A853]/30"}`}>
            {MECHANISM_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
}

function DispositionSelect({ value, onChange }: { value: CaseDisposition | undefined; onChange: (d: CaseDisposition) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">Final case disposition</label>
      <p className="text-xs text-[#7A6F65]">Do not force a behavioral mechanism when the correct professional judgment is to abstain or change scope.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {DISPOSITIONS.map((d) => (
          <button key={d} type="button" onClick={() => onChange(d)}
            className={`font-mono text-xs uppercase tracking-wide px-2.5 py-2 rounded border text-left transition-colors ${value === d ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]" : "border-[#D4A853]/12 text-[#B0A89E] hover:border-[#D4A853]/30"}`}>
            {DISPOSITION_LABELS[d]}
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
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`font-mono text-xs uppercase px-3 py-1.5 rounded border transition-colors ${value === c ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]" : "border-[#D4A853]/12 text-[#B0A89E] hover:border-[#D4A853]/30"}`}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function CaseDossier({ c }: { c: ObservableCase }) {
  const rows: [string, string | null][] = [
    ["Landing Page", c.landingPage], ["Pricing Page", c.pricingPage],
    ["Onboarding Flow", c.onboardingFlow], ["Checkout Flow", c.checkoutFlow],
    ["Technical Findings", c.technicalFindings], ["Context", c.contextualInfo],
  ].filter(([, v]) => !!v) as [string, string][];
  return (
    <div className="border border-[#D4A853]/12 bg-[#110F0D]/40 rounded-lg p-5 space-y-4">
      <div>
        <h3 className="font-serif text-lg text-[#F5F0EB]">{c.title}{c.companyName ? ` — ${c.companyName}` : ""}</h3>
        <div className="mt-1.5"><SourceBadge c={c} /></div>
      </div>
      <div className="space-y-3">
        {rows.map(([label, v]) => <div key={label}><span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block mb-1">{label}</span><p className="text-sm text-[#B0A89E] leading-relaxed whitespace-pre-line">{v}</p></div>)}
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
  const [readinessData, setReadinessData] = useState<ReadinessPayload | null>(null);

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
  const [revealed, setRevealed] = useState<RevealedAttempt | null>(null);
  const [revealedCase, setRevealedCase] = useState<ObservableCase | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);

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
      if (res.ok) setReadinessData(data);
    } catch {
      // Supplementary panel; training remains usable if this read fails.
    }
  }

  useEffect(() => { void loadCases(); void loadReadiness(); }, []);

  async function startCase(c: ObservableCase) {
    setError(null);
    try {
      const res = await fetch("/api/training/attempt", {
        method: "POST", headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", caseId: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start case.");
      setActiveCase({ ...data.case, trainingUse: c.trainingUse });
      setAttemptId(data.attempt.id);
      setStage(data.attempt.stage);
      setInputs({}); setExchanges([]); setSocraticQuestion(null); setSocraticResponse("");
      setRevealed(null); setRevealedCase(null); setReflectionAnswers({}); setCompleted(false); setBlockedReason(null);
      setView("case");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to start case."); }
  }

  async function save(fields: Partial<AttemptInputs>) {
    if (!attemptId) return;
    setSaving(true); setBlockedReason(null);
    try {
      const res = await fetch("/api/training/attempt", {
        method: "POST", headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", attemptId, fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setInputs(data.attempt.inputs ?? ((prev: AttemptInputs) => ({ ...prev, ...fields })));
      setStage(data.attempt.stage);
      setBlockedReason(data.advanceBlockedReason ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save."); }
    finally { setSaving(false); }
  }

  async function askSocratic() {
    if (!activeCase) return;
    setSocraticLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/diagnostic-calibration-tutor`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ step: "socratic", observableCase: activeCase, inputs, priorExchanges: exchanges }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Socratic tutor request failed.");
      setSocraticQuestion(data.question); setSocraticResponse("");
    } catch (err) { setError(err instanceof Error ? err.message : "Socratic tutor request failed."); }
    finally { setSocraticLoading(false); }
  }

  function recordExchange() {
    if (!socraticQuestion || !socraticResponse.trim()) return;
    setExchanges((prev) => [...prev, { question: socraticQuestion, response: socraticResponse.trim() }]);
    setSocraticQuestion(null); setSocraticResponse("");
  }

  async function reveal() {
    if (!attemptId) return;
    setRevealing(true);
    try {
      const res = await fetch("/api/training/attempt", {
        method: "POST", headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal", attemptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reveal verdict.");
      setRevealed(data.attempt);
      setRevealedCase({ ...data.case, trainingUse: activeCase?.trainingUse });
      setStage("verdict_revealed");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to reveal verdict."); }
    finally { setRevealing(false); }
  }

  async function submitReflection() {
    if (!attemptId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/training/attempt", {
        method: "POST", headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reflect", attemptId, reflectionAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit reflection.");
      setStage("reflection_complete"); setCompleted(true); void loadReadiness();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to submit reflection."); }
    finally { setSaving(false); }
  }

  const stageIdx = STAGE_ORDER.indexOf(stage);
  const practice = readinessData?.practiceCalibration;
  const premium = readinessData?.premiumReadiness;

  return (
    <div className="space-y-6">
      {error && <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 p-3 rounded text-xs text-[#C85C5C] font-mono flex items-center justify-between"><span>{error}</span><button onClick={() => setError(null)} className="uppercase tracking-wider">dismiss</button></div>}

      {premium && (
        <div className="border border-[#D4A853]/20 bg-[#110F0D]/40 rounded-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] block">Premium Authorization Gate</span>
              <span className="font-mono text-[10px] text-[#7A6F65]">Certification evidence — separate from practice</span>
            </div>
            <span className="font-mono text-xs uppercase px-2.5 py-1 rounded border text-[#C85C5C] border-[#C85C5C]/35 bg-[#C85C5C]/5">Not authorized</span>
          </div>
          <p className="text-xs text-[#B0A89E] leading-relaxed">{premium.explanation}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="border border-[#D4A853]/10 rounded p-2"><span className="text-[#7A6F65] block">Eligible cases</span><span className="text-[#F5F0EB]">{premium.bank.eligibleCases} / 30</span></div>
            <div className="border border-[#D4A853]/10 rounded p-2"><span className="text-[#7A6F65] block">Mechanisms</span><span className="text-[#F5F0EB]">{premium.bank.mechanismsCovered} / 6</span></div>
            <div className="border border-[#D4A853]/10 rounded p-2"><span className="text-[#7A6F65] block">Min / mechanism</span><span className="text-[#F5F0EB]">{premium.bank.minPerMechanism} / 3</span></div>
            <div className="border border-[#D4A853]/10 rounded p-2"><span className="text-[#7A6F65] block">Abstention cases</span><span className="text-[#F5F0EB]">{premium.bank.eligibleAbstentionCases} / 8</span></div>
          </div>
        </div>
      )}

      {practice && (
        <div className="border border-[#D4A853]/12 bg-[#110F0D]/30 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div><span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] block">Practice Calibration</span><span className="font-mono text-[10px] text-[#7A6F65]">Learning indicator — not certification authority</span></div>
            <span className="font-mono text-xs uppercase px-2.5 py-1 rounded border text-[#7A6F65] border-[#7A6F65]/30">{practice.windowUsed} completed</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {practice.criteria.map((c) => (
              <div key={c.id} className={`text-xs p-2.5 rounded border ${c.passed ? "border-[#5C9A6B]/25 bg-[#5C9A6B]/5" : "border-[#D4A853]/15"}`}>
                <div className="flex items-center justify-between font-mono"><span className={c.passed ? "text-[#5C9A6B]" : "text-[#B0A89E]"}>{c.passed ? "✓" : "○"} {c.label}</span><span className="text-[#7A6F65]">{c.actual} / {c.threshold}</span></div>
                <p className="text-[#7A6F65] mt-1">{c.detail}</p>
              </div>
            ))}
          </div>
          {(readinessData?.confusionPairs?.length ?? 0) > 0 && <div className="text-xs text-[#7A6F65] font-mono">Most-confused pair: {MECHANISM_LABELS[readinessData!.confusionPairs[0].reference as Mechanism]} mistaken for {MECHANISM_LABELS[readinessData!.confusionPairs[0].claimed as Mechanism]} ({readinessData!.confusionPairs[0].count}×)</div>}
        </div>
      )}

      {view === "list" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {MECHANISMS.map((m) => <div key={m} className={`text-xs font-mono p-2 rounded border ${mechanismCoverage[m] > 0 ? "border-[#D4A853]/15 text-[#B0A89E]" : "border-[#7A6F65]/20 text-[#7A6F65] italic"}`}>{MECHANISM_LABELS[m]}: {mechanismCoverage[m] > 0 ? `${mechanismCoverage[m]} practice case${mechanismCoverage[m] > 1 ? "s" : ""}` : "no practice case yet"}</div>)}
          </div>
          {loadingCases ? <p className="text-sm text-[#7A6F65]">Loading cases…</p> : cases.length === 0 ? (
            <div className="border border-[#D4A853]/12 bg-[#110F0D]/30 rounded-lg p-6 text-sm text-[#7A6F65]">No published practice cases are available. The system does not fabricate cases to make the bank look complete.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{cases.map((c) => <button key={c.id} onClick={() => startCase(c)} className="text-left border border-[#D4A853]/12 hover:border-[#D4A853]/30 bg-[#110F0D]/30 rounded-lg p-4 space-y-2 transition-colors"><h4 className="font-serif text-[#F5F0EB]">{c.title}</h4><SourceBadge c={c} /></button>)}</div>
          )}
        </div>
      )}

      {view === "case" && activeCase && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-4"><button onClick={() => setView("list")} className="font-mono text-xs uppercase tracking-wider text-[#7A6F65] hover:text-[#D4A853]">← Back to cases</button><CaseDossier c={revealedCase ?? activeCase} /></div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">{STAGE_ORDER.map((s, i) => <span key={s} className={`font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded ${i < stageIdx ? "text-[#5C9A6B] bg-[#5C9A6B]/8" : i === stageIdx ? "text-[#D4A853] bg-[#D4A853]/10 border border-[#D4A853]/30" : "text-[#7A6F65]/50"}`}>{i + 1}. {STAGE_LABELS[s]}</span>)}</div>

            <div className="border border-[#D4A853]/15 bg-[#0A0908] rounded-lg p-6 space-y-4">
              {stage === "observation" && <><Field label="Observation" value={inputs.observation ?? ""} onChange={(v) => setInputs((p) => ({ ...p, observation: v }))} placeholder="What is directly observable, before any interpretation?" /><button disabled={saving} onClick={() => save({ observation: inputs.observation })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">Save &amp; Continue</button></>}

              {stage === "evidence_review" && <><Field label="Evidence Review" value={inputs.evidenceNotes ?? ""} onChange={(v) => setInputs((p) => ({ ...p, evidenceNotes: v }))} placeholder="What evidence supports a conclusion? What contradicts one?" /><button disabled={saving} onClick={() => save({ evidenceNotes: inputs.evidenceNotes })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">Save &amp; Continue</button></>}

              {stage === "hypothesis" && <><MechanismSelect label="Behavioral Hypothesis — Mechanism" value={inputs.hypothesisMechanism} onChange={(m) => setInputs((p) => ({ ...p, hypothesisMechanism: m }))} /><Field label="Reasoning" value={inputs.hypothesisReasoning ?? ""} onChange={(v) => setInputs((p) => ({ ...p, hypothesisReasoning: v }))} placeholder="Why this mechanism, from the evidence above?" /><button disabled={saving} onClick={() => save({ hypothesisMechanism: inputs.hypothesisMechanism, hypothesisReasoning: inputs.hypothesisReasoning })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">Save &amp; Continue</button></>}

              {stage === "counter_hypothesis" && <><p className="text-xs text-[#7A6F65] italic">What alternative explanation is genuinely plausible?</p><MechanismSelect label="Counter-Hypothesis — Mechanism" value={inputs.counterHypothesisMechanism} onChange={(m) => setInputs((p) => ({ ...p, counterHypothesisMechanism: m }))} exclude={inputs.hypothesisMechanism} /><Field label="Reasoning" value={inputs.counterHypothesisReasoning ?? ""} onChange={(v) => setInputs((p) => ({ ...p, counterHypothesisReasoning: v }))} placeholder="Why might this be the real explanation instead?" /><button disabled={saving} onClick={() => save({ counterHypothesisMechanism: inputs.counterHypothesisMechanism, counterHypothesisReasoning: inputs.counterHypothesisReasoning })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">Save &amp; Continue</button></>}

              {stage === "socratic_challenge" && <div className="space-y-4">
                {exchanges.map((ex, i) => <div key={i} className="space-y-1.5 border-l-2 border-[#D4A853]/20 pl-3"><p className="text-sm text-[#D4A853]/90 italic">{ex.question}</p><p className="text-sm text-[#B0A89E]">{ex.response}</p></div>)}
                {!socraticQuestion && <button disabled={socraticLoading} onClick={askSocratic} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">{socraticLoading ? "Thinking…" : exchanges.length === 0 ? "Begin Socratic Challenge" : "Ask Another"}</button>}
                {socraticQuestion && <div className="space-y-2"><p className="text-sm text-[#D4A853]/90 italic">{socraticQuestion}</p><textarea value={socraticResponse} onChange={(e) => setSocraticResponse(e.target.value)} rows={3} className="w-full bg-[#110F0D]/60 border border-[#D4A853]/15 rounded p-3 text-sm text-[#F5F0EB]" placeholder="Your response…" /><button disabled={!socraticResponse.trim()} onClick={recordExchange} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">Respond</button></div>}
                {exchanges.length > 0 && !socraticQuestion && <button disabled={saving} onClick={() => save({ socraticExchanges: exchanges })} className="font-mono text-xs uppercase tracking-wider border border-[#5C9A6B]/40 text-[#5C9A6B] px-4 py-2 rounded disabled:opacity-40">Save &amp; Continue</button>}
              </div>}

              {stage === "revision" && <><Field label="Analyst Revision" value={inputs.revision ?? ""} onChange={(v) => setInputs((p) => ({ ...p, revision: v }))} placeholder="What, if anything, changed after the challenge? State it explicitly." /><button disabled={saving} onClick={() => save({ revision: inputs.revision })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">Save &amp; Continue</button></>}

              {stage === "judgment" && <>
                <DispositionSelect value={inputs.judgmentDisposition} onChange={(d) => setInputs((p) => ({ ...p, judgmentDisposition: d, judgmentMechanism: mechanismRequired(d) ? p.judgmentMechanism : undefined }))} />
                {mechanismRequired(inputs.judgmentDisposition) && <MechanismSelect label="Final Judgment — Mechanism" value={inputs.judgmentMechanism} onChange={(m) => setInputs((p) => ({ ...p, judgmentMechanism: m }))} />}
                {inputs.judgmentDisposition && !mechanismRequired(inputs.judgmentDisposition) && <p className="text-xs border border-[#5C9A6B]/20 bg-[#5C9A6B]/5 text-[#B0A89E] p-3 rounded">Professional abstention selected. No behavioral mechanism will be forced onto this case.</p>}
                <ConfidenceSelect value={inputs.judgmentConfidence} onChange={(c) => setInputs((p) => ({ ...p, judgmentConfidence: c }))} />
                <button disabled={saving} onClick={() => save({ judgmentDisposition: inputs.judgmentDisposition, judgmentMechanism: mechanismRequired(inputs.judgmentDisposition) ? inputs.judgmentMechanism : undefined, judgmentConfidence: inputs.judgmentConfidence })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">Save &amp; Continue</button>
              </>}

              {stage === "recommendation" && <><Field label="Recommendation" value={inputs.recommendation ?? ""} onChange={(v) => setInputs((p) => ({ ...p, recommendation: v }))} placeholder="What action follows from your judgment or abstention?" /><Field label="Unknowns" value={inputs.uncertaintyNotes ?? ""} onChange={(v) => setInputs((p) => ({ ...p, uncertaintyNotes: v }))} placeholder="What would change your mind? What don't you know?" rows={2} /><div className="flex gap-2"><button disabled={saving} onClick={() => save({ recommendation: inputs.recommendation, uncertaintyNotes: inputs.uncertaintyNotes })} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">Save</button><button disabled={revealing} onClick={reveal} className="font-mono text-xs uppercase tracking-wider border border-[#5C9A6B]/40 text-[#5C9A6B] px-4 py-2 rounded disabled:opacity-40">{revealing ? "Revealing…" : "Reveal Reference Verdict"}</button></div></>}

              {blockedReason && <p className="text-xs text-[#C85C5C]">{blockedReason}</p>}

              {stage === "verdict_revealed" && revealed && revealedCase && <div className="space-y-5">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block mb-1">Reference Judgment</span>
                  <div className={`p-3 rounded border font-mono text-xs mb-2 ${revealed.dispositionCorrect && revealed.mechanismCorrect ? "border-[#5C9A6B]/30 bg-[#5C9A6B]/5 text-[#5C9A6B]" : "border-[#C85C5C]/30 bg-[#C85C5C]/5 text-[#C85C5C]"}`}>
                    Reference disposition: {DISPOSITION_LABELS[revealedCase.referenceDisposition!]}
                    {revealedCase.referenceMechanism ? ` · mechanism: ${MECHANISM_LABELS[revealedCase.referenceMechanism]}` : " · no behavioral mechanism"}
                  </div>
                  <p className="text-sm text-[#B0A89E] leading-relaxed">{revealedCase.referenceDiagnosis}</p>
                  {revealedCase.referenceMechanismNote && <p className="text-xs text-[#7A6F65] italic mt-1">{revealedCase.referenceMechanismNote}</p>}
                  <p className="text-sm text-[#B0A89E] leading-relaxed mt-2"><span className="text-[#7A6F65]">Recommended: </span>{revealedCase.referenceRecommendation}</p>
                  {revealedCase.referenceResult && <p className="text-sm text-[#5C9A6B] mt-2">{revealedCase.referenceResult}</p>}
                  {!revealed.mechanismCorrect && revealed.aiDisagreementAssessment === true && revealed.adjudicationStatus !== "adjudicated" && <p className="text-xs text-[#D4A853] mt-2">AI calibration flagged your alternative as potentially defensible. This is feedback only; it earns no certification credit without the independent adjudication contract.</p>}
                  {revealed.calibrationFeedback && <p className="text-xs text-[#7A6F65] mt-2">{revealed.calibrationFeedback}</p>}
                  {!revealed.gateEligible && <p className="text-xs text-[#7A6F65] mt-2">This attempt is practice evidence only. It does not contribute to premium authorization.</p>}
                </div>
                <div><span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block mb-2">AI-assisted calibration profile — feedback, not ground truth</span><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{Object.entries(revealed.calibrationProfile).map(([k, v]) => <div key={k} className="flex items-center justify-between text-xs"><span className="text-[#B0A89E] capitalize">{k.replace(/_/g, " ")}</span><Stars value={v} /></div>)}</div></div>
                <div className="space-y-3 pt-2 border-t border-[#D4A853]/10"><span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block">Comparative Reflection — mandatory before completion</span>{REFLECTION_QUESTIONS.map((q) => <Field key={q.key} label={q.question} value={reflectionAnswers[q.key] ?? ""} onChange={(v) => setReflectionAnswers((p) => ({ ...p, [q.key]: v }))} rows={2} />)}<button disabled={saving} onClick={submitReflection} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded disabled:opacity-40">Submit Reflection &amp; Complete Case</button></div>
              </div>}

              {stage === "reflection_complete" && completed && <div className="space-y-3"><p className="text-sm text-[#5C9A6B]">Case complete. Comparative reflection has been recorded.</p><button onClick={() => { setView("list"); void loadCases(); void loadReadiness(); }} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/40 text-[#D4A853] px-4 py-2 rounded">Back to Cases</button></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
