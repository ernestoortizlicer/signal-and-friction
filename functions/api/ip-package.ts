import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getServiceRoleKey } from './_env';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface IPNode {
  id: string;
  title: string;
  thesis: string;
  antithesis: string;
  synthesis: string;
  domain: string;
  confidence: number;
  tags?: string[];
  sourceContext?: string;
}

function validateIPNode(obj: unknown): obj is IPNode {
  if (typeof obj !== 'object' || obj === null) return false;
  const n = obj as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.title === 'string' &&
    typeof n.thesis === 'string' &&
    typeof n.antithesis === 'string' &&
    typeof n.synthesis === 'string' &&
    typeof n.domain === 'string' &&
    typeof n.confidence === 'number' &&
    n.confidence >= 0 &&
    n.confidence <= 100
  );
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!validateIPNode(payload)) {
    return Response.json(
      {
        error:
          'Payload inválido. Required: id, title, thesis, antithesis, synthesis, domain (string), confidence (0-100)',
      },
      { status: 422 }
    );
  }

  const node = payload as IPNode;

  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('ip_nodes')
    .upsert(
      {
        id: node.id,
        title: node.title,
        thesis: node.thesis,
        antithesis: node.antithesis,
        synthesis: node.synthesis,
        domain: node.domain,
        confidence: node.confidence,
        tags: node.tags ?? [],
        source_context: node.sourceContext ?? null,
        certified: node.confidence >= 80,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('id, certified')
    .single();

  if (error) {
    // Table may not exist yet — return structured error so the client can handle gracefully
    return Response.json(
      { error: `Database error: ${error.message}`, code: error.code },
      { status: 500 }
    );
  }

  return Response.json(
    { ok: true, id: data.id, certified: data.certified },
    { status: 201 }
  );
};
