import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { runScan, toRawTechnicalSignals, buildScaffoldEvidence } from '../_scan';
import { canonicalizePublicTargetUrl } from '../_target-url';

type ProvisionEnv = Record<string, string | undefined> & {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  PAGESPEED_API_KEY?: string;
};

export type ProvisionResult =
  | { status: 'succeeded'; scaffoldId: string; created: boolean }
  | { status: 'needs_input'; reason: string }
  | { status: 'retryable'; reason: string }
  | { status: 'noop'; reason: string };

function safeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? 'unknown error');
  return message.replace(/https?:\/\/\S+/gi, '[url]').slice(0, 500);
}

export async function provisionPaymentScaffoldBySessionId(
  stripeSessionId: string,
  env: ProvisionEnv,
  options: { allowNeedsInput?: boolean } = {}
): Promise<ProvisionResult> {
  const serviceRoleKey = getServiceRoleKey(env as Record<string, string>);
  if (!serviceRoleKey) return { status: 'retryable', reason: 'supabase_service_role_missing' };

  const supabase = createClient(getSupabaseUrl(env as Record<string, string>), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, client_id')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();

  if (paymentError) return { status: 'retryable', reason: 'payment_lookup_failed' };
  if (!payment) return { status: 'noop', reason: 'payment_not_found' };
  if (!payment.client_id) return { status: 'noop', reason: 'payment_unmatched' };

  const { data: claimed, error: claimError } = await supabase
    .rpc('claim_scaffold_provisioning_job', {
      p_payment_id: payment.id,
      p_allow_needs_input: options.allowNeedsInput === true,
    })
    .maybeSingle();

  if (claimError) return { status: 'retryable', reason: 'job_claim_failed' };
  if (!claimed) {
    const { data: job } = await supabase
      .from('scaffold_provisioning_jobs')
      .select('status, scaffold_id')
      .eq('payment_id', payment.id)
      .maybeSingle();
    if (job?.status === 'succeeded' && job.scaffold_id) {
      return { status: 'succeeded', scaffoldId: job.scaffold_id, created: false };
    }
    return { status: 'noop', reason: `job_not_claimable:${job?.status ?? 'missing'}` };
  }

  const finish = async (
    status: 'succeeded' | 'needs_input' | 'retryable',
    patch: { scaffold_id?: string | null; last_error?: string | null }
  ) => {
    const { error } = await supabase.rpc('finish_scaffold_provisioning_job', {
      p_payment_id: payment.id,
      p_status: status,
      p_scaffold_id: patch.scaffold_id ?? null,
      p_last_error: patch.last_error ?? null,
    });
    if (error) throw new Error('job_finish_failed');
  };

  try {
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, target_url')
      .eq('id', payment.client_id)
      .single();

    if (clientError || !client) {
      await finish('retryable', { last_error: 'client_lookup_failed' });
      return { status: 'retryable', reason: 'client_lookup_failed' };
    }

    const rawTargetUrl = typeof client.target_url === 'string' ? client.target_url : '';
    if (!rawTargetUrl.trim()) {
      await finish('needs_input', { last_error: 'client_target_url_missing' });
      return { status: 'needs_input', reason: 'client_target_url_missing' };
    }

    const canonicalTarget = canonicalizePublicTargetUrl(rawTargetUrl);
    if (!canonicalTarget.ok) {
      const reason = `client_target_url_${canonicalTarget.reason}`;
      await finish('needs_input', { last_error: reason });
      return { status: 'needs_input', reason };
    }

    const { data: existing, error: existingError } = await supabase
      .from('diagnostic_scaffolds')
      .select('id')
      .eq('client_id', payment.client_id)
      .maybeSingle();

    if (existingError) throw new Error('scaffold_lookup_failed');
    if (existing) {
      await finish('succeeded', { scaffold_id: existing.id });
      return { status: 'succeeded', scaffoldId: existing.id, created: false };
    }

    const report = await runScan(canonicalTarget.url, env);
    if (report.psError || report.htmlSignalsError) throw new Error('scan_incomplete');

    const signals = toRawTechnicalSignals(report);
    const evidence = buildScaffoldEvidence(signals);

    const { data: created, error: insertError } = await supabase
      .from('diagnostic_scaffolds')
      .insert({
        client_id: payment.client_id,
        prospect_candidate_id: null,
        target_url: report.url,
        domain: report.domain,
        scanned_at: signals.scannedAt,
        evidence,
        technical_signals: signals,
      })
      .select('id')
      .single();

    if (insertError || !created) {
      if (insertError?.code === '23505') {
        const { data: raced } = await supabase
          .from('diagnostic_scaffolds')
          .select('id')
          .eq('client_id', payment.client_id)
          .maybeSingle();
        if (raced) {
          await finish('succeeded', { scaffold_id: raced.id });
          return { status: 'succeeded', scaffoldId: raced.id, created: false };
        }
      }
      throw new Error('scaffold_insert_failed');
    }

    await finish('succeeded', { scaffold_id: created.id });
    return { status: 'succeeded', scaffoldId: created.id, created: true };
  } catch (err) {
    const reason = safeError(err);
    try {
      await finish('retryable', { last_error: reason });
    } catch (finishErr) {
      console.error(`Scaffold provisioning recovery-state write failed: ${safeError(finishErr)}`);
    }
    return { status: 'retryable', reason };
  }
}
