import { createClient } from '@supabase/supabase-js';
import { runScan } from './_scan';
import { getSupabaseUrl, getServiceRoleKey } from './_env';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PAGESPEED_API_KEY?: string;
}

interface ScanPayload {
  url: string;
  email?: string;
  company?: string;
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  let payload: ScanPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!payload.url || typeof payload.url !== 'string') {
    return Response.json({ error: 'Se requiere un campo url' }, { status: 422 });
  }

  let report;
  try {
    report = await runScan(payload.url, env);
  } catch {
    return Response.json({ error: 'URL inválida' }, { status: 422 });
  }

  // If email provided, persist as lead with friction data
  const serviceRoleKey = getServiceRoleKey(env);
  if (payload.email && serviceRoleKey) {
    try {
      const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await supabase.from('leads').upsert({
        email: payload.email,
        company: payload.company || report.domain,
        website: report.url,
        segment: report.frictionScore >= 60 ? 'DFY' : 'DWY',
        source: 'scan_tool',
        answers: {
          grade: report.grade,
          friction_score: report.frictionScore,
          lcp_ms: report.metrics.lcp.ms,
          tbt_ms: report.metrics.tbt.ms,
          abandonment_delta_pct: report.abandonmentDelta,
          primary_mechanism: report.frictionMechanisms[0]?.type ?? null,
          platform: report.signals.platform,
        },
      }, { onConflict: 'email' });
    } catch { /* non-fatal */ }
  }

  return Response.json(report, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
