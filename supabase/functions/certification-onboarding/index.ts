// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: CERTIFICATION ONBOARDING
// Path: supabase/functions/certification-onboarding/index.ts
// Description: Onboards agencies into the S&F Certified™ program.
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials in environment variables.");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse payload
    const body = await req.json();
    const { name, email, agency, website, tier, action } = body;

    if (!email || !name || !agency) {
      return new Response(JSON.stringify({ status: "error", message: "Name, email, and agency are required." }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      });
    }

    const stripeApiKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const origin = req.headers.get("origin") || "https://signal-and-friction.pages.dev";

    const CERTIFIED_PRICES: Record<string, string> = {
      annual:  Deno.env.get("STRIPE_PRICE_CERTIFIED_ANNUAL")  ?? "price_1TkqnwHv7TExyozUG4zwTCmP",
      monthly: Deno.env.get("STRIPE_PRICE_CERTIFIED_MONTHLY") ?? "price_1TkqnwHv7TExyozUWjn59T5y",
      renewal: Deno.env.get("STRIPE_PRICE_CERTIFIED_RENEWAL") ?? "price_1Tkqp5Hv7TExyozUQkj9swnM",
    };

    if (action !== "activate") {
      // Create Stripe Checkout Session or Simulated URL
      if (stripeApiKey && stripeApiKey !== "sk_test_placeholder") {
        try {
          const priceId = CERTIFIED_PRICES[tier] || CERTIFIED_PRICES.annual;
          const bodyParams = new URLSearchParams();
          bodyParams.append("mode", "subscription"); // all tiers are recurring
          bodyParams.append("customer_email", email);
          bodyParams.append("success_url", `${origin}/certified?success=true&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&agency=${encodeURIComponent(agency)}&website=${encodeURIComponent(website || "")}&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`);
          bodyParams.append("cancel_url", `${origin}/certified?cancelled=true`);
          bodyParams.append("line_items[0][price]", priceId);
          bodyParams.append("line_items[0][quantity]", "1");

          const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${stripeApiKey}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: bodyParams.toString()
          });
          const session = await sessionRes.json();
          if (session.error) {
            throw new Error(session.error.message);
          }
          return new Response(JSON.stringify({ checkout_url: session.url }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 200
          });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Stripe error";
          console.warn("Stripe Checkout Session creation failed, falling back to simulation:", errMsg);
          const simulatedUrl = `${origin}/certified?success=true&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&agency=${encodeURIComponent(agency)}&website=${encodeURIComponent(website || "")}&tier=${tier}&simulated=true`;
          return new Response(JSON.stringify({ checkout_url: simulatedUrl }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 200
          });
        }
      } else {
        const simulatedUrl = `${origin}/certified?success=true&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&agency=${encodeURIComponent(agency)}&website=${encodeURIComponent(website || "")}&tier=${tier}&simulated=true`;
        return new Response(JSON.stringify({ checkout_url: simulatedUrl }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200
        });
      }
    }

    // 1. Check if client exists
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("contact_email", email)
      .maybeSingle();

    let clientId = "";
    if (existingClient) {
      clientId = existingClient.id;
      // Update existing client to be certified
      await supabase
        .from("clients")
        .update({
          company_name: agency,
          contact_name: name,
          industry: website || "Web Application",
          is_certified: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", clientId);
    } else {
      // Create new client
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({
          company_name: agency,
          contact_name: name,
          contact_email: email,
          industry: website || "Web Application",
          source_platform: "Certified Portal",
          is_certified: true,
          segment: "microdosing" // Default segment for certified agencies
        })
        .select("id")
        .single();

      if (clientErr) throw clientErr;
      clientId = newClient.id;
    }

    // 2. Fetch the default certification program
    const { data: program, error: progErr } = await supabase
      .from("certification_programs")
      .select("id, name, curriculum")
      .limit(1)
      .single();

    if (progErr || !program) {
      throw new Error("No certification program seeded in the database. Run migration first.");
    }

    // 3. Upsert into certified_practitioners
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

    const { data: practitioner, error: pracErr } = await supabase
      .from("certified_practitioners")
      .upsert({
        client_id: clientId,
        program_id: program.id,
        status: "active",
        satisfaction_score: 100,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: "client_id,program_id" })
      .select("id")
      .single();

    if (pracErr) throw pracErr;

    // 4. Log activity
    await supabase.from("activity_log").insert({
      client_id: clientId,
      action: "CERTIFICATION_COMPLETED",
      details: { program: program.name, tier }
    });

    return new Response(JSON.stringify({
      status: "success",
      message: "Practitioner certified successfully.",
      practitioner_id: practitioner.id,
      client_id: clientId,
      program: program.name,
      curriculum: program.curriculum,
      expires_at: expiresAt.toISOString(),
      playbook_url: "https://c5b84e7e.signal-and-friction.pages.dev/playbook-v2.pdf",
      badge_url: "https://c5b84e7e.signal-and-friction.pages.dev/sf_linkedin_banner.png"
    }), {
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      },
      status: 200,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return new Response(JSON.stringify({ status: "error", message }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      },
      status: 500,
    });
  }
});
