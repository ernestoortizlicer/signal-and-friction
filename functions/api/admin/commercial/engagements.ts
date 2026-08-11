import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../../_admin-auth";
import { getServiceRoleKey, getSupabaseUrl } from "../../_env";

interface Env extends Record<string, string> {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const onRequestGet = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const url = new URL(request.url);
  const engagementId = url.searchParams.get("engagement_id")?.trim() || null;
  const requestedLimit = Number(url.searchParams.get("limit") || "50");
  const limit = Number.isSafeInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;

  if (engagementId && !UUID.test(engagementId)) {
    return Response.json({ error: "engagement_id must be a UUID." }, { status: 400 });
  }

  let engagementQuery = supabase
    .from("commercial_engagements")
    .select(
      "id,request_key,offer_price_id,offer_name,offer_scope,offer_line,offer_phase,phase_order,authorization_kind,client_id,predecessor_engagement_id,assigned_analyst_id,intake_company_name,intake_contact_name,intake_email,intake_industry,target_url,scope_brief,billing_state,delivery_state,state_reason,stripe_checkout_session_id,stripe_subscription_id,scaffold_id,paid_at,first_delivery_at,delivered_at,created_at,updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (engagementId) engagementQuery = engagementQuery.eq("id", engagementId);

  const { data: engagements, error: engagementError } = await engagementQuery;
  if (engagementError) {
    return Response.json(
      { error: `Could not load commercial engagements: ${engagementError.message}` },
      { status: 500 }
    );
  }

  const engagementIds = (engagements || []).map((engagement) => engagement.id);
  if (engagementIds.length === 0) {
    return Response.json({ engagements: [], webhookEvents: [], outbox: [] }, { status: 200 });
  }

  const [{ data: webhookEvents, error: webhookError }, { data: outbox, error: outboxError }] =
    await Promise.all([
      supabase
        .from("commercial_webhook_events")
        .select(
          "event_id,event_type,engagement_id,processing_state,attempt_count,last_error,event_created_at,received_at,last_attempted_at,processed_at"
        )
        .in("engagement_id", engagementIds)
        .order("received_at", { ascending: false }),
      supabase
        .from("commercial_outbox")
        .select(
          "id,webhook_event_id,engagement_id,kind,status,attempt_count,max_attempts,available_at,last_error,provider_message_id,sent_at,created_at,updated_at"
        )
        .in("engagement_id", engagementIds)
        .order("created_at", { ascending: false }),
    ]);

  if (webhookError || outboxError) {
    return Response.json(
      {
        error: `Could not load commercial operations state: ${
          webhookError?.message || outboxError?.message || "unknown"
        }`,
      },
      { status: 500 }
    );
  }

  return Response.json(
    {
      engagements,
      webhookEvents,
      outbox,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
};
