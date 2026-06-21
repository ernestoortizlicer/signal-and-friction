import { createClient } from '@supabase/supabase-js';

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

interface PageSpeedAudit {
  numericValue?: number;
  displayValue?: string;
  score?: number | null;
}

interface PageSpeedResult {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } };
    audits?: Record<string, PageSpeedAudit>;
  };
  error?: { message: string };
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function lcpAbandonmentDelta(lcpMs: number): number {
  // Google study: each 1s above 2.5s baseline adds ~7% abandonment
  const baselineMs = 2500;
  if (lcpMs <= baselineMs) return 0;
  const excessSeconds = (lcpMs - baselineMs) / 1000;
  return Math.min(Math.round(excessSeconds * 7), 45);
}

function frictionGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 0.9) return 'A';
  if (score >= 0.75) return 'B';
  if (score >= 0.5) return 'C';
  if (score >= 0.25) return 'D';
  return 'F';
}

async function detectHtmlSignals(url: string): Promise<{
  hasStripe: boolean;
  stripeAsync: boolean;
  scriptCount: number;
  missingOgTags: string[];
  hasCheckoutIndicator: boolean;
  hasLazyImages: boolean;
  platform: string | null;
}> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SignalFrictionAudit/1.0 (+https://signal-and-friction.pages.dev)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    const scriptTags = (html.match(/<script[^>]*>/gi) || []);
    const scriptCount = scriptTags.length;

    const hasStripe = html.includes('stripe.js') || html.includes('stripe.com/v3');
    const stripeAsync = hasStripe && (
      html.includes('async') && (html.includes('stripe.js') || html.includes('stripe.com/v3'))
    );

    const missingOgTags: string[] = [];
    if (!html.includes('og:title')) missingOgTags.push('og:title');
    if (!html.includes('og:description')) missingOgTags.push('og:description');
    if (!html.includes('og:image')) missingOgTags.push('og:image');

    const checkoutKeywords = ['/checkout', 'add-to-cart', 'add_to_cart', 'buy-now', 'cart', 'basket'];
    const hasCheckoutIndicator = checkoutKeywords.some(k => html.toLowerCase().includes(k));

    const hasLazyImages = html.includes('loading="lazy"') || html.includes("loading='lazy'");

    let platform: string | null = null;
    if (html.includes('Shopify')) platform = 'Shopify';
    else if (html.includes('WooCommerce') || html.includes('woocommerce')) platform = 'WooCommerce';
    else if (html.includes('BigCommerce')) platform = 'BigCommerce';
    else if (html.includes('squarespace')) platform = 'Squarespace';
    else if (html.includes('webflow')) platform = 'Webflow';
    else if (html.includes('next') || html.includes('__NEXT_DATA__')) platform = 'Next.js';

    return { hasStripe, stripeAsync, scriptCount, missingOgTags, hasCheckoutIndicator, hasLazyImages, platform };
  } catch {
    return {
      hasStripe: false, stripeAsync: false, scriptCount: 0,
      missingOgTags: [], hasCheckoutIndicator: false, hasLazyImages: false, platform: null,
    };
  }
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

  const normalizedUrl = normalizeUrl(payload.url);
  if (!isValidUrl(normalizedUrl)) {
    return Response.json({ error: 'URL inválida' }, { status: 422 });
  }

  const domain = new URL(normalizedUrl).hostname.replace('www.', '');

  // Run PageSpeed + HTML scan in parallel
  const psKey = env.PAGESPEED_API_KEY ? `&key=${env.PAGESPEED_API_KEY}` : '';
  const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&strategy=mobile${psKey}`;

  const [psResponse, htmlSignals] = await Promise.allSettled([
    fetch(psUrl, { signal: AbortSignal.timeout(25000) }).then(r => r.json() as Promise<PageSpeedResult>),
    detectHtmlSignals(normalizedUrl),
  ]);

  // Parse PageSpeed
  let lcpMs = 0;
  let tbtMs = 0;
  let cls = 0;
  let perfScore = 0;
  let speedIndexMs = 0;
  let psError: string | null = null;

  if (psResponse.status === 'fulfilled') {
    const ps = psResponse.value;
    if (ps.error) {
      psError = ps.error.message;
    } else {
      const audits = ps.lighthouseResult?.audits ?? {};
      lcpMs = audits['largest-contentful-paint']?.numericValue ?? 0;
      tbtMs = audits['total-blocking-time']?.numericValue ?? 0;
      cls = audits['cumulative-layout-shift']?.numericValue ?? 0;
      perfScore = ps.lighthouseResult?.categories?.performance?.score ?? 0;
      speedIndexMs = audits['speed-index']?.numericValue ?? 0;
    }
  } else {
    psError = 'PageSpeed API timeout';
  }

  const html = htmlSignals.status === 'fulfilled' ? htmlSignals.value : {
    hasStripe: false, stripeAsync: false, scriptCount: 0,
    missingOgTags: [], hasCheckoutIndicator: false, hasLazyImages: false, platform: null,
  };

  // Compute derived metrics
  const abandonmentDelta = lcpAbandonmentDelta(lcpMs);
  const grade = frictionGrade(perfScore);
  const frictionScore = Math.round((1 - perfScore) * 100);

  // Identify friction mechanisms
  const frictionMechanisms: Array<{ type: string; severity: 'high' | 'medium' | 'low'; detail: string }> = [];

  if (lcpMs > 4000) {
    frictionMechanisms.push({ type: 'Cognitive Load', severity: 'high', detail: `LCP ${(lcpMs / 1000).toFixed(1)}s — above 4s threshold; users interpret slowness as unreliability.` });
  } else if (lcpMs > 2500) {
    frictionMechanisms.push({ type: 'Cognitive Load', severity: 'medium', detail: `LCP ${(lcpMs / 1000).toFixed(1)}s — above 2.5s baseline. Mobile cart abandonment increases by ~${abandonmentDelta}%.` });
  }

  if (tbtMs > 600) {
    frictionMechanisms.push({ type: 'Technical Friction', severity: 'high', detail: `Total Blocking Time ${Math.round(tbtMs)}ms — main thread blocked during checkout interaction window.` });
  } else if (tbtMs > 200) {
    frictionMechanisms.push({ type: 'Technical Friction', severity: 'medium', detail: `TBT ${Math.round(tbtMs)}ms — scripts are competing for execution during the critical conversion window.` });
  }

  if (cls > 0.25) {
    frictionMechanisms.push({ type: 'Trust Deficit', severity: 'high', detail: `CLS score ${cls.toFixed(3)} — layout shifts during page load destroy confidence in payment forms.` });
  } else if (cls > 0.1) {
    frictionMechanisms.push({ type: 'Trust Deficit', severity: 'medium', detail: `CLS score ${cls.toFixed(3)} — minor layout instability detected. Impacts form interaction trust.` });
  }

  if (html.hasStripe && !html.stripeAsync) {
    frictionMechanisms.push({ type: 'Technical Friction', severity: 'medium', detail: 'Stripe.js loaded synchronously — blocks parser and adds ~300ms to checkout render time. Load async.' });
  }

  if (html.scriptCount > 30) {
    frictionMechanisms.push({ type: 'Cognitive Load', severity: 'high', detail: `${html.scriptCount} script tags detected — excessive JS payload increases TBT and delays checkout interaction.` });
  } else if (html.scriptCount > 15) {
    frictionMechanisms.push({ type: 'Cognitive Load', severity: 'medium', detail: `${html.scriptCount} script tags — script contention risks blocking the payment UX on mid-range devices.` });
  }

  if (html.missingOgTags.length > 0) {
    frictionMechanisms.push({ type: 'Trust Deficit', severity: 'low', detail: `Missing OG tags: ${html.missingOgTags.join(', ')} — social sharing previews broken; reduces trust in referral traffic.` });
  }

  if (!html.hasLazyImages && html.hasCheckoutIndicator) {
    frictionMechanisms.push({ type: 'Technical Friction', severity: 'low', detail: 'Image lazy loading not detected — above-the-fold images may be blocking checkout page initial render.' });
  }

  // Monthly friction cost estimate (gated)
  const estimatedAbandonmentLoss = abandonmentDelta > 0
    ? `+${abandonmentDelta}% cart abandonment vs. baseline — at 1,000 monthly visitors and $200 avg order: $${(abandonmentDelta * 1000 * 0.03 * 200).toLocaleString()} monthly friction cost estimate`
    : null;

  const report = {
    domain,
    url: normalizedUrl,
    scannedAt: new Date().toISOString(),
    grade,
    frictionScore,
    psError,
    metrics: {
      lcp: { ms: Math.round(lcpMs), label: `${(lcpMs / 1000).toFixed(2)}s`, status: lcpMs > 4000 ? 'poor' : lcpMs > 2500 ? 'needs_improvement' : 'good' },
      tbt: { ms: Math.round(tbtMs), label: `${Math.round(tbtMs)}ms`, status: tbtMs > 600 ? 'poor' : tbtMs > 200 ? 'needs_improvement' : 'good' },
      cls: { value: +cls.toFixed(3), status: cls > 0.25 ? 'poor' : cls > 0.1 ? 'needs_improvement' : 'good' },
      performanceScore: Math.round(perfScore * 100),
      speedIndex: { ms: Math.round(speedIndexMs), label: `${(speedIndexMs / 1000).toFixed(2)}s` },
    },
    signals: {
      platform: html.platform,
      hasStripe: html.hasStripe,
      stripeAsync: html.stripeAsync,
      scriptCount: html.scriptCount,
      missingOgTags: html.missingOgTags,
      hasCheckoutIndicator: html.hasCheckoutIndicator,
      hasLazyImages: html.hasLazyImages,
    },
    frictionMechanisms,
    abandonmentDelta,
    estimatedAbandonmentLoss,
  };

  // If email provided, persist as lead with friction data
  if (payload.email && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await supabase.from('leads').upsert({
        email: payload.email,
        company: payload.company || domain,
        website: normalizedUrl,
        segment: frictionScore >= 60 ? 'DFY' : 'DWY',
        source: 'scan_tool',
        answers: {
          grade,
          friction_score: frictionScore,
          lcp_ms: Math.round(lcpMs),
          tbt_ms: Math.round(tbtMs),
          abandonment_delta_pct: abandonmentDelta,
          primary_mechanism: frictionMechanisms[0]?.type ?? null,
          platform: html.platform,
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
