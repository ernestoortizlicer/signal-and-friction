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

// Presence/absence only — 'undetermined' when the page is a client-rendered
// shell with too little server-side text to search honestly. Never
// collapsed to a false negative just because we couldn't check.
export type Presence = 'found' | 'not_found' | 'undetermined';

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
    httpsEnabled: boolean;
    privacyPolicyLink: Presence;
    termsOfServiceLink: Presence;
    socialProof: Presence;
    securityBadges: Presence;
    liveChatWidget: Presence;
    pricingLink: Presence;
    viewportMetaPresent: boolean;
    primaryCtaPresent: Presence;
    onSiteTestimonial: Presence;
    thirdPartyReviewLink: Presence;
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
// Strips script/style blocks and remaining tags to approximate what a
// visitor actually sees server-side, before any client JS runs. Under
// ~500 characters of that is treated as "this is a JS-rendered shell, not
// real content" — the concrete, checkable condition behind 'undetermined'
// for the SaaS-trust-signal checks below. Not a judgment about the site;
// just an honest limit of what a plain fetch (no JS execution) can see.
//
// Phrase-based checks (pricingLink's text fallback, primaryCtaPresent) run
// against this stripped text rather than raw HTML. Root cause of a real
// false negative found 2026-07-31: matching raw HTML with a `>text<`
// boundary breaks the instant a CTA has any trailing decoration inside the
// same tag — e.g. "See the diagnostic pricing &#x27;→</a>" leaves an
// arrow glyph between the phrase and the closing `<`, so a boundary-
// anchored regex never matches even though the phrase is right there.
// Stripped text has no tag boundaries left to trip on.
function stripToVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleTextLength(html: string): number {
  return stripToVisibleText(html).length;
}

function detectPresence(html: string, contentIsRendered: boolean, pattern: RegExp): Presence {
  if (!contentIsRendered) return 'undetermined';
  return pattern.test(html) ? 'found' : 'not_found';
}

