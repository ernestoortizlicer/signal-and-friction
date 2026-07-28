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
 * Lives under functions/ (not src/lib) for the same reason as _models.ts —
 * Cloudflare esbuild can't resolve cross-directory imports into src/ at
 * function compile time. The leading `_` keeps Pages from treating this
 * module as a route.
 */

import { getSupabaseUrl, getServiceRoleKey } from "./_env";

const ADMIN_ALLOWLIST_FALLBACK = "ernestoortiz@gmail.com,ernestoortizlicer@gmail.com";

export interface AdminUser {
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
  // The actual root cause found in production 2026-07-28: this specific
  // value (not the URL) had a hidden trailing character, so Supabase
  // rejected it with "Invalid API key" — a 401 with a *valid, unexpired*
  // token, which reads exactly like an auth bug even though the token was
  // never the problem.
  const apikey = getServiceRoleKey(env);
  if (!apikey) {
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const token = authHeader.slice(7);
  const targetUrl = `${supabaseUrl}/auth/v1/user`;

  // Validate the URL itself before attempting to fetch it. An invalid URL
  // (e.g. from a hidden control character in the env var) throws here
  // synchronously with a specific, diagnosable message — as opposed to the
  // generic "Fetch API cannot load" TypeError fetch() throws for the same
  // underlying problem, which carries no further detail.
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
    // A network-level failure here (as opposed to a non-2xx from Supabase,
    // which is handled below) previously propagated as an uncaught
    // exception out of every admin-gated endpoint — Cloudflare then served
    // its own bare 500 with no body, so the real reason was never visible
    // anywhere, not even in logs the caller could see. Every caller of
    // requireAdmin depends on it resolving to either an AdminUser or a
    // Response; it must never throw.
    // 500, not 502/503/504 — Cloudflare's edge treats the 50x "gateway"
    // range as a signal the origin itself is down and substitutes its own
    // generic error page over whatever body the Worker actually returned,
    // even when the Worker ran successfully and produced valid JSON. 502
    // was confirmed to swallow this exact message in production.
    // err.message alone is the generic wrapper ("Fetch API cannot load: <url>")
    // — workerd's fetch() attaches the actual underlying reason (DNS
    // failure, connection reset, TLS error, etc.) as err.cause, which was
    // being silently discarded here. Surface it explicitly.
    // Passing new URL()'s validation doesn't rule out something workerd's
    // fetch() specifically rejects that the URL constructor tolerates —
    // show the exact JSON-escaped target so any invisible character shows
    // up as a visible escape sequence (\n, \t,  , etc.) either way.
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
    // Previously collapsed every non-OK response from Supabase into a bare
    // "Unauthorized" with no indication of what Supabase actually said
    // (expired token, malformed JWT, wrong project, etc.) or what the
    // token itself claims. Surface both — this is the same class of fix
    // as the fetch-failure branch above: don't let a real reason get
    // discarded on the way back to the caller.
    const supabaseBody = await userRes.text().catch(() => "(could not read response body)");
    const claims = decodeJwtPayloadForDiagnostics(token);
    const claimsSummary = claims
      ? `exp=${claims.exp ? new Date(Number(claims.exp) * 1000).toISOString() : "(none)"} (expired=${claims.exp ? Date.now() > Number(claims.exp) * 1000 : "unknown"}), email=${claims.email ?? "(none)"}, role=${claims.role ?? "(none)"}, sub=${claims.sub ?? "(none)"}, aud=${claims.aud ?? "(none)"}`
      : "token does not decode as a 3-segment JWT";
    return Response.json(
      {
        error: `Unauthorized — Supabase Auth responded ${userRes.status}: ${supabaseBody}. Token claims: ${claimsSummary}`,
      },
      { status: 401 }
    );
  }

  const user = (await userRes.json()) as { email?: string };
  const email = (user.email || "").toLowerCase();
  const allowlist = (env.ADMIN_EMAILS || ADMIN_ALLOWLIST_FALLBACK)
    .split(",")
    .map((e) => e.trim().toLowerCase());

  if (!email || !allowlist.includes(email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return { email };
}
