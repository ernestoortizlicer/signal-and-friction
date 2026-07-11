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

const ADMIN_ALLOWLIST_FALLBACK = "ernestoortiz@gmail.com,ernestoortizlicer@gmail.com";

export interface AdminUser {
  email: string;
}

export async function requireAdmin(
  request: Request,
  env: Record<string, string>
): Promise<AdminUser | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = env.SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
  const apikey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apikey) {
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const token = authHeader.slice(7);
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
  });
  if (!userRes.ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
