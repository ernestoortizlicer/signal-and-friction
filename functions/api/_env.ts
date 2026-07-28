/**
 * Trimmed Supabase env var accessors.
 * ════════════════════════════════════════════════════════════════════════════
 * Every server-side Function must read SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY through these, never via env.X directly. A
 * secret pasted into the Cloudflare dashboard or set via
 * `wrangler pages secret put` can silently carry a trailing newline or
 * space. Confirmed in production on 2026-07-28: an untrimmed URL produces
 * a malformed fetch() target ("Fetch API cannot load", no cause — the
 * rejection happens at URL-parse time, before any network attempt), and an
 * untrimmed service-role key gets rejected by Supabase itself ("Invalid
 * API key — check your anon or service_role key"). Both failures return a
 * clean, valid-looking token/response right up until the corrupted value
 * is used, so they're easy to misdiagnose as an auth or network problem.
 *
 * Lives under functions/ (not src/lib) for the same reason as _models.ts —
 * Cloudflare esbuild can't resolve cross-directory imports into src/ at
 * function compile time. The leading `_` keeps Pages from treating this
 * module as a route.
 */

const DEFAULT_SUPABASE_URL = "https://tsaarsuuclvkjsgjcmoj.supabase.co";

// Deliberately just the two properties this module cares about, not
// Record<string, string> — every caller has its own stricter Env interface
// (no index signature) for its other bindings, and TS won't let those pass
// through a Record<string,string> parameter. A narrow structural type here
// accepts any of them without forcing an index signature on every caller.
interface SupabaseEnvVars {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export function getSupabaseUrl(env: SupabaseEnvVars): string {
  return (env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
}

export function getServiceRoleKey(env: SupabaseEnvVars): string | undefined {
  return env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
}