async function detectHtmlSignals(url: string): Promise<{
  hasStripe: boolean;
  stripeAsync: boolean;
  scriptCount: number;
  missingOgTags: string[];
  hasCheckoutIndicator: boolean;
  hasLazyImages: boolean;
  platform: string | null;
  httpsEnabled: boolean;
  privacyPolicyLink: Presence;
  termsOfServiceLink: Presence;
  socialProof: Presence;
  securityBadges: Presence;
  liveChatWidget: Presence;
  pricingLink: Presence;
  viewportMetaPresent: boolean;
  primaryCtaPresent: Presence;
  onSiteTestimonial: Presence;
  thirdPartyReviewLink: Presence;
}> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SignalFrictionAudit/1.0 (+https://signal-and-friction.pages.dev)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Target returned HTTP ${res.status}`);
  }
  const html = await res.text();

  // The final URL after redirects — the honest answer to "is this site
  // actually served over HTTPS", not just what protocol we requested.
  const httpsEnabled = res.url.startsWith('https://');

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

  // B2B-SaaS-appropriate trust signals — presence/absence only, checked
  // against a marketing homepage rather than the checkout-page-shaped
  // signals above. "Pricing link" is deliberately not scoped to "in nav"
  // — a plain-text/regex search can't reliably isolate a nav region, so
  // it checks for a pricing link anywhere on the page, matching what's
  // actually measured rather than overclaiming precision.
  const visibleText = stripToVisibleText(html);
  const contentIsRendered = visibleText.length >= 500;
  const privacyPolicyLink = detectPresence(html, contentIsRendered, /href="[^"]*privacy[^"]*"|privacy\s*policy/i);
  const termsOfServiceLink = detectPresence(html, contentIsRendered, /href="[^"]*terms[^"]*"|terms\s*(of\s*(service|use)|and\s*conditions)/i);
  const socialProof = detectPresence(html, contentIsRendered, /testimonial|case\s*stud(y|ies)|trustpilot|g2\.com|capterra/i);
  const securityBadges = detectPresence(html, contentIsRendered, /soc\s?2|gdpr|iso\s?27001/i);
  const liveChatWidget = detectPresence(html, contentIsRendered, /intercom|drift\.com|crisp\.chat|tawk\.to|zendesk|zopim|hubspot|chatwoot|frontapp\.com/i);

  // Root cause of a real false negative (found 2026-07-31, scanning this
  // site's own homepage): the old pattern only checked the raw href
  // attribute (`href="...pricing..."`) or a tag-boundary-anchored
  // `>pricing<` text match. A pricing link whose href doesn't literally
  // contain "pricing" (client-side routed, a differently-named slug) or
  // whose visible label sits behind nested markup never matched either
  // form. Now also checks the stripped visible text for the word
  // "pricing" — catches a plain-text nav label or button regardless of
  // its href or surrounding markup, at the cost of also matching editorial
  // mentions of the word "pricing" that aren't a link (an honest tradeoff:
  // false positives from body copy vs. false negatives from real pricing
  // links this used to miss — this scan already accepts the same tradeoff
  // for the CTA/testimonial/security checks below).
  const pricingLink = detectPresence(
    html,
    contentIsRendered,
    /href="[^"]*pricing[^"]*"/i
  ) === 'found' ? 'found' : detectPresence(visibleText, contentIsRendered, /\bpricing\b/i);

  // Google's own mobile-friendly criterion (web.dev/Chrome docs): without a
  // valid viewport meta tag, mobile browsers render at desktop width and
  // scale down, which is close to a guaranteed bounce on majority-mobile
  // traffic. This tag lives in <head> and is present in the initial server
  // response even for JS-shell SPAs, so — unlike the content checks below —
  // it never needs the contentIsRendered gate; it's a direct regex on the
  // raw response, same reliability class as httpsEnabled.
  const viewportMetaPresent = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);

  // Best-effort by design, not fold-scoped: a plain fetch with no headless
  // browser cannot know what's visible without scrolling, so this
  // deliberately checks presence anywhere on the page rather than
  // overclaiming "above the fold" or "in the hero" — same honesty pattern
  // already established by pricingLink above.
  //
  // Root cause of a real false negative (found 2026-07-31, this site's own
  // CTAs — "Scan My Funnel →" and "See the diagnostic pricing →" — were
  // both reported not_found): two compounding bugs. First, the old phrase
  // list only covered one CTA archetype (trial-signup SaaS: "get started",
  // "start free trial") and had no coverage for the free-scan/audit/
  // diagnostic-tool archetype this product itself belongs to — a real gap
  // in the source list, not a matching bug. Second, the match ran against
  // raw HTML with a `>phrase<` tag-boundary anchor, which breaks the
  // instant any trailing decoration (an arrow glyph, an icon span) sits
  // between the phrase and the tag close — exactly what "→" does here.
  // Fixed by matching the stripped visible text (no tag boundaries to
  // trip on) against a broadened phrase list spanning the common CTA
  // archetypes documented in CXL's and Unbounce's CTA-copy research:
  // trial/signup, demo/sales-contact, and scan/audit/checker tools.
  const ctaPhrases = [
    // trial / signup archetype
    'get started', 'start your free trial', 'start a free trial', 'start free trial',
    'sign up free', 'sign up for free', 'create your account', 'create free account',
    'try it free', 'try for free',
    // demo / sales-contact archetype
    'book a demo', 'request a demo', 'schedule a demo', 'talk to sales', 'contact sales',
    'book a call', 'schedule a call', 'get a quote', 'get quote',
    // scan / audit / diagnostic-tool archetype — the original list had zero
    // coverage here, which is what missed this site's own primary CTA
    'scan my', 'run a free scan', 'run my scan', 'analyze my', 'check my site',
    'audit my', 'get my audit', 'get my report', 'see my results', 'get my diagnostic',
    // generic low-friction next-step phrasing
    'start now', 'see pricing', 'view pricing', 'claim your', 'join free', 'join now',
  ];
  const ctaPattern = new RegExp(ctaPhrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
  const primaryCtaPresent = detectPresence(visibleText, contentIsRendered, ctaPattern);

  // Split from a single combined "socialProof" regex: NN/g's research found
  // users trust testimonials on external review platforms (which the site
  // owner doesn't control) more than the same claim made on-site — the two
  // forms carry different evidentiary weight and are scored separately.
  const onSiteTestimonial = detectPresence(html, contentIsRendered, /testimonial|case\s*stud(y|ies)/i);
  const thirdPartyReviewLink = detectPresence(html, contentIsRendered, /trustpilot|g2\.com|capterra/i);

  return {
    hasStripe, stripeAsync, scriptCount, missingOgTags, hasCheckoutIndicator, hasLazyImages, platform,
    httpsEnabled, privacyPolicyLink, termsOfServiceLink, socialProof, securityBadges, liveChatWidget, pricingLink,
    viewportMetaPresent, primaryCtaPresent, onSiteTestimonial, thirdPartyReviewLink,
  };
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
    httpsEnabled: false,
    privacyPolicyLink: 'undetermined' as Presence,
    termsOfServiceLink: 'undetermined' as Presence,
    socialProof: 'undetermined' as Presence,
    securityBadges: 'undetermined' as Presence,
    liveChatWidget: 'undetermined' as Presence,
    pricingLink: 'undetermined' as Presence,
    viewportMetaPresent: false,
    primaryCtaPresent: 'undetermined' as Presence,
    onSiteTestimonial: 'undetermined' as Presence,
    thirdPartyReviewLink: 'undetermined' as Presence,
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
      httpsEnabled: html.httpsEnabled,
      privacyPolicyLink: html.privacyPolicyLink,
      termsOfServiceLink: html.termsOfServiceLink,
      socialProof: html.socialProof,
      securityBadges: html.securityBadges,
      liveChatWidget: html.liveChatWidget,
      pricingLink: html.pricingLink,
      viewportMetaPresent: html.viewportMetaPresent,
      primaryCtaPresent: html.primaryCtaPresent,
      onSiteTestimonial: html.onSiteTestimonial,
      thirdPartyReviewLink: html.thirdPartyReviewLink,
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
  performanceScore: number; // informational context only — not scored, see computeTechnicalSignalScore doc
  speedIndex: ScanReport['metrics']['speedIndex'];
  grade: ScanReport['grade'];
  platform: string | null;
  missingOgTags: string[]; // informational only — not scored, see doc below
  httpsEnabled: boolean;   // informational flag only — not scored, see doc below
  privacyPolicyLink: Presence;
  termsOfServiceLink: Presence;
  securityBadges: Presence;
  liveChatWidget: Presence; // informational flag only — not scored, see doc below
  pricingLink: Presence;
  viewportMetaPresent: boolean;
  primaryCtaPresent: Presence;
  onSiteTestimonial: Presence;
  thirdPartyReviewLink: Presence;
  scannedAt: string;
  psError: string | null;
  htmlSignalsError: string | null;
}

