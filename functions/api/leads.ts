import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function isValidEmail(email: unknown): email is string {
  return (
    typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length <= 254
  );
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!isValidEmail(payload.email)) {
    return Response.json({ error: 'Email inválido o ausente' }, { status: 422 });
  }

  const segment =
    payload.segment === 'DFY' || payload.segment === 'DWY'
      ? payload.segment
      : 'DWY';

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('leads')
    .insert({
      email: payload.email,
      company: typeof payload.company === 'string' ? payload.company : null,
      website: typeof payload.website === 'string' ? payload.website : null,
      segment,
      answers:
        payload.answers && typeof payload.answers === 'object' ? payload.answers : {},
      source: typeof payload.source === 'string' ? payload.source : 'landing',
    })
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: `No se pudo guardar el lead: ${error.message}` }, { status: 500 });
  }

  return Response.json({ ok: true, id: data.id }, { status: 201 });
};
