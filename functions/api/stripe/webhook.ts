import { onRequestPost as legacyOnRequestPost } from '../../../src/server/stripe/legacy-handler';
import { classifyLegacyWebhookResponse } from '../../../src/server/stripe-webhook-boundary.mjs';

type LegacyContext = Parameters<typeof legacyOnRequestPost>[0];

/**
 * Public Stripe webhook transport boundary.
 *
 * The existing payment-processing implementation is preserved as an internal
 * compatibility unit for this narrow P0. This boundary corrects only the
 * externally observable HTTP semantics so Stripe can distinguish invalid
 * requests, retryable processing failures, safe duplicates, and success.
 *
 * Follow-up: collapse the internal compatibility handler once the commercial
 * lifecycle refactor is validated. Do not expand this adapter into a second
 * business-logic owner.
 */
export const onRequestPost = async (context: LegacyContext): Promise<Response> => {
  const innerResponse = await legacyOnRequestPost(context);

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