// Retired from the prospecting-facing signal set 2026-07-31 (checkout
// indicator, checkout+lazy-load, Stripe/async, lazy-images, script count):
// all five are e-commerce/checkout artifacts or redundant technical-cost
// proxies that a B2B SaaS marketing page essentially never trips — see the
// signal audit doc for the full reasoning. detectHtmlSignals() and the
// public-facing ScanReport type still compute and expose them (the public
// /scan tool and functions/api/diagnose.ts depend on that shape) — only
// this prospecting-facing extraction stops forwarding them.
export function toRawTechnicalSignals(report: ScanReport): RawTechnicalSignals {
  return {
    lcp: report.metrics.lcp,
    tbt: report.metrics.tbt,
    cls: report.metrics.cls,
    performanceScore: report.metrics.performanceScore,
    speedIndex: report.metrics.speedIndex,
    grade: report.grade,
    platform: report.signals.platform,
    missingOgTags: report.signals.missingOgTags,
    httpsEnabled: report.signals.httpsEnabled,
    privacyPolicyLink: report.signals.privacyPolicyLink,
    termsOfServiceLink: report.signals.termsOfServiceLink,
    securityBadges: report.signals.securityBadges,
    liveChatWidget: report.signals.liveChatWidget,
    pricingLink: report.signals.pricingLink,
    viewportMetaPresent: report.signals.viewportMetaPresent,
    primaryCtaPresent: report.signals.primaryCtaPresent,
    onSiteTestimonial: report.signals.onSiteTestimonial,
    thirdPartyReviewLink: report.signals.thirdPartyReviewLink,
    scannedAt: report.scannedAt,
    psError: report.psError,
    htmlSignalsError: report.htmlSignalsError,
  };
}

