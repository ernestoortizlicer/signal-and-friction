import { requireAdmin } from '../_admin-auth';
import { postStripePaymentToFinanceBySessionId } from '../../../src/server/stripe-finance-posting';

type Env = Record<string, string>;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

/**
 * Explicit recovery tool, not a second payment processor.
 * Replays one already-known Stripe Checkout Session through canonical Finance
 * RPCs. Both gross revenue and exact Stripe fee writes are idempotent.
 */
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  let body: { sessionId?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid request body.' }, { status: 400, headers: CORS }); }

  const sessionId = String(body.sessionId ?? '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return Response.json({ error: 'A valid Stripe Checkout Session id is required.' }, { status: 400, headers: CORS });
  }

  try {
    const result = await postStripePaymentToFinanceBySessionId(sessionId, env as Parameters<typeof postStripePaymentToFinanceBySessionId>[1]);
    return Response.json({ ok: true, result }, { headers: CORS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Stripe Finance reconciliation failed.' }, { status: 500, headers: CORS });
  }
};
