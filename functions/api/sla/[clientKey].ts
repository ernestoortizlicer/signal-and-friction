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

  // 1. Check if deliverable already exists — if yes, SLA is done. No PII
  // in this response (boolean + URL only), so no capability check needed.
  try {
    const resDeliv = await fetch(
      `${supabaseUrl}/rest/v1/deliverables?client_key=eq.${encodeURIComponent(clientKey)}&select=client_key`,
      { headers }
    );
    if (resDeliv.ok) {
      const delivData: Array<{ client_key: string }> = await resDeliv.json();
      if (delivData.length > 0) {
        return Response.json(
          { status: "delivered", deliverableUrl: `/deliverable/${clientKey}` },
          { headers: CORS }
        );
      }
    }
  } catch {
    // non-fatal
  }

  // 2. Real (non-demo) clients require their own UUID as a capability
  // token (`?cid=`) — clientKey alone is a guessable company-name slug.
  // This also replaces the old unfiltered "fetch every client row" query
  // with a single filtered lookup by id.
  if (!DEMO_CLIENT_KEYS.has(clientKey)) {
    const cid = new URL(request.url).searchParams.get("cid");
    if (!cid) {
      return Response.json({ error: "Not found" }, { status: 404, headers: CORS });
    }

    try {
      const resClient = await fetch(
        `${supabaseUrl}/rest/v1/clients?id=eq.${encodeURIComponent(cid)}&select=id,company_name,beta_projects(status,created_at,delivered_at)`,
        { headers }
      );
      if (!resClient.ok) {
        return Response.json({ error: "Service unavailable" }, { status: 503, headers: CORS });
      }

      const rows: Array<{
        id: string;
        company_name: string;
        beta_projects: Array<{ status: string; created_at: string; delivered_at: string | null }>;
      }> = await resClient.json();
      const match = rows[0];

      if (!match || toClientKey(match.company_name || "") !== clientKey) {
        return Response.json({ error: "Not found" }, { status: 404, headers: CORS });
      }

      const project = match.beta_projects?.[0];
      const createdAt = project?.created_at || new Date().toISOString();
      const now = Date.now();
      const hoursElapsed = (now - new Date(createdAt).getTime()) / 3600000;
      const hoursRemaining = Math.max(0, 72 - hoursElapsed);
      const pctElapsed = Math.min(100, (hoursElapsed / 72) * 100);

      return Response.json(
        {
          status: "in_progress",
          clientName: match.company_name,
          clientKey,
          createdAt,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          hoursRemaining: Math.round(hoursRemaining * 10) / 10,
          pctElapsed: Math.round(pctElapsed * 10) / 10,
          projectStatus: project?.status || "active",
        },
        { headers: CORS }
      );
    } catch {
      return Response.json({ error: "Internal error" }, { status: 500, headers: CORS });
    }
  }

  // Demo clientKey with no matching deliverables-table row (step 1 already
  // returned if one existed) — nothing real to report.
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