export interface CoreWebVitalsBreakdown {
  lcp: number; // 0-25 — Largest Contentful Paint over 2.5s baseline
  cls: number; // 0-12 — Cumulative Layout Shift over 0.1 baseline
  tbt: number; // 0-8  — Total Blocking Time over 200ms baseline (lab proxy for interactivity/INP — see doc)
}

// FAST-FOLLOW, not included (2026-07-31): Lighthouse's `tap-targets` and
// `font-size` SEO audits were considered for this bucket alongside
// viewport. Verification attempt: a live PageSpeed v5 call from this
// environment returned HTTP 429 (RESOURCE_EXHAUSTED, quota_limit_value=0 —
// keyless PSI access is fully blocked here, not just rate-limited), so the
// actual JSON shape returned to this project could not be confirmed
// directly. Secondary check of Lighthouse's own source/issue tracker
// (GoogleChrome/lighthouse) confirms both audits are still live in the SEO
// category, but issues #9506 and #13719 document them frequently returning
// "not applicable" (null score) rather than pass/fail, including whenever
// no viewport tag is present — i.e. they're gated on the exact signal this
// bucket already scores, and unreliable even when they do fire. Add only
// after confirming against a real PSI v5 response (a working
// PAGESPEED_API_KEY, e.g. in the deployed Cloudflare env) that they return
// a usable, non-null score on real B2B SaaS marketing pages.
export interface MobileUsabilityBreakdown {
  viewportMissing: number; // 0 or 10 — no viewport meta tag found
}

export interface TrustDisclosureBreakdown {
  pricingLinkMissing: number;       // 0 or 10 — no pricing link found anywhere on the page
  securityBadgeMissing: number;     // 0 or 7  — no SOC2/GDPR/ISO 27001 mention found
  thirdPartyReviewMissing: number;  // 0 or 7  — no Trustpilot/G2/Capterra mention found
  onSiteTestimonialMissing: number; // 0 or 3  — no on-site testimonial/case-study language found
  privacyMissing: number;           // 0 or 4  — no privacy policy link found
  termsMissing: number;             // 0 or 4  — no terms of service link found
}

export interface ValueClarityBreakdown {
  primaryCtaMissing: number; // 0 or 10 — no conventional primary-action phrase found anywhere on the page
}

export interface TechnicalScoreBreakdown {
  coreWebVitals: CoreWebVitalsBreakdown;
  coreWebVitalsTotal: number;         // 0-45
  mobileUsability: MobileUsabilityBreakdown;
  mobileUsabilityTotal: number;       // 0-10
  trustDisclosure: TrustDisclosureBreakdown;
  trustDisclosureTotal: number;       // 0-35
  valueClarity: ValueClarityBreakdown;
  valueClarityTotal: number;          // 0-10
}

/**
 * Pure arithmetic, zero model calls. Every component is a deterministic
 * function of one observable scan field — there is no step here where
 * anything infers "how much this company is hurting". This is a triage
 * ranking, not a diagnosis; the breakdown is returned alongside the score
 * so the admin view (and, via buildScaffoldEvidence, the client-facing
 * deliverable) can show exactly which observed signals produced it.
 *
 * Weights below were set by relative evidence strength across the sourced
 * research (web.dev Core Web Vitals case studies, Baymard Institute,
 * Nielsen Norman Group — see the signal audit doc for citations), not
 * derived as a formula from those studies — none of them publish a
 * point scale, only percentage effects on real funnels this scan can't
 * see. That's a considered ranking, stated as such, not implied to be more
 * precise than it is.
 *
 * Deliberately NOT scored here, despite being real, correctly-measured
 * signals: the raw 0-100 PageSpeed "performance" composite (it already
 * blends LCP/TBT/CLS internally via Lighthouse's own formula — scoring it
 * alongside the three sub-metrics below would double-count the same data),
 * HTTPS (near-universal in 2026, ~zero discriminative power left), missing
 * OG tags (affects link-preview quality for people sharing the URL, not
 * friction experienced by someone already on the page — doesn't map to any
 * of the six friction mechanisms), and live-chat widget presence (no
 * citation found tying it to conversion in the sources reviewed). All four
 * remain on RawTechnicalSignals and in buildScaffoldEvidence's output for
 * a human reviewer — they just don't move the number.
 *
 * Only a confirmed 'not_found' (or, for viewport, a confirmed missing tag)
 * adds points. 'found', 'undetermined', and viewport-present all add 0 —
 * an undetermined check is a gap in what a plain fetch can see, not
 * evidence of anything, so it must never score like a confirmed absence.
 */
