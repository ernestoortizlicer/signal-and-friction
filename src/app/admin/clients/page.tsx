"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import { AdminActionLink, AdminDefinition, AdminMetric, AdminPageHeader, AdminPanel, AdminStatus } from "@/components/admin/AdminPagePrimitives";

type Client = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_profile_url: string | null;
  industry: string | null;
  source_platform: string | null;
  target_url: string | null;
  protocol_stage: string | null;
  created_at: string;
  updated_at: string;
};

type Project = {
  id: string;
  client_id: string;
  status: string;
  payment_status: string;
  symbolic_price_charged: number | null;
  updated_at: string;
};

type ClientRow = Client & { project: Project | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const CLOSED = new Set(["closed_completed", "closed_lost"]);

function money(value: number | null) {
  if (!value || value <= 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const headers = getAuthHeaders();
        const [clientResponse, projectResponse] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/clients?select=id,company_name,contact_name,contact_email,contact_profile_url,industry,source_platform,target_url,protocol_stage,created_at,updated_at&order=updated_at.desc`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/beta_projects?select=id,client_id,status,payment_status,symbolic_price_charged,updated_at&order=updated_at.desc`, { headers }),
        ]);
        if (!clientResponse.ok || !projectResponse.ok) throw new Error("Client relationship state could not be loaded.");
        setClients(await clientResponse.json());
        setProjects(await projectResponse.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Client state failed.");
      }
    })();
  }, []);

  const rows = useMemo<ClientRow[]>(() => {
    const latest = new Map<string, Project>();
    for (const project of projects) if (!latest.has(project.client_id)) latest.set(project.client_id, project);
    return clients.map((client) => ({ ...client, project: latest.get(client.id) ?? null }));
  }, [clients, projects]);

  const normalizedQuery = query.trim().toLowerCase();
  const visible = rows.filter((row) => {
    if (!normalizedQuery) return true;
    return [row.company_name, row.contact_name, row.contact_email, row.industry, row.target_url]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery));
  });

  const activeRelationships = rows.filter((row) => row.project && !CLOSED.has(row.project.status)).length;
  const paidClients = rows.filter((row) => row.project?.payment_status === "paid").length;
  const contactComplete = rows.filter((row) => row.contact_name && row.contact_email).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Sales · Clients"
        title="Relationship truth, without duplicating Delivery or Finance."
        description="A client record answers who the relationship is with and how to reach them. Commercial stage stays in Opportunities; money stays in Finance; diagnostic artifacts stay in Delivery."
        actions={<><AdminActionLink href="/admin/opportunities" tone="neutral">Opportunities</AdminActionLink><AdminActionLink href="/admin/prospecting" tone="neutral">Prospects</AdminActionLink></>}
      />

      {error && <div className="border border-[#C85C5C]/30 bg-[#C85C5C]/10 rounded-xl p-4 text-sm text-[#C85C5C]">{error}</div>}

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <AdminMetric label="Client records" value={rows.length} />
        <AdminMetric label="Active relationships" value={activeRelationships} />
        <AdminMetric label="Paid clients" value={paidClients} />
        <AdminMetric label="Contact complete" value={`${contactComplete}/${rows.length}`} detail="Name + email present" />
      </section>

      <AdminPanel className="!p-4">
        <label className="sf-eyebrow" htmlFor="client-search">Find relationship</label>
        <input
          id="client-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Company, person, email, industry or URL"
          className="sf-control w-full mt-2 px-3.5"
        />
      </AdminPanel>

      <section className="space-y-3">
        {visible.map((client) => {
          const project = client.project;
          const active = project ? !CLOSED.has(project.status) : false;
          const paymentTone = project?.payment_status === "paid" ? "green" : project?.payment_status === "refunded" ? "red" : "neutral";
          return (
            <AdminPanel key={client.id} className="grid xl:grid-cols-[minmax(220px,1.3fr)_minmax(260px,1.1fr)_minmax(220px,1fr)_auto] gap-5 items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="!text-[22px]">{client.company_name}</h2>
                  <AdminStatus tone={active ? "gold" : "neutral"}>{project?.status?.replaceAll("_", " ") ?? "No opportunity"}</AdminStatus>
                  {project && <AdminStatus tone={paymentTone}>{project.payment_status}</AdminStatus>}
                </div>
                <p className="text-sm text-[#7A6F65] mt-2">Client since {new Date(client.created_at).toLocaleDateString()}</p>
              </div>

              <div className="grid gap-3">
                <AdminDefinition label="Primary contact">
                  <span className="text-[#F5F0EB]">{client.contact_name || "No contact name"}</span>
                  <span className="block break-all">{client.contact_email || "No contact email"}</span>
                  {client.contact_profile_url && <a href={client.contact_profile_url} target="_blank" rel="noopener noreferrer" className="block text-[#D4A853] underline mt-1">Open contact profile</a>}
                </AdminDefinition>
                <AdminDefinition label="Client target">
                  {client.target_url ? <a href={client.target_url} target="_blank" rel="noopener noreferrer" className="text-[#D4A853] underline break-all">{client.target_url}</a> : <span className="text-amber-400">No canonical target URL</span>}
                </AdminDefinition>
              </div>

              <div className="grid gap-3">
                <AdminDefinition label="Relationship context">{client.industry || "Industry not recorded"}<span className="block text-xs text-[#7A6F65] mt-1">Source: {client.source_platform || "unknown"}</span></AdminDefinition>
                <AdminDefinition label="Commercial value"><span className="font-mono text-[#F5F0EB]">{money(Number(project?.symbolic_price_charged ?? 0))}</span><span className="block text-xs text-[#7A6F65] mt-1">{client.protocol_stage || "No protocol stage"}</span></AdminDefinition>
              </div>

              <div className="flex xl:flex-col flex-wrap gap-2 xl:items-stretch">
                {project && <AdminActionLink href="/admin/opportunities">Opportunity</AdminActionLink>}
                {project?.payment_status === "paid" && <AdminActionLink href="/admin/scaffolds" tone="green">Delivery</AdminActionLink>}
                <AdminActionLink href="/admin/finance" tone="neutral">Finance</AdminActionLink>
              </div>
            </AdminPanel>
          );
        })}
        {visible.length === 0 && <AdminPanel className="text-center py-12"><p className="text-[#7A6F65]">No client relationships match this view.</p></AdminPanel>}
      </section>
    </div>
  );
}
