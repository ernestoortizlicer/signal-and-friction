// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: TALLY WEBHOOK RECEIVER
// Path: supabase/functions/tally-webhook/index.ts
// Description: Receives Tally form submissions, extracts URL,
//              email, bottleneck, segment selection, custom answers, and routes.
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
  const allowedOrigin = ALLOWED_ORIGINS.some((o) => origin.startsWith(o) || origin.endsWith(".signal-and-friction.pages.dev"))
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
    
    // Parse webhook payload
    const body = await req.json();
    const fields = body.data?.fields || [];
    
    if (fields.length === 0) {
      return new Response(JSON.stringify({ status: "ignored", message: "Empty submission fields." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Parse redesigned form questions
    let rawUrl = "";
    let funnelPain = "";
    let segmentSelection = "concierge"; // default
    let customAnswer = "";
    let email = "";

    // Robust mapping checking both field keys and label contents
    for (const field of fields) {
      const label = (field.label || "").toLowerCase();
      const key = (field.key || "").toLowerCase();
      const value = field.value;

      if (!value) continue;

      if (key.includes("url") || label.includes("url") || label.includes("landing page") || label.includes("website")) {
        rawUrl = value;
      } else if (key.includes("funnel") || label.includes("funnel") || label.includes("drop-off") || label.includes("bottleneck") || label.includes("dropouts") || label.includes("product")) {
        funnelPain = value;
      } else if (key.includes("segment") || label.includes("segment") || label.includes("how do you want") || label.includes("preference")) {
        segmentSelection = value;
      } else if (key.includes("mrr") || key.includes("expertise") || label.includes("mrr") || label.includes("expertise") || label.includes("level") || label.includes("goal")) {
        customAnswer = value;
      } else if (key.includes("email") || label.includes("email") || label.includes("send")) {
        email = value;
      }
    }

    // Validation
    if (!email) {
      return new Response(JSON.stringify({ status: "error", message: "Email is a required field." }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Clean URL and parse company name
    let companyName = "Unknown Startup";
    if (rawUrl) {
      try {
        let cleanUrl = rawUrl;
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
          cleanUrl = "https://" + cleanUrl;
        }
        const parsedUrl = new URL(cleanUrl);
        let host = parsedUrl.hostname;
        if (host.startsWith("www.")) {
          host = host.substring(4);
        }
        const parts = host.split(".");
        if (parts.length > 0) {
          companyName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }
      } catch (_e) {
        companyName = rawUrl;
      }
    }

    // Split contact name from email prefix
    let contactName = "Founder";
    const emailParts = email.split("@");
    if (emailParts.length > 0 && emailParts[0]) {
      const rawName = emailParts[0];
      contactName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }

    // Map segmentSelection to ENUM values: 'high_ticket' or 'microdosing'
    let mappedSegment = "high_ticket";
    if (
      segmentSelection.toLowerCase().includes("autonomy") || 
      segmentSelection.toLowerCase().includes("microdosing") || 
      segmentSelection.toLowerCase().includes("learn")
    ) {
      mappedSegment = "microdosing";
    }

    // 1. Check if client already exists to prevent duplication
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("contact_email", email)
      .maybeSingle();

    let clientId = "";
    if (existingClient) {
      clientId = existingClient.id;
      // Update client info
      await supabase
        .from("clients")
        .update({ 
          company_name: companyName,
          contact_name: contactName,
          industry: rawUrl || "Web Application",
          segment: mappedSegment,
          custom_fields: { segment_raw: segmentSelection, custom_answer: customAnswer },
          updated_at: new Date().toISOString()
        })
        .eq("id", clientId);
    } else {
      // 2. Insert new client (trigger will auto-create beta_project)
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({
          company_name: companyName,
          contact_name: contactName,
          contact_email: email,
          industry: rawUrl || "Web Application",
          source_platform: "Tally Form",
          segment: mappedSegment,
          custom_fields: { segment_raw: segmentSelection, custom_answer: customAnswer }
        })
        .select("id")
        .single();

      if (clientErr) throw clientErr;
      clientId = newClient.id;
    }

    // Map funnelPain to CHECK constraint dominant_friction_mechanism:
    // 'cognitive_load', 'trust_deficit', 'value_deficit', 'sequence_order'
    let mappedMechanism = "cognitive_load";
    const painLower = funnelPain.toLowerCase();
    if (painLower.includes("bounce") || painLower.includes("landing")) {
      mappedMechanism = "value_deficit";
    } else if (painLower.includes("billing") || painLower.includes("paywall") || painLower.includes("gate")) {
      mappedMechanism = "trust_deficit";
    } else if (painLower.includes("onboarding") || painLower.includes("dropout") || painLower.includes("setup")) {
      mappedMechanism = "cognitive_load";
    } else if (painLower.includes("pricing") || painLower.includes("confusion")) {
      mappedMechanism = "sequence_order";
    }

    // Update beta_projects metrics, pricing and phase
    const pricing = mappedSegment === "microdosing" ? 350.00 : 2000.00;
    await supabase
      .from("beta_projects")
      .update({
        custom_metrics: { segment_raw: segmentSelection, custom_answer: customAnswer },
        current_phase: "diagnostic",
        symbolic_price_charged: pricing
      })
      .eq("client_id", clientId);

    // 3. Create CRM Interaction mapping
    const { error: interactionErr } = await supabase
      .from("interactions")
      .insert({
        client_id: clientId,
        funnel_signal: `Tally Submission URL: ${rawUrl}`,
        dominant_friction_mechanism: mappedMechanism,
        root_cause_description: `Routing: ${mappedSegment.toUpperCase()} | Answer: ${customAnswer || "None"}`
      });

    if (interactionErr) throw interactionErr;

    // Log the event
    await supabase.from("activity_log").insert({
      client_id: clientId,
      action: "FORM_SUBMITTED",
      details: { source: "Tally", bottleneck: funnelPain, segment: mappedSegment }
    });

    // Query appropriate Stripe Payment Link based on the segment (Beta Diagnostic phase)
    const priceId = mappedSegment === "microdosing" ? "price_dwy_beta_diagnostic" : "price_dfy_beta_diagnostic";
    const { data: linkData } = await supabase
      .from("stripe_payment_links")
      .select("payment_link_url")
      .eq("price_id", priceId)
      .maybeSingle();

    const paymentLinkUrl = linkData?.payment_link_url || `https://buy.stripe.com/mock_${mappedSegment}_beta_diagnostic`;

    return new Response(JSON.stringify({ 
      status: "success", 
      message: "Lead processed successfully.",
      client_id: clientId,
      company: companyName,
      segment: mappedSegment,
      payment_link: paymentLinkUrl
    }), {
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return new Response(JSON.stringify({ status: "error", message }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 500,
    });
  }
});