export function computeTechnicalSignalScore(
  signals: RawTechnicalSignals
): { score: number; breakdown: TechnicalScoreBreakdown } {
  const lcpMs = signals.lcp.ms;
  const lcp = lcpMs <= 2500 ? 0 : Math.min(25, Math.round(((lcpMs - 2500) / 3500) * 25));

  const clsVal = signals.cls.value;
  const cls = clsVal <= 0.1 ? 0 : Math.min(12, Math.round(((clsVal - 0.1) / 0.4) * 12));

  const tbtMs = signals.tbt.ms;
  const tbt = tbtMs <= 200 ? 0 : Math.min(8, Math.round(((tbtMs - 200) / 800) * 8));

  const coreWebVitals: CoreWebVitalsBreakdown = { lcp, cls, tbt };
  const coreWebVitalsTotal = lcp + cls + tbt;

  const mobileUsability: MobileUsabilityBreakdown = {
    viewportMissing: signals.viewportMetaPresent ? 0 : 10,
  };
  const mobileUsabilityTotal = mobileUsability.viewportMissing;

  const trustDisclosure: TrustDisclosureBreakdown = {
    pricingLinkMissing: signals.pricingLink === 'not_found' ? 10 : 0,
    securityBadgeMissing: signals.securityBadges === 'not_found' ? 7 : 0,
    thirdPartyReviewMissing: signals.thirdPartyReviewLink === 'not_found' ? 7 : 0,
    onSiteTestimonialMissing: signals.onSiteTestimonial === 'not_found' ? 3 : 0,
    privacyMissing: signals.privacyPolicyLink === 'not_found' ? 4 : 0,
    termsMissing: signals.termsOfServiceLink === 'not_found' ? 4 : 0,
  };
  const trustDisclosureTotal = Object.values(trustDisclosure).reduce((sum, v) => sum + v, 0);

  const valueClarity: ValueClarityBreakdown = {
    primaryCtaMissing: signals.primaryCtaPresent === 'not_found' ? 10 : 0,
  };
  const valueClarityTotal = valueClarity.primaryCtaMissing;

  const breakdown: TechnicalScoreBreakdown = {
    coreWebVitals, coreWebVitalsTotal,
    mobileUsability, mobileUsabilityTotal,
    trustDisclosure, trustDisclosureTotal,
    valueClarity, valueClarityTotal,
  };
  const score = Math.min(100, coreWebVitalsTotal + mobileUsabilityTotal + trustDisclosureTotal + valueClarityTotal);
  return { score, breakdown };
}

/**
 * ── Diagnostic scaffold evidence ──
 * Converts every raw scan signal into a MEASURED evidence row — one row
 * per observation, each with its own source. Used only to populate the
 * read-only evidence section of a diagnostic scaffold; never touches the
 * 7 judgment fields a human fills in on that scaffold. Every row here is
 * a direct fact from the scan — no interpretation, no severity language.
 */

export interface ScaffoldEvidenceRow {
  tier: 'measured';
  label: string;
  value: string;
  source: string;
}

function presenceLabel(p: Presence): string {
  if (p === 'found') return 'Found';
  if (p === 'not_found') return 'Not found';
  return "Undetermined — page appears JS-rendered; a plain fetch can't verify";
}

