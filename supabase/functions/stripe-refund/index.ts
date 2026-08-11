// RETIRED LEGACY MUTATION BOUNDARY
//
// The old path refunded an amount derived from beta_projects without naming
// the original Stripe PaymentIntent/charge. On provider failure it generated
// a simulated refund ID and still marked the guarantee refunded. That is a
// fabricated financial success state. Until refund authorization is tied to
// an exact commercial transaction, refunds remain a deliberate Stripe-admin
// operation and this endpoint fails closed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(() =>
  new Response(
    JSON.stringify({
      status: "retired",
      error:
        "Legacy simulated refunds are disabled. Refund the exact Stripe transaction through the controlled operations workflow.",
    }),
    {
      status: 409,
      headers: { "Content-Type": "application/json" },
    }
  )
);
