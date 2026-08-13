import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { provisionPaymentScaffoldBySessionId } from './_provision-payment';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

interface Payload {
  paymentId?: string;
  stripeSessionId?: string;
}

export const onRequestPost = async ({ request, env }: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }

  if (!!payload.paymentId === !!payload.stripeSessionId) {
    return Response.json(
      { error: 'Provide exactly one of paymentId or stripeSessionId' },
      { status: 400, headers: CORS }
    );
  }

  let stripeSessionId = payload.stripeSessionId?.trim() || '';
  if (payload.paymentId) {
    const serviceRoleKey = getServiceRoleKey(env);
    if (!serviceRoleKey) {
      return Response.json({ error: 'Server misconfiguration' }, { status: 500, headers: CORS });
    }
    const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: payment, error } = await supabase
      .from('payments')
      .select('stripe_session_id')
      .eq('id', payload.paymentId)
      .maybeSingle();
    if (error || !payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404, headers: CORS });
    }
    stripeSessionId = payment.stripe_session_id;
  }

  const result = await provisionPaymentScaffoldBySessionId(stripeSessionId, env, {
    allowNeedsInput: true,
  });

  const status = result.status === 'retryable' ? 503 : 200;
  return Response.json(result, { status, headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
