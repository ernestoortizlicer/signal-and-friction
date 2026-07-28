import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { runScan, toRawTechnicalSignals, computeTechnicalSignalScore } from '../_scan';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

interface ScanRequestPayload {
  candidateId: string;
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  let payload: ScanRequestPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }

  if (!payload.candidateId || typeof payload.candidateId !== 'string') {
    return Response.json({ error: 'candidateId is required' }, { status: 400, headers: CORS });
  }

  const supabaseUrl = env.SUPABASE_URL || 'https://tsaarsuuclvkjsgjcmoj.supabase.co';
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Server misconfiguration' }, { status: 500, headers: CORS });
  }
  const supabase = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: candidate, error: fetchError } = await supabase
    .from('prospect_candidates')
    .select('id, url')
    .eq('id', payload.candidateId)
    .single();

  if (fetchError || !candidate) {
    return Response.json({ error: 'Candidate not found' }, { status: 404, headers: CORS });
  }

  await supabase.from('prospect_candidates').update({ status: 'scanning' }).eq('id', candidate.id);

  let report;
  try {
    report = await runScan(candidate.url, env);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed';
    await supabase
      .from('prospect_candidates')
      .update({ status: 'scan_failed', scan_error: message })
      .eq('id', candidate.id);
    return Response.json({ error: message }, { status: 422, headers: CORS });
  }

  const signals = toRawTechnicalSignals(report);
  const { score, breakdown } = computeTechnicalSignalScore(signals);

  const { data: updated, error: updateError } = await supabase
    .from('prospect_candidates')
    .update({
      technical_signals: signals,
      technical_score: score,
      score_breakdown: breakdown,
      status: 'scanned',
      scanned_at: new Date().toISOString(),
      scan_error: null,
    })
    .eq('id', candidate.id)
    .select()
    .single();

  if (updateError || !updated) {
    return Response.json({ error: 'Failed to save scan result' }, { status: 500, headers: CORS });
  }

  return Response.json(updated, { headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
