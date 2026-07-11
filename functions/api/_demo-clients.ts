/**
 * Client keys for the intentional public demo deliverables — bundled sample
 * content shown to prospects evaluating the product, not real client data.
 * These stay reachable by plain slug with no capability token required.
 * Every other clientKey is a real client and requires `?cid=<clients.id>`
 * (see functions/api/deliverable/[clientKey].ts and functions/api/sla/[clientKey].ts).
 *
 * Keep in sync with the files in public/deliverables/.
 */
export const DEMO_CLIENT_KEYS = new Set([
  "acme-corp",
  "growthly",
  "payflux",
  "startuphub",
  "command-center-guide",
]);
