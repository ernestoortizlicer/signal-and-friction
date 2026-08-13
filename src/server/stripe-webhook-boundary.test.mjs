import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLegacyWebhookResponse } from './stripe-webhook-boundary.mjs';

test('missing signature is rejected, never acknowledged as success', () => {
  assert.deepEqual(
    classifyLegacyWebhookResponse(200, { error: 'Missing signature' }),
    { action: 'replace', status: 400, body: { error: 'Missing signature' } },
  );
});

test('invalid Stripe signature is rejected with 400', () => {
  const payload = { error: 'Webhook verification failed: invalid signature', received: true };
  assert.deepEqual(
    classifyLegacyWebhookResponse(200, payload),
    { action: 'replace', status: 400, body: payload },
  );
});

test('server misconfiguration remains retryable', () => {
  const payload = { error: 'Server misconfiguration', received: true };
  assert.deepEqual(
    classifyLegacyWebhookResponse(200, payload),
    { action: 'replace', status: 500, body: payload },
  );
});

test('database insert failure remains retryable', () => {
  const payload = { error: 'Payment recorded but DB insert failed: connection reset', received: true };
  assert.deepEqual(
    classifyLegacyWebhookResponse(200, payload),
    { action: 'replace', status: 500, body: payload },
  );
});

test('DB-enforced duplicate checkout session is acknowledged safely', () => {
  const payload = {
    error: 'Payment recorded but DB insert failed: duplicate key value violates unique constraint "payments_stripe_session_id_key"',
    received: true,
  };
  assert.deepEqual(
    classifyLegacyWebhookResponse(200, payload),
    { action: 'replace', status: 200, body: { received: true, duplicate: true } },
  );
});

test('an unrelated uniqueness failure is not mislabeled as a safe payment duplicate', () => {
  const payload = {
    error: 'Payment recorded but DB insert failed: duplicate key value violates unique constraint "some_other_key"',
    received: true,
  };
  assert.deepEqual(
    classifyLegacyWebhookResponse(200, payload),
    { action: 'replace', status: 500, body: payload },
  );
});

test('successful and intentionally ignored events pass through', () => {
  assert.deepEqual(
    classifyLegacyWebhookResponse(200, { received: true, success: true }),
    { action: 'passthrough', status: 200 },
  );
  assert.deepEqual(
    classifyLegacyWebhookResponse(200, { received: true, ignored: 'customer.created' }),
    { action: 'passthrough', status: 200 },
  );
});

test('existing non-200 responses remain unchanged', () => {
  assert.deepEqual(
    classifyLegacyWebhookResponse(503, { error: 'upstream unavailable' }),
    { action: 'passthrough', status: 503 },
  );
});

test('non-JSON or non-object 200 responses are not guessed into a failure class', () => {
  assert.deepEqual(
    classifyLegacyWebhookResponse(200, null),
    { action: 'passthrough', status: 200 },
  );
});
