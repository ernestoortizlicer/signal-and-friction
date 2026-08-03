"use client";

// Phase 3.1 — redesign of the reasoning engine's touchpoint on the
// scaffold, following the ruthless design review that found the original
// Phase 3 panel read as a detached, browsable "attach a mechanism" form
// rather than part of the analyst's own reasoning. Every Phase 3
// constraint remains enforced structurally, unchanged:
//   1. The 7 judgment fields (rendered on the scaffold page) stay
//      authoritative — this component never writes to any of them.
//   2. Nothing here auto-attaches a mechanism. A hypothesis is only ever
//      saved after a deliberate, single-question evaluation step (see
//      saveHypothesis below) — never a passive "attach" click.
//   3. saveHypothesis()/saveRevision() are no-ops until rationale.trim()
//      is non-empty — enforced here AND again server-side in
//      functions/api/scaffolds/[id].ts (client-side alone is not a real
//      guarantee).
//   4. New hypotheses always start "pending" (buildHypothesisDraft),
//      never "modeled" — nothing here upgrades that on the analyst's
//      behalf.
//   5. Evidence strength is read from the canonical registry at render
//      time, including on revision — never author-set, never left stale.
//   6/7. Technical signals shown here are exactly what
//      _scan.ts/buildScaffoldEvidence() already measured — this panel
//      never invents a mechanism-to-signal link beyond the 2 approved,
//      documented mappings in the registry, and never treats a signal as
//      a behavioral finding on its own.
//
// What changed from Phase 3: no LLM/semantic matching of the analyst's
// free text was introduced — the selectors remain deterministic and
// signal/friction-mechanism driven, exactly as before. What changed is
// presentation: this is now embedded directly beside why_blocks_conversion
// (see page.tsx) instead of a collapsed panel below the whole form; it
// shows a restrained set of named candidates with NO evidence-strength
// badge until the analyst selects one to evaluate (avoids anchoring on
// "strong" vs "weak" before the analyst has judged fit for themselves);
// "Attach" is replaced by a single required question — why does this fit
// what you just described; and attached hypotheses render in a visually
// distinct register with a persistent "Hypothesis — not evidence" label
// and can be revised in place, not just removed and re-created.

