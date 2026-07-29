"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/supabase";
import {
  AdminSectionHeader,
  AdminAlert,
  AdminTable,
  AdminBadge,
  AdminCard,
  AdminEmptyState,
} from "@/components/admin/AdminComponents";

type Presence = "found" | "not_found" | "undetermined";

interface TechnicalSignals {
  lcp: { ms: number; label: string; status: string };
  tbt: { ms: number; label: string; status: string };
  cls: { value: number; status: string };
  performanceScore: number;
  speedIndex: { ms: number; label: string };
  grade: string;
  platform: string | null;
  hasStripe: boolean;
  stripeAsync: boolean;
  scriptCount: number;
  missingOgTags: string[];
  hasCheckoutIndicator: boolean;
  hasLazyImages: boolean;
  httpsEnabled: boolean;
  privacyPolicyLink: Presence;
  termsOfServiceLink: Presence;
  socialProof: Presence;
  securityBadges: Presence;
  liveChatWidget: Presence;
  pricingLink: Presence;
  scannedAt: string;
  psError: string | null;
}

interface TrustSignalBreakdown {
  missingOgTags: number;
  checkoutWithoutLazyLoad: number;
  syncStripe: number;
  httpsMissing: number;
  privacyMissing: number;
  termsMissing: number;
  socialProofMissing: number;
  securityBadgeMissing: number;
  liveChatMissing: number;
  pricingLinkMissing: number;
}

interface ScoreBreakdown {
  performance: number;
  lcp: number;
  tbt: number;
  cls: number;
  trustSignals: TrustSignalBreakdown;
  trustSignalsTotal: number;
}

