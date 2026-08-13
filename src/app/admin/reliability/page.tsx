"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";

type Incident = {
  id: string;
  severity: string;
  phase: string;
  description: string;
  root_cause: string | null;
  resolution: string | null;
  resolved_at: string | null;
};

export default function ReliabilityPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadIncidents();
  }, []);

  async function loadIncidents() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const response = await fetch(
        `${supabaseUrl}/rest/v1/ai_incidents?select=id,severity,phase,description,root_cause,resolution,resolved_at&order=created_at.desc&limit=100`,
        { headers: getAuthHeaders() },
      );
      if (!response.ok) throw new Error(`Reliability state failed (${response.status}).`);
      setIncidents(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Reliability state.");
    }
  }

  const open = incidents.filter((incident) => !incident.resolved_at);
  const severe = open.filter((incident) => incident.severity === "high" || incident.severity === "critical");

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] p-6">
      <div className="max-w-[1300px] mx-auto space-y-6">
        <header className="border-b border-[#D4A853]/15 pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#D4A853]/70">System · Reliability</span>
          <h1 className="font-serif text-3xl mt-1">Incident → root cause → correction → regression guard.</h1>
          <p className="text-xs text-[#7A6F65] mt-2 max-w-3xl">System learning belongs here. Human skill development belongs in Training. The two feedback loops remain connected but never conflated.</p>
        </header>

        {error && <div className="border border-[#C85C5C]/30 bg-[#C85C5C]/10 rounded p-3 text-xs text-[#C85C5C]">{error}</div>}

        <section className="grid grid-cols-3 gap-3">
          <Metric label="Open" value={open.length} />
          <Metric label="High / critical" value={severe.length} />
          <Metric label="Resolved" value={incidents.length - open.length} />
        </section>

        <section className="border border-[#D4A853]/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#D4A853]/10 font-mono text-xs uppercase text-[#D4A853]">Incident ledger</div>
          <div className="divide-y divide-[#D4A853]/8">
            {incidents.map((incident) => (
              <div key={incident.id} className="p-4 grid md:grid-cols-[140px_1fr_120px] gap-3">
                <div>
                  <span className="font-mono text-[10px] uppercase text-[#D4A853]">{incident.severity}</span>
                  <span className="block text-[10px] text-[#7A6F65]">{incident.phase}</span>
                </div>
                <div>
                  <div className="text-sm">{incident.description}</div>
                  {incident.root_cause && <div className="text-xs text-[#7A6F65] mt-1">Root cause: {incident.root_cause}</div>}
                  {incident.resolution && <div className="text-xs text-[#5C9A6B] mt-1">Resolution: {incident.resolution}</div>}
                </div>
                <span className={`font-mono text-[10px] uppercase ${incident.resolved_at ? "text-[#5C9A6B]" : "text-amber-400"}`}>
                  {incident.resolved_at ? "resolved" : "open"}
                </span>
              </div>
            ))}
            {incidents.length === 0 && <div className="p-8 text-xs text-[#7A6F65]">No incidents recorded.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[#D4A853]/10 rounded-xl p-4">
      <span className="font-mono text-[10px] uppercase text-[#7A6F65]">{label}</span>
      <span className="font-serif text-2xl block mt-1">{value}</span>
    </div>
  );
}
