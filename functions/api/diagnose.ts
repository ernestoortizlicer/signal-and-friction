// ════════════════════════════════════════════════════════════
// LEGACY AUTONOMOUS DIAGNOSIS — RETIRED
//
// Signal & Friction's current authority model is:
//   scanner/software -> evidence
//   AI              -> assist/challenge
//   human analyst   -> final diagnostic judgment
//
// This historical endpoint previously let an unauthenticated caller invoke an
// autonomous final-diagnosis LLM and receive a diagnosis + intervention
// decision directly from technical telemetry. That contradicts current product
// truth and creates an unnecessary public model-cost surface.
//
// Keep the route as a defensive 410 boundary so stale callers fail explicitly.
// Historical implementation remains available in Git history; it must not
// create new current-generation diagnostic output.
// ════════════════════════════════════════════════════════════

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

export const onRequestPost = async (): Promise<Response> =>
  new Response(
    JSON.stringify({
      status: 'retired',
      code: 'legacy_autonomous_diagnosis_retired',
      message: 'Automated final diagnosis is not part of the current Signal & Friction diagnostic workflow.',
    }),
    { status: 410, headers: RESPONSE_HEADERS },
  );

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    },
  });
