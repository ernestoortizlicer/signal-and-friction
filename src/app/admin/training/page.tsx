"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════
 * APP TRAINING FLOW v1 — TEST PROJECT ONLY
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Ruta no publicada (no aparece en navLinks de /admin). Alcance:
 *   crear intento → cargar caso seguro → preregistrar → finalizar/revelar
 *
 * NO implementa: Layer A, Layer B, lógica de graduación/readiness,
 * n12 diagnostics, gate_track_a. Ver AUDIT_REPORT para el porqué.
 *
 * Doble gate:
 *   1. /admin/layout.tsx — sesión + whitelist del proyecto REAL (ya activo
 *      para todo /admin/*).
 *   2. Esta página exige ADEMÁS una sesión propia contra el proyecto de
 *      PRUEBA (yowwjipozswrwahvvevo), porque auth.uid() debe resolver en
 *      ese proyecto para que create_training_attempt()/RLS funcionen.
 *      Un JWT del proyecto real NO es válido contra el proyecto de prueba.
 */

import { useCallback, useEffect, useState } from "react";
import { supabaseTrainingTest } from "@/lib/supabase-training-test";
import {
  createOrResumeAttempt,
  loadSafeCase,
  loadPreregistration,
  savePreregistration,
  finalizeAndReveal,
  DISPOSITIONS,
  MECHANISMS,
  CONFIDENCE_LEVELS,
  type SafeCase,
  type Disposition,
  type Mechanism,
  type ConfidenceLevel,
  type FinalizeResult,
  type ReasonCode,
  type PersistedPreregistration,
} from "@/lib/training-flow";

// ─────────────────────────────────────────────────────────────────────────
// Máquina de estados explícita — un solo estado inequívoco a la vez.
// ─────────────────────────────────────────────────────────────────────────

interface FormState {
  observation: string;
  evidence_notes: string;
  hypothesis_mechanism: Mechanism | "";
  hypothesis_reasoning: string;
  counter_hypothesis_mechanism: Mechanism | "";
  counter_hypothesis_reasoning: string;
  judgment_disposition: Disposition | "";
  judgment_mechanism: Mechanism | "";
  judgment_confidence: ConfidenceLevel | "";
  recommendation: string;
  uncertainty_notes: string;
}

const EMPTY_FORM: FormState = {
  observation: "",
  evidence_notes: "",
  hypothesis_mechanism: "",
  hypothesis_reasoning: "",
  counter_hypothesis_mechanism: "",
  counter_hypothesis_reasoning: "",
  judgment_disposition: "",
  judgment_mechanism: "",
  judgment_confidence: "",
  recommendation: "",
  uncertainty_notes: "",
};

type FlowState =
  | { status: "idle" }
  | { status: "requesting_attempt" }
  | { status: "editing"; attemptId: string; caseId: string; safeCase: SafeCase; resumed: boolean; form: FormState }
  | { status: "finalizing"; attemptId: string; caseId: string; safeCase: SafeCase; form: FormState }
  | { status: "revealed"; safeCase: SafeCase; form: FormState; reveal: FinalizeResult }
  | { status: "environment_unavailable"; reasonCode: ReasonCode }
  | { status: "error"; message: string };

const BEHAVIORAL_DISPOSITIONS: Disposition[] = ["behavioral_diagnosis", "mixed_condition"];

/** DB NULL → "" para cada uno de los 11 campos — nunca null/undefined en FormState. */
function normalizePersistedPreregistration(p: PersistedPreregistration): FormState {
  return {
    observation: p.observation ?? "",
    evidence_notes: p.evidence_notes ?? "",
    hypothesis_mechanism: p.hypothesis_mechanism ?? "",
    hypothesis_reasoning: p.hypothesis_reasoning ?? "",
    counter_hypothesis_mechanism: p.counter_hypothesis_mechanism ?? "",
    counter_hypothesis_reasoning: p.counter_hypothesis_reasoning ?? "",
    judgment_disposition: p.judgment_disposition ?? "",
    judgment_mechanism: p.judgment_mechanism ?? "",
    judgment_confidence: p.judgment_confidence ?? "",
    recommendation: p.recommendation ?? "",
    uncertainty_notes: p.uncertainty_notes ?? "",
  };
}

// Estado único y autoritativo del guardado de borrador — nunca booleans sueltos.
type DraftStatus = "idle" | "saving" | "saved" | "error";

function isPreregistrationComplete(f: FormState): boolean {
  if (!f.observation.trim() || !f.evidence_notes.trim()) return false;
  if (!f.hypothesis_mechanism || !f.hypothesis_reasoning.trim()) return false;
  if (!f.counter_hypothesis_mechanism || !f.counter_hypothesis_reasoning.trim()) return false;
  if (!f.judgment_disposition || !f.judgment_confidence) return false;
  if (!f.recommendation.trim() || !f.uncertainty_notes.trim()) return false;
  const needsMechanism = BEHAVIORAL_DISPOSITIONS.includes(f.judgment_disposition as Disposition);
  if (needsMechanism && !f.judgment_mechanism) return false;
  if (!needsMechanism && f.judgment_mechanism) return false; // invalid_abstention en la DB
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// Gate interno: sesión propia del proyecto de prueba
// ─────────────────────────────────────────────────────────────────────────

function TrainingTestAuthGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Suscripción PRIMERO — así ningún evento entre el subscribe y la
    // resolución de getSession() se pierde. Ambos escritores fijan authed +
    // checked con el mismo Boolean(session); son idempotentes entre sí en
    // el caso común (mismo estado subyacente), y en el caso raro de un
    // cambio real de sesión durante el montaje, cualquiera que resuelva
    // último gana — que es el comportamiento correcto, no una condición de
    // carrera a corregir con más máquina de estados.
    const {
      data: { subscription },
    } = supabaseTrainingTest.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setAuthed(Boolean(session));
      setChecked(true);
    });

    supabaseTrainingTest.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuthed(Boolean(data.session));
      setChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!checked) {
    return <p className="font-mono text-xs text-[#7A6F65]">Checking test-project session…</p>;
  }

  if (!authed) {
    return (
      <div className="max-w-sm space-y-3">
        <p className="font-mono text-xs text-[#7A6F65] tracking-wide uppercase">
          Test-project session required (yowwjipozswrwahvvevo)
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            const { error } = await supabaseTrainingTest.auth.signInWithOtp({
              email,
              options: { emailRedirectTo: `${window.location.origin}/admin/training` },
            });
            if (error) setErr(error.message);
            else setSent(true);
          }}
          className="space-y-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@signal-and-friction.com"
            className="w-full bg-transparent border-b border-[#2A2520] px-0 py-2 text-sm text-[#F5F0EB] font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#D4A853] text-[#0A0908] font-mono text-xs uppercase tracking-wide"
          >
            Send magic link
          </button>
        </form>
        {sent && <p className="text-xs text-[#5C9A6B] font-mono">Link sent — check inbox.</p>}
        {err && <p className="text-xs text-[#C85C5C] font-mono">{err}</p>}
      </div>
    );
  }

  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────