interface Candidate {
  id: string;
  domain: string;
  url: string;
  company_name: string | null;
  source: string;
  status: "new" | "scanning" | "scanned" | "scan_failed" | "promoted" | "dismissed";
  technical_signals: TechnicalSignals | null;
  technical_score: number | null;
  score_breakdown: ScoreBreakdown | null;
  founder_contact: string | null;
  scan_error: string | null;
  scanned_at: string | null;
  promoted_client_id: string | null;
  dismissed_at: string | null;
  created_at: string;
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";

function normalizeSeedUrl(raw: string): { url: string; domain: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    return { url: withProtocol, domain: u.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

function scoreVariant(score: number | null): "red" | "amber" | "green" | "muted" {
  if (score === null) return "muted";
  if (score >= 60) return "red";
  if (score >= 35) return "amber";
  return "green";
}

const STATUS_BADGE: Record<Candidate["status"], { variant: "muted" | "gold" | "green" | "red"; label: string }> = {
  new: { variant: "muted", label: "New" },
  scanning: { variant: "gold", label: "Scanning…" },
  scanned: { variant: "green", label: "Scanned" },
  scan_failed: { variant: "red", label: "Scan Failed" },
  promoted: { variant: "gold", label: "Promoted" },
  dismissed: { variant: "muted", label: "Dismissed" },
};

const STATUS_FILTERS: Array<{ key: "all" | Candidate["status"]; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "scanning", label: "Scanning" },
  { key: "scanned", label: "Scanned" },
  { key: "scan_failed", label: "Failed" },
  { key: "promoted", label: "Promoted" },
  { key: "dismissed", label: "Dismissed" },
];

export default function ProspectingCommandCenter() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [scaffoldIds, setScaffoldIds] = useState<Record<string, string>>({});
  const [generatingScaffoldIds, setGeneratingScaffoldIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [seedText, setSeedText] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
  const [bulkScanning, setBulkScanning] = useState(false);
  const [contactDrafts, setContactDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ message: string; variant: "green" | "red" } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | Candidate["status"]>("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [editDrafts, setEditDrafts] = useState<Record<string, { company_name: string; url: string }>>({});
  const [savingEditIds, setSavingEditIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [selectedActionRunning, setSelectedActionRunning] = useState(false);

  async function fetchCandidates() {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/prospect_candidates?select=*&order=technical_score.desc.nullslast,created_at.desc`,
        { headers }
      );
      if (res.ok) {
        const rows: Candidate[] = await res.json();
        setCandidates(rows);
      }
    } catch (err) {
      console.warn("Failed to load prospect candidates:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchScaffolds() {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/diagnostic_scaffolds?select=id,prospect_candidate_id&prospect_candidate_id=not.is.null`,
        { headers }
      );
      if (res.ok) {
        const rows: Array<{ id: string; prospect_candidate_id: string }> = await res.json();
        const map: Record<string, string> = {};
        // Most-recent-first isn't guaranteed by this query, but candidates
        // only ever have one live scaffold in practice — last write wins
        // either way, which is harmless.
        rows.forEach((r) => { map[r.prospect_candidate_id] = r.id; });
        setScaffoldIds(map);
      }
    } catch (err) {
      console.warn("Failed to load diagnostic scaffolds:", err);
    }
  }

  useEffect(() => {
    async function loadOnMount() {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/prospect_candidates?select=*&order=technical_score.desc.nullslast,created_at.desc`,
          { headers }
        );
        if (res.ok) {
          const rows: Candidate[] = await res.json();
          setCandidates(rows);
        }
      } catch (err) {
        console.warn("Failed to load prospect candidates:", err);
      } finally {
        setLoading(false);
      }
      await fetchScaffolds();
    }
    loadOnMount();
  }, []);

  async function generateScaffold(candidate: Candidate) {
    setGeneratingScaffoldIds((prev) => new Set(prev).add(candidate.id));
    try {
      const res = await fetch("/api/scaffolds/generate", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ prospectCandidateId: candidate.id }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.id) {
        setScaffoldIds((prev) => ({ ...prev, [candidate.id]: body.id }));
        router.push(`/admin/scaffolds?id=${body.id}`);
      } else {
        setNotice({ message: body?.error || `Scaffold generation failed (HTTP ${res.status}).`, variant: "red" });
      }
    } catch (err) {
      setNotice({ message: `Scaffold request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
    } finally {
      setGeneratingScaffoldIds((prev) => {
        const next = new Set(prev);
        next.delete(candidate.id);
        return next;
      });
    }
  }

  async function handleAddCandidates() {
    const lines = seedText.split(/[\n,]/).map((l) => l.trim()).filter(Boolean);
    const parsed = lines
      .map(normalizeSeedUrl)
      .filter((v): v is { url: string; domain: string } => v !== null);

    if (parsed.length === 0) {
      setNotice({ message: "No valid URLs found in the pasted list.", variant: "red" });
      return;
    }

    // De-dupe within the pasted batch itself before upserting.
    const uniqueByDomain = new Map<string, { url: string; domain: string }>();
    for (const p of parsed) uniqueByDomain.set(p.domain, p);
    const rows = Array.from(uniqueByDomain.values()).map((p) => ({
      domain: p.domain,
      url: p.url,
      source: "seed_list",
      status: "new",
    }));

    setAdding(true);
    try {
      const headers = {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      };
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/prospect_candidates?on_conflict=domain`,
        { method: "POST", headers, body: JSON.stringify(rows) }
      );
      if (!res.ok) {
        setNotice({ message: "Failed to add candidates — check the admin session and try again.", variant: "red" });
        return;
      }
      setSeedText("");
      setNotice({ message: `Added ${rows.length} candidate${rows.length === 1 ? "" : "s"} (existing domains skipped).`, variant: "green" });
      await fetchCandidates();
    } catch {
      setNotice({ message: "Failed to add candidates.", variant: "red" });
    } finally {
      setAdding(false);
    }
  }

  async function scanOne(id: string) {
    setScanningIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/prospecting/scan", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: id }),
      });
      const rawText = await res.text();
      let body: { error?: string; [key: string]: unknown } | null = null;
      try {
        body = rawText ? JSON.parse(rawText) : null;
      } catch {
        // Not JSON — something between the Worker and this browser rewrote
        // the response body (seen once already: Cloudflare's edge swaps in
        // its own page for 50x "gateway" statuses). Show the raw bytes
        // rather than a canned message, so that's visible instead of hidden.
      }
      if (res.ok && body) {
        setCandidates((prev) => prev.map((c) => (c.id === id ? (body as unknown as Candidate) : c)));
      } else {
        const detail = body?.error || (rawText ? rawText.slice(0, 300) : "(empty response body)");
        setNotice({ message: `Scan failed (HTTP ${res.status}): ${detail}`, variant: "red" });
        await fetchCandidates();
      }
    } catch (err) {
      setNotice({ message: `Scan request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
      await fetchCandidates();
    } finally {
      setScanningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function scanAllPending() {
    const pending = candidates.filter((c) => c.status === "new" || c.status === "scan_failed" || c.status === "scanning");
    if (pending.length === 0) return;
    setBulkScanning(true);
    // Sequential, not parallel — each scan already hits PageSpeed's own
    // rate limits; fanning these out concurrently just trades one queue
    // for another and makes partial failures harder to attribute.
    for (const c of pending) {
      await scanOne(c.id);
    }
    setBulkScanning(false);
  }

  async function saveFounderContact(id: string) {
    const value = contactDrafts[id];
    if (value === undefined) return;
    try {
      const headers = { ...getAuthHeaders(), "Content-Type": "application/json", Prefer: "return=representation" };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/prospect_candidates?id=eq.${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ founder_contact: value }),
      });
      if (res.ok) {
        const [updated] = await res.json();
        if (updated) setCandidates((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } catch {
      /* non-fatal — the draft stays in local state either way */
    }
  }

  async function promoteCandidate(candidate: Candidate) {
    const founderContact = (contactDrafts[candidate.id] ?? candidate.founder_contact ?? "").trim();
    if (!founderContact) {
      setNotice({ message: "Add a founder contact before promoting — that's the manual step that keeps this from auto-contacting anyone.", variant: "red" });
      return;
    }
    try {
      const headers = { ...getAuthHeaders(), "Content-Type": "application/json", Prefer: "return=representation" };
      const clientRes = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          company_name: candidate.company_name || candidate.domain,
          contact_name: founderContact,
          contact_profile_url: candidate.url,
          industry: "Unknown",
          estimated_mrr: 0,
          source_platform: "prospecting_seed_list",
        }),
      });
      if (!clientRes.ok) {
        setNotice({ message: "Failed to create the client record.", variant: "red" });
        return;
      }
      const [newClient] = await clientRes.json();

      const candRes = await fetch(`${SUPABASE_URL}/rest/v1/prospect_candidates?id=eq.${candidate.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "promoted",
          founder_contact: founderContact,
          promoted_client_id: newClient.id,
        }),
      });
      if (candRes.ok) {
        const [updated] = await candRes.json();
        if (updated) setCandidates((prev) => prev.map((c) => (c.id === candidate.id ? updated : c)));
      }
      setNotice({ message: `${candidate.domain} promoted to the client pipeline.`, variant: "green" });
    } catch {
      setNotice({ message: "Failed to promote this candidate.", variant: "red" });
    }
  }

  async function dismissCandidate(id: string) {
    try {
      const headers = { ...getAuthHeaders(), "Content-Type": "application/json", Prefer: "return=representation" };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/prospect_candidates?id=eq.${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "dismissed", dismissed_at: new Date().toISOString() }),
      });
      if (res.ok) {
        const [updated] = await res.json();
        if (updated) setCandidates((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } catch {
      /* non-fatal */
    }
  }

  // ── Delete (hard, admin-gated) ──
  async function deleteCandidate(id: string, label: string) {
    if (!window.confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/prospecting/candidates/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setCandidates((prev) => prev.filter((c) => c.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        const body = await res.json().catch(() => null);
        setNotice({ message: body?.error || `Delete failed (HTTP ${res.status}).`, variant: "red" });
      }
    } catch (err) {
      setNotice({ message: `Delete request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // ── Reset to New (un-dismiss, admin-gated) ──
  async function resetToNew(id: string) {
    try {
      const res = await fetch(`/api/prospecting/candidates/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "new" }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body) {
        setCandidates((prev) => prev.map((c) => (c.id === id ? body : c)));
      } else {
        setNotice({ message: body?.error || `Reset failed (HTTP ${res.status}).`, variant: "red" });
      }
    } catch (err) {
      setNotice({ message: `Reset request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
    }
  }

  // ── Inline edit of company_name / url (admin-gated) ──
  function startEditing(c: Candidate) {
    setEditDrafts((prev) => ({ ...prev, [c.id]: { company_name: c.company_name ?? "", url: c.url } }));
    setEditingIds((prev) => new Set(prev).add(c.id));
  }

  function cancelEditing(id: string) {
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setEditDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function saveEditing(id: string) {
    const draft = editDrafts[id];
    const current = candidates.find((c) => c.id === id);
    if (!draft || !current) return;

    const patch: { company_name?: string; url?: string } = {};
    if (draft.company_name !== (current.company_name ?? "")) patch.company_name = draft.company_name;
    if (draft.url !== current.url) patch.url = draft.url;

    if (Object.keys(patch).length === 0) {
      cancelEditing(id);
      return;
    }

    setSavingEditIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/prospecting/candidates/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body) {
        setCandidates((prev) => prev.map((c) => (c.id === id ? body : c)));
        cancelEditing(id);
        if (patch.url) {
          setNotice({ message: "URL updated — status reset to New so it can be scanned cleanly.", variant: "green" });
        }
      } else {
        setNotice({ message: body?.error || `Save failed (HTTP ${res.status}).`, variant: "red" });
      }
    } catch (err) {
      setNotice({ message: `Save request failed: ${err instanceof Error ? err.message : "network error"}`, variant: "red" });
    } finally {
      setSavingEditIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // ── Bulk selection ──
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible(visible: Candidate[]) {
    setSelectedIds((prev) => {
      const allSelected = visible.length > 0 && visible.every((c) => prev.has(c.id));
      const next = new Set(prev);
      if (allSelected) {
        visible.forEach((c) => next.delete(c.id));
      } else {
        visible.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Permanently delete ${ids.length} candidate${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setSelectedActionRunning(true);
    for (const id of ids) {
      try {
        const res = await fetch(`/api/prospecting/candidates/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          setCandidates((prev) => prev.filter((c) => c.id !== id));
        }
      } catch {
        /* continue deleting the rest of the batch */
      }
    }
    setSelectedIds(new Set());
    setSelectedActionRunning(false);
  }

  async function rescanSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setSelectedActionRunning(true);
    for (const id of ids) {
      await scanOne(id);
    }
    setSelectedActionRunning(false);
  }

  const pendingCount = candidates.filter((c) => c.status === "new" || c.status === "scan_failed" || c.status === "scanning").length;

  const filteredCandidates = statusFilter === "all" ? candidates : candidates.filter((c) => c.status === statusFilter);
  const scoredCandidates = filteredCandidates.filter((c) => c.technical_score !== null);
  const unscoredCandidates = filteredCandidates.filter((c) => c.technical_score === null);
  scoredCandidates.sort((a, b) =>
    sortDir === "desc" ? b.technical_score! - a.technical_score! : a.technical_score! - b.technical_score!
  );
  const visibleCandidates = [...scoredCandidates, ...unscoredCandidates];
  const allVisibleSelected = visibleCandidates.length > 0 && visibleCandidates.every((c) => selectedIds.has(c.id));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <AdminSectionHeader
        eyebrow="Prospecting"
        title="Candidate Pipeline"
        subtitle="Seed-list candidates, scanned and ranked by observable technical friction. You decide who's worth pursuing."
      />

      <AdminAlert variant="gold">
        Technical friction from public signal — not a validated business pain. This ranking is a triage aid, not a verdict.
        Founder contact and the promote/dismiss decision are entered by hand; nothing here contacts anyone automatically.
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
        <label className="block font-mono text-xs text-[#D4A853]/70 uppercase tracking-[0.15em] mb-2">
          Paste company URLs (one per line)
        </label>
        <textarea
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          placeholder={"acme.com\nhttps://example-saas.com\nfunnelco.io"}
          rows={4}
          className="w-full bg-black/40 border border-[#D4A853]/15 rounded-lg px-3 py-2 text-sm font-mono text-[#F5F0EB] placeholder:text-[#7A6F65] focus:outline-none focus:border-[#D4A853]/40"
        />
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={handleAddCandidates}
            disabled={adding || !seedText.trim()}
            className="px-4 py-2 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/25 text-[#D4A853] text-sm font-mono uppercase tracking-wide hover:bg-[#D4A853]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {adding ? "Adding…" : "Add Candidates"}
          </button>
          <button
            type="button"
            onClick={scanAllPending}
            disabled={bulkScanning || pendingCount === 0}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[#B0A89E] text-sm font-mono uppercase tracking-wide hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {bulkScanning ? "Scanning…" : `Scan All Pending (${pendingCount})`}
          </button>
        </div>
      </AdminCard>

      {candidates.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide border cursor-pointer transition-colors ${
                  statusFilter === f.key
                    ? "bg-[#D4A853]/15 border-[#D4A853]/40 text-[#D4A853]"
                    : "bg-white/5 border-white/10 text-[#7A6F65] hover:text-[#B0A89E]"
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide border border-white/10 bg-white/5 text-[#7A6F65] hover:text-[#B0A89E] cursor-pointer transition-colors ml-2"
            >
              Score {sortDir === "desc" ? "↓" : "↑"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#7A6F65]">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : ""}
            </span>
            <button
              type="button"
              onClick={rescanSelected}
              disabled={selectedIds.size === 0 || selectedActionRunning}
              className="px-3 py-1.5 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/25 text-[#D4A853] text-xs font-mono uppercase tracking-wide hover:bg-[#D4A853]/15 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {selectedActionRunning ? "Working…" : `Rescan Selected (${selectedIds.size})`}
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selectedIds.size === 0 || selectedActionRunning}
              className="px-3 py-1.5 rounded-lg bg-[#C85C5C]/10 border border-[#C85C5C]/25 text-[#C85C5C] text-xs font-mono uppercase tracking-wide hover:bg-[#C85C5C]/15 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {selectedActionRunning ? "Working…" : `Delete Selected (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <AdminEmptyState text="Loading candidates…" />
      ) : candidates.length === 0 ? (
        <AdminEmptyState icon="🔍" text="No candidates yet" subtext="Paste a seed list above to get started." />
      ) : visibleCandidates.length === 0 ? (
        <AdminEmptyState icon="🔍" text="No candidates match this filter" />
      ) : (
        <AdminTable
          headers={[
            <input
              key="select-all"
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => toggleSelectAllVisible(visibleCandidates)}
              className="cursor-pointer"
              aria-label="Select all visible candidates"
            />,
            "Company",
            "Score",
            "LCP",
            "Perf",
            "Platform",
            "Checkout",
            "Missing OG",
            "Founder Contact",
            "Status",
            "Actions",
          ]}
        >
          {visibleCandidates.map((c) => {
            // Only "this browser tab has an in-flight request for this row"
            // disables the button. c.status === "scanning" is DB state and
            // can be stale from a request that died before writing back —
            // gating the button on it would make a stuck row unrecoverable
            // from the UI (no request in flight, but no button to retry).
            const isScanning = scanningIds.has(c.id);
            const isDeleting = deletingIds.has(c.id);
            const isSavingEdit = savingEditIds.has(c.id);
            const isEditing = editingIds.has(c.id);
            const draft = contactDrafts[c.id] ?? c.founder_contact ?? "";
            const editDraft = editDrafts[c.id] ?? { company_name: c.company_name ?? "", url: c.url };
            return (
              <tr key={c.id} className="hover:bg-[#D4A853]/[0.02] transition-colors align-top">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="cursor-pointer"
                    aria-label={`Select ${c.domain}`}
                  />
                </td>
                <td className="px-4 py-3 min-w-[190px]">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={editDraft.company_name}
                        onChange={(e) =>
                          setEditDrafts((prev) => ({ ...prev, [c.id]: { ...editDraft, company_name: e.target.value } }))
                        }
                        placeholder="Company name"
                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs font-mono text-[#F5F0EB] placeholder:text-[#7A6F65] focus:outline-none focus:border-[#D4A853]/40"
                      />
                      <input
                        type="text"
                        value={editDraft.url}
                        onChange={(e) =>
                          setEditDrafts((prev) => ({ ...prev, [c.id]: { ...editDraft, url: e.target.value } }))
                        }
                        placeholder="https://example.com"
                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs font-mono text-[#F5F0EB] placeholder:text-[#7A6F65] focus:outline-none focus:border-[#D4A853]/40"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="text-[#F5F0EB] text-sm">{c.company_name || c.domain}</div>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7A6F65] hover:text-[#D4A853] underline decoration-[#D4A853]/20">
                        {c.domain}
                      </a>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge variant={scoreVariant(c.technical_score)}>
                    {c.technical_score === null ? "—" : c.technical_score}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.technical_signals ? c.technical_signals.lcp.label : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.technical_signals ? `${c.technical_signals.performanceScore}/100` : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.technical_signals?.platform ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.technical_signals
                    ? c.technical_signals.hasCheckoutIndicator
                      ? (c.technical_signals.hasLazyImages ? "Detected" : "Detected, unoptimized")
                      : "Not detected"
                    : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.technical_signals ? c.technical_signals.missingOgTags.length : "—"}
                </td>
                <td className="px-4 py-3 min-w-[180px]">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setContactDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    onBlur={() => saveFounderContact(c.id)}
                    placeholder="Name / email / LinkedIn"
                    disabled={c.status === "promoted" || c.status === "dismissed"}
                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-[#F5F0EB] placeholder:text-[#7A6F65] focus:outline-none focus:border-[#D4A853]/40 disabled:opacity-50"
                  />
                </td>
                <td className="px-4 py-3">
                  <AdminBadge variant={STATUS_BADGE[c.status].variant}>{STATUS_BADGE[c.status].label}</AdminBadge>
                  {c.status === "scan_failed" && c.scan_error && (
                    <div className="text-[10px] text-[#C85C5C]/80 mt-1 max-w-[160px]">{c.scan_error}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5 min-w-[110px]">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEditing(c.id)}
                          disabled={isSavingEdit}
                          className="px-2.5 py-1 rounded bg-[#5C9A6B]/10 border border-[#5C9A6B]/25 text-[#5C9A6B] text-[10px] font-mono uppercase tracking-wide hover:bg-[#5C9A6B]/15 disabled:opacity-40 cursor-pointer"
                        >
                          {isSavingEdit ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEditing(c.id)}
                          disabled={isSavingEdit}
                          className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#B0A89E] text-[10px] font-mono uppercase tracking-wide hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => scanOne(c.id)}
                          disabled={isScanning}
                          className="px-2.5 py-1 rounded bg-[#D4A853]/10 border border-[#D4A853]/25 text-[#D4A853] text-[10px] font-mono uppercase tracking-wide hover:bg-[#D4A853]/15 disabled:opacity-40 cursor-pointer"
                        >
                          {isScanning ? "Scanning…" : c.status === "new" ? "Scan" : "Rescan"}
                        </button>
                        {c.status === "scanned" && (
                          <>
                            <button
                              type="button"
                              onClick={() => promoteCandidate(c)}
                              className="px-2.5 py-1 rounded bg-[#5C9A6B]/10 border border-[#5C9A6B]/25 text-[#5C9A6B] text-[10px] font-mono uppercase tracking-wide hover:bg-[#5C9A6B]/15 cursor-pointer"
                            >
                              Promote
                            </button>
                            <button
                              type="button"
                              onClick={() => dismissCandidate(c.id)}
                              className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#B0A89E] text-[10px] font-mono uppercase tracking-wide hover:bg-white/10 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {c.status === "dismissed" && (
                          <button
                            type="button"
                            onClick={() => resetToNew(c.id)}
                            className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#B0A89E] text-[10px] font-mono uppercase tracking-wide hover:bg-white/10 cursor-pointer"
                          >
                            Reset to New
                          </button>
                        )}
                        {c.status === "promoted" && (
                          <span className="text-[10px] text-[#7A6F65] font-mono">In client pipeline</span>
                        )}
                        {scaffoldIds[c.id] ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/scaffolds?id=${scaffoldIds[c.id]}`)}
                            className="px-2.5 py-1 rounded bg-[#D4A853]/10 border border-[#D4A853]/25 text-[#D4A853] text-[10px] font-mono uppercase tracking-wide hover:bg-[#D4A853]/15 cursor-pointer"
                          >
                            Open Scaffold
                          </button>
                        ) : c.status === "scanned" ? (
                          <button
                            type="button"
                            onClick={() => generateScaffold(c)}
                            disabled={generatingScaffoldIds.has(c.id)}
                            className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#B0A89E] text-[10px] font-mono uppercase tracking-wide hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                          >
                            {generatingScaffoldIds.has(c.id) ? "Generating…" : "Generate Scaffold"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => startEditing(c)}
                          className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#7A6F65] text-[10px] font-mono uppercase tracking-wide hover:bg-white/10 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCandidate(c.id, c.company_name || c.domain)}
                          disabled={isDeleting}
                          className="px-2.5 py-1 rounded bg-[#C85C5C]/10 border border-[#C85C5C]/25 text-[#C85C5C] text-[10px] font-mono uppercase tracking-wide hover:bg-[#C85C5C]/15 disabled:opacity-40 cursor-pointer"
                        >
                          {isDeleting ? "Deleting…" : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </AdminTable>
      )}
    </div>
  );
}
