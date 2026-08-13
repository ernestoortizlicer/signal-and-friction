import { DEMO_CLIENT_KEYS } from "../_demo-clients";
import { getSupabaseUrl, getServiceRoleKey } from "../_env";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function toClientKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export const onRequestGet = async ({
  params,
  request,
  env,
}: {
  params: { clientKey: string };
  request: Request;
  env: Record<string, string>;
}) => {
  const { clientKey } = params;
  const supabaseUrl = getSupabaseUrl(env);
  const serviceKey = getServiceRoleKey(env);

  const headers = {
    apikey: serviceKey ?? "",
    Authorization: `Bearer ${serviceKey ?? ""}`,
    "Content-Type": "application/json",
  };

  // A published deliverable is the authoritative terminal state for this
  // client-facing SLA surface. Do not infer delivery from elapsed time.
  try {
    const resDeliv = await fetch(
      `${supabaseUrl}/rest/v1/deliverables?client_key=eq.${encodeURIComponent(clientKey)}&select=client_key`,
      { headers },
    );
    if (resDeliv.ok) {
      const delivData: Array<{ client_key: string }> = await resDeliv.json();
      if (delivData.length > 0) {
        return Response.json(
          { status: "delivered", deliverableUrl: `/deliverable/${clientKey}` },
          { headers: CORS },
        );
      }
    }
  } catch {
    // Non-fatal. Continue to the authorized project-state lookup.
  }

  if (!DEMO_CLIENT_KEYS.has(clientKey)) {
    const cid = new URL(request.url).searchParams.get("cid");
    if (!cid) {
      return Response.json({ error: "Not found" }, { status: 404, headers: CORS });
    }

    try {
      const resClient = await fetch(
        `${supabaseUrl}/rest/v1/clients?id=eq.${encodeURIComponent(cid)}&select=id,company_name,protocol_stage,beta_projects(status,payment_status,delivered_at)`,
        { headers },
      );
      if (!resClient.ok) {
        return Response.json({ error: "Service unavailable" }, { status: 503, headers: CORS });
      }

      const rows: Array<{
        id: string;
        company_name: string;
        protocol_stage: string;
        beta_projects: Array<{
          status: string;
          payment_status: string | null;
          delivered_at: string | null;
        }>;
      }> = await resClient.json();
      const match = rows[0];

      if (!match || toClientKey(match.company_name || "") !== clientKey) {
        return Response.json({ error: "Not found" }, { status: 404, headers: CORS });
      }

      const project = match.beta_projects?.[0];

      // Payment truth owns the commercial SLA start. beta_projects.created_at
      // can predate payment by hours or days because intake creates the project.
      const resPayment = await fetch(
        `${supabaseUrl}/rest/v1/payments?client_id=eq.${encodeURIComponent(match.id)}&select=created_at&order=created_at.asc&limit=1`,
        { headers },
      );
      if (!resPayment.ok) {
        return Response.json({ error: "Service unavailable" }, { status: 503, headers: CORS });
      }

      const payments: Array<{ created_at: string }> = await resPayment.json();
      const payment = payments[0];

      if (!payment) {
        return Response.json(
          {
            status: "awaiting_payment",
            clientName: match.company_name,
            clientKey,
            protocolStage: match.protocol_stage,
            projectStatus: project?.status ?? null,
            paymentStatus: project?.payment_status ?? null,
          },
          { headers: CORS },
        );
      }

      const slaStartedAt = payment.created_at;
      const now = Date.now();
      const hoursElapsed = Math.max(0, (now - new Date(slaStartedAt).getTime()) / 3600000);
      const hoursRemaining = Math.max(0, 72 - hoursElapsed);
      const pctElapsed = Math.min(100, (hoursElapsed / 72) * 100);

      return Response.json(
        {
          status: "in_progress",
          clientName: match.company_name,
          clientKey,
          slaStartedAt,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          hoursRemaining: Math.round(hoursRemaining * 10) / 10,
          pctElapsed: Math.round(pctElapsed * 10) / 10,
          protocolStage: match.protocol_stage,
          projectStatus: project?.status ?? null,
          paymentStatus: project?.payment_status ?? null,
        },
        { headers: CORS },
      );
    } catch {
      return Response.json({ error: "Internal error" }, { status: 500, headers: CORS });
    }
  }

  // Demo client keys without a published deliverable have no canonical live
  // payment/project state, so do not manufacture an SLA timeline for them.
  return Response.json({ error: "Not found" }, { status: 404, headers: CORS });
};

export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
