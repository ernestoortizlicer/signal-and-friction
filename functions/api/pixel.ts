/**
 * GET /api/pixel?client=acme-corp
 *
 * Returns a 1×1 transparent GIF immediately.
 * Logs a view event to Supabase `deliverable_view_events` in the background
 * (ctx.waitUntil — non-blocking, does not slow the pixel response).
 *
 * Bot filtering: skips known crawlers, link-preview agents, and social bots.
 *
 * Required Supabase table (run once):
 *   CREATE TABLE deliverable_view_events (
 *     id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     client_key  TEXT NOT NULL,
 *     viewed_at   TIMESTAMPTZ DEFAULT NOW(),
 *     user_agent  TEXT,
 *     country     TEXT
 *   );
 *   CREATE INDEX ON deliverable_view_events (client_key, viewed_at DESC);
 */

const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
  0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00,
  0x21, 0xf9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0x02, 0x02, 0x44, 0x01, 0x00,
  0x3b,
]);

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discord|slack|meta-externalagent/i;

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  POSTHOG_API_KEY: string;
}

interface ExecutionContext {
  waitUntil(p: Promise<unknown>): void;
}

async function logView(
  env: Env,
  clientKey: string,
  userAgent: string,
  country: string,
): Promise<void> {
  await Promise.allSettled([
    // Supabase event log
    fetch(`${env.SUPABASE_URL}/rest/v1/deliverable_view_events`, {
      method: "POST",
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ client_key: clientKey, user_agent: userAgent, country }),
    }),
    // PostHog — prospect engagement event
    env.POSTHOG_API_KEY
      ? fetch("https://app.posthog.com/capture/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: env.POSTHOG_API_KEY,
            event: "deliverable_viewed",
            distinct_id: `prospect-${clientKey}`,
            properties: {
              client_key: clientKey,
              country,
              user_agent_snippet: userAgent.slice(0, 120),
            },
            timestamp: new Date().toISOString(),
          }),
        })
      : Promise.resolve(),
  ]);
}

export const onRequestGet = async ({
  request,
  env,
  ctx,
}: {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
}): Promise<Response> => {
  const ua = request.headers.get("User-Agent") ?? "";
  const gif = new Response(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });

  if (BOT_UA.test(ua)) return gif;

  const url = new URL(request.url);
  const clientKey = url.searchParams.get("client")?.slice(0, 64) ?? "";
  if (!clientKey || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return gif;

  const country = request.headers.get("CF-IPCountry") ?? "XX";

  ctx.waitUntil(logView(env, clientKey, ua.slice(0, 512), country));
  return gif;
};
