/**
 * Shared scan engine — PageSpeed + HTML signal detection.
 * ════════════════════════════════════════════════════════════════════════════
 * Extracted from scan-url.ts so the public scan tool and the admin
 * prospecting pipeline run the exact same scan against the exact same code
 * path. Lives under functions/ (not src/lib) because Cloudflare esbuild
 * can't resolve cross-directory imports into src/ at function compile time.
 * The leading `_` keeps Pages from treating this module as a route.
 */

export interface ScanEnv {
  PAGESPEED_API_KEY?: string;
}

export interface FrictionMechanism {
  type: string;
  severity: 'high' | 'medium' | 'low';
  detail: string;
}

export interface ScanReport {
  domain: string;
  url: string;
  scannedAt: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  frictionScore: number;
  psError: string | null;
  htmlSignalsError: string | null;
  metrics: {
    lcp: { ms: number; label: string; status: 'poor' | 'needs_improvement' | 'good' };
    tbt: { ms: number; label: string; status: 'poor' | 'needs_improvement' | 'good' };
    cls: { value: number; status: 'poor' | 'needs_improvement' | 'good' };
    performanceScore: number;
    speedIndex: { ms: number; label: string };
  };
  signals: {
    platform: string | null;
    hasStripe: boolean;
    stripeAsync: boolean;
    scriptCount: number;
    missingOgTags: string[];
    hasCheckoutIndicator: boolean;
    hasLazyImages: boolean;
  };
  frictionMechanisms: FrictionMechanism[];
  abandonmentDelta: number;
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

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function isValidUrl(url: string): boolean {
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

// Throws on any failure (unreachable host, timeout, non-2xx response)
// instead of swallowing it. scan-url.ts's public tool still degrades this
// gracefully via the Promise.allSettled below (unchanged behavior there);
// the prospecting pipeline needs the real failure reason instead of a
// silent all-false/zero result that reads exactly like "measured, clean."
async function detectHtmlSignals(url: string): Promise<{
  hasStripe: boolean;
  stripeAsync: boolean;
  scriptCount: number;
  missingOgTags: string[];
  hasCheckoutIndicator: boolean;
  hasLazyImages: boolean;
  platform: string | null;
}> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SignalFrictionAudit/1.0 (+https://signal-and-friction.pages.dev)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Target returned HTTP ${res.status}`);
  }
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
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryablePageSpeedError(message: string): boolean {
  return /quota|rate.?limit|429|resource.?exhausted/i.test(message);
}

// Running keyless against Google's shared anonymous PageSpeed quota (no
// PAGESPEED_API_KEY configured) means individual requests fail with a
// quota error far more often than a keyed request would. Retrying a
// transient quota rejection gives a keyless scan a real second (and
// third) chance at getting genuine data instead of giving up on the
// first hit. Only retries quota/rate-limit-shaped errors — a permanent
// failure (bad URL, Lighthouse crash on the target) won't be fixed by
// trying again, so don't waste the attempts on those.
async function runPageSpeedWithRetry(psUrl: string): Promise<{ result: PageSpeedResult | null; error: string | null }> {
  const timeoutsMs = [25000, 12000, 12000];
  let lastError = 'PageSpeed request failed';

  for (let attempt = 0; attempt < timeoutsMs.length; attempt++) {
    const isLastAttempt = attempt === timeoutsMs.length - 1;
    try {
      const res = await fetch(psUrl, { signal: AbortSignal.timeout(timeoutsMs[attempt]) });
      const parsed = (await res.json()) as PageSpeedResult;
      if (!parsed.error) {
        return { result: parsed, error: null };
      }
      lastError = parsed.error.message;
      if (isLastAttempt || !isRetryablePageSpeedError(lastError)) {
        return { result: null, error: lastError };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'PageSpeed request failed';
      if (isLastAttempt) {
        return { result: null, error: lastError };
      }
      // Network-level failures (timeout, DNS) are worth one retry too —
      // they can be as transient as a quota rejection.
    }
    await sleep(1500 * (attempt + 1));
  }

  return { result: null, error: lastError };
}

export async function runScan(rawUrl: string, env: ScanEnv): Promise<ScanReport> {
  const normalizedUrl = normalizeUrl(rawUrl);
  if (!isValidUrl(normalizedUrl)) {
    throw new Error('Invalid URL');
  }

  const domain = new URL(normalizedUrl).hostname.replace('www.', '');

  // Run PageSpeed + HTML scan in parallel
  const psKey = env.PAGESPEED_API_KEY ? `&key=${env.PAGESPEED_API_KEY}` : '';
  const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&strategy=mobile${psKey}`;

  const [psOutcome, htmlSignals] = await Promise.allSettled([
    runPageSpeedWithRetry(psUrl),
    detectHtmlSignals(normalizedUrl),
  ]);

  // Parse PageSpeed
  let lcpMs = 0;
  let tbtMs = 0;
  let cls = 0;
  let perfScore = 0;
  let speedIndexMs = 0;
  let psError: string | null = null;

  if (psOutcome.status === 'fulfilled') {
    const { result: ps, error } = psOutcome.value;
    if (error || !ps) {
      psError = error ?? 'PageSpeed returned no result';
    } else {
      const audits = ps.lighthouseResult?.audits ?? {};
      lcpMs = audits['largest-contentful-paint']?.numericValue ?? 0;
      tbtMs = audits['total-blocking-time']?.numericValue ?? 0;
      cls = audits['cumulative-layout-shift']?.numericValue ?? 0;
      perfScore = ps.lighthouseResult?.categories?.performance?.score ?? 0;
      speedIndexMs = audits['speed-index']?.numericValue ?? 0;
    }
  } else {
    psError = psOutcome.reason instanceof Error ? psOutcome.reason.message : 'PageSpeed request failed';
  }

  let htmlSignalsError: string | null = null;
  const html = htmlSignals.status === 'fulfilled' ? htmlSignals.value : {
    hasStripe: false, stripeAsync: false, scriptCount: 0,
    missingOgTags: [], hasCheckoutIndicator: false, hasLazyImages: false, platform: null,
  };
  if (htmlSignals.status === 'rejected') {
    htmlSignalsError = htmlSignals.reason instanceof Error ? htmlSignals.reason.message : 'HTML fetch failed';
  }

  // Compute derived metrics
  const abandonmentDelta = lcpAbandonmentDelta(lcpMs);
  const grade = frictionGrade(perfScore);
  const frictionScore = Math.round((1 - perfScore) * 100);

  // Identify friction mechanisms
  const frictionMechanisms: FrictionMechanism[] = [];

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

  return {
    domain,
    url: normalizedUrl,
    scannedAt: new Date().toISOString(),
    grade,
    frictionScore,
    psError,
    htmlSignalsError,
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
  };
}

/**
 * ── Prospecting-only helpers ──
 * The pipeline that ranks cold-outreach candidates must never surface an
 * interpreted "pain point" or a projected business-impact number — only
 * what the scan actually observed. These two functions are the enforcement
 * point for that rule: toRawTechnicalSignals() is the only way prospecting
 * code is allowed to read a ScanReport, and it physically excludes
 * frictionMechanisms (narrative prose) and abandonmentDelta (a projected
 * % revenue impact) from the shape it returns.
 */

export interface RawTechnicalSignals {
  lcp: ScanReport['metrics']['lcp'];
  tbt: ScanReport['metrics']['tbt'];
  cls: ScanReport['metrics']['cls'];
  performanceScore: number;
  speedIndex: ScanReport['metrics']['speedIndex'];
  grade: ScanReport['grade'];
  platform: string | null;
  hasStripe: boolean;
  stripeAsync: boolean;
  scriptCount: number;
  missingOgTags: string[];
  hasCheckoutIndicator: boolean;
  hasLazyImages: boolean;
  scannedAt: string;
  psError: string | null;
  htmlSignalsError: string | null;
}

export function toRawTechnicalSignals(report: ScanReport): RawTechnicalSignals {
  return {
    lcp: report.metrics.lcp,
    tbt: report.metrics.tbt,
    cls: report.metrics.cls,
    performanceScore: report.metrics.performanceScore,
    speedIndex: report.metrics.speedIndex,
    grade: report.grade,
    platform: report.signals.platform,
    hasStripe: report.signals.hasStripe,
    stripeAsync: report.signals.stripeAsync,
    scriptCount: report.signals.scriptCount,
    missingOgTags: report.signals.missingOgTags,
    hasCheckoutIndicator: report.signals.hasCheckoutIndicator,
    hasLazyImages: report.signals.hasLazyImages,
    scannedAt: report.scannedAt,
    psError: report.psError,
    htmlSignalsError: report.htmlSignalsError,
  };
}

export interface TechnicalScoreBreakdown {
  performance: number; // 0-40, from PageSpeed performance score deficit
  lcp: number;          // 0-20, from Largest Contentful Paint over 2.5s baseline
  tbt: number;           // 0-15, from Total Blocking Time over 200ms baseline
  cls: number;           // 0-10, from Cumulative Layout Shift over 0.1 baseline
  trustSignals: number;  // 0-15, from missing OG tags / sync Stripe / no lazy-loading on a checkout page
}

/**
 * Pure arithmetic, zero model calls. Every component is a deterministic
 * function of one observable scan field — there is no step here where
 * anything infers "how much this company is hurting". This is a triage
 * ranking, not a diagnosis; the breakdown is returned alongside the score
 * so the admin view can show exactly which observed signals produced it.
 */
export function computeTechnicalSignalScore(
  signals: RawTechnicalSignals
): { score: number; breakdown: TechnicalScoreBreakdown } {
  const performance = Math.round((1 - signals.performanceScore / 100) * 40);

  const lcpMs = signals.lcp.ms;
  const lcp = lcpMs <= 2500 ? 0 : Math.min(20, Math.round(((lcpMs - 2500) / 3500) * 20));

  const tbtMs = signals.tbt.ms;
  const tbt = tbtMs <= 200 ? 0 : Math.min(15, Math.round(((tbtMs - 200) / 800) * 15));

  const clsVal = signals.cls.value;
  const cls = clsVal <= 0.1 ? 0 : Math.min(10, Math.round(((clsVal - 0.1) / 0.4) * 10));

  let trustSignals = 0;
  if (signals.missingOgTags.length > 0) trustSignals += 5;
  if (signals.hasCheckoutIndicator && !signals.hasLazyImages) trustSignals += 5;
  if (signals.hasStripe && !signals.stripeAsync) trustSignals += 5;

  const breakdown: TechnicalScoreBreakdown = { performance, lcp, tbt, cls, trustSignals };
  const score = Math.min(100, performance + lcp + tbt + cls + trustSignals);
  return { score, breakdown };
}
