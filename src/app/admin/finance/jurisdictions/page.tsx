"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/supabase";

type Profile = { id: string; name: string; scope: string; base_currency: string };
type Assignment = {
  id: string;
  profile_id: string;
  jurisdiction_code: string;
  role: string;
  status: "unknown" | "self_reported" | "authority_verified" | "professional_verified";
  effective_from: string;
  effective_to: string | null;
  requires_professional_review: boolean;
  notes: string | null;
};
type Pack = {
  jurisdiction_code: string;
  display_name: string;
  pack_version: number;
  coverage_status: "research" | "beta" | "active" | "retired";
  default_currency: string | null;
  default_locale: string | null;
  coverage_topics: string[];
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
};
type Coverage = { jurisdiction_code: string; recorded_sources: number; verified_sources: number; latest_verified_at: string | null };
type Payload = { profiles: Profile[]; profile: Profile | null; assignments: Assignment[]; packs: Pack[]; sourceCoverage: Coverage[] };

const ROLES = [
  ["business_registration", "Business registration"],
  ["tax_residency", "Tax-residency review"],
  ["vat_gst", "VAT / GST"],
  ["payroll_social", "Payroll / social system"],
  ["personal_residency", "Personal residence"],
  ["banking", "Banking"],
  ["work_authorization", "Work authorization"],
  ["permanent_establishment_review", "Permanent-establishment review"],
  ["other", "Other"],
] as const;

function roleLabel(role: string) { return ROLES.find(([key]) => key === role)?.[1] ?? role; }

