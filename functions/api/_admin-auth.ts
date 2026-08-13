/**
 * Server-side admin session verification for Cloudflare Functions.
 * ════════════════════════════════════════════════════════════════════════════
 * The client-side gate in src/app/admin/layout.tsx only prevents the React
 * tree from rendering — it does nothing to protect an independently
 * fetchable API route. Any Function that returns admin-only data or performs
 * an admin-only action must call requireAdmin() itself.
 *
 * Verifies the caller's Supabase session JWT against Supabase's own Auth
 * server (GoTrue), then checks the returned email against the same admin
 * allowlist src/app/admin/layout.tsx uses client-side (kept in sync
 * manually — there's no shared env var namespace between the Next.js build
 * and the Cloudflare Functions runtime).
 *
 * IMPORTANT: return the verified Supabase user id as well as email. Training
 * attempts are user-owned in the hardened calibration schema and must bind
 * `analyst_id` to the verified identity, never to a caller-supplied UUID.
 *
 * Lives under functions/ (not src/lib) for the same reason as _models.ts —
 * Cloudflare esbuild can't resolve cross-directory imports into src/ at
 * function compile time. The leading `_` keeps Pages from treating this
 * module as a route.
 */

import { getSupabaseUrl, getServiceRoleKey } from "./_env";

const ADMIN_ALLOWLIST_FALLBACK = "ernestoortiz@gmail.com,ernestoortizlicer@gmail.com";

export interface AdminUser {
  id: string;
  email: string;
}

// Decodes a JWT's payload segment WITHOUT verifying its signature — this is
// only ever used to report diagnostic claims (exp, email) back in an error
// message, never to make an authorization decision. Verification of the
// token itself is Supabase's /auth/v1/user call above; this just explains
// *why* that call may have rejected it.
function decodeJwtPayloadForDiagnostics(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export async function requireAdmin(
  request: Request,
  env: Record<string, string>
): Promise<AdminUser | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = getSupabaseUrl(env);
  const apikey = getServiceRoleKey(env);
  if (!apikey) {
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const token = authHeader.slice(7);
  const targetUrl = `${supabaseUrl}/auth/v1/user`;

  try {
    new URL(targetUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        error: `Auth verification failed: SUPABASE_URL produced an invalid target URL. Raw value: ${JSON.stringify(supabaseUrl)}. Constructed URL: ${JSON.stringify(targetUrl)}. Parse error: ${message}`,
      },
      { status: 500 }
    );
  }

  let userRes: Response;
  try {
    userRes = await fetch(targetUrl, {
      headers: { Authorization: `Bearer ${token}`, apikey },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const cause = err instanceof Error && err.cause !== undefined ? String(err.cause) : null;
    return Response.json(
      {
        error: `Auth verification failed: could not reach Supabase Auth (${message})${cause ? ` — cause: ${cause}` : ' — no cause attached'}. Target: ${JSON.stringify(targetUrl)}`,
      },
      { status: 500 }
    );
  }
  if (!userRes.ok) {
    const supabaseBody = await userRes.text().catch(() => "(could not read response body)");
    const claims = decodeJwtPayloadForDiagnostics(token);
    const claimsSummary = claims
      ? `exp=${claims.exp ? new Date(Number(claims.exp) * 1000).toISOString() : "(none)"} (expired=${claims.exp ? Date.now() > Number(claims.exp) * 1000 : "unknown"}), email=${claims.email ?? "(none)"}, role=${claims.role ?? "(none)"}, sub=${claims.sub ?? "(none)"}, aud=${claims.aud ?? "(none)"}`
      : "token does not decode as a 3-segment JWT";
    const apikeyClaims = decodeJwtPayloadForDiagnostics(apikey);
    const apikeySummary = apikeyClaims
      ? `role=${apikeyClaims.role ?? "(none)"}, ref=${apikeyClaims.ref ?? "(none)"}, iss=${apikeyClaims.iss ?? "(none)"}, iat=${apikeyClaims.iat ? new Date(Number(apikeyClaims.iat) * 1000).toISOString() : "(none)"}`
      : "SUPABASE_SERVICE_ROLE_KEY does not decode as a 3-segment JWT";
    return Response.json(
      {
        error: `Unauthorized — Supabase Auth responded ${userRes.status}: ${supabaseBody}. Token claims: ${claimsSummary}. Deployed SUPABASE_SERVICE_ROLE_KEY claims: ${apikeySummary}`,
      },
      { status: 401 }
    );
  }

  const user = (await userRes.json()) as { id?: string; email?: string };
  const id = (user.id || "").trim();
  const email = (user.email || "").toLowerCase();
  const allowlist = (env.ADMIN_EMAILS || ADMIN_ALLOWLIST_FALLBACK)
    .split(",")
    .map((e) => e.trim().toLowerCase());

  if (!id || !email || !allowlist.includes(email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return { id, email };
}
