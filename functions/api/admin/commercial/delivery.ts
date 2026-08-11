import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../../_admin-auth";
import { getServiceRoleKey, getSupabaseUrl } from "../../_env";

interface Env extends Record<string, string> {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const engagementId = typeof body.engagementId === "string" ? body.engagementId.trim() : "";
  const scaffoldId = typeof body.scaffoldId === "string" ? body.scaffoldId.trim() : "";
  if (!UUID.test(engagementId) || !UUID.test(scaffoldId)) {
    return Response.json({ error: "engagementId and scaffoldId must be UUIDs." }, { status: 422 });
  }

  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("attach_commercial_scaffold", {
    p_payload: {
      engagement_id: engagementId,
      scaffold_id: scaffoldId,
      actor_auth_user_id: admin.id,
    },
  });
  if (error) return Response.json({ error: error.message }, { status: 409 });

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return Response.json({ error: result?.error || "Scaffold attachment was rejected." }, { status: 409 });
  }
  return Response.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
};