export default function JurisdictionStackPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(wanted?: string) {
    setError(null);
    try {
      const id = wanted ?? profileId;
      const res = await fetch(`/api/finance/jurisdictions${id ? `?profileId=${encodeURIComponent(id)}` : ""}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load jurisdiction stack.");
      setData(json);
      if (json.profile?.id) setProfileId(json.profile.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load jurisdiction stack."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const coverageByCode = useMemo(() => new Map((data?.sourceCoverage ?? []).map((x) => [x.jurisdiction_code, x])), [data]);
  const packByCode = useMemo(() => new Map((data?.packs ?? []).map((x) => [x.jurisdiction_code, x])), [data]);

  async function saveAssignment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profileId) return;
    const form = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/finance/jurisdictions", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_assignment",
          profileId,
          jurisdictionCode: String(form.get("jurisdictionCode") ?? "").toUpperCase(),
          role: form.get("role"),
          status: form.get("status"),
          effectiveFrom: form.get("effectiveFrom"),
          effectiveTo: form.get("effectiveTo"),
          notes: form.get("notes"),
          requiresProfessionalReview: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save jurisdiction role.");
      setData(json);
      e.currentTarget.reset();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save jurisdiction role."); }
    finally { setBusy(false); }
  }

  async function removeAssignment(id: string) {
    if (!profileId || !confirm("Remove this jurisdiction assertion? This does not alter historical compliance records.")) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/finance/jurisdictions", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_assignment", profileId, id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove jurisdiction role.");
      setData(json);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to remove jurisdiction role."); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="min-h-screen bg-[#0A0908] text-[#7A6F65] p-8 font-mono text-xs">Loading jurisdiction stack…</main>;

  return <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] p-4 md:p-6">
    <div className="max-w-[1350px] mx-auto space-y-6">
      <header className="border-b border-[#D4A853]/15 pb-5 flex flex-wrap justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[.35em] text-[#D4A853]/70">Finance OS v2.1 · Jurisdiction Stack</span>
          <h1 className="font-serif text-3xl mt-1">Global finance without guessing residency.</h1>
          <p className="text-xs text-[#7A6F65] mt-2 max-w-3xl leading-relaxed">A profile can have several jurisdictional roles at once. Self-reported facts are not promoted to verified legal or tax status. Country packs are evidence packages, not legal conclusions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/finance" className="border border-[#D4A853]/20 px-3 py-2 rounded text-[10px] font-mono uppercase text-[#D4A853]">← Finance OS</Link>
          {data?.profiles.length ? <select value={profileId} onChange={(e) => { setProfileId(e.target.value); void load(e.target.value); }} className="bg-[#110F0D] border border-[#D4A853]/15 rounded px-3 py-2 text-xs font-mono">{data.profiles.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.scope}</option>)}</select> : null}
        </div>
      </header>

      {error && <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 rounded p-3 text-xs text-[#C85C5C] font-mono">{error}</div>}

      <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_.65fr] gap-5">
        <div className="border border-[#D4A853]/12 bg-[#110F0D]/40 rounded-xl p-5 space-y-4">
          <div className="flex justify-between gap-3"><div><span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]">Current jurisdiction roles</span><p className="text-xs text-[#7A6F65] mt-1">Time-bounded assertions for the selected finance profile.</p></div><span className="font-mono text-xs text-[#B0A89E]">{data?.assignments.length ?? 0} roles</span></div>
          {!data?.assignments.length ? <div className="border border-[#D4A853]/10 rounded p-5 text-xs text-[#7A6F65]">No jurisdiction has been asserted. This is safer than inferring one from location, nationality, company registration or bank account.</div> : <div className="space-y-2">{data.assignments.map((a) => {
            const c = coverageByCode.get(a.jurisdiction_code);
            const pack = packByCode.get(a.jurisdiction_code);
            return <div key={a.id} className="border border-[#D4A853]/10 rounded-lg p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <div>
                <div className="flex flex-wrap gap-2 items-center"><span className="font-serif text-lg">{a.jurisdiction_code}</span><span className="text-[10px] font-mono uppercase border border-[#D4A853]/15 px-2 py-0.5 rounded text-[#D4A853]">{roleLabel(a.role)}</span><span className={`text-[10px] font-mono uppercase ${a.status.includes("verified") ? "text-[#5C9A6B]" : "text-[#D4A853]"}`}>{a.status.replaceAll("_", " ")}</span></div>
                <div className="text-xs text-[#7A6F65] mt-1">Effective {a.effective_from}{a.effective_to ? ` → ${a.effective_to}` : " → open"} · {pack ? `pack ${pack.coverage_status} v${pack.pack_version}` : "no country pack yet"} · {c?.verified_sources ?? 0} verified sources</div>
                {a.notes && <p className="text-xs text-[#B0A89E] mt-2">{a.notes}</p>}
              </div>
              <button disabled={busy} onClick={() => void removeAssignment(a.id)} className="text-[10px] font-mono uppercase text-[#C85C5C] disabled:opacity-40">remove</button>
            </div>;
          })}</div>}
        </div>

        <form onSubmit={saveAssignment} className="border border-[#D4A853]/12 bg-[#110F0D]/40 rounded-xl p-5 space-y-3">
          <div><span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]">Add a role</span><p className="text-xs text-[#7A6F65] mt-1">This creates an assertion, not a legal conclusion.</p></div>
          <label className="block text-[10px] font-mono uppercase text-[#7A6F65]">Jurisdiction code<input name="jurisdictionCode" required maxLength={8} placeholder="US, CA, SG, JP, DE…" className="input mt-1 uppercase" /></label>
          <label className="block text-[10px] font-mono uppercase text-[#7A6F65]">Role<select name="role" className="input mt-1">{ROLES.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="block text-[10px] font-mono uppercase text-[#7A6F65]">Evidence status<select name="status" className="input mt-1"><option value="self_reported">Self reported</option><option value="unknown">Unknown / review</option></select></label>
          <div className="grid grid-cols-2 gap-2"><label className="block text-[10px] font-mono uppercase text-[#7A6F65]">From<input type="date" name="effectiveFrom" className="input mt-1" /></label><label className="block text-[10px] font-mono uppercase text-[#7A6F65]">To<input type="date" name="effectiveTo" className="input mt-1" /></label></div>
          <label className="block text-[10px] font-mono uppercase text-[#7A6F65]">Notes<textarea name="notes" rows={3} className="input mt-1" placeholder="What is known, what remains uncertain, what professional verification is needed?" /></label>
          <button disabled={busy} className="w-full bg-[#D4A853]/10 border border-[#D4A853]/25 text-[#D4A853] rounded px-3 py-2 text-xs font-mono uppercase disabled:opacity-40">{busy ? "Saving…" : "Record jurisdiction role"}</button>
        </form>
      </section>

      <section className="border border-[#D4A853]/12 bg-[#110F0D]/30 rounded-xl p-5 space-y-4">
        <div><span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]">Jurisdiction pack registry</span><p className="text-xs text-[#7A6F65] mt-1">Only packs researched against official sources belong here. Empty is an honest state.</p></div>
        {!data?.packs.length ? <div className="text-xs text-[#7A6F65] border border-[#D4A853]/10 rounded p-4">No country packs have been activated. Market research should choose the first countries before we spend time encoding regulation.</div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{data.packs.map((p) => <div key={p.jurisdiction_code} className="border border-[#D4A853]/10 rounded p-4"><div className="flex justify-between"><span className="font-serif text-lg">{p.display_name}</span><span className="text-[10px] font-mono uppercase text-[#D4A853]">{p.coverage_status} · v{p.pack_version}</span></div><p className="text-xs text-[#7A6F65] mt-2">{p.coverage_topics.length ? p.coverage_topics.join(" · ") : "No coverage topics frozen yet"}</p></div>)}</div>}
      </section>

      <div className="border border-[#5C9A6B]/15 bg-[#5C9A6B]/5 rounded p-4 text-xs text-[#B0A89E] leading-relaxed"><strong className="text-[#5C9A6B]">Operating boundary.</strong> Finance OS may track obligations, evidence, deadlines, ledger state, policies and educational scenarios. A residency determination, tax calculation or personalized securities recommendation remains outside autonomous model authority.</div>
    </div>
  </main>;
}
