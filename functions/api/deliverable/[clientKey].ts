import { createClient } from '@supabase/supabase-js';

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

export const onRequestGet = async ({
  params,
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
