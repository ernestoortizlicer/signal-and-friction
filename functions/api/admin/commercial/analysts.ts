import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../../_admin-auth";
import { getServiceRoleKey, getSupabaseUrl } from "../../_env";

interface Env extends Record<string, string> {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function db(env: Env) {
  const key = getServiceRoleKey(env);
  if (!key) return null;
  return createClient(getSupabaseUrl(env), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const onRequestGet = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const supabase = db(env);
  if (!supabase) return Response.json({ error: "Server misconfiguration" }, { status: 500 });

  const { data, error } = await supabase
    .from("commercial_analysts")
    .select(
      "id,auth_user_id,display_name,notification_email,is_active,accepts_new_engagements,is_default,created_at,updated_at"
    )
    .order("display_name");
  if (error) {
    const status = ["23503", "23505", "23514"].includes(error.code || "") ? 409 : 500;
    return Response.json(
      {
        error:
          status === 409
            ? "Analyst configuration conflicts with the current commercial roster."
            : "Analyst configuration could not be persisted.",
      },
      { status }
    );
  }
  return Response.json({ analysts: data || [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
};

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const supabase = db(env);
  if (!supabase) return Response.json({ error: "Server misconfiguration" }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const notificationEmail =
    typeof body.notificationEmail === "string"
      ? body.notificationEmail.trim().toLowerCase()
      : admin.email;
  const isActive = body.isActive !== false;
  const acceptsNewEngagements = body.acceptsNewEngagements !== false;
  const isDefault = body.isDefault !== false;

  if (displayName.length < 2 || displayName.length > 120) {
    return Response.json({ error: "displayName must be between 2 and 120 characters." }, { status: 422 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
    return Response.json({ error: "notificationEmail must be valid." }, { status: 422 });
  }

  const { data, error } = await supabase.rpc("configure_commercial_analyst", {
    p_payload: {
      auth_user_id: admin.id,
      display_name: displayName,
      notification_email: notificationEmail,
      is_active: isActive,
      accepts_new_engagements: acceptsNewEngagements,
      is_default: isDefault,
    },
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return Response.json({ error: result?.error || "Analyst configuration was rejected." }, { status: 409 });
  }
  return Response.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
};
