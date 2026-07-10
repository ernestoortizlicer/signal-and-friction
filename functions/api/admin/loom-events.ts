const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

/**
 * Admin-only read of loom_view_events via service role. loom_view_events has
 * no anon or client-keyed authenticated RLS policy (see
 * supabase/migrations/20260626000100_loom_view_events.sql) — the browser-side
 * anon/authenticated Supabase client cannot read it, so the Deal Acceleration
 * dashboard fetches through this endpoint instead. Follows the same
 * unauthenticated-service-role pattern already used by
 * functions/api/sla/[clientKey].ts and functions/api/notify-delivery/[clientKey].ts;
 * the route itself is only reachable from the client-side admin-whitelist gate
 * in src/app/admin/layout.tsx.
 */
export const onRequestGet = async ({
  request,
  env,
}: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> => {
  const supabaseUrl = env.SUPABASE_URL || 'https://tsaarsuuclvkjsgjcmoj.supabase.co';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return Response.json({ error: 'Server misconfiguration' }, { status: 500, headers: CORS });
  }

  const sbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  const since = new URL(request.url).searchParams.get('since') || new Date(0).toISOString();

  try {
    const eventsRes = await fetch(
      `${supabaseUrl}/rest/v1/loom_view_events?timestamp=gte.${encodeURIComponent(since)}&order=timestamp.desc&select=*`,
      { headers: sbHeaders }
    );
    if (!eventsRes.ok) {
      return Response.json({ error: 'Failed to fetch Loom events' }, { status: 502, headers: CORS });
    }
    const events: Array<{ prospect_id: string | null }> = await eventsRes.json();

    const prospectIds = [...new Set(events.map((e) => e.prospect_id).filter(Boolean))];
    let clients: Array<{ id: string; company_name: string; contact_email: string; contact_name: string }> = [];
    if (prospectIds.length > 0) {
      const clientsRes = await fetch(
        `${supabaseUrl}/rest/v1/clients?id=in.(${prospectIds.join(',')})&select=id,company_name,contact_email,contact_name`,
        { headers: sbHeaders }
      );
      if (clientsRes.ok) {
        clients = await clientsRes.json();
      }
    }

    return Response.json({ events, clients }, { headers: CORS });
  } catch (error) {
    console.error('Loom events fetch error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
};
