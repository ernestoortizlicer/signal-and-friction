import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { runScan, toRawTechnicalSignals, buildScaffoldEvidence, type RawTechnicalSignals } from '../_scan';
import { canonicalizePublicTargetUrl } from '../_target-url';

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
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('id, target_url')
        .eq('id', clientId)
        .single();
      if (fetchError || !client) {
        return Response.json({ error: 'Client not found' }, { status: 404, headers: CORS });
      }

      if (!payload.scaffoldId) {
        const { data: existingClientScaffold } = await supabase
          .from('diagnostic_scaffolds')
          .select('id')
          .eq('client_id', clientId)
          .maybeSingle();
        if (existingClientScaffold) {
          return Response.json(
            { error: 'Client scaffold already exists; rescan the existing scaffold instead', code: 'client_scaffold_exists', scaffoldId: existingClientScaffold.id },
            { status: 409, headers: CORS }
          );
        }
      }

      let persistedTarget: string | null = null;
      if (client.target_url) {
        const parsed = canonicalizePublicTargetUrl(client.target_url);
        if (!parsed.ok) {
          return Response.json({ error: 'Stored client target URL requires review' }, { status: 409, headers: CORS });
        }
        persistedTarget = parsed.url;
      }

      let providedTarget: string | null = null;
      if (payload.url?.trim()) {
        const parsed = canonicalizePublicTargetUrl(payload.url);
        if (!parsed.ok) {
          return Response.json({ error: 'Invalid target URL', reason: parsed.reason }, { status: 400, headers: CORS });
        }
        providedTarget = parsed.url;
      }

      if (persistedTarget && providedTarget && persistedTarget !== providedTarget) {
        return Response.json(
          { error: 'Target URL conflicts with canonical client target; update the client record deliberately before rescanning' },
          { status: 409, headers: CORS }
        );
      }

      const clientTargetUrl = persistedTarget ?? providedTarget;
      if (!clientTargetUrl && payload.scaffoldId) {
        const { data: existingScaffold } = await supabase
          .from('diagnostic_scaffolds')
          .select('target_url')
          .eq('id', payload.scaffoldId)
          .single();
        if (existingScaffold?.target_url) {
          const parsed = canonicalizePublicTargetUrl(existingScaffold.target_url);
          if (parsed.ok) persistedTarget = parsed.url;
        }
      }

      const finalTargetUrl = clientTargetUrl ?? persistedTarget;
      if (!finalTargetUrl) {
        return Response.json({ error: 'Client target_url is required before generating a scaffold' }, { status: 400, headers: CORS });
      }

      if (!client.target_url && providedTarget) {
        const { error: targetUpdateError } = await supabase
          .from('clients')
          .update({ target_url: providedTarget, updated_at: new Date().toISOString() })
          .eq('id', clientId);
        if (targetUpdateError) {
          return Response.json({ error: 'Failed to persist canonical client target URL' }, { status: 500, headers: CORS });
        }
      }

      const report = await runScan(finalTargetUrl, env);
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
    if (insertError?.code === '23505' && clientId) {
      return Response.json({ error: 'Client scaffold already exists', code: 'client_scaffold_exists' }, { status: 409, headers: CORS });
    }
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
