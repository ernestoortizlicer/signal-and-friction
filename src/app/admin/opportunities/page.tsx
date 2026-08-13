"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import { AdminActionLink, AdminDefinition, AdminMetric, AdminPageHeader, AdminPanel, AdminStatus } from "@/components/admin/AdminPagePrimitives";

type Project = { id: string; client_id: string; status: string; payment_status: string; symbolic_price_charged: number | null; current_phase: string | null; created_at: string; updated_at: string; delivered_at: string | null };
type Client = { id: string; company_name: string; contact_name: string | null; contact_email: string | null };
type Opportunity = Project & { client: Client | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const CLOSED = new Set(["closed_completed", "closed_lost"]);

function stageLabel(status: string) {
  const labels: Record<string, string> = {
    prospecting: "Prospecting", outreach_sent: "Outreach sent", followup_sent: "Follow-up sent",
    provisioning: "Provisioning", awaiting_input: "Awaiting input", diagnostic_in_progress: "Diagnostic in progress",
    delivered: "Delivered", awaiting_testimonial: "Awaiting testimonial", closed_completed: "Closed · completed", closed_lost: "Closed · lost",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function nextAction(status: string) {
  const actions: Record<string, string> = {
    prospecting: "Send outreach", outreach_sent: "Follow up", followup_sent: "Check response", provisioning: "Resolve provisioning",
    awaiting_input: "Collect required input", diagnostic_in_progress: "Complete diagnostic", delivered: "Request testimonial",
    awaiting_testimonial: "Follow up for testimonial", closed_completed: "No open commercial action", closed_lost: "No open commercial action",
  };
  return actions[status] ?? "Review commercial state";
}

function money(value: number | null) {
  if (!value || value <= 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function OpportunitiesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const headers = getAuthHeaders();
        const [projectResponse, clientResponse] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/beta_projects?select=id,client_id,status,payment_status,symbolic_price_charged,current_phase,created_at,updated_at,delivered_at&order=updated_at.desc`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/clients?select=id,company_name,contact_name,contact_email`, { headers }),
        ]);
        if (!projectResponse.ok || !clientResponse.ok) throw new Error("Opportunity state could not be loaded.");
        setProjects(await projectResponse.json());
        setClients(await clientResponse.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Opportunity state failed.");
      }
    })();
  }, []);

  const opportunities = useMemo<Opportunity[]>(() => {
    const byId = new Map(clients.map((client) => [client.id, client]));
    return projects.map((project) => ({ ...project, client: byId.get(project.client_id) ?? null })).sort((a, b) => {
      if (a.payment_status === "paid" && b.payment_status !== "paid") return -1;
      if (a.payment_status !== "paid" && b.payment_status === "paid") return 1;
      const av = Number(a.symbolic_price_charged ?? 0), bv = Number(b.symbolic_price_charged ?? 0);
      if (av !== bv) return bv - av;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [projects, clients]);

  const active = opportunities.filter((o) => !CLOSED.has(o.status));
  const paid = active.filter((o) => o.payment_status === "paid");
  const visible = showClosed ? opportunities : active;
  const committedValue = paid.reduce((sum, o) => sum + Number(o.symbolic_price_charged ?? 0), 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Sales · Opportunities" title="Chosen relationships, explicit commercial state." description="An opportunity exists only after human promotion. This view describes commercial truth; Command decides which action deserves attention first." actions={<><AdminActionLink href="/admin/prospecting" tone="neutral">Prospects</AdminActionLink><AdminActionLink href="/admin/priorities">Open Command</AdminActionLink></>} />
      {error && <div className="border border-[#C85C5C]/30 bg-[#C85C5C]/10 rounded-xl p-4 text-sm text-[#C85C5C]">{error}</div>}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <AdminMetric label="Active opportunities" value={active.length} />
        <AdminMetric label="Paid work" value={paid.length} />
        <AdminMetric label="Committed value" value={money(committedValue)} detail="Recorded paid opportunity value" />
        <AdminMetric label="Closed historically" value={opportunities.length - active.length} />
      </section>
      <div className="flex justify-end"><button type="button" onClick={() => setShowClosed((v) => !v)} className="min-h-9 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-mono uppercase tracking-[0.1em] text-[#B0A89E] hover:bg-white/5">{showClosed ? "Hide closed" : "Show closed"}</button></div>
      <section className="space-y-3">
        {visible.map((o) => {
          const isClosed = CLOSED.has(o.status);
          const paymentTone = o.payment_status === "paid" ? "green" : o.payment_status === "refunded" ? "red" : "neutral";
          return (
            <AdminPanel key={o.id} className="grid xl:grid-cols-[minmax(220px,1.3fr)_minmax(180px,.9fr)_minmax(200px,1fr)_auto] gap-5 items-start">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="!text-[22px]">{o.client?.company_name ?? "Unlinked client"}</h2><AdminStatus tone={isClosed ? "neutral" : "gold"}>{stageLabel(o.status)}</AdminStatus><AdminStatus tone={paymentTone}>{o.payment_status}</AdminStatus></div><p className="text-sm text-[#7A6F65] mt-2 break-all">{o.client?.contact_email ?? "No contact email"}</p></div>
              <div className="grid grid-cols-2 xl:grid-cols-1 gap-3"><AdminDefinition label="Opportunity value"><span className="text-[#F5F0EB] font-mono">{money(Number(o.symbolic_price_charged ?? 0))}</span></AdminDefinition><AdminDefinition label="Current phase">{o.current_phase || stageLabel(o.status)}</AdminDefinition></div>
              <AdminDefinition label="Next commercial action"><span className={isClosed ? "text-[#7A6F65]" : "text-[#D4A853]"}>{nextAction(o.status)}</span><span className="block text-xs text-[#7A6F65] mt-1">Updated {new Date(o.updated_at).toLocaleDateString()}</span></AdminDefinition>
              <div className="flex xl:flex-col flex-wrap gap-2 xl:items-stretch">{!isClosed && <AdminActionLink href="/admin/priorities">Prioritize</AdminActionLink>}<AdminActionLink href="/admin/dashboard" tone="neutral">Commercial workspace</AdminActionLink>{o.payment_status === "paid" && <AdminActionLink href="/admin/scaffolds" tone="green">Delivery</AdminActionLink>}</div>
            </AdminPanel>
          );
        })}
        {visible.length === 0 && <AdminPanel className="text-center py-12"><p className="text-[#7A6F65]">No opportunities in this view.</p></AdminPanel>}
      </section>
    </div>
  );
}
