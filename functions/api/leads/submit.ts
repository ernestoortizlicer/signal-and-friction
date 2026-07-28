import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

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

    // Validate required fields
    if (!body.email || !body.url || !body.funnelPain || !body.segmentSelection || !body.customAnswer) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: CORS }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: CORS }
      );
    }

    // Parse URL and extract company name
    let companyName = 'Unknown Startup';
    let urlDomain = '';
    try {
      let cleanUrl = body.url;
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      const parsedUrl = new URL(cleanUrl);
      urlDomain = parsedUrl.hostname;
      let host = urlDomain;
      if (host.startsWith('www.')) {
        host = host.substring(4);
      }
      const parts = host.split('.');
      if (parts.length > 0) {
        companyName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    } catch (_e) {
      companyName = body.url;
    }

    // Extract contact name from email
    let contactName = 'Founder';
    const emailParts = body.email.split('@');
    if (emailParts.length > 0 && emailParts[0]) {
      const rawName = emailParts[0];
      contactName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }

    // Map segment selection to enum.
    // elite_us/elite_sg intentionally fall through to 'high_ticket' here —
    // Elite = Concierge pricing + manual white-glove follow-up, not a
    // separate Stripe tier yet. Revisit when a real prospect validates
    // demand above Concierge.
    let mappedSegment = 'high_ticket';
    if (
      body.segmentSelection.toLowerCase().includes('autonomy') ||
      body.segmentSelection.toLowerCase().includes('microdosing') ||
      body.segmentSelection.toLowerCase().includes('learn')
    ) {
      mappedSegment = 'microdosing';
    }

    // Map friction mechanism
    let mappedMechanism = 'cognitive_load';
    const painLower = body.funnelPain.toLowerCase();
    if (painLower.includes('bounce') || painLower.includes('landing')) {
      mappedMechanism = 'value_deficit';
    } else if (painLower.includes('billing') || painLower.includes('paywall') || painLower.includes('gate')) {
      mappedMechanism = 'trust_deficit';
    } else if (painLower.includes('onboarding') || painLower.includes('dropout') || painLower.includes('setup')) {
      mappedMechanism = 'cognitive_load';
    } else if (painLower.includes('pricing') || painLower.includes('confusion')) {
      mappedMechanism = 'sequence_order';
    }

    const region = body.region || 'US';

    const serviceRoleKey = getServiceRoleKey(env);
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration' }),
        { status: 500, headers: CORS }
      );
    }

    const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Check if client already exists (prevent duplicates)
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('contact_email', body.email)
      .maybeSingle();

    let clientId = '';
    if (existingClient) {
      clientId = existingClient.id;
      // Update existing client
      await supabase
        .from('clients')
        .update({
          company_name: companyName,
          contact_name: contactName,
          industry: urlDomain || 'Web Application',
          segment: mappedSegment,
          custom_fields: {
            segment_raw: body.segmentSelection,
            custom_answer: body.customAnswer,
            urgency: body.urgency || null,
            region,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);
    } else {
      // Insert new client
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert({
          company_name: companyName,
          contact_name: contactName,
          contact_email: body.email,
          industry: urlDomain || 'Web Application',
          source_platform: 'Direct Form Submission',
          segment: mappedSegment,
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

    // Update beta_projects if it exists. Supabase query builders are thenables,
    // not Promises — they have no `.catch`. Await and ignore a soft failure.
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
      if (projectErr) {
        // Project may not exist yet — non-critical.
        console.warn('beta_projects update skipped:', projectErr.message);
      }
    }

    // Create interaction record (non-critical telemetry).
    const { error: interactionErr } = await supabase
      .from('interactions')
      .insert({
        client_id: clientId,
        interaction_type: 'form_submission',
        dominant_friction_mechanism: mappedMechanism,
        data: {
          url: body.url,
          funnel_pain: body.funnelPain,
          segment_selection: body.segmentSelection,
          custom_answer: body.customAnswer,
        },
      });
    if (interactionErr) {
      console.warn('interaction logging skipped:', interactionErr.message);
    }

    // Determine Stripe payment link based on segment
    const priceId = mappedSegment === 'microdosing' ? 'price_dwy_beta_diagnostic' : 'price_dfy_beta_diagnostic';
    const { data: linkData } = await supabase
      .from('stripe_payment_links')
      .select('payment_link_url')
      .eq('price_id', priceId)
      .maybeSingle();

    // A link containing "mock" is a seed placeholder, not a real Stripe
    // link — never hand it back as if it were usable.
    const rawLink = linkData?.payment_link_url || null;
    const paymentLink = rawLink && !rawLink.includes('mock') ? rawLink : null;

    if (!paymentLink) {
      console.error(`❌ Stripe link missing or still a mock placeholder for ${priceId}`);
      // Still return success - lead is recorded
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: CORS }
    );
  }
};
