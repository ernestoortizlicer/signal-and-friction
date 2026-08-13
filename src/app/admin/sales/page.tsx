"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import { AdminActionLink, AdminMetric, AdminPageHeader, AdminPanel } from "@/components/admin/AdminPagePrimitives";

type Prospect = { status: string };
type Project = { status: string; payment_status: string };
type Client = { id: string };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export default function SalesHub() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const headers = getAuthHeaders();
        const [prospectResponse, projectResponse, clientResponse] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/prospect_candidates?select=status`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/beta_projects?select=status,payment_status`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/clients?select=id`, { headers }),
        ]);
        if (!prospectResponse.ok || !projectResponse.ok || !clientResponse.ok) throw new Error("Sales lifecycle state could not be loaded.");
        setProspects(await prospectResponse.json());
        setProjects(await projectResponse.json());
        setClients(await clientResponse.json());
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
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Sales · Lifecycle"
        title="Prospects → Opportunities → Clients"
        description="Sales owns commercial state, not priorities and not accounting. Prospecting decides what deserves pursuit; Opportunities tracks chosen relationships; Clients preserves the relationship once it exists. Command decides what to do first."
        actions={<AdminActionLink href="/admin/priorities" tone="neutral">Open Command</AdminActionLink>}
      />

      {error && <div className="border border-[#C85C5C]/30 bg-[#C85C5C]/10 rounded-xl p-4 text-sm text-[#C85C5C]">{error}</div>}

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <AdminMetric label="Prospects under review" value={activeProspects} detail="Not promoted or dismissed" />
        <AdminMetric label="Promoted historically" value={promoted} detail="Explicit human promotion" />
        <AdminMetric label="Active opportunities" value={activeOpportunities} detail="Open commercial relationships" />
        <AdminMetric label="Paid work" value={paidWork} detail={`${clients.length} client record${clients.length === 1 ? "" : "s"}`} />
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <LifecycleCard step="01" title="Prospects" question="Is this company worth our commercial attention?" description="Discover, scan, research and preserve evidence. A technical signal is not a business pain and never promotes a company automatically." href="/admin/prospecting" action="Review prospects" />
        <LifecycleCard step="02" title="Opportunities" question="What commercial state is this chosen relationship in?" description="Outreach, follow-up, diagnostic progression, delivery and close state live here. Every open state derives a next action into Command." href="/admin/opportunities" action="Open opportunities" />
        <LifecycleCard step="03" title="Clients" question="Who has an actual relationship with Signal & Friction?" description="Client identity and contact truth live here. Payment and accounting remain Finance truth; delivery work remains Delivery truth." href="/admin/clients" action="Open clients" />
      </section>

      <AdminPanel>
        <span className="sf-eyebrow">Lifecycle boundary</span>
        <div className="mt-4 grid md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3">
          <Boundary title="Prospect" detail="Evidence gathering. No commercial commitment assumed." />
          <Arrow />
          <Boundary title="Human promotion" detail="Explicit decision that the company deserves pursuit." />
          <Arrow />
          <Boundary title="Opportunity / Client" detail="Commercial state now produces derived next actions and delivery handoffs." />
        </div>
      </AdminPanel>
    </div>
  );
}

function LifecycleCard({ step, title, question, description, href, action }: { step: string; title: string; question: string; description: string; href: string; action: string }) {
  return (
    <article className="sf-card p-5 md:p-6 flex flex-col min-h-[280px]">
      <span className="sf-eyebrow">{step}</span>
      <h2 className="mt-2">{title}</h2>
      <p className="text-base text-[#D7D0C9] mt-4">{question}</p>
      <p className="text-sm text-[#8D837A] leading-relaxed mt-2 flex-1">{description}</p>
      <div className="mt-6"><AdminActionLink href={href}>{action} →</AdminActionLink></div>
    </article>
  );
}

function Boundary({ title, detail }: { title: string; detail: string }) {
  return <div className="border border-white/5 rounded-xl p-4"><span className="text-[#F5F0EB] font-medium block">{title}</span><span className="text-sm text-[#7A6F65] block mt-1.5 leading-relaxed">{detail}</span></div>;
}

function Arrow() {
  return <div className="hidden md:flex items-center justify-center text-[#D4A853]/60 font-mono">→</div>;
}