// Every row a prospect (or you) can ask "where's this from" about gets a
// real, checkable answer appended to its source string — not just how the
// number was measured (method + date, as before) but, for the signals
// whose weight was set by external research, why it counts. Citations
// point at the same sources documented in the signal audit; nothing here
// is invented or restated from memory beyond what was actually fetched.
export function buildScaffoldEvidence(signals: RawTechnicalSignals): ScaffoldEvidenceRow[] {
  const scannedDate = new Date(signals.scannedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const pageSpeedSource = `Google PageSpeed Insights, mobile, scanned ${scannedDate}`;
  const htmlSource = `Raw HTML scan, scanned ${scannedDate}`;
  const cwvCitation = 'web.dev Core Web Vitals case studies (e.g. Renault: 1s LCP improvement ↔ 14pp lower bounce rate, 13% more conversions)';

  return [
    // ── Scored: Core Web Vitals (45 pts) ──
    { tier: 'measured', label: 'Largest Contentful Paint (mobile)', value: signals.lcp.label, source: `${pageSpeedSource} — ${cwvCitation}` },
    { tier: 'measured', label: 'Cumulative Layout Shift (mobile)', value: signals.cls.value.toFixed(3), source: `${pageSpeedSource} — ${cwvCitation}` },
    { tier: 'measured', label: 'Total Blocking Time (mobile)', value: signals.tbt.label, source: `${pageSpeedSource} — lab-metric proxy for interactivity/INP; real INP requires field data this single-page scan can't collect` },

    // ── Scored: Mobile usability (10 pts) ──
    { tier: 'measured', label: 'Mobile viewport meta tag', value: signals.viewportMetaPresent ? 'Present' : 'Missing', source: `${htmlSource} — Google mobile-friendly usability criterion; without it, mobile browsers render at desktop width and scale down` },

    // ── Scored: Trust & disclosure (35 pts) ──
    { tier: 'measured', label: 'Pricing link present on page', value: presenceLabel(signals.pricingLink), source: `${htmlSource} — Nielsen Norman Group, "Trustworthiness in Web Design" (up-front disclosure factor: pricing shouldn't be hidden)` },
    { tier: 'measured', label: 'Security/compliance badges (SOC2/GDPR/ISO 27001)', value: presenceLabel(signals.securityBadges), source: `${htmlSource} — Baymard Institute B2B research: compliance certifications matter more than consumer trust badges for this buyer` },
    { tier: 'measured', label: 'Third-party review platform link (G2/Capterra/Trustpilot)', value: presenceLabel(signals.thirdPartyReviewLink), source: `${htmlSource} — NN/g: users trust testimonials on external sites more than the same claim made on-site` },
    { tier: 'measured', label: 'On-site testimonial / case-study language', value: presenceLabel(signals.onSiteTestimonial), source: `${htmlSource} — NN/g "connection to the rest of the web" credibility factor; weighted lower than the third-party form above` },
    { tier: 'measured', label: 'Privacy policy link', value: presenceLabel(signals.privacyPolicyLink), source: `${htmlSource} — NN/g up-front disclosure factor` },
    { tier: 'measured', label: 'Terms of service link', value: presenceLabel(signals.termsOfServiceLink), source: `${htmlSource} — NN/g up-front disclosure factor` },

    // ── Scored: Value clarity (10 pts) ──
    { tier: 'measured', label: 'Primary call-to-action phrase', value: presenceLabel(signals.primaryCtaPresent), source: `${htmlSource} — NN/g homepage research: unclear next step reads as unclear value, a leading cause of homepage abandonment. Presence anywhere on the page, not fold-scoped — a plain fetch can't measure scroll position.` },

    // ── Unscored: shown for context, do not affect the 100-point score ──
    { tier: 'measured', label: 'PageSpeed performance score (mobile) — not scored', value: `${signals.performanceScore}/100`, source: `${pageSpeedSource} — informational only; excluded from scoring because it's Lighthouse's own internal blend of the three Core Web Vitals rows above, and scoring both would double-count the same data` },
    { tier: 'measured', label: 'HTTPS enabled — not scored', value: signals.httpsEnabled ? 'Yes' : 'No', source: `${htmlSource} — informational only; HTTPS is near-universal in 2026 and no longer discriminates between candidates` },
    { tier: 'measured', label: 'Missing Open Graph tags — not scored', value: signals.missingOgTags.length > 0 ? signals.missingOgTags.join(', ') : 'None missing', source: `${htmlSource} — informational only; affects social-share link previews, not friction experienced by a visitor already on the page` },
    { tier: 'measured', label: 'Live-chat / support widget — not scored', value: presenceLabel(signals.liveChatWidget), source: `${htmlSource} — informational only; no cited study found tying presence to conversion` },
    { tier: 'measured', label: 'Detected platform', value: signals.platform ?? 'Not detected', source: htmlSource },
  ];
}
