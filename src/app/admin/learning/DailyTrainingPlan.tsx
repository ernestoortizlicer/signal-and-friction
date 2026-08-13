"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";

type SessionType = "course_study" | "diagnostic_case" | "active_recall" | "build_application" | "review";

type Settings = {
  course_study_target_min: number;
  diagnostic_practice_target_min: number;
  active_recall_target_min: number;
  build_application_target_min: number;
  timezone: string;
};

type Resource = {
  id: string;
  provider: string;
  title: string;
  source_url: string | null;
  status: "planned" | "active" | "paused" | "completed" | "archived";
  priority: number;
  estimated_total_minutes: number | null;
  completed_minutes: number;
  completed_sessions: number;
};

type Session = {
  id: string;
  session_date: string;
  session_type: SessionType;
  plan_key: string | null;
  resource_id: string | null;
  planned_minutes: number;
  actual_minutes: number | null;
  status: "planned" | "in_progress" | "completed" | "skipped";
  outcome: string | null;
  evidence_ref: string | null;
  retrieval_score: number | null;
};

type Payload = {
  date: string;
  settings: Settings | null;
  resources: Resource[];
  sessions: Session[];
  today: Session[];
  adherence: { activeDaysLast14: number; actualMinutesLast14: number; completedBlocksLast14: number };
  calibrationFocus: string | null;
};

const BLOCK_LABEL: Record<SessionType, string> = {
  course_study: "Course Study",
  diagnostic_case: "Diagnostic Calibration",
  active_recall: "Active Recall",
  build_application: "Build / Apply",
  review: "Review",
};

function localDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DailyTrainingPlan({ onOpenCalibration, onOpenReasoning }: { onOpenCalibration: () => void; onOpenReasoning: () => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({ course: 45, diagnostic: 30, recall: 15, build: 30, timezone: "Europe/Madrid" });
  const [newResource, setNewResource] = useState({ provider: "Udemy", title: "", sourceUrl: "", estimatedTotalMinutes: "", priority: 3 });
  const [completion, setCompletion] = useState<Record<string, { minutes: string; outcome: string; evidence: string; retrieval: string }>>({});
  const date = useMemo(localDate, []);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/learning/daily?date=${encodeURIComponent(date)}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load Daily Learning OS.");
      setData(json);
      if (json.settings) {
        setSettingsDraft({
          course: json.settings.course_study_target_min,
          diagnostic: json.settings.diagnostic_practice_target_min,
          recall: json.settings.active_recall_target_min,
          build: json.settings.build_application_target_min,
          timezone: json.settings.timezone,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Daily Learning OS.");
    } finally {
      setLoading(false);
    }
  }

  async function act(action: string, body: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/learning/daily", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, date, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `${action} failed.`);
      setData(json);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed.`);
      return false;
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (data && data.today.length === 0 && data.settings) void act("ensure_plan");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.date, data?.today.length]);

  const activeResource = data?.resources.find((r) => r.status === "active") ?? null;
  const completedToday = data?.today.filter((s) => s.status === "completed") ?? [];
  const plannedToday = data?.today ?? [];
  const plannedMinutes = plannedToday.reduce((sum, s) => sum + s.planned_minutes, 0);
  const actualMinutes = completedToday.reduce((sum, s) => sum + Number(s.actual_minutes || 0), 0);
  const progress = plannedToday.length > 0 ? Math.round((completedToday.length / plannedToday.length) * 100) : 0;

  async function completeSession(session: Session) {
    const draft = completion[session.id] ?? { minutes: String(session.planned_minutes), outcome: "", evidence: "", retrieval: "" };
    const minutes = Number(draft.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError("Actual minutes must be greater than zero.");
      return;
    }
    const ok = await act("complete_session", {
      id: session.id,
      actualMinutes: minutes,
      outcome: draft.outcome,
      evidenceRef: draft.evidence,
      retrievalScore: draft.retrieval ? Number(draft.retrieval) : null,
    });
    if (ok) setCompletion((prev) => { const next = { ...prev }; delete next[session.id]; return next; });
  }

  if (loading) return <div className="border border-[#D4A853]/12 bg-[#110F0D]/30 rounded-xl p-8 text-xs font-mono text-[#7A6F65] animate-pulse">Loading deliberate-practice plan…</div>;

  return (
    <div className="space-y-6">
      {error && <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 rounded p-3 text-xs font-mono text-[#C85C5C] flex gap-3 justify-between"><span>{error}</span><button onClick={() => setError(null)}>dismiss</button></div>}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Today" value={`${progress}%`} detail={`${actualMinutes} / ${plannedMinutes} min`} />
        <Metric label="14-Day Active Days" value={`${data?.adherence.activeDaysLast14 ?? 0}`} detail="completed evidence-bearing blocks" />
        <Metric label="14-Day Practice" value={`${data?.adherence.actualMinutesLast14 ?? 0} min`} detail={`${data?.adherence.completedBlocksLast14 ?? 0} completed blocks`} />
        <Metric label="Calibration Focus" value={data?.calibrationFocus ? data.calibrationFocus.replace(/^disposition:/, "") : "No signal yet"} detail="derived from recent revealed errors" />
      </section>

      <section className="border border-[#D4A853]/15 bg-[#110F0D]/35 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#D4A853]/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#D4A853] block">Daily Deliberate Practice</span>
            <h2 className="font-serif text-xl text-[#F5F0EB] mt-1">Study → Retrieve → Diagnose → Apply</h2>
            <p className="text-xs text-[#7A6F65] mt-1 max-w-2xl">Course completion is input. Skill evidence comes from retrieval, application, and the separate Diagnostic Calibration gate.</p>
          </div>
          <button onClick={() => setEditingSettings((v) => !v)} className="font-mono text-xs uppercase tracking-wider border border-[#D4A853]/25 text-[#D4A853] px-3 py-1.5 rounded">Targets</button>
        </div>

        {editingSettings && (
          <div className="p-5 border-b border-[#D4A853]/10 grid grid-cols-2 md:grid-cols-5 gap-3">
            <NumberField label="Course" value={settingsDraft.course} onChange={(v) => setSettingsDraft((p) => ({ ...p, course: v }))} />
            <NumberField label="Diagnostic" value={settingsDraft.diagnostic} onChange={(v) => setSettingsDraft((p) => ({ ...p, diagnostic: v }))} />
            <NumberField label="Recall" value={settingsDraft.recall} onChange={(v) => setSettingsDraft((p) => ({ ...p, recall: v }))} />
            <NumberField label="Build" value={settingsDraft.build} onChange={(v) => setSettingsDraft((p) => ({ ...p, build: v }))} />
            <div className="flex items-end">
              <button disabled={busy === "save_settings"} onClick={async () => {
                const ok = await act("save_settings", { courseStudyTargetMin: settingsDraft.course, diagnosticPracticeTargetMin: settingsDraft.diagnostic, activeRecallTargetMin: settingsDraft.recall, buildApplicationTargetMin: settingsDraft.build, timezone: settingsDraft.timezone });
                if (ok) { setEditingSettings(false); await act("ensure_plan"); }
              }} className="w-full h-9 border border-[#5C9A6B]/35 text-[#5C9A6B] rounded font-mono text-xs uppercase disabled:opacity-40">Save</button>
            </div>
          </div>
        )}

        <div className="divide-y divide-[#D4A853]/8">
          {plannedToday.map((session) => {
            const resource = data?.resources.find((r) => r.id === session.resource_id);
            const draft = completion[session.id] ?? { minutes: String(session.planned_minutes), outcome: "", evidence: "", retrieval: "" };
            const done = session.status === "completed";
            return (
              <div key={session.id} className="p-5 grid grid-cols-1 lg:grid-cols-[180px_1fr_310px] gap-4 items-start">
                <div>
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${done ? "text-[#5C9A6B]" : "text-[#D4A853]"}`}>{done ? "✓ Completed" : "○ Planned"}</span>
                  <h3 className="font-serif text-base text-[#F5F0EB] mt-1">{BLOCK_LABEL[session.session_type]}</h3>
                  <span className="font-mono text-[10px] text-[#7A6F65]">{session.planned_minutes} min target</span>
                </div>
                <div className="text-sm text-[#B0A89E] leading-relaxed">
                  {session.session_type === "course_study" && <><p>{resource ? `${resource.provider} — ${resource.title}` : "Add an active course/resource below."}</p><p className="text-xs text-[#7A6F65] mt-1">Finish by writing the one concept you can now explain or apply without the instructor.</p></>}
                  {session.session_type === "diagnostic_case" && <><p>Run one staged case without seeing the reference verdict until your judgment is locked.</p><button onClick={onOpenCalibration} className="mt-2 text-xs font-mono text-[#D4A853] underline underline-offset-4">Open Diagnostic Calibration →</button></>}
                  {session.session_type === "active_recall" && <><p>Retrieve from memory before rereading. Explain a concept, contrast two mechanisms, or reconstruct a tool contract.</p><button onClick={onOpenReasoning} className="mt-2 text-xs font-mono text-[#D4A853] underline underline-offset-4">Open Reasoning Lab →</button></>}
                  {session.session_type === "build_application" && <p>Apply today’s concept in real code, an eval, a tool schema, or a workflow decision. Evidence should point to the artifact.</p>}
                  {done && session.outcome && <p className="mt-2 text-xs text-[#5C9A6B]">Outcome: {session.outcome}</p>}
                </div>
                {!done ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[90px_1fr] gap-2">
                      <input type="number" min={1} value={draft.minutes} onChange={(e) => setCompletion((p) => ({ ...p, [session.id]: { ...draft, minutes: e.target.value } }))} className="bg-[#0A0908] border border-[#D4A853]/15 rounded px-2 py-1.5 text-xs text-[#F5F0EB]" placeholder="min" />
                      <input value={draft.outcome} onChange={(e) => setCompletion((p) => ({ ...p, [session.id]: { ...draft, outcome: e.target.value } }))} className="bg-[#0A0908] border border-[#D4A853]/15 rounded px-2 py-1.5 text-xs text-[#F5F0EB]" placeholder="What changed / what can you now do?" />
                    </div>
                    <div className="grid grid-cols-[1fr_90px] gap-2">
                      <input value={draft.evidence} onChange={(e) => setCompletion((p) => ({ ...p, [session.id]: { ...draft, evidence: e.target.value } }))} className="bg-[#0A0908] border border-[#D4A853]/15 rounded px-2 py-1.5 text-xs text-[#F5F0EB]" placeholder="Evidence ref: commit, note, case…" />
                      <input type="number" min={0} max={100} value={draft.retrieval} onChange={(e) => setCompletion((p) => ({ ...p, [session.id]: { ...draft, retrieval: e.target.value } }))} className="bg-[#0A0908] border border-[#D4A853]/15 rounded px-2 py-1.5 text-xs text-[#F5F0EB]" placeholder="Recall %" />
                    </div>
                    <div className="flex gap-2">
                      <button disabled={busy === "complete_session"} onClick={() => void completeSession(session)} className="flex-1 border border-[#5C9A6B]/35 text-[#5C9A6B] rounded py-1.5 font-mono text-[10px] uppercase disabled:opacity-40">Complete with evidence</button>
                      <button disabled={busy === "skip_session"} onClick={() => void act("skip_session", { id: session.id, reason: "Skipped intentionally" })} className="border border-[#7A6F65]/25 text-[#7A6F65] rounded px-3 py-1.5 font-mono text-[10px] uppercase disabled:opacity-40">Skip</button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-[#5C9A6B]/20 bg-[#5C9A6B]/5 rounded p-3 text-xs font-mono text-[#5C9A6B]">{session.actual_minutes} actual min{session.retrieval_score != null ? ` · recall ${session.retrieval_score}%` : ""}{session.evidence_ref ? <><br/><span className="text-[#7A6F65]">{session.evidence_ref}</span></> : null}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div className="border border-[#D4A853]/12 bg-[#110F0D]/25 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4"><div><span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]">Resource Queue</span><h3 className="font-serif text-lg text-[#F5F0EB]">Courses & primary references</h3></div><span className="font-mono text-[10px] text-[#7A6F65]">{activeResource ? "active resource selected by priority" : "no active resource"}</span></div>
          {data?.resources.length ? <div className="space-y-2">{data.resources.map((r) => {
            const pct = r.estimated_total_minutes ? Math.min(100, Math.round((Number(r.completed_minutes) / r.estimated_total_minutes) * 100)) : null;
            return <div key={r.id} className="border border-[#D4A853]/10 rounded p-3 flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm text-[#F5F0EB]">{r.provider} — {r.title}</div><div className="text-[10px] font-mono text-[#7A6F65]">P{r.priority} · {r.status} · {r.completed_minutes} min logged{pct != null ? ` · ${pct}% of estimate` : ""}</div></div><div className="flex gap-2">{r.source_url && <a href={r.source_url} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-[#D4A853] underline">open</a>}{r.status !== "completed" && <button onClick={() => void act("update_resource", { id: r.id, status: "completed" })} className="text-[10px] font-mono text-[#5C9A6B]">complete</button>}</div></div>;
          })}</div> : <p className="text-xs text-[#7A6F65]">No learning resources yet. Add the Udemy course you are actually taking; the system will place the highest-priority active resource into today’s study block.</p>}
        </div>

        <form onSubmit={async (e) => { e.preventDefault(); const ok = await act("add_resource", { ...newResource, estimatedTotalMinutes: newResource.estimatedTotalMinutes ? Number(newResource.estimatedTotalMinutes) : null }); if (ok) { setNewResource({ provider: "Udemy", title: "", sourceUrl: "", estimatedTotalMinutes: "", priority: 3 }); await act("ensure_plan"); } }} className="border border-[#D4A853]/12 bg-[#110F0D]/25 rounded-xl p-5 space-y-3">
          <div><span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]">Add Resource</span><h3 className="font-serif text-lg text-[#F5F0EB]">External course or reference</h3></div>
          <input required value={newResource.provider} onChange={(e) => setNewResource((p) => ({ ...p, provider: e.target.value }))} className="w-full bg-[#0A0908] border border-[#D4A853]/15 rounded px-3 py-2 text-xs" placeholder="Provider" />
          <input required value={newResource.title} onChange={(e) => setNewResource((p) => ({ ...p, title: e.target.value }))} className="w-full bg-[#0A0908] border border-[#D4A853]/15 rounded px-3 py-2 text-xs" placeholder="Course / reference title" />
          <input value={newResource.sourceUrl} onChange={(e) => setNewResource((p) => ({ ...p, sourceUrl: e.target.value }))} className="w-full bg-[#0A0908] border border-[#D4A853]/15 rounded px-3 py-2 text-xs" placeholder="URL (optional)" />
          <div className="grid grid-cols-2 gap-2"><input type="number" min={1} value={newResource.estimatedTotalMinutes} onChange={(e) => setNewResource((p) => ({ ...p, estimatedTotalMinutes: e.target.value }))} className="bg-[#0A0908] border border-[#D4A853]/15 rounded px-3 py-2 text-xs" placeholder="Estimated min" /><select value={newResource.priority} onChange={(e) => setNewResource((p) => ({ ...p, priority: Number(e.target.value) }))} className="bg-[#0A0908] border border-[#D4A853]/15 rounded px-3 py-2 text-xs"><option value={5}>P5 — now</option><option value={4}>P4</option><option value={3}>P3</option><option value={2}>P2</option><option value={1}>P1</option></select></div>
          <button disabled={busy === "add_resource"} className="w-full border border-[#D4A853]/30 text-[#D4A853] rounded py-2 font-mono text-xs uppercase disabled:opacity-40">Add to queue</button>
        </form>
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border border-[#D4A853]/10 bg-[#110F0D]/30 rounded-xl p-4"><span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block">{label}</span><span className="font-serif text-2xl text-[#F5F0EB] block mt-1">{value}</span><span className="text-[10px] text-[#7A6F65]">{detail}</span></div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <label className="text-[10px] font-mono uppercase tracking-wider text-[#7A6F65]">{label} min<input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 block w-full h-9 bg-[#0A0908] border border-[#D4A853]/15 rounded px-2 text-xs text-[#F5F0EB]" /></label>;
}
