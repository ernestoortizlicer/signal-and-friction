"use client";

// Phase 3 — the reasoning engine's ONLY touchpoint on the scaffold. Every
// constraint from the approved Phase 3 plan is enforced here structurally,
// not just by convention:
//   1. The 7 judgment fields (rendered elsewhere on this page) stay
//      authoritative — this panel never writes to any of them.
//   2. Collapsed by default (see `open` state below) — optional, never
//      blocking the existing save flow.
//   3. Nothing here auto-attaches a mechanism. suggestMechanisms() only
//      ever populates a list to browse; attaching is a deliberate click.
//   4. attachMechanism() is a no-op button until rationale.trim() is
//      non-empty — enforced here AND again server-side in
//      functions/api/scaffolds/[id].ts (client-side alone is not a real
//      guarantee).
//   5. "A suggestion does not count as evidence" is stated in the UI
//      copy directly, not just implied by the interaction design.
//   6/7. Technical signals shown here are exactly what
//      _scan.ts/buildScaffoldEvidence() already measured — this panel
//      never invents a mechanism-to-signal link beyond the 2 approved,
//      documented mappings in the registry, and never treats a signal as
//      a behavioral finding on its own.

import { useMemo, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import {
  MECHANISMS,
  suggestMechanisms,
  buildHypothesisDraft,
  type DiagnosisHypothesis,
  type FrictionMechanismId,
  type PerformanceSignalId,
  type ReasoningMechanism,
} from "@/domain/reasoning";

const EVIDENCE_STYLES: Record<string, string> = {
  strong: "text-[#5C9A6B] border-[#5C9A6B]/40 bg-[#5C9A6B]/8",
  mixed: "text-[#C85C5C] border-[#C85C5C]/40 bg-[#C85C5C]/8",
  contextual: "text-[#D4A853] border-[#D4A853]/40 bg-[#D4A853]/8",
  weak: "text-[#C85C5C] border-[#C85C5C]/40 bg-[#C85C5C]/8",
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";

/**
 * Reads only the 3 fields the registry's 2 approved mappings actually use
 * (Social Proof / Authority Signaling). Deliberately does not attempt to
 * derive a broader signal set from LCP/CLS/TBT/etc — there is no approved
 * mapping for those, so pretending to derive one here would silently
 * reintroduce exactly the artificial-link problem the registry itself
 * was built to reject.
 */
function derivePresentSignals(technicalSignals: Record<string, unknown> | null): PerformanceSignalId[] {
  if (!technicalSignals) return [];
  const present: PerformanceSignalId[] = [];
  if (technicalSignals.thirdPartyReviewLink === "found") present.push("third_party_review_link");
  if (technicalSignals.onSiteTestimonial === "found") present.push("on_site_testimonial");
  if (technicalSignals.securityBadges === "found") present.push("security_badges");
  return present;
}

interface ReasoningPanelProps {
  scaffoldId: string;
  frictionMechanism: string | null;
  technicalSignals: Record<string, unknown> | null;
  reasoningLinks: DiagnosisHypothesis[];
  onSaved: (links: DiagnosisHypothesis[]) => void;
}

export default function ReasoningPanel({
  scaffoldId,
  frictionMechanism,
  technicalSignals,
  reasoningLinks,
  onSaved,
}: ReasoningPanelProps) {
  const [open, setOpen] = useState(false);
  const [rationaleDrafts, setRationaleDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browseAll, setBrowseAll] = useState(false);

  const presentSignals = useMemo(() => derivePresentSignals(technicalSignals), [technicalSignals]);
  const attachedIds = new Set(reasoningLinks.map((l) => l.mechanismId));

  const suggestions = useMemo(() => {
    const all = suggestMechanisms(presentSignals, (frictionMechanism as FrictionMechanismId) || null);
    const list = browseAll ? all : all.slice(0, 5);
    return list.filter((m) => !attachedIds.has(m.id));
  }, [presentSignals, frictionMechanism, browseAll, reasoningLinks]);

  async function persist(nextLinks: DiagnosisHypothesis[]) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/scaffolds/${scaffoldId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reasoning_links: nextLinks }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error || `Save failed (HTTP ${res.status}).`);
        return;
      }
      onSaved(nextLinks);
    } catch (err) {
      setError(`Save request failed: ${err instanceof Error ? err.message : "network error"}`);
    } finally {
      setSaving(false);
    }
  }

  function attach(mechanism: ReasoningMechanism) {
    const rationale = (rationaleDrafts[mechanism.id] ?? "").trim();
    if (!rationale) return; // No-op — attaching without a stated reason is not allowed.
    const draft = buildHypothesisDraft({
      id: `${scaffoldId}-${mechanism.id}-${Date.now()}`,
      mechanismId: mechanism.id,
      frictionMechanism: (frictionMechanism as FrictionMechanismId) || (mechanism.relevantFrictionMechanisms[0]?.id ?? "cognitive_load"),
      linkedObservationIds: [],
      analystRationale: rationale,
    });
    if (!draft) return;
    setRationaleDrafts((prev) => ({ ...prev, [mechanism.id]: "" }));
    void persist([...reasoningLinks, draft]);
  }

  function detach(mechanismId: string) {
    void persist(reasoningLinks.filter((l) => l.mechanismId !== mechanismId));
  }

  return (
    <div className="border border-[#D4A853]/12 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#110F0D] hover:bg-[#1A1815] transition-colors cursor-pointer"
      >
        <span className="font-mono text-xs text-[#D4A853]/80 uppercase tracking-widest">
          Reasoning suggestions {reasoningLinks.length > 0 ? `(${reasoningLinks.length} attached)` : "(optional)"}
        </span>
        <span className="font-mono text-xs text-[#7A6F65]">{open ? "▲ collapse" : "▼ expand"}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-black/20">
          <p className="text-xs text-[#7A6F65] leading-relaxed">
            Candidate behavioral mechanisms from the reasoning registry — a suggestion here is not evidence and does
            not become part of the diagnosis until you attach it with your own reason. The 7 judgment fields above
            remain the authoritative diagnosis regardless of what&apos;s attached here.
          </p>

          {reasoningLinks.length > 0 && (
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block">Attached</span>
              {reasoningLinks.map((link) => {
                const mechanism = MECHANISMS.find((m) => m.id === link.mechanismId);
                return (
                  <div key={link.mechanismId} className="border border-[#D4A853]/15 bg-[#110F0D] rounded p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-serif text-sm text-white font-bold">{mechanism?.name ?? link.mechanismId}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${EVIDENCE_STYLES[link.evidenceStrength]}`}>
                          {link.evidenceStrength}
                        </span>
                        <span className="font-mono text-[9px] text-[#7A6F65] uppercase border border-[#7A6F65]/25 rounded px-1.5 py-0.5">
                          {link.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => detach(link.mechanismId)}
                          disabled={saving}
                          className="font-mono text-[9px] text-[#C85C5C] uppercase tracking-wider hover:underline cursor-pointer disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#B0A89E] leading-relaxed">{link.analystRationale}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest">
                {suggestions.length === 0 ? "No further candidates" : "Candidates"}
              </span>
              <button
                type="button"
                onClick={() => setBrowseAll((v) => !v)}
                className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest hover:underline cursor-pointer"
              >
                {browseAll ? "Show top 5 only" : `Browse all ${MECHANISMS.length}`}
              </button>
            </div>
            {suggestions.map((m) => (
              <div key={m.id} className="border border-[#7A6F65]/15 rounded p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-serif text-sm text-[#F5F0EB]">{m.name}</span>
                  <span className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${EVIDENCE_STYLES[m.evidenceStrength]}`}>
                    {m.evidenceStrength}
                  </span>
                </div>
                <p className="text-xs text-[#7A6F65] leading-relaxed">{m.diagnosticQuestions[0]}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rationaleDrafts[m.id] ?? ""}
                    onChange={(e) => setRationaleDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="Why does this apply here? (required to attach)"
                    className="flex-1 bg-black/30 border border-[#D4A853]/15 rounded px-2 py-1.5 text-xs text-[#F5F0EB] placeholder:text-[#7A6F65] focus:outline-none focus:border-[#D4A853]/40"
                  />
                  <button
                    type="button"
                    onClick={() => attach(m)}
                    disabled={saving || !(rationaleDrafts[m.id] ?? "").trim()}
                    className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/30 rounded px-3 py-1.5 hover:bg-[#D4A853]/10 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Attach
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-[#C85C5C]">{error}</p>}
        </div>
      )}
    </div>
  );
}
