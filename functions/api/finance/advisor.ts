import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
type Env = Record<string, string>;

function db(env: Env) {
  return createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toCents(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

async function buildAuthoritativeContext(env: Env, analystId: string, profileId: string) {
  const supabase = db(env);
  const { data: profile, error: profileError } = await supabase.from('finance_profiles').select('*').eq('id', profileId).eq('owner_id', analystId).single();
  if (profileError || !profile) throw profileError ?? new Error('Finance profile not found');

  const [accountsRes, txRes, obligationsRes, jurisdictionsRes, cashPolicyRes, ipsRes, goalsRes, investmentsRes] = await Promise.all([
    supabase.from('accounts').select('id,name,type,currency,liquidity_class,is_active').eq('profile_id', profileId).eq('is_active', true).order('type').order('name'),
    supabase.from('transactions').select('id,date,description,status,transaction_entries(account_id,amount)').eq('profile_id', profileId).order('date', { ascending: false }).limit(200),
    supabase.from('finance_obligations').select('id,jurisdiction_code,obligation_type,period_label,due_date,status,amount_cents,amount_currency,amount_source,source_id,evidence_ref,requires_professional_review,notes').eq('profile_id', profileId).order('due_date'),
    supabase.from('finance_profile_jurisdictions').select('id,jurisdiction_code,role,status,effective_from,effective_to,source_id,evidence_ref,requires_professional_review,notes').eq('profile_id', profileId).order('effective_from', { ascending: false }),
    supabase.from('finance_cash_policies').select('*').eq('profile_id', profileId).eq('status', 'active').maybeSingle(),
    supabase.from('finance_investment_policies').select('*').eq('profile_id', profileId).eq('status', 'active').maybeSingle(),
    supabase.from('financial_goals').select('id,name,target_amount,current_amount,target_date').eq('profile_id', profileId).is('archived_at', null).order('target_date'),
    supabase.from('investments').select('id,name,type,cost_basis,current_value,purchase_date,projected_annual_roi_pct,notes,source_note').eq('profile_id', profileId).is('archived_at', null),
  ]);
  const firstError = accountsRes.error || txRes.error || obligationsRes.error || jurisdictionsRes.error || cashPolicyRes.error || ipsRes.error || goalsRes.error || investmentsRes.error;
  if (firstError) throw firstError;

  const jurisdictionCodes = [...new Set([
    ...(jurisdictionsRes.data ?? []).map((j) => j.jurisdiction_code),
    ...(obligationsRes.data ?? []).map((o) => o.jurisdiction_code),
    ...(profile.jurisdiction_code ? [String(profile.jurisdiction_code)] : []),
  ].filter(Boolean))];

  const sourcesRes = jurisdictionCodes.length
    ? await supabase.from('finance_compliance_sources')
        .select('id,jurisdiction_code,authority,topic,source_title,source_url,valid_from,valid_to,checked_at,verification_status,verified_at,verification_note')
        .in('jurisdiction_code', jurisdictionCodes)
        .eq('verification_status', 'verified')
        .order('verified_at', { ascending: false })
    : { data: [], error: null };
  if (sourcesRes.error) throw sourcesRes.error;

  const accounts = accountsRes.data ?? [];
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const balances: Record<string, number> = Object.fromEntries(accounts.map((a) => [a.id, 0]));
  const now = Date.now();
  const cutoff30 = now - 30 * 86400000;
  const cutoff90 = now - 90 * 86400000;
  let expenses30 = 0, expenses90 = 0, revenue30 = 0, revenue90 = 0;
  for (const tx of txRes.data ?? []) {
    for (const entry of tx.transaction_entries ?? []) {
      const amount = toCents(entry.amount);
      balances[entry.account_id] = (balances[entry.account_id] ?? 0) + amount;
      const account = accountById.get(entry.account_id);
      const when = Date.parse(tx.date);
      if (account?.type === 'expense') {
        if (when >= cutoff90) expenses90 += amount;
        if (when >= cutoff30) expenses30 += amount;
      } else if (account?.type === 'revenue') {
        if (when >= cutoff90) revenue90 += -amount;
        if (when >= cutoff30) revenue30 += -amount;
      }
    }
  }
  const liquidCash = accounts.filter((a) => a.type === 'asset' && ['cash','cash_equivalent'].includes(a.liquidity_class)).reduce((s, a) => s + (balances[a.id] ?? 0), 0);
  const monthlyBurn = Math.max(0, expenses90 / 3);

  return {
    asOf: new Date().toISOString(),
    profile: {
      id: profile.id,
      name: profile.name,
      scope: profile.scope,
      entityName: profile.entity_name,
      baseCurrency: profile.base_currency,
      // Compatibility metadata only; never treat this as tax-residency truth.
      legacyJurisdictionCode: profile.jurisdiction_code,
      legacyJurisdictionStatus: profile.jurisdiction_status,
      jurisdictionStack: jurisdictionsRes.data ?? [],
    },
    metrics: {
      liquidCashCents: liquidCash,
      expenses30Cents: expenses30,
      normalizedMonthlyBurnCents: monthlyBurn,
      revenue30Cents: revenue30,
      operatingProfit30Cents: revenue30 - expenses30,
      runwayMonths: monthlyBurn > 0 ? liquidCash / monthlyBurn : null,
    },
    accounts: accounts.map((a) => ({ name: a.name, type: a.type, currency: a.currency, liquidityClass: a.liquidity_class, balanceCents: balances[a.id] ?? 0 })),
    recentTransactions: (txRes.data ?? []).slice(0, 30).map((t) => ({ date: t.date, description: t.description, status: t.status })),
    obligations: obligationsRes.data ?? [],
    verifiedComplianceSources: sourcesRes.data ?? [],
    cashPolicy: cashPolicyRes.data ?? null,
    investmentPolicy: ipsRes.data ?? null,
    goals: goalsRes.data ?? [],
    investments: investmentsRes.data ?? [],
  };
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  let body: { question?: string; profileId?: string; tier?: 'sharp' | 'blade' };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS }); }
  const question = body.question?.trim() ?? '';
  if (!question || !body.profileId) return Response.json({ error: 'question and profileId are required' }, { status: 400, headers: CORS });

  const supabase = db(env);
  let runId: string | null = null;
  const started = Date.now();
  try {
    const context = await buildAuthoritativeContext(env, admin.id, body.profileId);
    const hash = await sha256(JSON.stringify(context));
    const { data: run, error: runError } = await supabase.from('finance_agent_runs').insert({
      analyst_id: admin.id,
      profile_id: body.profileId,
      question,
      input_snapshot_hash: hash,
      prompt_version: 'finance-os-v2.1-2026-08-13',
      status: 'started',
      trace_json: {
        context_as_of: context.asOf,
        accounts: context.accounts.length,
        transactions: context.recentTransactions.length,
        obligations: context.obligations.length,
        jurisdictions: context.profile.jurisdictionStack.length,
        verified_sources: context.verifiedComplianceSources.length,
        cash_policy_present: !!context.cashPolicy,
        investment_policy_present: !!context.investmentPolicy,
      },
    }).select('id').single();
    if (runError || !run) throw runError ?? new Error('Could not create Finance Agent trace');
    runId = run.id;

    const key = getServiceRoleKey(env);
    if (!key) throw new Error('Server finance advisor credential missing');
    const res = await fetch(`${getSupabaseUrl(env)}/functions/v1/finance-advisor-prompt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context, tier: body.tier === 'sharp' ? 'sharp' : 'blade' }),
    });
    const result = await res.json() as { analysis?: Record<string, unknown>; meta?: Record<string, unknown>; error?: string };
    if (!res.ok || !result.analysis) throw new Error(result.error || `Finance advisor failed (${res.status})`);

    const meta = result.meta ?? {};
    await supabase.from('finance_agent_runs').update({
      status: 'completed',
      output_json: result.analysis,
      model: typeof meta.model === 'string' ? meta.model : null,
      estimated_cost_usd: Number(meta.estimatedCostUSD ?? 0),
      latency_ms: Number(meta.latencyMs ?? (Date.now() - started)),
      completed_at: new Date().toISOString(),
    }).eq('id', runId);

    const recs = Array.isArray(result.analysis.recommendations) ? result.analysis.recommendations : [];
    const allowedCategories = ['bookkeeping','compliance','treasury','wealth','education'];
    const rows = recs.slice(0, 8).flatMap((raw) => {
      if (!raw || typeof raw !== 'object') return [];
      const r = raw as Record<string, unknown>;
      const title = typeof r.title === 'string' ? r.title.trim() : '';
      const rationale = typeof r.rationale === 'string' ? r.rationale.trim() : '';
      const category = allowedCategories.includes(String(r.category)) ? String(r.category) : 'education';
      if (!title || !rationale) return [];
      return [{
        run_id: runId,
        profile_id: body.profileId,
        category,
        title,
        rationale,
        assumptions: Array.isArray(r.assumptions) ? r.assumptions : [],
        evidence: Array.isArray(r.evidence) ? r.evidence : [],
        risk_level: ['low','medium','high'].includes(String(r.risk_level)) ? String(r.risk_level) : 'medium',
        requires_human_approval: true,
        status: 'proposed',
      }];
    });
    if (rows.length) await supabase.from('finance_recommendations').insert(rows);

    return Response.json({ runId, analysis: result.analysis, meta }, { headers: CORS });
  } catch (err) {
    if (runId) {
      await supabase.from('finance_agent_runs').update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown failure',
        latency_ms: Date.now() - started,
        completed_at: new Date().toISOString(),
      }).eq('id', runId);
    }
    return Response.json({ error: err instanceof Error ? err.message : 'Finance Agent failed.' }, { status: 500, headers: CORS });
  }
};

export const onRequestOptions = (): Response => new Response(null, {
  status: 204,
  headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
});
