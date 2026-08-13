"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import { AdminStatus } from "@/components/admin/AdminPagePrimitives";

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";

const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  ok: "searched",
  unavailable: "no result",
  provider_error: "provider error",
  configuration_missing: "not configured",
  rate_limited: "rate limited",
};

function statusTone(status: RunStatus): "green" | "neutral" | "red" | "amber" {
  if (status === "ok") return "green";
  if (status === "unavailable") return "neutral";
  if (status === "rate_limited") return "amber";
  return "red";
}

function verificationTone(status: ContactVerificationStatus): "green" | "gold" | "amber" | "neutral" | "red" {
  if (status === "verified") return "green";
  if (status === "candidate") return "gold";
  if (status === "inferred") return "amber";
  if (status === "provider_error" || status === "configuration_missing") return "red";
  return "neutral";
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

export default function ContactDiscoveryCell({ candidateId, domain, companyName, contactDiscovery, onUpdated }: ContactDiscoveryCellProps) {
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
    <div className="w-full min-w-0 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={discover}
          disabled={loading}
          className="min-h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-[#B0A89E] text-xs font-mono uppercase tracking-[0.08em] hover:bg-white/10 disabled:opacity-40 cursor-pointer"
        >
          {loading ? "Discovering…" : contactDiscovery ? "Refresh discovery" : "Run discovery"}
        </button>
        {contactDiscovery && <span className="text-xs text-[#7A6F65]">Last run {timeAgo(contactDiscovery.runAt)}</span>}
      </div>

      {error && <p className="text-xs text-[#C85C5C] leading-relaxed">{error}</p>}

      {!contactDiscovery && !error && (
        <p className="text-xs text-[#7A6F65] leading-relaxed">
          No discovery run yet. This is evidence gathering only; it never fills founder contact or contacts anyone automatically.
        </p>
      )}

      {contactDiscovery && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SummaryChip label="People" result={contactDiscovery.people} />
            <SummaryChip label="LinkedIn" result={contactDiscovery.linkedin} />
            <SummaryChip label="Email" result={contactDiscovery.email} />
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="min-h-8 px-2.5 rounded-lg text-xs font-mono text-[#D4A853] hover:bg-[#D4A853]/8"
              aria-expanded={open}
            >
              {open ? "Hide evidence ↑" : "View evidence ↓"}
            </button>
          </div>

          {open && (
            <div className="w-full border border-white/10 rounded-xl p-4 space-y-4 bg-black/20">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div>
                  <span className="block text-sm text-[#F5F0EB] font-medium">Discovery evidence</span>
                  <span className="block text-xs text-[#7A6F65] mt-1">Candidates remain untrusted until manually verified.</span>
                </div>
                <span className="text-xs text-[#7A6F65]">{contactDiscovery.meta.tavilyResultsFound} source result{contactDiscovery.meta.tavilyResultsFound === 1 ? "" : "s"}</span>
              </div>

              <CategoryDetail title="People" result={contactDiscovery.people}>
                {(person: PersonCandidate, i) => (
                  <CandidateRow key={i} verificationStatus={person.verificationStatus} rationale={person.rationale} sourceUrl={person.sourceUrl}>
                    <span className="text-[#F5F0EB] font-medium">{person.name}</span>
                    <span className="text-[#8D837A]"> · {person.roleClaim}</span>
                  </CandidateRow>
                )}
              </CategoryDetail>

              <CategoryDetail title="LinkedIn" result={contactDiscovery.linkedin}>
                {(linkedin: LinkedInCandidate, i) => (
                  <CandidateRow key={i} verificationStatus={linkedin.verificationStatus} rationale={linkedin.rationale} sourceUrl={linkedin.sourceUrl}>
                    <a href={linkedin.url} target="_blank" rel="noopener noreferrer" className="text-[#D4A853] underline break-all">{linkedin.personNameClaim || "LinkedIn candidate"}</a>
                    {linkedin.corroboratingSignals.length === 0 && <span className="block text-xs text-amber-400 mt-1">No corroborating signal — verify manually.</span>}
                  </CandidateRow>
                )}
              </CategoryDetail>

              <CategoryDetail title="Email" result={contactDiscovery.email}>
                {(email: EmailCandidate, i) => (
                  <CandidateRow key={i} verificationStatus={email.verificationStatus} rationale={email.rationale} sourceUrl={email.sourceUrl}>
                    <span className="text-[#F5F0EB] break-all">{email.email}</span>
                    <span className="text-[#8D837A]"> · {email.method === "site_mailto_link" ? "found on site" : "pattern inference"}</span>
                  </CandidateRow>
                )}
              </CategoryDetail>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryChip<T>({ label, result }: { label: string; result: CategoryResult<T> }) {
  const value = result.status === "ok" ? `${result.candidates.length}` : RUN_STATUS_LABEL[result.status];
  return <AdminStatus tone={statusTone(result.status)}>{label} · {value}</AdminStatus>;
}

function CategoryDetail<T>({ title, result, children }: { title: string; result: CategoryResult<T>; children: (item: T, i: number) => React.ReactNode }) {
  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="!text-[16px]">{title}</h3>
        <AdminStatus tone={statusTone(result.status)}>{RUN_STATUS_LABEL[result.status]}</AdminStatus>
      </div>
      {result.error && <p className="text-xs text-[#C85C5C] mb-2">{result.error}</p>}
      {result.status === "ok" && result.candidates.length === 0 && <p className="text-xs text-[#7A6F65]">Search ran successfully and found no grounded candidate.</p>}
      {result.candidates.length > 1 && <p className="text-xs text-[#D4A853]/80 mb-2">{result.candidates.length} competing candidates — no automatic winner selected.</p>}
      <div className="grid gap-2">{result.candidates.map((candidate, i) => children(candidate, i))}</div>
    </section>
  );
}

function CandidateRow({ verificationStatus, rationale, sourceUrl, children }: { verificationStatus: ContactVerificationStatus; rationale: string; sourceUrl: string | null; children: React.ReactNode }) {
  return (
    <div className="border border-white/5 rounded-lg p-3 text-sm leading-relaxed">
      <div className="flex flex-wrap items-center gap-2">
        <AdminStatus tone={verificationTone(verificationStatus)}>{verificationStatus}</AdminStatus>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <p className="text-xs text-[#7A6F65] mt-2">{rationale}</p>
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-[#D4A853] underline mt-1">Open source</a>}
    </div>
  );
}
