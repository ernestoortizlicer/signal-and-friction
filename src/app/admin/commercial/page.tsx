"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/supabase";

interface CommercialEngagement {
  id: string;
  offer_price_id: string;
  offer_name: string;
  offer_scope: string;
  offer_line: "dwy" | "dfy";
  offer_phase: "diagnostic" | "intervention" | "monitoring" | "expansion" | "autonomy";
  phase_order: number;
  authorization_kind: "public_diagnostic" | "operator_lifecycle";
  client_id: string | null;
  predecessor_engagement_id: string | null;
  assigned_analyst_id: string;
  intake_company_name: string;
  intake_contact_name: string;
  intake_email: string;
  intake_industry: string;
  target_url: string;
  scope_brief: string;
  billing_state: string;
  delivery_state: string;
  state_reason: string | null;
  stripe_checkout_session_id: string | null;
  scaffold_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CommercialAnalyst {
  id: string;
  auth_user_id: string;
  display_name: string;
  notification_email: string;
  is_active: boolean;
  accepts_new_engagements: boolean;
  is_default: boolean;
}

interface WebhookEvent {
  event_id: string;
  engagement_id: string | null;
  event_type: string;
  processing_state: string;
  attempt_count: number;
  last_error: string | null;
  received_at: string;
}

interface OutboxItem {
  id: string;
  engagement_id: string;
  kind: string;
  status: string;
  attempt_count: number;
  last_error: string | null;
}

interface QueuePayload {
  engagements: CommercialEngagement[];
  webhookEvents: WebhookEvent[];
  outbox: OutboxItem[];
}

const EMPTY_QUEUE: QueuePayload = { engagements: [], webhookEvents: [], outbox: [] };

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function stateClass(state: string): string {
  if (["paid", "ready", "active", "delivered", "sent", "processed"].includes(state)) {
    return "border-[#5C9A6B]/30 bg-[#5C9A6B]/5 text-[#7FC18F]";
  }
  if (["needs_review", "payment_failed", "past_due", "failed", "dead_letter"].includes(state)) {
    return "border-[#C85C5C]/30 bg-[#C85C5C]/5 text-[#E48B8B]";
  }
  return "border-[#D4A853]/20 bg-[#D4A853]/5 text-[#D4A853]";
}

export default function CommercialOperationsPage() {
  const [queue, setQueue] = useState<QueuePayload>(EMPTY_QUEUE);
  const [analysts, setAnalysts] = useState<CommercialAnalyst[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});

  async function load() {
    setError(null);
    try {
      const headers = getAuthHeaders();
      const [queueResponse, analystsResponse] = await Promise.all([
        fetch("/api/admin/commercial/engagements?limit=100", { headers, cache: "no-store" }),
        fetch("/api/admin/commercial/analysts", { headers, cache: "no-store" }),
      ]);
      const queueBody = (await queueResponse.json().catch(() => null)) as
        | (QueuePayload & { error?: string })
        | null;
      const analystsBody = (await analystsResponse.json().catch(() => null)) as
        | { analysts?: CommercialAnalyst[]; error?: string }
        | null;
      if (!queueResponse.ok) throw new Error(queueBody?.error || "Commercial queue could not be loaded.");
      if (!analystsResponse.ok) throw new Error(analystsBody?.error || "Analyst roster could not be loaded.");
      setQueue(queueBody || EMPTY_QUEUE);
      setAnalysts(analystsBody?.analysts || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Commercial operations could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The admin route is client-authenticated; load only after hydration has
    // access to the Supabase session cookie used by getAuthHeaders().
    void load();
  }, []);

  const analystById = useMemo(
    () => Object.fromEntries(analysts.map((analyst) => [analyst.id, analyst])),
    [analysts]
  );
  const hasAcceptingDefault = analysts.some(
    (analyst) => analyst.is_active && analyst.accepts_new_engagements && analyst.is_default
  );

  async function configureSelf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfiguring(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/commercial/analysts", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          isActive: true,
          acceptsNewEngagements: true,
          isDefault: true,
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Analyst configuration failed.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Analyst configuration failed.");
    } finally {
      setConfiguring(false);
    }
  }

