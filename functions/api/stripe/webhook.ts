import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
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
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'Falta firma o secret del webhook' }, { status: 400 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-05-27.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'firma inválida';
    return Response.json({ error: `Webhook inválido: ${msg}` }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Idempotencia: evita duplicados si Stripe reintenta el evento.
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  if (existing) {
    return Response.json({ received: true, duplicate: true });
  }

  let productName: string | null = null;
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    productName = lineItems.data[0]?.description ?? null;
  } catch {
    // non-fatal: el pago se registra igualmente
  }

  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const referralCode = (session.metadata?.referral_code as string | undefined) ?? null;

  const { error } = await supabase.from('payments').insert({
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
  });

  if (error) {
    // 500 para que Stripe reintente y no se pierda el pago.
    return Response.json({ error: `No se pudo guardar el pago: ${error.message}` }, { status: 500 });
  }

  return Response.json({ received: true });
};
