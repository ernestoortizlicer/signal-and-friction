/**
 * GET /api/views
 *
 * Returns aggregate deliverable view counts from Supabase.
 * Response: { [clientKey]: { count: number; lastViewed: string | null } }
 *
 * No auth required — admin-only page calls this, data carries no PII.
 */

import { getSupabaseUrl, getServiceRoleKey } from "./_env";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface AggregateRow {
  client_key: string;
  count: string; // Supabase returns count as string via PostgREST
  last_viewed: string | null;
}

type ViewsPayload = Record<string, { count: number; lastViewed: string | null }>;

export const onRequestGet = async ({
  env,
}: {
  env: Env;
  request: Request;
}): Promise<Response> => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const supabaseUrl = getSupabaseUrl(env);
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return new Response(JSON.stringify({}), { headers: cors });
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/deliverable_view_events?select=client_key,count:id.count(),last_viewed:viewed_at.max()&group=client_key`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Accept": "application/json",
        },
      },
    );

    if (!res.ok) {
      return new Response(JSON.stringify({}), { headers: cors });
    }

    const rows: AggregateRow[] = await res.json();

    const payload: ViewsPayload = {};
    for (const row of rows) {
      payload[row.client_key] = {
        count: parseInt(row.count, 10) || 0,
        lastViewed: row.last_viewed ?? null,
      };
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...cors, "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({}), { headers: cors });
  }
};
