"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/supabase";
import {
  AdminSectionHeader,
  AdminAlert,
  AdminCard,
  AdminBadge,
  AdminEmptyState,
} from "@/components/admin/AdminComponents";
import {
  applyDosing,
  generateTeaser,
  type FrictionMechanism,
  type FunnelStage,
  type MagnitudeLevel,
  type ConfidenceLevel,
} from "@/lib/dosing";

/**
 * QUERY-STRING SHELL — not a [id] dynamic route.
 *
 * output: "export" requires every [id] segment enumerated at build time via
 * generateStaticParams(), which is impossible for scaffold UUIDs created
 * after the build. Same constraint documented on
 * src/app/deliverable/live/page.tsx. This single static file reads the real
 * id from ?id=<uuid> instead, so it works for any scaffold without a rebuild.
 */

interface EvidenceRow {
  tier: "measured";
  label: string;
  value: string;
  source: string;
}

interface Scaffold {
  id: string;
  client_id: string | null;
  prospect_candidate_id: string | null;
  target_url: string;
  domain: string;
  scanned_at: string;
  evidence: EvidenceRow[];
  friction_mechanism: string | null;
  specific_friction_point: string | null;
  why_blocks_conversion: string | null;
  projected_impact: string | null;
  the_decision: string | null;
  what_to_avoid: string | null;
  confidence_and_why: string | null;
  loom_script: string | null;
  loom_script_generated_at: string | null;
  status: "draft" | "pushed_to_deliverable";
  created_at: string;
  updated_at: string;
  funnel_stage: FunnelStage | null;
  projected_impact_magnitude: MagnitudeLevel | null;
  confidence_level: ConfidenceLevel | null;
  dfy_execution_summary: string | null;
  dfy_monitoring_findings: string | null;
  dfy_handoff_documentation: string | null;
  pending_dosing_line: "dwy" | "dfy" | null;
  pending_dosing_tier: "beta_diagnostic" | "intervention" | "monitoring" | "expansion" | "autonomy_kit" | null;
  pending_dosing_triggered_at: string | null;
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";

const JUDGMENT_FIELDS: Array<{
  key: keyof Pick<
    Scaffold,
    | "friction_mechanism"
    | "specific_friction_point"
    | "why_blocks_conversion"
    | "projected_impact"
    | "the_decision"
    | "what_to_avoid"
    | "confidence_and_why"
  >;
  label: string;
  question: string;
}> = [
  {
    key: "friction_mechanism",
    label: "Friction Mechanism",
    question: "Looking at the evidence above, what mechanism is actually creating friction here — cognitive load, trust deficit, technical friction, something else? Name it.",
  },
  {
    key: "specific_friction_point",
    label: "Specific Friction Point",
    question: "Where exactly does this happen? Which page, moment, or interaction — be concrete, not general.",
  },
  {
    key: "why_blocks_conversion",
    label: "Why It Blocks Conversion",
    question: "Walk through why this specific point actually stops someone from converting. What's the causal chain?",
  },
  {
    key: "projected_impact",
    label: "Projected Impact",
    question: "If this were fixed, what's the realistic impact — and what's your basis for that estimate? Say so if it's a rough judgment call, not a number.",
  },
  {
    key: "the_decision",
    label: "The Decision",
    question: "What's the actual recommendation? What should this company do, specifically?",
  },
  {
    key: "what_to_avoid",
    label: "What to Avoid",
    question: "What's the wrong move someone might make here instead — the fix that looks right but isn't?",
  },
  {
    key: "confidence_and_why",
    label: "Confidence & Why",
    question: "How confident are you in this read, and why? Name what would change your mind.",
  },
];

// friction_mechanism must be one of these exact tokens — generateTeaser()
// and applyDosing() both index a label map keyed on them
// (src/lib/dosing.ts). The column itself is a free TEXT column with no DB
// CHECK constraint, and the field used to render as a free-text textarea;
// any real prose answer here (rather than the exact token) silently
// produced "undefined" text in the teaser and a silently-dropped field in
// the dosed preview, never a visible error.
const FRICTION_MECHANISM_OPTIONS: Array<{ value: FrictionMechanism; label: string }> = [
  { value: "cognitive_load", label: "Cognitive Load" },
  { value: "trust_deficit", label: "Trust Deficit" },
  { value: "commitment_anxiety", label: "Commitment Anxiety" },
  { value: "ordering_error", label: "Ordering Error" },
  { value: "identity_friction", label: "Identity Friction" },
  { value: "value_uncertainty", label: "Value Uncertainty" },
];

const FUNNEL_STAGE_OPTIONS: Array<{ value: FunnelStage; label: string }> = [
  { value: "landing", label: "Landing / Homepage" },
  { value: "pricing", label: "Pricing Page" },
  { value: "signup", label: "Signup Flow" },
  { value: "checkout", label: "Checkout" },
  { value: "activation", label: "Post-Signup Activation" },
];

const LEVEL_OPTIONS: Array<{ value: MagnitudeLevel | ConfidenceLevel; label: string }> = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function ScaffoldEditor() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [scaffold, setScaffold] = useState<Scaffold | null>(null);
  const [targetLabel, setTargetLabel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [notice, setNotice] = useState<{ message: string; variant: "green" | "red" } | null>(null);
  const [loomScriptDraft, setLoomScriptDraft] = useState("");
  const [generatingLoom, setGeneratingLoom] = useState(false);
  const [savingLoom, setSavingLoom] = useState(false);
  const [teaserDraft, setTeaserDraft] = useState("");
  const [teaserError, setTeaserError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/diagnostic_scaffolds?id=eq.${id}&select=*`,
          { headers: getAuthHeaders() }
        );
        const rows: Scaffold[] = res.ok ? await res.json() : [];
        const row = rows[0];
        if (!row) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setScaffold(row);
        setDrafts({
          friction_mechanism: row.friction_mechanism ?? "",
          specific_friction_point: row.specific_friction_point ?? "",
          why_blocks_conversion: row.why_blocks_conversion ?? "",
          projected_impact: row.projected_impact ?? "",
          the_decision: row.the_decision ?? "",
          what_to_avoid: row.what_to_avoid ?? "",
          confidence_and_why: row.confidence_and_why ?? "",
          funnel_stage: row.funnel_stage ?? "",
          projected_impact_magnitude: row.projected_impact_magnitude ?? "",
          confidence_level: row.confidence_level ?? "",
        });
        setLoomScriptDraft(row.loom_script ?? "");

        if (row.client_id) {
          const cRes = await fetch(
            `${SUPABASE_URL}/rest/v1/clients?id=eq.${row.client_id}&select=company_name`,
            { headers: getAuthHeaders() }
          );
          const [client] = cRes.ok ? await cRes.json() : [];
          setTargetLabel(client?.company_name ? `Client — ${client.company_name}` : "Client");
        } else if (row.prospect_candidate_id) {
          const pRes = await fetch(
            `${SUPABASE_URL}/rest/v1/prospect_candidates?id=eq.${row.prospect_candidate_id}&select=company_name,domain`,
            { headers: getAuthHeaders() }
          );
          const [cand] = pRes.ok ? await pRes.json() : [];
          setTargetLabel(cand ? `Prospect — ${cand.company_name || cand.domain}` : "Prospect candidate");
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function persistJudgmentFields(): Promise<Scaffold | null> {
    if (!scaffold) return null;
    const requestBody: Record<string, string> = {
      friction_mechanism: drafts.friction_mechanism,
      specific_friction_point: drafts.specific_friction_point,
      why_blocks_conversion: drafts.why_blocks_conversion,
      projected_impact: drafts.projected_impact,
      the_decision: drafts.the_decision,
      what_to_avoid: drafts.what_to_avoid,
      confidence_and_why: drafts.confidence_and_why,
    };
    // The 3 classifiers are DB-CHECK-constrained to specific enum values —
    // only send them once a real option is picked, never an empty string,
    // or the PATCH would 400 against the constraint.
    if (drafts.funnel_stage) requestBody.funnel_stage = drafts.funnel_stage;
    if (drafts.projected_impact_magnitude) requestBody.projected_impact_magnitude = drafts.projected_impact_magnitude;
    if (drafts.confidence_level) requestBody.confidence_level = drafts.confidence_level;

    const res = await fetch(`/api/scaffolds/${scaffold.id}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body) {
      setScaffold(body);
      return body;
    }
    setNotice({ message: body?.error || `Save failed (HTTP ${res.status}).`, variant: "red" });
    return null;
  }

