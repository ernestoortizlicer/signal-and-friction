import { createClient } from '@supabase/supabase-js';
import { requireAdmin, type AdminUser } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
type Env = Record<string, string>;

function db(env: Env) {
  return createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function rpcInternal(env: Env, name: string, payload: Record<string, unknown>): Promise<unknown> {
  const key = getServiceRoleKey(env);
  if (!key) throw new Error('Server finance credential unavailable');
  const res = await fetch(`${getSupabaseUrl(env)}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} failed (${res.status}): ${text.slice(0, 500)}`);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function cents(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

async function getOwnedProfile(env: Env, analystId: string, profileId: string) {
  const supabase = db(env);
  const { data, error } = await supabase.from('finance_profiles').select('*').eq('id', profileId).eq('owner_id', analystId).single();
  if (error || !data) throw new Error('Finance profile not found for this operator');
  return data;
}

async function dashboard(env: Env, analystId: string, requestedProfileId?: string | null) {
  const supabase = db(env);
  const { data: profiles, error: profilesError } = await supabase.from('finance_profiles').select('*').eq('owner_id', analystId).order('created_at');
  if (profilesError) throw profilesError;
  const profile = (profiles ?? []).find((p) => p.id === requestedProfileId) ?? profiles?.[0] ?? null;
  if (!profile) return { profiles: [], profile: null, accounts: [], transactions: [], metrics: null, investments: [], goals: [], sources: [], obligations: [], cashPolicy: null, investmentPolicy: null, recommendations: [] };

  const [accountsRes, txRes, investmentsRes, goalsRes, sourcesRes, obligationsRes, cashPolicyRes, ipsRes, recommendationsRes] = await Promise.all([
    supabase.from('accounts').select('*').eq('profile_id', profile.id).eq('is_active', true).order('type').order('name'),
    supabase.from('transactions').select('*,transaction_entries(id,account_id,category_id,amount)').eq('profile_id', profile.id).order('date', { ascending: false }).limit(500),
    supabase.from('investments').select('*').eq('profile_id', profile.id).is('archived_at', null).order('created_at', { ascending: false }),
    supabase.from('financial_goals').select('*').eq('profile_id', profile.id).is('archived_at', null).order('target_date', { ascending: true }),
    supabase.from('finance_compliance_sources').select('*').eq('jurisdiction_code', profile.jurisdiction_code ?? 'UNSET').order('checked_at', { ascending: false }).limit(100),
    supabase.from('finance_obligations').select('*,finance_compliance_sources(id,authority,source_title,source_url,verification_status,verified_at)').eq('profile_id', profile.id).order('due_date', { ascending: true }),
    supabase.from('finance_cash_policies').select('*').eq('profile_id', profile.id).eq('status', 'active').maybeSingle(),
    supabase.from('finance_investment_policies').select('*').eq('profile_id', profile.id).eq('status', 'active').maybeSingle(),
    supabase.from('finance_recommendations').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(20),
  ]);
  const error = accountsRes.error || txRes.error || investmentsRes.error || goalsRes.error || sourcesRes.error || obligationsRes.error || cashPolicyRes.error || ipsRes.error || recommendationsRes.error;
  if (error) throw error;

  const accounts = accountsRes.data ?? [];
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const balances: Record<string, number> = Object.fromEntries(accounts.map((a) => [a.id, 0]));
  const now = Date.now();
  const cutoff30 = now - 30 * 86400000;
  const cutoff90 = now - 90 * 86400000;
  let expenses30 = 0, expenses90 = 0, revenue30 = 0, revenue90 = 0;

  const transactions = (txRes.data ?? []).map((tx) => {
    const entries = (tx.transaction_entries ?? []) as Array<{ id: string; account_id: string; category_id: string | null; amount: number }>;
    for (const entry of entries) {
      const amount = cents(entry.amount);
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
    const debit = entries.find((e) => cents(e.amount) > 0);
    const credit = entries.find((e) => cents(e.amount) < 0);
    return {
      id: tx.id, date: tx.date, description: tx.description, status: tx.status,
      voidedAt: tx.voided_at, voidReason: tx.void_reason,
      reversesTransactionId: tx.reverses_transaction_id, reversalTransactionId: tx.reversal_transaction_id,
      debitAccount: debit ? accountById.get(debit.account_id)?.name ?? debit.account_id : null,
      creditAccount: credit ? accountById.get(credit.account_id)?.name ?? credit.account_id : null,
      amountCents: debit ? Math.abs(cents(debit.amount)) : entries.reduce((m, e) => Math.max(m, Math.abs(cents(e.amount))), 0),
      externalSource: tx.external_source, externalId: tx.external_id,
    };
  });

  const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((sum, a) => sum + (balances[a.id] ?? 0), 0);
  const totalLiabilities = accounts.filter((a) => a.type === 'liability').reduce((sum, a) => sum + Math.abs(balances[a.id] ?? 0), 0);
  const liquidCash = accounts.filter((a) => a.type === 'asset' && ['cash','cash_equivalent'].includes(a.liquidity_class)).reduce((sum, a) => sum + (balances[a.id] ?? 0), 0);
  const normalizedMonthlyBurn = Math.max(0, expenses90 / 3);
  const currencies = [...new Set(accounts.map((a) => a.currency))];

  return {
    profiles: profiles ?? [], profile,
    accounts: accounts.map((a) => ({ ...a, balance_cents: balances[a.id] ?? 0 })), transactions,
    metrics: {
      totalAssetsCents: totalAssets, totalLiabilitiesCents: totalLiabilities, netWorthCents: totalAssets - totalLiabilities,
      liquidCashCents: liquidCash, expenses30Cents: expenses30, expenses90Cents: expenses90,
      normalizedMonthlyBurnCents: normalizedMonthlyBurn, revenue30Cents: revenue30, revenue90Cents: revenue90,
      operatingProfit30Cents: revenue30 - expenses30,
      runwayMonths: normalizedMonthlyBurn > 0 ? liquidCash / normalizedMonthlyBurn : null,
      currencies, mixedCurrencyWarning: currencies.length > 1,
    },
    investments: investmentsRes.data ?? [], goals: goalsRes.data ?? [], sources: sourcesRes.data ?? [],
    obligations: obligationsRes.data ?? [], cashPolicy: cashPolicyRes.data ?? null,
    investmentPolicy: ipsRes.data ?? null, recommendations: recommendationsRes.data ?? [],
  };
}

async function requireOwnedProfileForAction(env: Env, admin: AdminUser, profileId: string | null) {
  if (!profileId) throw new Error('profileId is required');
  return getOwnedProfile(env, admin.id, profileId);
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }
  try {
    return Response.json(await dashboard(env, admin.id, new URL(request.url).searchParams.get('profileId')), { headers: CORS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to load Finance OS.' }, { status: 500, headers: CORS });
  }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const responseBody = await admin.json().catch(() => ({}));
    return Response.json(responseBody, { status: admin.status, headers: CORS });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS }); }

  const action = String(body.action ?? '');
  const supabase = db(env);
  const profileId = typeof body.profileId === 'string' ? body.profileId : null;

  try {
    if (action === 'post_transaction') {
      await requireOwnedProfileForAction(env, admin, profileId);
      await rpcInternal(env, 'post_finance_transaction', {
        p_actor_id: admin.id,
        p_date: typeof body.date === 'string' ? body.date : new Date().toISOString(),
        p_description: String(body.description ?? ''),
        p_debit_account: body.debitAccountId,
        p_credit_account: body.creditAccountId,
        p_amount_cents: Math.round(Number(body.amountCents)),
        p_external_source: body.externalSource ?? null,
        p_external_id: body.externalId ?? null,
      });
    } else if (action === 'void_transaction') {
      await requireOwnedProfileForAction(env, admin, profileId);
      await rpcInternal(env, 'void_finance_transaction', {
        p_actor_id: admin.id,
        p_transaction_id: body.transactionId,
        p_reason: String(body.reason ?? ''),
      });
    } else if (action === 'save_profile') {
      const name = String(body.name ?? '').trim();
      if (!name) return Response.json({ error: 'profile name is required' }, { status: 400, headers: CORS });
      const row = {
        owner_id: admin.id,
        name,
        scope: body.scope === 'personal' ? 'personal' : 'business',
        entity_name: typeof body.entityName === 'string' && body.entityName.trim() ? body.entityName.trim() : null,
        base_currency: typeof body.baseCurrency === 'string' && body.baseCurrency.trim() ? body.baseCurrency.trim().toUpperCase() : 'USD',
        jurisdiction_code: typeof body.jurisdictionCode === 'string' && body.jurisdictionCode.trim() ? body.jurisdictionCode.trim().toUpperCase() : null,
        jurisdiction_status: body.jurisdictionCode ? 'self_reported' : 'unknown',
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        updated_at: new Date().toISOString(),
      };
      if (profileId) {
        const { error } = await supabase.from('finance_profiles').update(row).eq('id', profileId).eq('owner_id', admin.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('finance_profiles').insert(row);
        if (error) throw error;
      }
    } else if (action === 'add_compliance_source') {
      const profile = await requireOwnedProfileForAction(env, admin, profileId);
      const jurisdiction = String(body.jurisdictionCode ?? profile.jurisdiction_code ?? '').trim().toUpperCase();
      const sourceUrl = String(body.sourceUrl ?? '').trim();
      const authority = String(body.authority ?? '').trim();
      const topic = String(body.topic ?? '').trim();
      const sourceTitle = String(body.sourceTitle ?? '').trim();
      if (!jurisdiction || !sourceUrl || !authority || !topic || !sourceTitle) return Response.json({ error: 'jurisdiction, authority, topic, source title and URL are required' }, { status: 400, headers: CORS });
      const { error } = await supabase.from('finance_compliance_sources').insert({
        jurisdiction_code: jurisdiction, authority, topic, source_title: sourceTitle, source_url: sourceUrl,
        valid_from: typeof body.validFrom === 'string' && body.validFrom ? body.validFrom : null,
        valid_to: typeof body.validTo === 'string' && body.validTo ? body.validTo : null,
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        verification_status: 'recorded',
      });
      if (error) throw error;
    } else if (action === 'verify_compliance_source') {
      await requireOwnedProfileForAction(env, admin, profileId);
      await rpcInternal(env, 'verify_finance_compliance_source', {
        p_source_id: body.sourceId,
        p_note: String(body.note ?? 'Reviewed against the cited authority page.'),
        p_verified_by: admin.email,
      });
    } else if (action === 'save_obligation') {
      const profile = await requireOwnedProfileForAction(env, admin, profileId);
      const sourceId = typeof body.sourceId === 'string' && body.sourceId ? body.sourceId : null;
      let sourceVerified = false;
      if (sourceId) {
        const { data: source } = await supabase.from('finance_compliance_sources').select('verification_status,jurisdiction_code').eq('id', sourceId).single();
        sourceVerified = source?.verification_status === 'verified' && source?.jurisdiction_code === String(body.jurisdictionCode ?? profile.jurisdiction_code ?? '').trim().toUpperCase();
      }
      const amount = body.amountCents == null || body.amountCents === '' ? null : Math.round(Number(body.amountCents));
      const row = {
        profile_id: profile.id,
        jurisdiction_code: String(body.jurisdictionCode ?? profile.jurisdiction_code ?? '').trim().toUpperCase(),
        obligation_type: String(body.obligationType ?? '').trim(),
        period_label: typeof body.periodLabel === 'string' && body.periodLabel.trim() ? body.periodLabel.trim() : null,
        due_date: typeof body.dueDate === 'string' && body.dueDate ? body.dueDate : null,
        status: sourceVerified ? String(body.status ?? 'open') : 'needs_review',
        amount_cents: amount,
        amount_currency: amount == null ? null : String(body.amountCurrency ?? profile.base_currency).trim().toUpperCase(),
        amount_source: amount == null ? null : (['manual','authority_import','professional_verified'].includes(String(body.amountSource)) ? String(body.amountSource) : 'manual'),
        source_id: sourceId,
        evidence_ref: typeof body.evidenceRef === 'string' && body.evidenceRef.trim() ? body.evidenceRef.trim() : null,
        requires_professional_review: body.requiresProfessionalReview !== false,
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        updated_at: new Date().toISOString(),
      };
      if (!row.jurisdiction_code || !row.obligation_type) return Response.json({ error: 'jurisdictionCode and obligationType are required' }, { status: 400, headers: CORS });
      const id = typeof body.id === 'string' ? body.id : null;
      const result = id
        ? await supabase.from('finance_obligations').update(row).eq('id', id).eq('profile_id', profile.id)
        : await supabase.from('finance_obligations').insert(row);
      if (result.error) throw result.error;
    } else if (action === 'activate_cash_policy') {
      await requireOwnedProfileForAction(env, admin, profileId);
      await rpcInternal(env, 'activate_finance_cash_policy', {
        p_actor_id: admin.id, p_profile_id: profileId,
        p_name: String(body.name ?? 'Treasury Policy'), p_reserve_months: Number(body.reserveMonthsTarget ?? 6),
        p_owner_pay: Number(body.ownerPayPct ?? 0), p_tax_reserve: Number(body.taxComplianceReservePct ?? 0),
        p_operating_reserve: Number(body.operatingReservePct ?? 0), p_long_term_investing: Number(body.longTermInvestingPct ?? 0),
        p_opportunity: Number(body.opportunityFundPct ?? 0), p_tax_verified: body.taxReserveVerified === true,
        p_tax_evidence: String(body.taxReserveEvidenceRef ?? ''), p_rationale: String(body.rationale ?? ''),
      });
    } else if (action === 'activate_investment_policy') {
      await requireOwnedProfileForAction(env, admin, profileId);
      await rpcInternal(env, 'activate_finance_investment_policy', {
        p_actor_id: admin.id, p_profile_id: profileId,
        p_horizon_years: Number(body.horizonYears ?? 10), p_liquidity_months: Number(body.liquidityBufferMonths ?? 6),
        p_risk_capacity: String(body.riskCapacity ?? 'unassessed'), p_max_single_asset: Number(body.maxSingleAssetPct ?? 20),
        p_max_illiquid: Number(body.maxIlliquidPct ?? 30), p_allowed: parseList(body.allowedAssetClasses),
        p_prohibited: parseList(body.prohibitedAssetClasses), p_notes: String(body.notes ?? ''),
      });
    } else if (action === 'save_goal') {
      const profile = await requireOwnedProfileForAction(env, admin, profileId);
      const target = Math.round(Number(body.targetAmountCents));
      if (!String(body.name ?? '').trim() || !Number.isFinite(target) || target <= 0) return Response.json({ error: 'goal name and positive target are required' }, { status: 400, headers: CORS });
      const { error } = await supabase.from('financial_goals').insert({
        profile_id: profile.id, name: String(body.name).trim(), target_amount: target,
        current_amount: Math.max(0, Math.round(Number(body.currentAmountCents ?? 0))),
        target_date: typeof body.targetDate === 'string' && body.targetDate ? body.targetDate : null,
      });
      if (error) throw error;
    } else if (action === 'archive_goal') {
      const profile = await requireOwnedProfileForAction(env, admin, profileId);
      const { error } = await supabase.from('financial_goals').update({ archived_at: new Date().toISOString() }).eq('id', body.id).eq('profile_id', profile.id);
      if (error) throw error;
    } else if (action === 'recommendation_decision') {
      const profile = await requireOwnedProfileForAction(env, admin, profileId);
      const status = body.status === 'approved' ? 'approved' : body.status === 'rejected' ? 'rejected' : null;
      if (!status) return Response.json({ error: 'decision must be approved or rejected' }, { status: 400, headers: CORS });
      const { error } = await supabase.from('finance_recommendations').update({ status, decided_at: new Date().toISOString() }).eq('id', body.id).eq('profile_id', profile.id);
      if (error) throw error;
    } else {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: CORS });
    }

    return Response.json(await dashboard(env, admin.id, profileId), { headers: CORS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Finance OS action failed.' }, { status: 500, headers: CORS });
  }
};

export const onRequestOptions = (): Response => new Response(null, {
  status: 204,
  headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
});
