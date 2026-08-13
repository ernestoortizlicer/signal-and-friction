import { onRequestPost as legacyOnRequestPost } from '../../../src/server/stripe/legacy-handler';
import { classifyLegacyWebhookResponse } from '../../../src/server/stripe-webhook-boundary.mjs';
import { provisionPaymentScaffoldBySessionId } from '../scaffolds/_provision-payment';

type LegacyContext = Parameters<typeof legacyOnRequestPost>[0];
type PaymentsContext = Omit<LegacyContext, 'env'> & {
  env: Omit<LegacyContext['env'], 'STRIPE_WEBHOOK_SECRET'> & {
    STRIPE_PAYMENTS_WEBHOOK_SECRET: string;
  };
  waitUntil?: (promise: Promise<unknown>) => void;
};

/**
 * Dedicated Snapshot payment-event transport boundary.
 *
 * The existing /api/stripe/webhook route remains bound to the pre-existing
 * Stripe Event Destination and its STRIPE_WEBHOOK_SECRET. Payment events use
 * a separate route + signing secret so two Stripe destinations never compete
 * for one verification secret.
 *
 * Payment acknowledgement and scaffold provisioning are deliberately split:
 * the private payment processor commits canonical payment truth first. Only
 * after the signed event is safely acknowledged do we schedule best-effort
 * background scaffold provisioning. The DB outbox remains durable if the
 * background task is interrupted or the external scan fails.
 */
export const onRequestPost = async (context: PaymentsContext): Promise<Response> => {
  const provisioningRequest = context.request.clone();

  const innerResponse = await legacyOnRequestPost({
    ...context,
    env: {
      ...context.env,
      STRIPE_WEBHOOK_SECRET: context.env.STRIPE_PAYMENTS_WEBHOOK_SECRET,
    },
  });

  let payload: unknown;
  try {
    payload = await innerResponse.clone().json();
  } catch {
    return innerResponse;
  }

  const classification = classifyLegacyWebhookResponse(innerResponse.status, payload);
  const response = classification.action === 'passthrough'
    ? innerResponse
    : Response.json(classification.body, {
        status: classification.status,
        headers: { 'Cache-Control': 'no-store' },
      });

  // Never launch downstream work for an invalid signature, retryable payment
  // failure, or unrelated event. The raw event body is only inspected after
  // the inner processor has already verified the Stripe signature and the
  // transport classifier has accepted the payment handling result.
  if (response.status === 200 && typeof context.waitUntil === 'function') {
    context.waitUntil((async () => {
      try {
        const event = await provisioningRequest.json() as {
          type?: string;
          data?: { object?: { id?: string } };
        };
        if (event.type !== 'checkout.session.completed') return;
        const sessionId = event.data?.object?.id;
        if (!sessionId) return;

        const result = await provisionPaymentScaffoldBySessionId(sessionId, context.env);
        if (result.status === 'retryable' || result.status === 'needs_input') {
          console.warn(`Scaffold provisioning deferred: ${result.status}/${result.reason}`);
        }
      } catch (err) {
        console.warn(`Scaffold provisioning background task failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    })());
  }

  return response;
};
