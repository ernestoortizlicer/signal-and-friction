export function classifyLegacyWebhookResponse(status, payload) {
  if (status !== 200 || !payload || typeof payload !== 'object') {
    return { action: 'passthrough', status };
  }

  const error = typeof payload.error === 'string' ? payload.error : null;
  if (!error) {
    return { action: 'passthrough', status };
  }

  const normalized = error.toLowerCase();

  if (
    normalized.includes('missing signature') ||
    normalized.includes('webhook verification failed')
  ) {
    return { action: 'replace', status: 400, body: payload };
  }

  // Production has a DB UNIQUE constraint on payments.stripe_session_id.
  // If concurrent deliveries race past the legacy read-before-insert check,
  // the database is the authority: the second delivery is a safe duplicate,
  // not a payment-processing failure that should be retried forever.
  if (
    normalized.includes('duplicate key') &&
    (normalized.includes('payments_stripe_session_id_key') || normalized.includes('stripe_session_id'))
  ) {
    return {
      action: 'replace',
      status: 200,
      body: { received: true, duplicate: true },
    };
  }

  // Any other legacy error means the public webhook boundary did not prove
  // successful processing. Preserve retryability instead of acknowledging a
  // false success to Stripe.
  return { action: 'replace', status: 500, body: payload };
}
