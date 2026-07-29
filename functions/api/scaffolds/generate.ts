import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { runScan, toRawTechnicalSignals, buildScaffoldEvidence, type RawTechnicalSignals } from '../_scan';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

interface GeneratePayload {
  scaffoldId?: string;
  clientId?: string;
  prospectCandidateId?: string;
  url?: string;
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

  let payload: GeneratePayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }

  const supabaseUrl = getSupabaseUrl(env);
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return Response.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500, headers: CORS });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Rescan: re-derive the target from the existing scaffold row (never
  // trust a client/candidate id passed alongside scaffoldId — the
  // scaffold's own stored link is authoritative) instead of the
  // clientId/prospectCandidateId branch below.
  let clientId: string | null = null;
  let prospectCandidateId: string | null = null;

  if (payload.scaffoldId) {
    const { data: existing, error: fetchExistingError } = await supabase
      .from('diagnostic_scaffolds')
      .select('id, client_id, prospect_candidate_id')
      .eq('id', payload.scaffoldId)
      .single();
    if (fetchExistingError || !existing) {
      return Response.json({ error: 'Scaffold not found' }, { status: 404, headers: CORS });
    }
    clientId = existing.client_id;
    prospectCandidateId = existing.prospect_candidate_id;
  } else {
    const hasClient = !!payload.clientId;
    const hasCandidate = !!payload.prospectCandidateId;
    if (hasClient === hasCandidate) {
      return Response.json(
        { error: 'Provide exactly one of clientId or prospectCandidateId' },
        { status: 400, headers: CORS }
      );
    }
    clientId = hasClient ? payload.clientId! : null;
    prospectCandidateId = hasCandidate ? payload.prospectCandidateId! : null;
  }

  let signals: RawTechnicalSignals;
  let targetUrl: string;
  let domain: string;

  try {
    if (prospectCandidateId) {
      const { data: candidate, error: fetchError } = await supabase
        .from('prospect_candidates')
        .select('id, url, domain, status, technical_signals')
        .eq('id', prospectCandidateId)
        .single();
      if (fetchError || !candidate) {
        return Response.json({ error: 'Candidate not found' }, { status: 404, headers: CORS });
      }
      targetUrl = candidate.url;
      domain = candidate.domain;

      // Reuse the candidate's own scan if it already succeeded — avoids a
      // redundant PageSpeed call and stays consistent with what's shown
      // in the prospecting table. Only re-scan if there's no usable
      // stored result yet. On an explicit Rescan, always run a fresh scan
      // instead — that's the whole point of the button.
      if (!payload.scaffoldId && candidate.status === 'scanned' && candidate.technical_signals) {
        const stored = candidate.technical_signals as RawTechnicalSignals;
        if (stored.psError || stored.htmlSignalsError) {
          return Response.json(
            { error: `Stored scan did not produce real measurements — PageSpeed: ${stored.psError ?? '(ok)'}, HTML: ${stored.htmlSignalsError ?? '(ok)'}. Rescan the candidate first.` },
            { status: 422, headers: CORS }
          );
        }
        signals = stored;
      } else {
        const report = await runScan(targetUrl, env);
        if (report.psError || report.htmlSignalsError) {
          const reasons = [
            report.psError ? `PageSpeed: ${report.psError}` : null,
            report.htmlSignalsError ? `HTML fetch: ${report.htmlSignalsError}` : null,
          ].filter(Boolean).join(' | ');
          return Response.json({ error: `Scan did not produce real measurements — ${reasons}` }, { status: 422, headers: CORS });
        }
        signals = toRawTechnicalSignals(report);
      }
    } else {
      // Client-backed scaffold: clients have no stored URL, so use
      // whatever was passed, falling back to the scaffold's own
      // previously recorded target_url on a Rescan with no override.
      let clientTargetUrl = payload.url?.trim();
      if (!clientTargetUrl && payload.scaffoldId) {
        const { data: existingScaffold } = await supabase
          .from('diagnostic_scaffolds')
          .select('target_url')
          .eq('id', payload.scaffoldId)
          .single();
        clientTargetUrl = existingScaffold?.target_url;
      }
      if (!clientTargetUrl) {
        return Response.json({ error: 'url is required when generating a scaffold for a client' }, { status: 400, headers: CORS });
      }
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .single();
      if (fetchError || !client) {
        return Response.json({ error: 'Client not found' }, { status: 404, headers: CORS });
      }
      const report = await runScan(clientTargetUrl, env);
      if (report.psError || report.htmlSignalsError) {
        const reasons = [
          report.psError ? `PageSpeed: ${report.psError}` : null,
          report.htmlSignalsError ? `HTML fetch: ${report.htmlSignalsError}` : null,
        ].filter(Boolean).join(' | ');
        return Response.json({ error: `Scan did not produce real measurements — ${reasons}` }, { status: 422, headers: CORS });
      }
      signals = toRawTechnicalSignals(report);
      targetUrl = report.url;
      domain = report.domain;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed';
    return Response.json({ error: message }, { status: 422, headers: CORS });
  }

  const evidence = buildScaffoldEvidence(signals);

  if (payload.scaffoldId) {
    // Rescan — refresh evidence/technical_signals/target_url/domain only.
    // The 7 judgment fields and status are untouched.
    const { data: updated, error: updateError } = await supabase
      .from('diagnostic_scaffolds')
      .update({
        target_url: targetUrl,
        domain,
        scanned_at: signals.scannedAt,
        evidence,
        technical_signals: signals,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.scaffoldId)
      .select()
      .single();

    if (updateError || !updated) {
      return Response.json({ error: updateError?.message ?? 'Failed to update scaffold' }, { status: 500, headers: CORS });
    }
    return Response.json(updated, { headers: CORS });
  }

  const { data: scaffold, error: insertError } = await supabase
    .from('diagnostic_scaffolds')
    .insert({
      client_id: clientId,
      prospect_candidate_id: prospectCandidateId,
      target_url: targetUrl,
      domain,
      scanned_at: signals.scannedAt,
      evidence,
      technical_signals: signals,
    })
    .select()
    .single();

  if (insertError || !scaffold) {
    return Response.json({ error: insertError?.message ?? 'Failed to create scaffold' }, { status: 500, headers: CORS });
  }

  return Response.json(scaffold, { status: 201, headers: CORS });
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
