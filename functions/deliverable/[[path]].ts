import { DEMO_CLIENT_KEYS } from '../api/_demo-clients';

/**
 * Publish-without-rebuild routing for /deliverable/*.
 *
 * output: "export" requires every dynamic [clientKey] segment to be known
 * at build time, so a brand-new client written to the `deliverables` table
 * has no prerendered static page and would 404 before any client-side JS
 * runs.
 *
 * A public/_redirects wildcard was tried first and rejected: Cloudflare
 * processes _redirects rules unconditionally and a same-path "passthrough"
 * rule (source === destination) is silently a no-op rather than an
 * exclusion — verified empirically against a deployed preview, not
 * assumed. A Pages Function gives real conditional logic instead of a
 * text DSL, so it's the reliable mechanism.
 *
 * Cloudflare Pages Functions take precedence over static assets for any
 * matching route, so this function intercepts EVERY request under
 * /deliverable/*, including the demo pages' own URLs — the branching
 * below is what makes those still resolve to their own real content.
 */
const RESERVED_SLUGS = new Set([...DEMO_CLIENT_KEYS, 'live']);

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export const onRequestGet = async ({
  request,
  env,
  params,
}: {
  request: Request;
  env: Env;
  params: { path?: string | string[] };
}): Promise<Response> => {
  const segments = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const clientKey = segments[0] ?? '';

  // Bare /deliverable/ (empty segments) or a reserved/demo slug — serve
  // the real static asset for this exact path, untouched.
  if (clientKey === '' || RESERVED_SLUGS.has(clientKey)) {
    return env.ASSETS.fetch(request);
  }

  // Any other clientKey is a real (non-demo) client, by construction —
  // serve the live shell's static content while keeping the real URL in
  // the browser's address bar. The shell's own client-side JS reads the
  // actual clientKey from that URL and fetches the live data.
  const shellUrl = new URL(request.url);
  shellUrl.pathname = '/deliverable/live/';
  return env.ASSETS.fetch(new Request(shellUrl.toString(), request));
};
