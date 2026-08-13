import { onRequestPost as legacyOnRequestPost } from '../../../src/server/stripe/legacy-handler';
import { classifyLegacyWebhookResponse } from '../../../src/server/stripe-webhook-boundary.mjs';

type LegacyContext = Parameters<typeof legacyOnRequestPost>[0];
type PaymentsContext = Omit<LegacyContext, 'env'> & {
  env: Omit<LegacyContext['env'], 'STRIPE_WEBHOOK_SECRET'> & {
    STRIPE_PAYMENTS_WEBHOOK_SECRET: string;
  };
};

/**
 * Dedicated Snapshot payment-event transport boundary.
 *
 * The existing /api/stripe/webhook route remains bound to the pre-existing
 * Stripe Event Destination and its STRIPE_WEBHOOK_SECRET. Payment events use
 * a separate route + signing secret so two Stripe destinations never compete
 * for one verification secret.
 */
export const onRequestPost = async (context: PaymentsContext): Promise<Response> => {
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
  if (classification.action === 'passthrough') {
    return innerResponse;
  }

  return Response.json(classification.body, {
    status: classification.status,
    headers: { 'Cache-Control': 'no-store' },
  });
};
