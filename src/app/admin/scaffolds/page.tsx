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
  status: "draft" | "pushed_to_deliverable";
  created_at: string;
  updated_at: string;
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
        });

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

  async function saveDraft() {
    if (!scaffold) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/scaffolds/${scaffold.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          friction_mechanism: drafts.friction_mechanism,
          specific_friction_point: drafts.specific_friction_point,
          why_blocks_conversion: drafts.why_blocks_conversion,
          projected_impact: drafts.projected_impact,
          the_decision: drafts.the_decision,
          what_to_avoid: drafts.what_to_avoid,
          confidence_and_why: drafts.confidence_and_why,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body) {
        setScaffold(body);
        setNotice({ message: "Draft saved.", variant: "green" });
      } else {
        setNotice({ message: body?.error || `Save failed (HTTP ${res.status}).`, variant: "red" });
      }
    } catch (err) {
      setNotice({ message: `Save request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
    } finally {
      setSaving(false);
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
          {JUDGMENT_FIELDS.map((f) => (
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
          ))}
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
