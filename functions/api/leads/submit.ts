import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { canonicalizePublicTargetUrl } from '../_target-url';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY?: string;
}

type MarketSurface = 'global' | 'apac';
type CountryCode = 'US' | 'CA' | 'GB' | 'SG' | 'AU';

interface LeadSubmissionPayload {
  url: string;
  funnelPain: string;
  segmentSelection: string;
  customAnswer: string;
  email: string;
  urgency?: string;
  companyStage?: string;
  marketSurface?: MarketSurface;
  countryCode?: CountryCode;
  language?: string;
  acquisitionSource?: string;
  region?: 'US' | 'APAC';
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const COUNTRY_MARKET: Record<CountryCode, MarketSurface> = {
  US: 'global', CA: 'global', GB: 'global', SG: 'apac', AU: 'apac',
};

function marketContext(body: LeadSubmissionPayload) {
  const country = body.countryCode && COUNTRY_MARKET[body.countryCode] ? body.countryCode : null;
  const expected = country ? COUNTRY_MARKET[country] : null;
  const market: MarketSurface = expected ?? body.marketSurface ?? (body.region === 'APAC' ? 'apac' : 'global');
  if (expected && expected !== market) return null;
  return {
    market_surface: market,
    country_code: country,
    language: body.language?.slice(0, 16) || 'en',
    acquisition_source: body.acquisitionSource?.slice(0, 500) || 'direct',
    company_stage: body.companyStage?.slice(0, 80) || null,
    region: market === 'apac' ? 'APAC' : 'US',
  } as const;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response('OK', { headers: CORS });
  try {
    const body = (await request.json()) as LeadSubmissionPayload;
    if (!body.email || !body.url || !body.funnelPain || !body.segmentSelection || !body.customAnswer) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: CORS });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400, headers: CORS });
    }
    const context = marketContext(body);
    if (!context) return new Response(JSON.stringify({ error: 'Country and market surface conflict' }), { status: 400, headers: CORS });

    const canonicalTarget = canonicalizePublicTargetUrl(body.url);
    if (!canonicalTarget.ok) return new Response(JSON.stringify({ error: 'Invalid target URL', reason: canonicalTarget.reason }), { status: 400, headers: CORS });
    const targetUrl = canonicalTarget.url;
    const parsed = new URL(targetUrl);
    const urlDomain = parsed.hostname;
    const companyRoot = urlDomain.replace(/^www\./, '').split('.')[0] || 'Unknown Startup';
    const companyName = companyRoot.charAt(0).toUpperCase() + companyRoot.slice(1);
    const rawName = body.email.split('@')[0] || 'Founder';
    const contactName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const selection = body.segmentSelection.toLowerCase();
    const mappedSegment = selection.includes('autonomy') || selection.includes('microdosing') || selection.includes('learn') ? 'microdosing' : 'high_ticket';

    const serviceRoleKey = getServiceRoleKey(env);
    if (!serviceRoleKey) return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500, headers: CORS });
    const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const customFields = { segment_raw: body.segmentSelection, custom_answer: body.customAnswer, urgency: body.urgency || null, ...context };

    const { data: existingClient, error: lookupError } = await supabase.from('clients').select('id, target_url').eq('contact_email', body.email).maybeSingle();
    if (lookupError) return new Response(JSON.stringify({ error: 'Failed to resolve client record' }), { status: 500, headers: CORS });

    let clientId: string;
    if (existingClient) {
      clientId = existingClient.id;
      if (existingClient.target_url) {
        const stored = canonicalizePublicTargetUrl(existingClient.target_url);
        if (!stored.ok || stored.url !== targetUrl) {
          return new Response(JSON.stringify({ error: 'Target URL conflict requires review', code: 'target_url_conflict_requires_review' }), { status: 409, headers: CORS });
        }
      }
      const { error } = await supabase.from('clients').update({ company_name: companyName, contact_name: contactName, industry: urlDomain || 'Web Application', segment: mappedSegment, target_url: targetUrl, custom_fields: customFields, updated_at: new Date().toISOString() }).eq('id', clientId);
      if (error) return new Response(JSON.stringify({ error: 'Failed to update lead record' }), { status: 500, headers: CORS });
    } else {
      const { data, error } = await supabase.from('clients').insert({ company_name: companyName, contact_name: contactName, contact_email: body.email, industry: urlDomain || 'Web Application', source_platform: 'Direct Form Submission', segment: mappedSegment, target_url: targetUrl, custom_fields: customFields }).select('id').single();
      if (error || !data) return new Response(JSON.stringify({ error: 'Failed to create lead record' }), { status: 500, headers: CORS });
      clientId = data.id;
    }

    const symbolicPrice = mappedSegment === 'microdosing' ? 350 : 2000;
    const { error: projectError } = await supabase.from('beta_projects').update({ custom_metrics: customFields, current_phase: 'diagnostic', symbolic_price_charged: symbolicPrice }).eq('client_id', clientId);
    if (projectError) console.warn('beta_projects update skipped:', projectError.message);
    const { error: interactionError } = await supabase.from('interactions').insert({ client_id: clientId, funnel_signal: body.funnelPain, dominant_friction_mechanism: null });
    if (interactionError) console.warn('interaction logging skipped:', interactionError.message);

    const priceId = mappedSegment === 'microdosing' ? 'price_dwy_beta_diagnostic' : 'price_dfy_beta_diagnostic';
    const { data: linkData } = await supabase.from('stripe_payment_links').select('payment_link_url').eq('price_id', priceId).maybeSingle();
    const rawLink = linkData?.payment_link_url || null;
    const paymentLink = rawLink && !rawLink.includes('mock') ? rawLink : null;

    return new Response(JSON.stringify({ success: true, client_id: clientId, company: companyName, segment: mappedSegment, region: context.region, market_surface: context.market_surface, country_code: context.country_code, payment_link: paymentLink, message: 'Lead submitted successfully' }), { status: 200, headers: CORS });
  } catch (error) {
    console.error('Lead submission error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: CORS });
  }
};
