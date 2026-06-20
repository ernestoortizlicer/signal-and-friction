// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: STRIPE INVOICE DRAFTER
// Path: supabase/functions/stripe-invoice/index.ts
// Description: Triggered via database webhook when project status goes to 'delivered'.
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    const stripeApiKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Parse database trigger payload
    const payload = await req.json();
    const { record, old_record } = payload;
    
    // Guard: Only execute if status has shifted to 'delivered' and payment is uninvoiced
    if (record.status !== "delivered" || record.payment_status !== "uninvoiced") {
      return new Response(JSON.stringify({ status: "ignored", reason: "Status is not 'delivered' or already invoiced." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("company_name, contact_name, contact_email")
      .eq("id", record.client_id)
      .single();
      
    if (clientError || !client) throw new Error("Client details not found.");
    
    // 1. Create or Find Stripe Customer & Invoice
    let invoiceId = "";
    
    if (stripeApiKey && stripeApiKey !== "sk_test_placeholder") {
      let stripeCustomerId = "";
      
      // Search existing customer by email
      const searchRes = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(client.contact_email || "")}`, {
        headers: {
          Authorization: `Bearer ${stripeApiKey}`,
        }
      });
      const searchData = await searchRes.json();
      
      if (searchData.data && searchData.data.length > 0) {
        stripeCustomerId = searchData.data[0].id;
      } else {
        // Create new customer
        const createRes = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeApiKey}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            name: client.contact_name,
            email: client.contact_email || "",
            description: `Company: ${client.company_name}`
          })
        });
        const customer = await createRes.json();
        stripeCustomerId = customer.id;
      }
      
      // 2. Map symbolic_price_charged to the corresponding Stripe Price ID
      let priceId = "";
      const amountCharged = record.symbolic_price_charged || 350;
      try {
        const { data: dbPriceLink } = await supabase
          .from("stripe_payment_links")
          .select("price_id")
          .eq("amount", Math.round(amountCharged * 100))
          .maybeSingle();
        if (dbPriceLink) {
          priceId = dbPriceLink.price_id;
        }
      } catch (_err) {
        // ignore db error, fallback to hardcoded
      }
      if (!priceId) {
        priceId = amountCharged === 2000 ? "price_dfy_beta_diagnostic" : "price_dwy_beta_diagnostic";
      }

      // Create Invoice Item using the Stripe Price ID
      const invoiceItemRes = await fetch("https://api.stripe.com/v1/invoiceitems", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeApiKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          customer: stripeCustomerId,
          price: priceId
        })
      });
      
      if (!invoiceItemRes.ok) {
        throw new Error(`Failed to create Stripe Invoice Item: ${await invoiceItemRes.text()}`);
      }
      
      // 3. Create Draft Invoice
      const invoiceRes = await fetch("https://api.stripe.com/v1/invoices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeApiKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          customer: stripeCustomerId,
          auto_advance: "true", // Automatically finalize and email draft once ready
          collection_method: "send_invoice",
          days_until_due: "7"
        })
      });
      const invoice = await invoiceRes.json();
      
      if (!invoiceRes.ok) {
        throw new Error(`Failed to create Stripe Invoice: ${JSON.stringify(invoice)}`);
      }
      invoiceId = invoice.id;
    } else {
      // Stripe key not configured — simulation mode
      invoiceId = `in_mock_${Math.random().toString(36).substring(2, 10)}`;
    }
    
    // 4. Update project payment_status & log invoice ID
    const { error: updateError } = await supabase
      .from("beta_projects")
      .update({ 
        payment_status: "invoiced_unpaid",
        updated_at: new Date().toISOString()
      })
      .eq("id", record.id);
      
    if (updateError) throw updateError;
    
    // Log invoice creation
    await supabase.from("activity_log").insert({
      client_id: record.client_id,
      action: "INVOICE_CREATED",
      details: { stripe_invoice_id: invoiceId, amount: record.symbolic_price_charged || 350.00 }
    });
    
    return new Response(JSON.stringify({ status: "success", invoice_id: invoiceId }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return new Response(JSON.stringify({ status: "error", message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