// Flujo principal
// ─────────────────────────────────────────────────────────────────────────

function TrainingFlow() {
  const [state, setState] = useState<FlowState>({ status: "idle" });
  const [busy, setBusy] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");

  const start = useCallback(async () => {
    if (busy) return; // anti doble-click
    setBusy(true);
    setState({ status: "requesting_attempt" });
    try {
      const res = await createOrResumeAttempt();

      if (res.environment_deficiency || !res.attempt_id || !res.chosen_case_id) {
        setState({
          status: "environment_unavailable",
          reasonCode: (res.reason_code as ReasonCode) ?? "training_environment_not_ready",
        });
        return;
      }

      const safeCase = await loadSafeCase(res.chosen_case_id);
      const resumed = res.reason_code === "attempt_in_progress";
      // Hidratar ANTES de entrar a "editing" — nunca renderizar EMPTY_FORM y
      // corregirlo después. Si la hidratación falla, esto lanza y cae en el
      // catch de abajo: jamás se llega a setState(editing) con datos a medias.
      const form = resumed
        ? normalizePersistedPreregistration(await loadPreregistration(res.attempt_id))
        : EMPTY_FORM;

      setDraftStatus("idle");
      setState({
        status: "editing",
        attemptId: res.attempt_id,
        caseId: res.chosen_case_id,
        safeCase,
        resumed,
        form,
      });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Unexpected technical error." });
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const updateForm = (patch: Partial<FormState>) => {
    if (state.status !== "editing") return;
    setState({ ...state, form: { ...state.form, ...patch } });
    // Un campo editado invalida la confirmación "Draft saved" anterior — el
    // formulario actual ya no coincide con lo último persistido.
    setDraftStatus((prev) => (prev === "saved" ? "idle" : prev));
  };

  // Primitiva única de persistencia — usada tanto por el guardado manual como
  // por finalize(). Sin efectos de UI propios: solo persiste o lanza.
  const persistDraft = async () => {
    if (state.status !== "editing") return;
    await savePreregistration(state.attemptId, {
      observation: state.form.observation || undefined,
      evidence_notes: state.form.evidence_notes || undefined,
      hypothesis_mechanism: (state.form.hypothesis_mechanism || undefined) as Mechanism | undefined,
      hypothesis_reasoning: state.form.hypothesis_reasoning || undefined,
      counter_hypothesis_mechanism: (state.form.counter_hypothesis_mechanism || undefined) as
        | Mechanism
        | undefined,
      counter_hypothesis_reasoning: state.form.counter_hypothesis_reasoning || undefined,
      judgment_disposition: (state.form.judgment_disposition || undefined) as Disposition | undefined,
      judgment_mechanism: BEHAVIORAL_DISPOSITIONS.includes(state.form.judgment_disposition as Disposition)
        ? ((state.form.judgment_mechanism || undefined) as Mechanism | undefined)
        : null,
      judgment_confidence: (state.form.judgment_confidence || undefined) as ConfidenceLevel | undefined,
      recommendation: state.form.recommendation || undefined,
      uncertainty_notes: state.form.uncertainty_notes || undefined,
    });
  };

  // Handler del botón "Save draft" — dueño exclusivo del ciclo de vida de UX
  // (idle → saving → saved/error). Finalize NUNCA llama a este handler:
  // llama a persistDraft() directamente para no interferir con este estado.
  const handleSaveDraftClick = async () => {
    if (state.status !== "editing") return;
    if (draftStatus === "saving") return; // anti doble-click
    setDraftStatus("saving");
    try {
      await persistDraft();
      setDraftStatus("saved");
    } catch (e) {
      setDraftStatus("error");
      setState({ status: "error", message: e instanceof Error ? e.message : "Failed to save draft." });
    }
  };

  const finalize = async () => {
    if (state.status !== "editing") return;
    if (!isPreregistrationComplete(state.form)) return; // el botón ya está disabled en este caso
    try {
      await persistDraft();
    } catch (e) {
      // No continuar a "finalizing" si la persistencia previa falló — fail closed.
      setState({ status: "error", message: e instanceof Error ? e.message : "Failed to save draft." });
      return;
    }
    setState({ status: "finalizing", attemptId: state.attemptId, caseId: state.caseId, safeCase: state.safeCase, form: state.form });
    try {
      const reveal = await finalizeAndReveal(state.attemptId);
      setState({ status: "revealed", safeCase: state.safeCase, form: state.form, reveal });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Failed to finalize attempt." });
    }
  };

  // ── Render por estado — sin combinaciones booleanas ──

  if (state.status === "idle" || state.status === "environment_unavailable" || state.status === "error") {
    return (
      <div className="space-y-4">
        <h1 className="font-mono text-sm uppercase tracking-widest text-[#D4A853]">Training — v1 (test)</h1>

        {state.status === "environment_unavailable" && (
          <p className="text-sm text-[#B0A89E] font-mono">
            Training is temporarily unavailable. Please try again later.
          </p>
        )}
        {state.status === "error" && (
          <p className="text-sm text-[#C85C5C] font-mono">Unexpected error: {state.message}</p>
        )}

        <button
          onClick={start}
          disabled={busy}
          className="px-5 py-3 bg-[#D4A853] text-[#0A0908] font-mono text-xs uppercase tracking-wide disabled:opacity-40"
        >
          {busy ? "Requesting…" : "Start / Continue attempt"}
        </button>
      </div>
    );
  }

  if (state.status === "requesting_attempt") {
    return <p className="font-mono text-xs text-[#7A6F65]">Requesting attempt…</p>;
  }

  if (state.status === "editing" || state.status === "finalizing") {
    const { safeCase, form } = state;
    // Nota: completitud es una propiedad de `form`, no de `state.status`. Mantenerla
    // sin referenciar state.status evita ambigüedad de narrowing entre "editing"/"finalizing".
    const complete = isPreregistrationComplete(form);
    return (
      <div className="max-w-2xl space-y-6">
        {state.status === "editing" && state.resumed && (
          <p className="text-xs font-mono text-[#D4A853]">Resuming your current training attempt.</p>
        )}

        <div className="border border-[#D4A853]/15 p-4 space-y-1">
          <h2 className="font-mono text-sm text-[#F5F0EB]">{safeCase.title}</h2>
          {safeCase.company_name && <p className="text-xs text-[#7A6F65] font-mono">{safeCase.company_name}</p>}
          {[safeCase.landing_page, safeCase.pricing_page, safeCase.onboarding_flow, safeCase.checkout_flow, safeCase.technical_findings, safeCase.contextual_info]
            .filter(Boolean)
            .map((t, i) => (
              <p key={i} className="text-sm text-[#B0A89E] whitespace-pre-wrap">{t}</p>
            ))}
        </div>

        <fieldset disabled={state.status === "finalizing"} className="space-y-4">
          <Field label="Observation" value={form.observation} onChange={(v) => updateForm({ observation: v })} />
          <Field label="Evidence notes" value={form.evidence_notes} onChange={(v) => updateForm({ evidence_notes: v })} />
          <Select label="Hypothesis mechanism" value={form.hypothesis_mechanism} options={MECHANISMS}
            onChange={(v) => updateForm({ hypothesis_mechanism: v as Mechanism })} />
          <Field label="Hypothesis reasoning" value={form.hypothesis_reasoning} onChange={(v) => updateForm({ hypothesis_reasoning: v })} />
          <Select label="Counter-hypothesis mechanism" value={form.counter_hypothesis_mechanism} options={MECHANISMS}
            onChange={(v) => updateForm({ counter_hypothesis_mechanism: v as Mechanism })} />
          <Field label="Counter-hypothesis reasoning" value={form.counter_hypothesis_reasoning} onChange={(v) => updateForm({ counter_hypothesis_reasoning: v })} />
          <Select label="Judgment disposition" value={form.judgment_disposition} options={DISPOSITIONS}
            onChange={(v) => updateForm({ judgment_disposition: v as Disposition, judgment_mechanism: "" })} />
          {BEHAVIORAL_DISPOSITIONS.includes(form.judgment_disposition as Disposition) && (
            <Select label="Judgment mechanism" value={form.judgment_mechanism} options={MECHANISMS}
              onChange={(v) => updateForm({ judgment_mechanism: v as Mechanism })} />
          )}
          <Select label="Confidence" value={form.judgment_confidence} options={CONFIDENCE_LEVELS}
            onChange={(v) => updateForm({ judgment_confidence: v as ConfidenceLevel })} />
          <Field label="Recommendation" value={form.recommendation} onChange={(v) => updateForm({ recommendation: v })} />
          <Field label="Uncertainty notes" value={form.uncertainty_notes} onChange={(v) => updateForm({ uncertainty_notes: v })} />
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraftClick}
            disabled={state.status === "finalizing" || draftStatus === "saving"}
            className="px-4 py-2 border border-[#D4A853]/30 text-[#D4A853] font-mono text-xs uppercase disabled:opacity-40"
          >
            {draftStatus === "saving" ? "Saving…" : "Save draft"}
          </button>
          <span aria-live="polite" className="text-xs font-mono">
            {draftStatus === "saved" && <span className="text-[#5C9A6B]">Draft saved</span>}
            {draftStatus === "error" && <span className="text-[#C85C5C]">Save failed</span>}
          </span>
          <button onClick={finalize} disabled={!complete || state.status === "finalizing"}
            className="px-4 py-2 bg-[#D4A853] text-[#0A0908] font-mono text-xs uppercase disabled:opacity-40">
            {state.status === "finalizing" ? "Finalizing…" : "Finalize & reveal"}
          </button>
        </div>
      </div>
    );
  }

  // revealed
  const { form, reveal } = state;
  return (
    <div className="max-w-2xl space-y-6">
      <div className="border border-[#D4A853]/30 p-4 space-y-1">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#7A6F65]">Your preregistered judgment</h3>
        <p className="text-sm text-[#F5F0EB]">Disposition: {form.judgment_disposition}</p>
        {form.judgment_mechanism && <p className="text-sm text-[#F5F0EB]">Mechanism: {form.judgment_mechanism}</p>}
        <p className="text-sm text-[#B0A89E]">Confidence: {form.judgment_confidence}</p>
      </div>
      <div className="border border-[#5C9A6B]/30 p-4 space-y-1">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#7A6F65]">Reference verdict</h3>
        <p className="text-sm text-[#F5F0EB]">Disposition: {reveal.reference_disposition}</p>
        {reveal.reference_mechanism && <p className="text-sm text-[#F5F0EB]">Mechanism: {reveal.reference_mechanism}</p>}
      </div>
      <div className="border border-[#D4A853]/15 p-4 space-y-1">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#7A6F65]">Scoring</h3>
        <p className={`text-sm ${reveal.disposition_correct ? "text-[#5C9A6B]" : "text-[#C85C5C]"}`}>
          Disposition correct: {String(reveal.disposition_correct)}
        </p>
        <p className={`text-sm ${reveal.mechanism_correct ? "text-[#5C9A6B]" : "text-[#C85C5C]"}`}>
          Mechanism correct: {String(reveal.mechanism_correct)}
        </p>
      </div>
      <div className="border border-[#D4A853]/15 p-4 space-y-1">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#7A6F65]">Reflection</h3>
        <p className="text-sm text-[#B0A89E] whitespace-pre-wrap">{form.uncertainty_notes}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block font-mono text-xs text-[#7A6F65] uppercase tracking-wide mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full bg-transparent border-b border-[#2A2520] px-0 py-2 text-sm text-[#F5F0EB] font-mono"
      />
    </div>
  );
}

function Select<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T | ""; options: readonly T[]; onChange: (v: T | "") => void }) {
  return (
    <div>
      <label className="block font-mono text-xs text-[#7A6F65] uppercase tracking-wide mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className="w-full bg-[#0A0908] border border-[#2A2520] px-2 py-2 text-sm text-[#F5F0EB] font-mono"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export default function TrainingPage() {
  return (
    <div className="p-6">
      <p className="font-mono text-[10px] text-[#D4A853]/70 tracking-[0.15em] uppercase mb-4">
        TEST environment · Synthetic cases · No production eligibility impact
      </p>
      <TrainingTestAuthGate>
        <TrainingFlow />
      </TrainingTestAuthGate>
    </div>
  );
}
