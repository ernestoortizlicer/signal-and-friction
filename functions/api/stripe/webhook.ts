import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY?: string;
}

function inferSegment(productName: string | null): 'DFY' | 'DWY' | null {
  if (!productName) return null;
  const n = productName.toLowerCase();
  if (n.includes('dfy')) return 'DFY';
  if (n.includes('dwy')) return 'DWY';
  return null;
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  try {
    // 🔴 CRITICAL: Always return 200 to Stripe for non-fatal errors
    // Stripe needs 200-299 to consider delivery successful
    
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      console.error('❌ Missing stripe-signature header');
      return Response.json({ error: 'Missing signature' }, { status: 200 });
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ Missing STRIPE_WEBHOOK_SECRET in environment');
      return Response.json({ error: 'Server misconfiguration' }, { status: 200 });
    }

    if (!env.STRIPE_SECRET_KEY) {
      console.error('❌ Missing STRIPE_SECRET_KEY in environment');
      return Response.json({ error: 'Server misconfiguration' }, { status: 200 });
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'invalid signature';
      console.error(`❌ Webhook signature verification failed: ${msg}`);
      // Return 200 to tell Stripe we received it (even though signature failed)
      return Response.json({ error: `Webhook verification failed: ${msg}`, received: true }, { status: 200 });
    }

    // Only process checkout.session.completed events
    if (event.type !== 'checkout.session.completed') {
      console.log(`✓ Ignoring event type: ${event.type}`);
      return Response.json({ received: true, ignored: event.type }, { status: 200 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials in environment');
      return Response.json({ error: 'Server misconfiguration', received: true }, { status: 200 });
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Idempotency: prevent duplicates if Stripe retries
    const { data: existing, error: checkError } = await supabase
      .from('payments')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (checkError) {
      console.error(`⚠️ Error checking for existing payment: ${checkError.message}`);
      // Continue processing anyway - better to process twice than lose payment
    }

    if (existing) {
      console.log(`✓ Payment already recorded: ${session.id}`);
      return Response.json({ received: true, duplicate: true }, { status: 200 });
    }

    let productName: string | null = null;
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      productName = lineItems.data[0]?.description ?? null;
    } catch (err) {
      console.warn(`⚠️ Failed to fetch line items: ${err instanceof Error ? err.message : 'unknown error'}`);
      // Non-fatal: payment is recorded anyway
    }

    const email = session.customer_details?.email ?? session.customer_email ?? null;

    // Referral capture — robust to how the code reaches Stripe.
    // The app carries the referral as `sf_referral_ref` and (now) appends it to the
    // Payment Link as `client_reference_id`. Read all known channels, in priority order.
    const referralCode =
      session.client_reference_id ??
      (session.metadata?.sf_referral_ref as string | undefined) ??
      (session.metadata?.referral_code as string | undefined) ??
      null;

    if (!email) {
      console.warn('⚠️ No email found in checkout session');
      // Still process - email may be optional for some flows
    }

    // lead_id has no FK constraint (see the migration that documents this
    // table), so nothing enforced it being set — it just silently stayed
    // null on every payment, and the admin dashboard could show a revenue
    // total but never which client actually paid. Look up the client the
    // checkout email belongs to and link it here.
    let leadId: string | null = null;
    if (email) {
      try {
        const { data: matchedClient } = await supabase
          .from('clients')
          .select('id')
          .eq('contact_email', email)
          .maybeSingle();
        leadId = matchedClient?.id ?? null;
      } catch (err) {
        console.warn(`⚠️ Client lookup for lead_id failed (non-fatal): ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }

    const { error: insertError } = await supabase.from('payments').insert({
      stripe_session_id: session.id,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      email,
      amount_total: session.amount_total,
      currency: session.currency,
      product_name: productName,
      segment: inferSegment(productName),
      referral_code: referralCode,
      raw_event: event as unknown as Record<string, unknown>,
      lead_id: leadId,
    });

    if (insertError) {
      console.error(`❌ Failed to insert payment record: ${insertError.message}`);
      // Still return 200 to prevent Stripe from retrying endlessly
      // Log this for manual review
      return Response.json(
        { error: `Payment recorded but DB insert failed: ${insertError.message}`, received: true },
        { status: 200 }
      );
    }

    console.log(`✅ Payment processed successfully: ${session.id} | Amount: ${session.amount_total} ${session.currency}`);

    // Send the customer confirmation email. Non-fatal: a delivery failure must never
    // cause Stripe to retry the webhook (the payment is already recorded above).
    if (email && env.RESEND_API_KEY) {
      try {
        await sendPaymentConfirmation(env.RESEND_API_KEY, {
          email,
          productName,
          amountTotal: session.amount_total,
          currency: session.currency,
        });
      } catch (err) {
        console.warn(`⚠️ Confirmation email failed (payment still recorded): ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    } else if (!env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not set — skipping confirmation email');
    }

    return Response.json({ received: true, success: true }, { status: 200 });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'unknown error';
    console.error(`❌ Unhandled error in Stripe webhook: ${errorMsg}`);
    // CRITICAL: Always return 200 to Stripe, even on catastrophic errors
    // Otherwise Stripe will keep retrying forever
    return Response.json({ error: errorMsg, received: true }, { status: 200 });
  }
};

interface ConfirmationParams {
  email: string;
  productName: string | null;
  amountTotal: number | null;
  currency: string | null;
}

/**
 * Resend confirmation email to the paying customer.
 * Throws on a failed send so the caller can log it without affecting the 200 response.
 */
async function sendPaymentConfirmation(apiKey: string, params: ConfirmationParams): Promise<void> {
  const { email, productName, amountTotal, currency } = params;

  const amountLabel =
    amountTotal != null && currency
      ? `${(amountTotal / 100).toFixed(2)} ${currency.toUpperCase()}`
      : 'your diagnostic fee';
  const product = productName ?? 'Diagnostic Protocol';

  const html = `
<html>
  <body style="margin:0;background:#0A0908;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;color:#F5F0EB;">
      <div style="font-family:monospace;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#5C9A6B;">Payment Confirmed</div>
      <h1 style="font-size:26px;font-weight:700;margin:16px 0 8px;">Diagnostic Protocol <span style="color:#D4A853;">Activated</span></h1>
      <p style="color:#B0A89E;font-size:14px;line-height:1.6;">
        We've received <strong style="color:#F5F0EB;">${amountLabel}</strong> for <strong style="color:#F5F0EB;">${product}</strong>.
        Your clinical diagnostic and Loom walkthrough will arrive at this inbox within
        <strong style="color:#F5F0EB;">72 hours</strong>. No calls. No meetings. Just the deliverable.
      </p>
      <div style="border:1px solid rgba(212,168,83,0.15);background:rgba(212,168,83,0.03);padding:20px;margin-top:24px;border-radius:8px;">
        <p style="margin:0;color:#B0A89E;font-size:13px;line-height:1.6;">
          One Signal. One Friction. One Decision. Backed by the S&amp;F Specificity Guarantee — full refund if the finding isn't specific to your product.
        </p>
      </div>
      <p style="color:#7A6F65;font-size:12px;margin-top:32px;">— Signal &amp; Friction</p>
    </div>
  </body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Signal & Friction <hello@signal-and-friction.com>',
      to: email,
      subject: 'Payment confirmed — your diagnostic is in motion',
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
  }
}
