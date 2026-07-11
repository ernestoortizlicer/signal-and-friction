import { createClient } from '@supabase/supabase-js';
import { DEMO_CLIENT_KEYS } from '../_demo-clients';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export const onRequestGet = async ({
  params,
  request,
  env,
}: {
  params: { clientKey: string };
  env: Env;
  request: Request;
}): Promise<Response> => {
  const { clientKey } = params;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Missing credentials' }, { status: 500, headers: CORS });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Real (non-demo) deliverables require the client's own UUID as a
  // capability token (`?cid=`) — clientKey alone is a guessable company-name
  // slug. Demo deliverables stay reachable by slug only, as intended.
  if (!DEMO_CLIENT_KEYS.has(clientKey)) {
    const cid = new URL(request.url).searchParams.get('cid');
    if (!cid) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS });
    }
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('company_name')
      .eq('id', cid)
      .single();
    if (clientErr || !client || slugify(client.company_name) !== clientKey) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS });
    }
  }

  const { data, error } = await supabase
    .from('deliverables')
    .select('data')
    .eq('client_key', clientKey)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404, headers: CORS });
  }

  return Response.json(data.data, { headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, { status: 204, headers: CORS });