import { useMemo, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import {
  MECHANISMS,
  suggestMechanisms,
  buildHypothesisDraft,
  getMechanism,
  type DiagnosisHypothesis,
  type FrictionMechanismId,
  type PerformanceSignalId,
} from "@/domain/reasoning";

const EVIDENCE_STYLES: Record<string, string> = {
  strong: "text-[#5C9A6B] border-[#5C9A6B]/40 bg-[#5C9A6B]/8",
  mixed: "text-[#C85C5C] border-[#C85C5C]/40 bg-[#C85C5C]/8",
  contextual: "text-[#D4A853] border-[#D4A853]/40 bg-[#D4A853]/8",
  weak: "text-[#C85C5C] border-[#C85C5C]/40 bg-[#C85C5C]/8",
};

// A restrained default count, not a catalogue — suggestMechanisms already
// scopes to the selected friction mechanism, this just avoids dumping the
// whole scoped set on screen unasked. "+N more" reveals the rest of that
// SAME scoped set, never the full 21 — there is no "browse all" anymore.
const RESTRAINED_COUNT = 4;

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rationaleDrafts, setRationaleDrafts] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [reviseDrafts, setReviseDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presentSignals = useMemo(() => derivePresentSignals(technicalSignals), [technicalSignals]);

  // Quiet by default: with no friction mechanism selected yet, suggestMechanisms
  // would return the full unscoped set — showing that here would be noise, not
  // help. Nothing renders until there's something genuinely scoped to suggest.
  const candidates = useMemo(() => {
    if (!frictionMechanism) return [];
    const attached = new Set(reasoningLinks.map((l) => l.mechanismId));
    const all = suggestMechanisms(presentSignals, frictionMechanism as FrictionMechanismId);
    return all.filter((m) => !attached.has(m.id));
  }, [presentSignals, frictionMechanism, reasoningLinks]);

  const visibleCandidates = showMore ? candidates : candidates.slice(0, RESTRAINED_COUNT);
  const hiddenCount = candidates.length - visibleCandidates.length;
  const selected = candidates.find((m) => m.id === selectedId) ?? null;

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

  function saveHypothesis() {
    if (!selected) return;
    const rationale = (rationaleDrafts[selected.id] ?? "").trim();
    if (!rationale) return; // No-op — saving without a stated reason is not allowed.
    const draft = buildHypothesisDraft({
      id: `${scaffoldId}-${selected.id}-${Date.now()}`,
      mechanismId: selected.id,
      frictionMechanism: (frictionMechanism as FrictionMechanismId) || (selected.relevantFrictionMechanisms[0]?.id ?? "cognitive_load"),
      linkedObservationIds: [],
      analystRationale: rationale,
    });
    if (!draft) return;
    setRationaleDrafts((prev) => ({ ...prev, [selected.id]: "" }));
    setSelectedId(null);
    void persist([...reasoningLinks, draft]);
  }

  function detach(linkId: string) {
    void persist(reasoningLinks.filter((l) => l.id !== linkId));
  }

  function saveRevision(link: DiagnosisHypothesis) {
    const rationale = (reviseDrafts[link.id] ?? link.analystRationale).trim();
    if (!rationale) return;
    const mechanism = getMechanism(link.mechanismId);
    const nextLinks = reasoningLinks.map((l) =>
      l.id === link.id
        ? { ...l, analystRationale: rationale, evidenceStrength: mechanism?.evidenceStrength ?? l.evidenceStrength }
        : l
    );
    setRevisingId(null);
    void persist(nextLinks);
  }

  return (
    <div className="space-y-3">
      {candidates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest">
              Consider a named mechanism — optional, not part of the diagnosis until you say why
            </span>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest hover:underline cursor-pointer shrink-0"
              >
                {showMore ? "Show fewer" : `+${hiddenCount} more`}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleCandidates.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId((v) => (v === m.id ? null : m.id))}
                className={`font-mono text-[11px] rounded-full px-3 py-1 border cursor-pointer transition-colors ${
                  selectedId === m.id
                    ? "border-[#D4A853]/50 bg-[#D4A853]/10 text-[#D4A853]"
                    : "border-[#7A6F65]/25 text-[#B0A89E] hover:border-[#D4A853]/30 hover:text-[#D4A853]"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {selected && (
            <div className="border border-[#D4A853]/20 rounded p-3 space-y-2 bg-black/20">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-serif text-sm text-white">{selected.name}</span>
                <span className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${EVIDENCE_STYLES[selected.evidenceStrength]}`}>
                  {selected.evidenceStrength} evidence
                </span>
              </div>
              <p className="text-xs text-[#7A6F65] leading-relaxed">{selected.diagnosticQuestions[0]}</p>
              <label className="block text-xs text-[#D4A853]/80 font-mono italic">
                Why does this hypothesis fit the specific friction you described above?
              </label>
              <textarea
                autoFocus
                value={rationaleDrafts[selected.id] ?? ""}
                onChange={(e) => setRationaleDrafts((prev) => ({ ...prev, [selected.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveHypothesis();
                  }
                }}
                rows={2}
                placeholder="Your reasoning, in your own words…"
                className="w-full bg-black/30 border border-[#D4A853]/15 rounded px-2 py-1.5 text-xs text-[#F5F0EB] placeholder:text-[#7A6F65] focus:outline-none focus:border-[#D4A853]/40"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveHypothesis}
                  disabled={saving || !(rationaleDrafts[selected.id] ?? "").trim()}
                  className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/30 rounded px-3 py-1.5 hover:bg-[#D4A853]/10 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Save as hypothesis
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] hover:text-[#B0A89E] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {reasoningLinks.length > 0 && (
        <div className="space-y-2">
          {reasoningLinks.map((link) => {
            const mechanism = MECHANISMS.find((m) => m.id === link.mechanismId);
            const revising = revisingId === link.id;
            return (
              <div key={link.id} className="border-l-2 border-[#8B6FB8]/60 bg-[#8B6FB8]/[0.06] rounded-r p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#8B6FB8]">
                    Hypothesis — not evidence
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${EVIDENCE_STYLES[link.evidenceStrength]}`}>
                      {link.evidenceStrength}
                    </span>
                    <span className="font-mono text-[9px] text-[#7A6F65] uppercase border border-[#7A6F65]/25 rounded px-1.5 py-0.5">
                      {link.status}
                    </span>
                  </div>
                </div>
                <span className="font-serif text-sm text-white font-bold block">{mechanism?.name ?? link.mechanismId}</span>
                {revising ? (
                  <div className="space-y-1.5">
                    <textarea
                      autoFocus
                      value={reviseDrafts[link.id] ?? link.analystRationale}
                      onChange={(e) => setReviseDrafts((prev) => ({ ...prev, [link.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          saveRevision(link);
                        }
                      }}
                      rows={2}
                      className="w-full bg-black/30 border border-[#D4A853]/15 rounded px-2 py-1.5 text-xs text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveRevision(link)}
                        disabled={saving || !(reviseDrafts[link.id] ?? link.analystRationale).trim()}
                        className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/30 rounded px-3 py-1 hover:bg-[#D4A853]/10 cursor-pointer disabled:opacity-30"
                      >
                        Save revision
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevisingId(null)}
                        className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] hover:text-[#B0A89E] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-[#B0A89E] leading-relaxed">{link.analystRationale}</p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setReviseDrafts((prev) => ({ ...prev, [link.id]: link.analystRationale }));
                          setRevisingId(link.id);
                        }}
                        className="font-mono text-[9px] text-[#D4A853]/70 uppercase tracking-wider hover:underline cursor-pointer"
                      >
                        Revise
                      </button>
                      <button
                        type="button"
                        onClick={() => detach(link.id)}
                        disabled={saving}
                        className="font-mono text-[9px] text-[#C85C5C] uppercase tracking-wider hover:underline cursor-pointer disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-[#C85C5C]">{error}</p>}
    </div>
  );
}
