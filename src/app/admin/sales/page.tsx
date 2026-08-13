"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/supabase";

type Prospect = { status: string };
type Project = { status: string; payment_status: string };

export default function SalesHub() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const headers = getAuthHeaders();
        const [prospectResponse, projectResponse] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/prospect_candidates?select=status`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/beta_projects?select=status,payment_status`, { headers }),
        ]);
        if (!prospectResponse.ok || !projectResponse.ok) throw new Error("Sales lifecycle state could not be loaded.");
        setProspects(await prospectResponse.json());
        setProjects(await projectResponse.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sales state failed.");
      }
    })();
  }, []);

  const activeProspects = prospects.filter((p) => !["promoted", "dismissed"].includes(p.status)).length;
  const promoted = prospects.filter((p) => p.status === "promoted").length;
  const activeOpportunities = projects.filter((p) => !["closed_completed", "closed_lost"].includes(p.status)).length;
  const paidWork = projects.filter((p) => p.payment_status === "paid").length;

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] p-6">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <header className="border-b border-[#D4A853]/15 pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#D4A853]/70">Sales · Lifecycle</span>
          <h1 className="font-serif text-3xl mt-1">Find → qualify → pursue → convert.</h1>
          <p className="text-xs text-[#7A6F65] mt-2 max-w-3xl">Prospecting owns companies before commercial commitment. Opportunities owns relationships we have deliberately chosen to pursue. Promotion is the boundary between them.</p>
        </header>

        {error && <div className="border border-[#C85C5C]/30 bg-[#C85C5C]/10 rounded p-3 text-xs text-[#C85C5C]">{error}</div>}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Prospects under review" value={activeProspects} />
          <Metric label="Promoted historically" value={promoted} />
          <Metric label="Active opportunities" value={activeOpportunities} />
          <Metric label="Paid work" value={paidWork} />
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <LifecycleCard
            step="01"
            title="Prospects"
            question="Is this company worth our commercial attention?"
            description="Discover, scan, research, preserve evidence and contact provenance, then qualify. Nothing becomes a real opportunity merely because a technical signal exists."
            href="/admin/prospecting"
            action="Open prospects"
          />
          <LifecycleCard
            step="02"
            title="Opportunities"
            question="What is the next commercial action for a relationship we chose to pursue?"
            description="Outreach, follow-up, diagnostic work, delivery and close state live here. Each state should derive its next action into Command/Priorities."
            href="/admin/dashboard"
            action="Open opportunities"
          />
        </section>

        <section className="border border-[#D4A853]/10 rounded-xl p-5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]">Boundary contract</span>
          <div className="mt-3 grid md:grid-cols-3 gap-3 text-xs">
            <Boundary title="Prospect" detail="Evidence gathering. No client commitment assumed." />
            <Boundary title="Human promotion" detail="Explicit decision that the company deserves pursuit." />
            <Boundary title="Opportunity" detail="Commercial lifecycle state now produces derived next actions." />
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-[#D4A853]/10 rounded-xl p-4"><span className="font-mono text-[10px] uppercase text-[#7A6F65]">{label}</span><span className="font-serif text-2xl block mt-1">{value}</span></div>;
}

function LifecycleCard({ step, title, question, description, href, action }: { step: string; title: string; question: string; description: string; href: string; action: string }) {
  return (
    <div className="border border-[#D4A853]/12 bg-[#110F0D]/30 rounded-xl p-5 flex flex-col">
      <span className="font-mono text-[10px] text-[#D4A853]">{step}</span>
      <h2 className="font-serif text-2xl mt-1">{title}</h2>
      <p className="text-sm text-[#B0A89E] mt-3">{question}</p>
      <p className="text-xs text-[#7A6F65] leading-relaxed mt-2 flex-1">{description}</p>
      <Link href={href} className="mt-5 border border-[#D4A853]/25 text-[#D4A853] rounded px-3 py-2 text-xs font-mono uppercase text-center">{action} →</Link>
    </div>
  );
}

function Boundary({ title, detail }: { title: string; detail: string }) {
  return <div className="border border-white/5 rounded p-3"><span className="text-[#F5F0EB] block">{title}</span><span className="text-[#7A6F65] block mt-1">{detail}</span></div>;
}
