// RETIRED LEGACY MUTATION BOUNDARY
//
// This function previously selected a product by amount, guessed a fallback
// Diagnostic, and created an invoice outside any commercial engagement. That
// permits an unknown client/project state to become a real Stripe obligation.
// Invoicing must be rebuilt against an exact commercial_engagements row and an
// immutable provider price binding before it can be enabled again.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(() =>
  new Response(
    JSON.stringify({
      status: "retired",
      error:
        "Legacy amount-derived invoicing is disabled. Authorize checkout through the canonical commercial engagement boundary.",
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    }
  )
);
