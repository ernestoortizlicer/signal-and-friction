import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

type Env = Record<string, string>;

type PromotionInput = {
  candidateId?: string;
  founderContact?: string;
  contactEmail?: string;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: JSON_HEADERS });
  }

  const input = (await request.json().catch(() => null)) as PromotionInput | null;
  const candidateId = input?.candidateId?.trim() || '';
  const founderContact = input?.founderContact?.trim() || '';
  const contactEmail = input?.contactEmail?.trim() || '';

  if (!candidateId || !founderContact || !contactEmail) {
    return Response.json({ error: 'candidateId, founderContact and contactEmail are required' }, { status: 400, headers: JSON_HEADERS });
  }

  const serviceKey = getServiceRoleKey(env);
  if (!serviceKey) {
    return Response.json({ error: 'Promotion credential unavailable' }, { status: 500, headers: JSON_HEADERS });
  }

  const supabase = createClient(getSupabaseUrl(env), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('promote_prospect_candidate', {
    p_candidate_id: candidateId,
    p_founder_contact: founderContact,
    p_contact_email: contactEmail,
  });

  if (error) {
    return Response.json({ error: error.message, code: error.code ?? null }, { status: 409, headers: JSON_HEADERS });
  }

  const promotion = Array.isArray(data) ? data[0] : null;
  if (!promotion?.client_id || !promotion?.project_id) {
    return Response.json({ error: 'Promotion completed without a verifiable client/project result' }, { status: 500, headers: JSON_HEADERS });
  }

  return Response.json(
    {
      ok: true,
      actorId: admin.id,
      clientId: promotion.client_id,
      projectId: promotion.project_id,
    },
    { headers: JSON_HEADERS },
  );
};
