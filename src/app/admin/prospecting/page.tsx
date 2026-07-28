"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import {
  AdminSectionHeader,
  AdminAlert,
  AdminTable,
  AdminBadge,
  AdminCard,
  AdminEmptyState,
} from "@/components/admin/AdminComponents";

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
  scannedAt: string;
  psError: string | null;
}

interface ScoreBreakdown {
  performance: number;
  lcp: number;
  tbt: number;
  cls: number;
  trustSignals: number;
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

export default function ProspectingCommandCenter() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedText, setSeedText] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
  const [bulkScanning, setBulkScanning] = useState(false);
  const [contactDrafts, setContactDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ message: string; variant: "green" | "red" } | null>(null);

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
    }
    loadOnMount();
  }, []);

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

  const pendingCount = candidates.filter((c) => c.status === "new" || c.status === "scan_failed" || c.status === "scanning").length;

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

      {loading ? (
        <AdminEmptyState text="Loading candidates…" />
      ) : candidates.length === 0 ? (
        <AdminEmptyState icon="🔍" text="No candidates yet" subtext="Paste a seed list above to get started." />
      ) : (
        <AdminTable
          headers={["Company", "Score", "LCP", "Perf", "Platform", "Checkout", "Missing OG", "Founder Contact", "Status", "Actions"]}
        >
          {candidates.map((c) => {
            // Only "this browser tab has an in-flight request for this row"
            // disables the button. c.status === "scanning" is DB state and
            // can be stale from a request that died before writing back —
            // gating the button on it would make a stuck row unrecoverable
            // from the UI (no request in flight, but no button to retry).
            const isScanning = scanningIds.has(c.id);
            const draft = contactDrafts[c.id] ?? c.founder_contact ?? "";
            return (
              <tr key={c.id} className="hover:bg-[#D4A853]/[0.02] transition-colors align-top">
                <td className="px-4 py-3">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#F5F0EB] hover:text-[#D4A853] underline decoration-[#D4A853]/20">
                    {c.domain}
                  </a>
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
                  <div className="flex flex-col gap-1.5 min-w-[100px]">
                    {(c.status === "new" || c.status === "scan_failed" || c.status === "scanning") && (
                      <button
                        type="button"
                        onClick={() => scanOne(c.id)}
                        disabled={isScanning}
                        className="px-2.5 py-1 rounded bg-[#D4A853]/10 border border-[#D4A853]/25 text-[#D4A853] text-[10px] font-mono uppercase tracking-wide hover:bg-[#D4A853]/15 disabled:opacity-40 cursor-pointer"
                      >
                        {isScanning ? "Scanning…" : c.status === "new" ? "Scan" : "Retry Scan"}
                      </button>
                    )}
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
                    {c.status === "promoted" && (
                      <span className="text-[10px] text-[#7A6F65] font-mono">In client pipeline</span>
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
