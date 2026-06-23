import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

function isValidEmail(email: unknown): email is string {
  return (
    typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length <= 254
  );
}

async function runAutodiagnosis({
  leadId,
  website,
  company,
  origin,
  supabase,
  prefetchedScan,
}: {
  leadId: string;
  website: string;
  company?: string;
  origin: string;
  supabase: SupabaseClient;
  prefetchedScan?: Record<string, unknown>;
}): Promise<void> {
  const generatedAt = new Date().toISOString();

  try {
    let scanData: Record<string, unknown>;

    if (prefetchedScan) {
      // Scan already ran on the client (e.g. /scan page) — skip the PageSpeed round-trip
      scanData = prefetchedScan;
    } else {
      // Step 1: Scan URL — PageSpeed + HTML signals
      const scanRes = await fetch(`${origin}/api/scan-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: website, company }),
        signal: AbortSignal.timeout(30000),
      });

      if (!scanRes.ok) {
        await supabase.from('leads').update({
          auto_diagnosis: { error: `scan-url ${scanRes.status}`, generated_at: generatedAt },
        }).eq('id', leadId);
        return;
      }

      scanData = await scanRes.json();
    }

    // Step 2: Diagnose — claude-opus-4-8 via Vault
    const diagnoseRes = await fetch(`${origin}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scanData),
      signal: AbortSignal.timeout(30000),
    });

    if (!diagnoseRes.ok) {
      await supabase.from('leads').update({
        auto_diagnosis: { scan: scanData, error: `diagnose ${diagnoseRes.status}`, generated_at: generatedAt },
      }).eq('id', leadId);
      return;
    }

    const diagnosis = await diagnoseRes.json();

    // Step 3: Persist both results
    await supabase.from('leads').update({
      auto_diagnosis: { scan: scanData, diagnosis, generated_at: generatedAt },
    }).eq('id', leadId);

  } catch (e) {
    await supabase.from('leads').update({
      auto_diagnosis: { error: String(e), generated_at: generatedAt },
    }).eq('id', leadId).then(() => {}, () => {});
  }
}

export const onRequestPost = async ({
  request,
  env,
  ctx,
}: {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
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

  // Auto-diagnosis: DFY leads with a website get scanned + diagnosed in the background.
  // ctx.waitUntil keeps the Worker alive after the response is sent — non-blocking.
  // If scan_data is already in the payload (e.g. from /scan page), skip the PageSpeed round-trip.
  if (segment === 'DFY' && typeof payload.website === 'string' && payload.website.trim()) {
    const origin = new URL(request.url).origin;
    const prefetchedScan =
      payload.scan_data && typeof payload.scan_data === 'object' && !Array.isArray(payload.scan_data)
        ? (payload.scan_data as Record<string, unknown>)
        : undefined;
    ctx.waitUntil(
      runAutodiagnosis({
        leadId: data.id,
        website: payload.website.trim(),
        company: typeof payload.company === 'string' ? payload.company : undefined,
        origin,
        supabase,
        prefetchedScan,
      })
    );
  }

  return Response.json({ ok: true, id: data.id }, { status: 201 });
};
