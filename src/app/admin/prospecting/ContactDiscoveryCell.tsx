"use client";

// Contact-enrichment audit fix (2026-08-03) — before this, founder_contact
// was the only contact mechanism in the whole app: a single free-text
// field a human typed by hand, with no automated discovery at all. This
// calls the new prospecting-discover-contact edge function (Tavily search
// + DeepSeek extraction-only synthesis, same grounding pattern as
// prospecting-suggest-leads) and renders its result with explicit
// provenance — never a bare name/email/URL with no way to tell where it
// came from or how sure the system is.
//
// Deliberately does NOT write to founder_contact or auto-fill anything —
// this is informational only. The analyst decides what, if anything, to
// copy into founder_contact / the promotion email prompt themselves,
// exactly as they do today. Nothing here sends anything or performs any
// write beyond persisting the discovery result itself for later review.

import { useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import { AdminBadge } from "@/components/admin/AdminComponents";

type ContactVerificationStatus =
  | "verified"
  | "candidate"
  | "inferred"
  | "unavailable"
  | "provider_error"
  | "configuration_missing"
  | "rate_limited";

type RunStatus = "ok" | "unavailable" | "provider_error" | "configuration_missing" | "rate_limited";

interface PersonCandidate {
  name: string;
  roleClaim: string;
  verificationStatus: ContactVerificationStatus;
  sourceUrl: string;
  sourceSnippet: string;
  rationale: string;
  discoveredAt: string;
}

interface LinkedInCandidate {
  url: string;
  personNameClaim: string | null;
  verificationStatus: ContactVerificationStatus;
  corroboratingSignals: string[];
  sourceUrl: string;
  rationale: string;
  discoveredAt: string;
}

interface EmailCandidate {
  email: string;
  verificationStatus: ContactVerificationStatus;
  method: "site_mailto_link" | "pattern_inferred";
  sourceUrl: string | null;
  rationale: string;
  discoveredAt: string;
}

interface CategoryResult<T> {
  status: RunStatus;
  candidates: T[];
  error?: string;
}

export interface ContactDiscoveryResult {
  runAt: string;
  people: CategoryResult<PersonCandidate>;
  linkedin: CategoryResult<LinkedInCandidate>;
  email: CategoryResult<EmailCandidate>;
  meta: { tavilyQueriesRun: number; tavilyResultsFound: number; model: string | null; estimatedCostUSD: number | null };
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";

const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  ok: "ok",
  unavailable: "no result",
  provider_error: "provider error",
  configuration_missing: "not configured",
  rate_limited: "rate limited",
};

function runStatusVariant(status: RunStatus): "green" | "gold" | "red" | "amber" | "muted" {
  if (status === "ok") return "green";
  if (status === "unavailable") return "muted";
  if (status === "rate_limited") return "amber";
  return "red"; // provider_error, configuration_missing — both real failures worth flagging, distinct text either way
}

function verificationVariant(status: ContactVerificationStatus): "green" | "gold" | "amber" | "muted" {
  if (status === "verified") return "green";
  if (status === "candidate") return "gold";
  if (status === "inferred") return "amber";
  return "muted";
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

interface ContactDiscoveryCellProps {
  candidateId: string;
  domain: string;
  companyName: string | null;
  contactDiscovery: ContactDiscoveryResult | null;
  onUpdated: (contactDiscovery: ContactDiscoveryResult) => void;
}

export default function ContactDiscoveryCell({
  candidateId,
  domain,
  companyName,
  contactDiscovery,
  onUpdated,
}: ContactDiscoveryCellProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function discover() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/prospecting-discover-contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
        },
        body: JSON.stringify({ domain, companyName }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || body.error) {
        setError(body?.error || `Discovery request failed (HTTP ${res.status}).`);
        return;
      }
      const result = body as ContactDiscoveryResult;

      // Persist directly, same pattern saveFounderContact already uses —
      // this cell owns its own column, no coupling to the rest of the row.
      const patchHeaders = { ...getAuthHeaders(), "Content-Type": "application/json", Prefer: "return=representation" };
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/prospect_candidates?id=eq.${candidateId}`, {
        method: "PATCH",
        headers: patchHeaders,
        body: JSON.stringify({ contact_discovery: result }),
      });
      if (!patchRes.ok) {
        setError("Discovery ran, but saving the result failed — try again.");
        return;
      }
      onUpdated(result);
      setOpen(true);
    } catch (err) {
      setError(`Discovery request failed: ${err instanceof Error ? err.message : "network error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-[200px] space-y-1.5">
      <button
        type="button"
        onClick={discover}
        disabled={loading}
        className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#B0A89E] text-[10px] font-mono uppercase tracking-wide hover:bg-white/10 disabled:opacity-40 cursor-pointer"
      >
        {loading ? "Discovering…" : contactDiscovery ? "Refresh" : "Discover Contact"}
      </button>
      {error && <p className="text-[10px] text-[#C85C5C] font-mono">{error}</p>}

      {contactDiscovery && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex flex-wrap items-center gap-1 cursor-pointer text-left"
          >
            <span className="text-[9px] font-mono text-[#7A6F65]">{timeAgo(contactDiscovery.runAt)}</span>
            <CategoryChip label="People" result={contactDiscovery.people} />
            <CategoryChip label="LinkedIn" result={contactDiscovery.linkedin} />
            <CategoryChip label="Email" result={contactDiscovery.email} />
            <span className="text-[9px] font-mono text-[#7A6F65]">{open ? "▲" : "▼"}</span>
          </button>

          {open && (
            <div className="border border-white/10 rounded p-2 space-y-2 bg-black/20 max-w-[320px]">
              <CategoryDetail title="People" result={contactDiscovery.people}>
                {(p: PersonCandidate, i) => (
                  <CandidateRow key={i} verificationStatus={p.verificationStatus} rationale={p.rationale} sourceUrl={p.sourceUrl}>
                    <span className="text-[#F5F0EB]">{p.name}</span>
                    <span className="text-[#7A6F65]"> — {p.roleClaim}</span>
                  </CandidateRow>
                )}
              </CategoryDetail>
              <CategoryDetail title="LinkedIn" result={contactDiscovery.linkedin}>
                {(l: LinkedInCandidate, i) => (
                  <CandidateRow key={i} verificationStatus={l.verificationStatus} rationale={l.rationale} sourceUrl={l.sourceUrl}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[#D4A853] underline break-all">
                      {l.url}
                    </a>
                    {l.personNameClaim && <span className="text-[#7A6F65]"> — {l.personNameClaim}</span>}
                    {l.corroboratingSignals.length === 0 && (
                      <span className="block text-[9px] text-[#C85C5C]/80 mt-0.5">No corroborating signal — weak match, verify manually.</span>
                    )}
                  </CandidateRow>
                )}
              </CategoryDetail>
              <CategoryDetail title="Email" result={contactDiscovery.email}>
                {(e: EmailCandidate, i) => (
                  <CandidateRow key={i} verificationStatus={e.verificationStatus} rationale={e.rationale} sourceUrl={e.sourceUrl}>
                    <span className="text-[#F5F0EB] break-all">{e.email}</span>
                    <span className="text-[#7A6F65]"> — {e.method === "site_mailto_link" ? "found on site" : "pattern guess"}</span>
                  </CandidateRow>
                )}
              </CategoryDetail>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryChip<T>({ label, result }: { label: string; result: CategoryResult<T> }) {
  if (result.status === "ok") {
    return (
      <AdminBadge variant="green">
        {label} {result.candidates.length}
      </AdminBadge>
    );
  }
  return <AdminBadge variant={runStatusVariant(result.status)}>{label}: {RUN_STATUS_LABEL[result.status]}</AdminBadge>;
}

function CategoryDetail<T>({
  title,
  result,
  children,
}: {
  title: string;
  result: CategoryResult<T>;
  children: (item: T, i: number) => React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-mono text-[9px] text-[#7A6F65] uppercase tracking-widest">{title}</span>
        <AdminBadge variant={runStatusVariant(result.status)}>{RUN_STATUS_LABEL[result.status]}</AdminBadge>
      </div>
      {result.error && <p className="text-[9px] text-[#C85C5C]/80 font-mono mb-1">{result.error}</p>}
      {result.status === "ok" && result.candidates.length === 0 && (
        <p className="text-[9px] text-[#7A6F65] font-mono italic">Ran successfully, found nothing.</p>
      )}
      {result.candidates.length > 1 && (
        <p className="text-[9px] text-[#D4A853]/70 font-mono mb-1">{result.candidates.length} competing candidates — no single one was picked for you.</p>
      )}
      <div className="space-y-1.5">{result.candidates.map((c, i) => children(c, i))}</div>
    </div>
  );
}

function CandidateRow({
  verificationStatus,
  rationale,
  sourceUrl,
  children,
}: {
  verificationStatus: ContactVerificationStatus;
  rationale: string;
  sourceUrl: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="text-[10px] font-mono leading-relaxed border-l-2 border-white/10 pl-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <AdminBadge variant={verificationVariant(verificationStatus)}>{verificationStatus}</AdminBadge>
        {children}
      </div>
      <p className="text-[#7A6F65] mt-0.5">{rationale}</p>
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#7A6F65] underline break-all">
          source
        </a>
      )}
    </div>
  );
}