  async function saveDraft() {
    if (!scaffold) return;
    setSaving(true);
    setNotice(null);
    try {
      const saved = await persistJudgmentFields();
      if (saved) {
        setNotice({ message: "Draft saved.", variant: "green" });
      }
    } catch (err) {
      setNotice({ message: `Save request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
    } finally {
      setSaving(false);
    }
  }

  const judgmentReadyForScript = [
    drafts.friction_mechanism,
    drafts.specific_friction_point,
    drafts.why_blocks_conversion,
    drafts.the_decision,
  ].every((v) => (v ?? "").trim().length > 0);

  async function generateLoomScript() {
    if (!scaffold || !judgmentReadyForScript) return;
    setGeneratingLoom(true);
    setNotice(null);
    try {
      // Persist whatever's currently in the judgment textareas first, so the
      // script is generated from exactly what's on screen, not a stale save.
      const saved = await persistJudgmentFields();
      if (!saved) return;

      const res = await fetch("/api/scaffolds/generate-loom", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ scaffoldId: scaffold.id }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body) {
        setScaffold((prev) => (prev ? { ...prev, ...body } : body));
        setLoomScriptDraft(body.loom_script ?? "");
        setNotice({ message: "Loom script generated.", variant: "green" });
      } else {
        setNotice({ message: body?.error || `Script generation failed (HTTP ${res.status}).`, variant: "red" });
      }
    } catch (err) {
      setNotice({ message: `Script generation request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
    } finally {
      setGeneratingLoom(false);
    }
  }

  async function saveLoomScript() {
    if (!scaffold) return;
    setSavingLoom(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/scaffolds/${scaffold.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ loom_script: loomScriptDraft }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body) {
        setScaffold(body);
        setNotice({ message: "Script saved.", variant: "green" });
      } else {
        setNotice({ message: body?.error || `Save failed (HTTP ${res.status}).`, variant: "red" });
      }
    } catch (err) {
      setNotice({ message: `Save request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
    } finally {
      setSavingLoom(false);
    }
  }

  function generateTeaserDraft() {
    if (!scaffold) return;
    setTeaserError(null);
    try {
      const text = generateTeaser({
        friction_mechanism: (drafts.friction_mechanism || null) as FrictionMechanism | null,
        specific_friction_point: drafts.specific_friction_point || null,
        why_blocks_conversion: drafts.why_blocks_conversion || null,
        projected_impact: drafts.projected_impact || null,
        the_decision: drafts.the_decision || null,
        what_to_avoid: drafts.what_to_avoid || null,
        confidence_and_why: drafts.confidence_and_why || null,
        funnel_stage: (drafts.funnel_stage || null) as FunnelStage | null,
        projected_impact_magnitude: (drafts.projected_impact_magnitude || null) as MagnitudeLevel | null,
        confidence_level: (drafts.confidence_level || null) as ConfidenceLevel | null,
        dfy_execution_summary: scaffold.dfy_execution_summary,
        dfy_monitoring_findings: scaffold.dfy_monitoring_findings,
        dfy_handoff_documentation: scaffold.dfy_handoff_documentation,
      });
      setTeaserDraft(text);
    } catch (err) {
      setTeaserError(err instanceof Error ? err.message : "Could not generate a teaser.");
      setTeaserDraft("");
    }
  }

  async function rescan() {
    if (!scaffold) return;
    setRescanning(true);
    setNotice(null);
    try {
      const res = await fetch("/api/scaffolds/generate", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ scaffoldId: scaffold.id }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body) {
        // Merge fresh evidence/scan fields only — the judgment-field drafts
        // in local state are untouched, so nothing typed gets clobbered.
        setScaffold((prev) => (prev ? { ...prev, ...body } : body));
        setNotice({ message: "Evidence refreshed from a new scan.", variant: "green" });
      } else {
        setNotice({ message: body?.error || `Rescan failed (HTTP ${res.status}).`, variant: "red" });
      }
    } catch (err) {
      setNotice({ message: `Rescan request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
    } finally {
      setRescanning(false);
    }
  }

  if (!id) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <AdminEmptyState icon="🗂️" text="No scaffold specified" subtext="Open this page from a Generate/Open Scaffold button on Prospecting or Pipeline." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <AdminEmptyState text="Loading scaffold…" />
      </div>
    );
  }

  if (notFound || !scaffold) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <AdminEmptyState icon="⚠️" text="Scaffold not found" subtext="It may have been deleted, or the link is stale." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 pb-16">
      <AdminSectionHeader
        eyebrow="Diagnostic Scaffold"
        title={targetLabel || scaffold.domain}
        subtitle={`${scaffold.target_url} · last scanned ${formatDate(scaffold.scanned_at)}`}
        badge={<AdminBadge variant={scaffold.status === "draft" ? "muted" : "gold"}>{scaffold.status === "draft" ? "Private Draft" : "Pushed to Deliverable"}</AdminBadge>}
      />

      <AdminAlert variant="gold">
        Private draft — never visible to the client. Evidence below is auto-filled and read-only, straight from the scan.
        The 7 fields underneath are yours to fill in; nothing here is generated for you.
      </AdminAlert>

      {scaffold.pending_dosing_tier && scaffold.pending_dosing_line && (
        <AdminCard>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-[#D4A853] uppercase tracking-[0.15em]">
              ⚠ Purchase received — {scaffold.pending_dosing_line.toUpperCase()} {scaffold.pending_dosing_tier.replace(/_/g, " ")}
            </span>
            <span className="font-mono text-[10px] text-[#7A6F65]">
              {scaffold.pending_dosing_triggered_at ? formatDate(scaffold.pending_dosing_triggered_at) : ""}
            </span>
          </div>
          <p className="text-xs font-mono text-[#B0A89E] mb-3">
            Nothing has been sent to the client. Below is the dosed content this tier would show, computed from your 7 fields above — review it, then use the normal push-to-deliverable action when you're ready. This flag stays here until you do.
          </p>
          {(() => {
            const dosed = applyDosing(
              {
                friction_mechanism: scaffold.friction_mechanism as FrictionMechanism | null,
                specific_friction_point: scaffold.specific_friction_point,
                why_blocks_conversion: scaffold.why_blocks_conversion,
                projected_impact: scaffold.projected_impact,
                the_decision: scaffold.the_decision,
                what_to_avoid: scaffold.what_to_avoid,
                confidence_and_why: scaffold.confidence_and_why,
                funnel_stage: scaffold.funnel_stage,
                projected_impact_magnitude: scaffold.projected_impact_magnitude,
                confidence_level: scaffold.confidence_level,
                dfy_execution_summary: scaffold.dfy_execution_summary,
                dfy_monitoring_findings: scaffold.dfy_monitoring_findings,
                dfy_handoff_documentation: scaffold.dfy_handoff_documentation,
              },
              scaffold.pending_dosing_line!,
              scaffold.pending_dosing_tier!
            );
            const entries = Object.entries(dosed.fields).filter(([, v]) => v);
            return (
              <div className="space-y-2 text-xs font-mono border-t border-[#D4A853]/8 pt-3">
                {entries.length === 0 && <p className="text-[#7A6F65] italic">Fill in the 7 fields above to see the dosed preview.</p>}
                {entries.map(([key, value]) => (
                  <div key={key}>
                    <span className="text-[#7A6F65] uppercase">{key.replace(/_/g, " ")}: </span>
                    <span className="text-[#F5F0EB]">{value}</span>
                  </div>
                ))}
                {dosed.dfyDelivery && (
                  <>
                    <div><span className="text-[#7A6F65] uppercase">execution summary: </span><span className="text-[#F5F0EB]">{dosed.dfyDelivery.execution_summary}</span></div>
                    <div><span className="text-[#7A6F65] uppercase">monitoring findings: </span><span className="text-[#F5F0EB]">{dosed.dfyDelivery.monitoring_findings}</span></div>
                    <div><span className="text-[#7A6F65] uppercase">handoff documentation: </span><span className="text-[#F5F0EB]">{dosed.dfyDelivery.handoff_documentation}</span></div>
                  </>
                )}
              </div>
            );
          })()}
        </AdminCard>
      )}

      {notice && (
        <AdminAlert variant={notice.variant}>
          {notice.message}{" "}
          <button type="button" onClick={() => setNotice(null)} className="underline ml-2 cursor-pointer">
            dismiss
          </button>
        </AdminAlert>
      )}

      <AdminCard>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-[0.15em]">
            Measured Evidence ({scaffold.evidence.length})
          </span>
          <button
            type="button"
            onClick={rescan}
            disabled={rescanning}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#B0A89E] text-xs font-mono uppercase tracking-wide hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {rescanning ? "Rescanning…" : "Rescan"}
          </button>
        </div>
        <div className="space-y-1.5">
          {scaffold.evidence.map((row, i) => (
            <div key={i} className="bg-black/30 border border-white/5 p-2.5 rounded flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-[#F5F0EB]">
                  {row.label}: <span className="text-[#5C9A6B]">{row.value}</span>
                </p>
                <p className="font-mono text-[10px] text-[#7A6F65] mt-0.5">{row.source}</p>
              </div>
              <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 text-[#5C9A6B] border-[#5C9A6B]/40 bg-[#5C9A6B]/10">
                measured
              </span>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-[0.15em] block mb-4">
          Judgment — your read, in your words
        </span>
        <div className="space-y-5">
          {JUDGMENT_FIELDS.map((f) =>
            f.key === "friction_mechanism" ? (
              <div key={f.key} className="space-y-1.5">
                <label className="block font-mono text-xs text-[#F5F0EB] uppercase tracking-wide">{f.label}</label>
                <p className="text-xs text-[#7A6F65] font-mono">{f.question}</p>
                <select
                  value={drafts[f.key] ?? ""}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full bg-black/40 border border-[#D4A853]/15 rounded-lg px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
                >
                  <option value="">— Select —</option>
                  {FRICTION_MECHANISM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div key={f.key} className="space-y-1.5">
                <label className="block font-mono text-xs text-[#F5F0EB] uppercase tracking-wide">{f.label}</label>
                <p className="text-xs text-[#7A6F65] font-mono">{f.question}</p>
                <textarea
                  value={drafts[f.key] ?? ""}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  rows={3}
                  className="w-full bg-black/40 border border-[#D4A853]/15 rounded-lg px-3 py-2 text-sm font-mono text-[#F5F0EB] placeholder:text-[#7A6F65] focus:outline-none focus:border-[#D4A853]/40"
                  placeholder="—"
                />
              </div>
            )
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-[#D4A853]/8 space-y-4">
          <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-[0.15em] block">
            Classifiers — power the free teaser &amp; dosed disclosure
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-[#F5F0EB] uppercase tracking-wide">Funnel Stage</label>
              <select
                value={drafts.funnel_stage ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, funnel_stage: e.target.value }))}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded-lg px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              >
                <option value="">— Unset —</option>
                {FUNNEL_STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-[#F5F0EB] uppercase tracking-wide">Impact Magnitude</label>
              <select
                value={drafts.projected_impact_magnitude ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, projected_impact_magnitude: e.target.value }))}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded-lg px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              >
                <option value="">— Unset —</option>
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-[#F5F0EB] uppercase tracking-wide">Confidence Level</label>
              <select
                value={drafts.confidence_level ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, confidence_level: e.target.value }))}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded-lg px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              >
                <option value="">— Unset —</option>
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#D4A853]/8">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/25 text-[#D4A853] text-sm font-mono uppercase tracking-wide hover:bg-[#D4A853]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <span className="text-xs font-mono text-[#7A6F65]">Updated {formatDate(scaffold.updated_at)}</span>
        </div>
      </AdminCard>

      <AdminCard>
        <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-[0.15em] block mb-1">
          Free Teaser — the first thing this prospect sees
        </span>
        <p className="text-xs text-[#7A6F65] font-mono mb-4">
          Deterministic, zero-AI text generated from the fields above — never reveals The Decision or What to Avoid.
          Generated from whatever is currently on screen, saved or not.
        </p>

        {!drafts.friction_mechanism && (
          <AdminAlert variant="gold">
            Set Friction Mechanism above first — the teaser can&apos;t be generated without it.
          </AdminAlert>
        )}
        {teaserError && <AdminAlert variant="red">{teaserError}</AdminAlert>}

        <div className="flex items-center gap-3 mt-3 mb-4">
          <button
            type="button"
            onClick={generateTeaserDraft}
            disabled={!drafts.friction_mechanism}
            className="px-4 py-2 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/25 text-[#D4A853] text-sm font-mono uppercase tracking-wide hover:bg-[#D4A853]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {teaserDraft ? "Regenerate Teaser" : "Generate Teaser"}
          </button>
          {teaserDraft && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(teaserDraft)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[#B0A89E] text-sm font-mono uppercase tracking-wide hover:bg-white/10 transition-colors cursor-pointer"
            >
              Copy
            </button>
          )}
        </div>

        {teaserDraft && (
          <textarea
            readOnly
            value={teaserDraft}
            rows={9}
            className="w-full bg-black/40 border border-[#D4A853]/15 rounded-lg px-3 py-2 text-sm font-mono text-[#F5F0EB] leading-relaxed focus:outline-none focus:border-[#D4A853]/40"
          />
        )}
      </AdminCard>

      <AdminCard>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-[0.15em]">
            Loom Script — cold-outreach teaser
          </span>
          {scaffold.loom_script_generated_at && (
            <span className="text-[10px] font-mono text-[#7A6F65]">
              Generated {formatDate(scaffold.loom_script_generated_at)}
            </span>
          )}
        </div>
        <p className="text-xs text-[#7A6F65] font-mono mb-4">
          Built only from Friction Mechanism, Specific Friction Point, Why It Blocks Conversion, The Decision, and the measured evidence above.
          Never reveals the fix — this is a teaser, not the deliverable.
        </p>

        {!judgmentReadyForScript && (
          <AdminAlert variant="gold">
            Fill in Friction Mechanism, Specific Friction Point, Why It Blocks Conversion, and The Decision above first —
            an empty judgment field means there&apos;s no real finding to script from.
          </AdminAlert>
        )}

        <div className="flex items-center gap-3 mt-3 mb-4">
          <button
            type="button"
            onClick={generateLoomScript}
            disabled={!judgmentReadyForScript || generatingLoom}
            className="px-4 py-2 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/25 text-[#D4A853] text-sm font-mono uppercase tracking-wide hover:bg-[#D4A853]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {generatingLoom ? "Generating…" : scaffold.loom_script ? "Regenerate Loom Script" : "Generate Loom Script"}
          </button>
          {loomScriptDraft && (
            <span className="text-xs font-mono text-[#7A6F65]">
              {loomScriptDraft.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          )}
        </div>

        {(scaffold.loom_script || loomScriptDraft) && (
          <div className="space-y-2">
            <textarea
              value={loomScriptDraft}
              onChange={(e) => setLoomScriptDraft(e.target.value)}
              rows={16}
              className="w-full bg-black/40 border border-[#D4A853]/15 rounded-lg px-3 py-2 text-sm font-mono text-[#F5F0EB] leading-relaxed focus:outline-none focus:border-[#D4A853]/40"
            />
            <button
              type="button"
              onClick={saveLoomScript}
              disabled={savingLoom}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[#B0A89E] text-sm font-mono uppercase tracking-wide hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {savingLoom ? "Saving…" : "Save Script"}
            </button>
          </div>
        )}
      </AdminCard>

      <div className="flex gap-4">
        <Link href="/admin/prospecting" className="text-xs font-mono text-[#7A6F65] hover:text-[#B0A89E] underline">
          ← Back to Prospecting
        </Link>
        <Link href="/admin/dashboard" className="text-xs font-mono text-[#7A6F65] hover:text-[#B0A89E] underline">
          ← Back to Pipeline
        </Link>
      </div>
    </div>
  );
}

export default function ScaffoldPage() {
  return (
    <Suspense fallback={<div className="p-6 md:p-8 max-w-4xl mx-auto"><AdminEmptyState text="Loading…" /></div>}>
      <ScaffoldEditor />
    </Suspense>
  );
}
