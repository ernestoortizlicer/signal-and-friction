import { onRequestPost as legacyOnRequestPost } from '../../../src/server/stripe/legacy-handler';
import { classifyLegacyWebhookResponse } from '../../../src/server/stripe-webhook-boundary.mjs';
import { provisionPaymentScaffoldBySessionId } from '../scaffolds/_provision-payment';
import { handleReferralStripeEvent } from './_referrals';

type LegacyContext = Parameters<typeof legacyOnRequestPost>[0];
type PaymentsContext = Omit<LegacyContext, 'env'> & {
  env: Omit<LegacyContext['env'], 'STRIPE_WEBHOOK_SECRET'> & {
    STRIPE_PAYMENTS_WEBHOOK_SECRET: string;
  };
  waitUntil?: (promise: Promise<unknown>) => void;
};

type VerifiedEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

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

  if (response.status === 200 && typeof context.waitUntil === 'function') {
    context.waitUntil((async () => {
      let event: VerifiedEvent;
      try {
        event = await provisioningRequest.json() as VerifiedEvent;
      } catch (err) {
        console.warn(`Stripe post-processing parse failed: ${err instanceof Error ? err.message : 'unknown error'}`);
        return;
      }

      try {
        await handleReferralStripeEvent(event, context.env);
      } catch (err) {
        console.warn(`Referral lifecycle processing failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      }

      if (event.type !== 'checkout.session.completed') return;
      const sessionId = typeof event.data?.object?.id === 'string' ? event.data.object.id : null;
      if (!sessionId) return;

      try {
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