  async function startEvidence(engagement: CommercialEngagement) {
    if (!engagement.client_id) return;
    setStartingId(engagement.id);
    setActionError((current) => ({ ...current, [engagement.id]: "" }));
    try {
      const scanResponse = await fetch("/api/scaffolds/generate", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: engagement.client_id, url: engagement.target_url }),
      });
      const scaffold = (await scanResponse.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;
      if (!scanResponse.ok || !scaffold?.id) {
        throw new Error(scaffold?.error || "The evidence scan did not produce a real scaffold.");
      }

      const attachResponse = await fetch("/api/admin/commercial/delivery", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ engagementId: engagement.id, scaffoldId: scaffold.id }),
      });
      const attached = (await attachResponse.json().catch(() => null)) as { error?: string } | null;
      if (!attachResponse.ok) {
        throw new Error(
          attached?.error ||
            `Scaffold ${scaffold.id} was created but could not be attached. Reconcile it before retrying.`
        );
      }

      window.location.assign(`/admin/scaffolds?id=${encodeURIComponent(scaffold.id)}`);
    } catch (cause) {
      setActionError((current) => ({
        ...current,
        [engagement.id]: cause instanceof Error ? cause.message : "Evidence work could not start.",
      }));
      setStartingId(null);
    }
  }

  if (loading) {
    return <div className="p-8 font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]">Loading commercial state…</div>;
  }

  return (
    <main className="min-h-full p-5 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 border-b border-[#D4A853]/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D4A853]/70">Commercial control plane</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-white">Engagement operations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7A6F65]">
              Payment, entitlement, analyst ownership, webhook state, and delivery work are joined here by engagement ID.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-[#D4A853]/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-[#D4A853] hover:bg-[#D4A853]/5"
          >
            Refresh
          </button>
        </header>

        {error && <div role="alert" className="rounded border border-[#C85C5C]/30 bg-[#C85C5C]/5 p-4 font-mono text-xs text-[#E48B8B]">{error}</div>}

        {!hasAcceptingDefault && (
          <form onSubmit={configureSelf} className="rounded border border-[#D4A853]/25 bg-[#D4A853]/[0.03] p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#D4A853]">Public checkout is fail-closed</p>
            <p className="mt-2 text-sm leading-6 text-[#B0A89E]">
              Configure one active default analyst before a paid Diagnostic can be created. The authenticated admin user becomes that accountable owner.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                required
                minLength={2}
                maxLength={120}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Analyst display name"
                className="flex-1 rounded border border-[#D4A853]/15 bg-[#050403] px-3 py-2 font-mono text-sm outline-none focus:border-[#D4A853]/50"
              />
              <button disabled={configuring} className="rounded bg-[#D4A853] px-5 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#0A0908] disabled:opacity-50">
                {configuring ? "Configuring…" : "Register me as default analyst"}
              </button>
            </div>
          </form>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total", queue.engagements.length],
            ["Paid / ready", queue.engagements.filter((item) => item.billing_state === "paid" && item.delivery_state === "ready").length],
            ["Needs review", queue.engagements.filter((item) => item.billing_state === "needs_review" || item.delivery_state === "needs_review").length],
            ["Outbox failed", queue.outbox.filter((item) => item.status === "failed" || item.status === "dead_letter").length],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-[#D4A853]/10 bg-[#0E0C0A] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5F564E]">{label}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#F5F0EB]">{value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          {queue.engagements.length === 0 ? (
            <div className="rounded border border-dashed border-[#D4A853]/15 p-10 text-center font-mono text-xs text-[#7A6F65]">
              No commercial engagements exist yet. Zero is the real state.
            </div>
          ) : (
            queue.engagements.map((engagement) => {
              const analyst = analystById[engagement.assigned_analyst_id];
              const eventFailures = queue.webhookEvents.filter(
                (event) => event.engagement_id === engagement.id && event.processing_state === "needs_review"
              );
              const outboxFailures = queue.outbox.filter(
                (item) => engagement.id === item.engagement_id && ["failed", "dead_letter"].includes(item.status)
              );
              const canStartEvidence =
                engagement.billing_state === "paid" &&
                engagement.delivery_state === "ready" &&
                !engagement.scaffold_id &&
                !!engagement.client_id &&
                ["diagnostic", "expansion"].includes(engagement.offer_phase);

              return (
                <article key={engagement.id} className="rounded-lg border border-[#D4A853]/12 bg-[#0E0C0A] p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4A853]">{engagement.offer_line} · phase {engagement.phase_order}</span>
                        <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${stateClass(engagement.billing_state)}`}>{engagement.billing_state}</span>
                        <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${stateClass(engagement.delivery_state)}`}>{engagement.delivery_state}</span>
                      </div>
                      <h2 className="mt-2 font-serif text-xl font-bold text-white">{engagement.intake_company_name} · {engagement.offer_name}</h2>
                      <p className="mt-1 font-mono text-xs text-[#7A6F65]">{engagement.id}</p>
                    </div>
                    <div className="font-mono text-xs text-[#7A6F65] lg:text-right">
                      <p>Created {formatTimestamp(engagement.created_at)}</p>
                      <p>Paid {formatTimestamp(engagement.paid_at)}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 border-t border-[#D4A853]/8 pt-5 lg:grid-cols-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5F564E]">Intake</p>
                      <p className="mt-2 text-sm text-[#B0A89E]">{engagement.intake_contact_name} · {engagement.intake_email}</p>
                      <p className="mt-1 text-sm text-[#7A6F65]">{engagement.intake_industry}</p>
                      <a href={engagement.target_url} target="_blank" rel="noreferrer" className="mt-2 block break-all font-mono text-xs text-[#D4A853] hover:underline">{engagement.target_url}</a>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5F564E]">Scope brief</p>
                      <p className="mt-2 text-sm leading-6 text-[#B0A89E]">{engagement.scope_brief}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5F564E]">Ownership</p>
                      <p className="mt-2 text-sm text-[#B0A89E]">{analyst?.display_name || engagement.assigned_analyst_id}</p>
                      <p className="mt-1 font-mono text-xs text-[#7A6F65]">{engagement.authorization_kind.replaceAll("_", " ")}</p>
                      {engagement.predecessor_engagement_id && (
                        <p className="mt-1 break-all font-mono text-xs text-[#7A6F65]">Predecessor: {engagement.predecessor_engagement_id}</p>
                      )}
                    </div>
                  </div>

                  {(eventFailures.length > 0 || outboxFailures.length > 0 || engagement.state_reason) && (
                    <div className="mt-5 rounded border border-[#C85C5C]/20 bg-[#C85C5C]/5 p-3 font-mono text-xs leading-5 text-[#E48B8B]">
                      {engagement.state_reason && <p>{engagement.state_reason}</p>}
                      {eventFailures.map((event) => <p key={event.event_id}>{event.event_type}: {event.last_error || "needs review"}</p>)}
                      {outboxFailures.map((item) => <p key={item.id}>{item.kind}: {item.last_error || item.status}</p>)}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {canStartEvidence && (
                      <button
                        type="button"
                        disabled={startingId === engagement.id}
                        onClick={() => void startEvidence(engagement)}
                        className="rounded bg-[#D4A853] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#0A0908] disabled:opacity-50"
                      >
                        {startingId === engagement.id ? "Running real scan…" : "Start evidence scan"}
                      </button>
                    )}
                    {engagement.scaffold_id && (
                      <Link href={`/admin/scaffolds?id=${encodeURIComponent(engagement.scaffold_id)}`} className="rounded border border-[#D4A853]/25 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-[#D4A853] hover:bg-[#D4A853]/5">
                        Open scaffold →
                      </Link>
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#5F564E]">
                      {engagement.scaffold_id ? "Delivery anchor attached" : "Engagement is the active work item"}
                    </span>
                  </div>
                  {actionError[engagement.id] && <p role="alert" className="mt-3 font-mono text-xs text-[#E48B8B]">{actionError[engagement.id]}</p>}
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
