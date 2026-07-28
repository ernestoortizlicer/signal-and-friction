import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { runScan, toRawTechnicalSignals, computeTechnicalSignalScore } from '../_scan';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

interface ScanRequestPayload {
  candidateId: string;
}

// Best-effort — used from inside a catch block, so a second failure here
// must never mask or replace the first (real) error being reported.
async function markFailed(supabase: SupabaseClient, candidateId: string, message: string): Promise<void> {
  try {
    await supabase
      .from('prospect_candidates')
      .update({ status: 'scan_failed', scan_error: message.slice(0, 2000) })
      .eq('id', candidateId);
  } catch (err) {
    console.error('prospecting/scan: failed to record scan_failed status', err);
  }
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
    return Response.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500, headers: CORS });
  }
  const supabase = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const candidateId = payload.candidateId;

  // Everything past this point can fail in ways specific to this one
  // candidate (bad URL, PageSpeed outage, a write that gets rejected). None
  // of those may fail silently — every branch below either succeeds or
  // records a real, readable reason on the row itself.
  try {
    const { data: candidate, error: fetchError } = await supabase
      .from('prospect_candidates')
      .select('id, url')
      .eq('id', candidateId)
      .single();

    if (fetchError) {
      return Response.json(
        { error: `Candidate lookup failed: ${fetchError.message}` },
        { status: 500, headers: CORS }
      );
    }
    if (!candidate) {
      return Response.json({ error: 'Candidate not found' }, { status: 404, headers: CORS });
    }

    const { error: scanningError } = await supabase
      .from('prospect_candidates')
      .update({ status: 'scanning' })
      .eq('id', candidate.id);
    if (scanningError) {
      const message = `Failed to mark candidate as scanning: ${scanningError.message}`;
      await markFailed(supabase, candidate.id, message);
      return Response.json({ error: message }, { status: 500, headers: CORS });
    }

    let report;
    try {
      report = await runScan(candidate.url, env);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      await markFailed(supabase, candidate.id, message);
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
      const message = `Failed to save scan result: ${updateError?.message ?? 'no row returned'}`;
      await markFailed(supabase, candidate.id, message);
      return Response.json({ error: message }, { status: 500, headers: CORS });
    }

    return Response.json(updated, { headers: CORS });
  } catch (err) {
    // Catches anything unexpected (network error, a supabase-js throw, etc.)
    // that the specific handlers above didn't anticipate. The row must not
    // come out of a scan attempt with status='new' and scan_error=null —
    // that combination means a failure happened and was never recorded.
    const message = err instanceof Error ? err.message : 'Unexpected error during scan';
    console.error('prospecting/scan: unhandled error', err);
    await markFailed(supabase, candidateId, message);
    return Response.json({ error: message }, { status: 500, headers: CORS });
  }
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
