import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { canonicalizePublicTargetUrl } from '../_target-url';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY?: string;
}

interface LeadSubmissionPayload {
  url: string;
  funnelPain: string;
  segmentSelection: string;
  customAnswer: string;
  email: string;
  urgency?: string;
  region?: 'US' | 'APAC';
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('OK', { headers: CORS });
  }

  try {
    const body = (await request.json()) as LeadSubmissionPayload;

    if (!body.email || !body.url || !body.funnelPain || !body.segmentSelection || !body.customAnswer) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: CORS });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400, headers: CORS });
    }

    // This value becomes the canonical future scan target, so validate the
    // public-network policy before persisting anything or returning a payment
    // link. Automatic post-payment scanning must never turn public intake into
    // an arbitrary server-side fetch primitive.
    const canonicalTarget = canonicalizePublicTargetUrl(body.url);
    if (!canonicalTarget.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid target URL', reason: canonicalTarget.reason }),
        { status: 400, headers: CORS }
      );
    }
    const targetUrl = canonicalTarget.url;

    let companyName = 'Unknown Startup';
    let urlDomain = '';
    try {
      const parsedUrl = new URL(targetUrl);
      urlDomain = parsedUrl.hostname;
      let host = urlDomain;
      if (host.startsWith('www.')) host = host.substring(4);
      const parts = host.split('.');
      if (parts.length > 0) companyName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'Invalid target URL' }), { status: 400, headers: CORS });
    }

    let contactName = 'Founder';
    const emailParts = body.email.split('@');
    if (emailParts.length > 0 && emailParts[0]) {
      const rawName = emailParts[0];
      contactName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }

    // elite_us/elite_sg intentionally remain Concierge/high_ticket until
    // real paid demand validates a separate offer tier.
    let mappedSegment = 'high_ticket';
    if (
      body.segmentSelection.toLowerCase().includes('autonomy') ||
      body.segmentSelection.toLowerCase().includes('microdosing') ||
      body.segmentSelection.toLowerCase().includes('learn')
    ) {
      mappedSegment = 'microdosing';
    }

    const region = body.region || 'US';
    const serviceRoleKey = getServiceRoleKey(env);
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500, headers: CORS });
    }

    const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingClient, error: existingClientError } = await supabase
      .from('clients')
      .select('id, target_url')
      .eq('contact_email', body.email)
      .maybeSingle();

    if (existingClientError) {
      return new Response(JSON.stringify({ error: 'Failed to resolve client record' }), { status: 500, headers: CORS });
    }

    let clientId = '';
    if (existingClient) {
      clientId = existingClient.id;

      // Email alone is not sufficient authorization to silently retarget an
      // existing client's diagnostic workspace. First establishment is safe;
      // a conflicting later URL requires human review.
      if (existingClient.target_url) {
        const storedTarget = canonicalizePublicTargetUrl(existingClient.target_url);
        if (!storedTarget.ok || storedTarget.url !== targetUrl) {
          return new Response(
            JSON.stringify({ error: 'Target URL conflict requires review', code: 'target_url_conflict_requires_review' }),
            { status: 409, headers: CORS }
          );
        }
      }

      const { error: updateClientError } = await supabase
        .from('clients')
        .update({
          company_name: companyName,
          contact_name: contactName,
          industry: urlDomain || 'Web Application',
          segment: mappedSegment,
          target_url: targetUrl,
          custom_fields: {
            segment_raw: body.segmentSelection,
            custom_answer: body.customAnswer,
            urgency: body.urgency || null,
            region,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (updateClientError) {
        return new Response(JSON.stringify({ error: 'Failed to update lead record' }), { status: 500, headers: CORS });
      }
    } else {
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert({
          company_name: companyName,
          contact_name: contactName,
          contact_email: body.email,
          industry: urlDomain || 'Web Application',
          source_platform: 'Direct Form Submission',
          segment: mappedSegment,
          target_url: targetUrl,
          custom_fields: {
            segment_raw: body.segmentSelection,
            custom_answer: body.customAnswer,
            urgency: body.urgency || null,
            region,
          },
        })
        .select('id')
        .single();

      if (clientErr) {
        console.error('Error creating client:', clientErr);
        return new Response(
          JSON.stringify({ error: `Failed to create lead record: ${clientErr.message}` }),
          { status: 500, headers: CORS }
        );
      }
      clientId = newClient!.id;
    }

    if (clientId) {
      const pricing = mappedSegment === 'microdosing' ? 350.0 : 2000.0;
      const { error: projectErr } = await supabase
        .from('beta_projects')
        .update({
          custom_metrics: {
            segment_raw: body.segmentSelection,
            custom_answer: body.customAnswer,
            region,
          },
          current_phase: 'diagnostic',
          symbolic_price_charged: pricing,
        })
        .eq('client_id', clientId);
      if (projectErr) console.warn('beta_projects update skipped:', projectErr.message);
    }

    // Intake records evidence/context only. Human diagnostic authority remains
    // downstream; no friction mechanism is inferred here.
    const { error: interactionErr } = await supabase
      .from('interactions')
      .insert({
        client_id: clientId,
        funnel_signal: body.funnelPain,
        dominant_friction_mechanism: null,
      });
    if (interactionErr) console.warn('interaction logging skipped:', interactionErr.message);

    const priceId = mappedSegment === 'microdosing' ? 'price_dwy_beta_diagnostic' : 'price_dfy_beta_diagnostic';
    const { data: linkData } = await supabase
      .from('stripe_payment_links')
      .select('payment_link_url')
      .eq('price_id', priceId)
      .maybeSingle();

    const rawLink = linkData?.payment_link_url || null;
    const paymentLink = rawLink && !rawLink.includes('mock') ? rawLink : null;

    if (!paymentLink) {
      console.error(`❌ Stripe link missing or still a mock placeholder for ${priceId}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        client_id: clientId,
        company: companyName,
        segment: mappedSegment,
        region,
        payment_link: paymentLink,
        message: 'Lead submitted successfully',
      }),
      { status: 200, headers: CORS }
    );
  } catch (error) {
    console.error('Lead submission error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: CORS });
  }
};
