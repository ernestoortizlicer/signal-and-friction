/**
 * Publish-without-rebuild routing for /sla/*. Same mechanism as
 * functions/deliverable/[[path]].ts — see that file's comment for the
 * full explanation of why this is a Pages Function and not a
 * public/_redirects rule.
 */
const RESERVED_SLUGS = new Set(['acme-corp', 'live']);

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

  if (clientKey === '' || RESERVED_SLUGS.has(clientKey)) {
    return env.ASSETS.fetch(request);
  }

  const shellUrl = new URL(request.url);
  shellUrl.pathname = '/sla/live/';
  return env.ASSETS.fetch(new Request(shellUrl.toString(), request));
};
