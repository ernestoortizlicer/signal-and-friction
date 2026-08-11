// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: CERTIFICATION ONBOARDING — ARCHIVED
//
// Certified is not an active Signal & Friction offer. This endpoint is kept
// only as a defensive compatibility boundary so stale clients cannot create
// checkout sessions, simulated success states, or practitioner activations.
// Re-activation requires a new approved product decision and a migration back
// through the canonical offer architecture in src/lib/offer-catalog.ts.
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://signal-and-friction.com",
  "https://www.signal-and-friction.com",
  "https://signal-and-friction.pages.dev",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin =
    ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".signal-and-friction.pages.dev")
      ? origin
      : "https://signal-and-friction.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      status: "archived",
      code: "certified_not_available",
      message: "S&F Certified is not accepting new enrollments or activations.",
    }),
    {
      status: 410,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
});
