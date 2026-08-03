// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: PROSPECTING — CONTACT DISCOVERY
// Path: supabase/functions/prospecting-discover-contact/index.ts
//
// Writes NOTHING to the database — same principle as
// prospecting-suggest-leads/index.ts. Takes one already-added candidate
// (domain + company name) and returns an ephemeral JSON result the
// browser then PATCHes onto prospect_candidates.contact_discovery. A
// human reviews every candidate here before it's ever used for outreach.
//
// BEFORE THIS FUNCTION EXISTED: contact discovery was a single free-text
// column (founder_contact) a human typed by hand, plus a window.prompt()
// for email at promotion time — no automated discovery of any kind. This
// is the first real attempt, and it is built to the same grounding
// standard as prospecting-suggest-leads: real fetched/searched text
// first, the model only ever extracts from that real text, and a hard
// backstop rejects anything the model claims that isn't literally present
// in the real text it was given.
//
// HONEST CEILING: there is no identity-verification provider configured
// anywhere in this codebase (no Hunter/Clearbit/Proxycurl/PDL/etc.). That
// means a person name, a LinkedIn URL, or an email discovered here can
// reach "candidate" (found in real, cited text) or "inferred" (a pattern
// guess, email only) — never "verified". Representing that honestly, not
// silently upgrading confidence to look more complete, is the entire
// point of this function.
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { route } from "../_shared/ai-router.ts";

const ALLOWED_ORIGINS = [
  "https://signal-and-friction.com",
  "https://www.signal-and-friction.com",
  "https://signal-and-friction.pages.dev",
  "http://localhost:3000",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".signal-and-friction.pages.dev")
      ? origin
      : "https://signal-and-friction.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ── Types — mirrored informally in src/app/admin/prospecting/page.tsx,
// same "no shared cross-runtime module" precedent prospecting-suggest-
// leads already set with its own local Suggestion interface. ──────────

/**
 * Per-candidate confidence. "verified" is structurally representable —
 * a future real validation source could fill it in — but nothing in
 * this function ever produces it today. Search-grounded discovery with
 * no independent corroboration source can only honestly reach
 * "candidate" or "inferred".
 */
export type ContactVerificationStatus =
  | "verified"
  | "candidate"
  | "inferred"
  | "unavailable"
  | "provider_error"
  | "configuration_missing"
  | "rate_limited";

/** Whether a discovery CATEGORY's run itself succeeded — distinct from how confident any single found candidate is. */
export type RunStatus = "ok" | "unavailable" | "provider_error" | "configuration_missing" | "rate_limited";

export interface PersonCandidate {
  name: string;
  roleClaim: string;
  verificationStatus: ContactVerificationStatus;
  sourceUrl: string;
  sourceSnippet: string;
  rationale: string;
  discoveredAt: string;
}

export interface LinkedInCandidate {
  url: string;
  personNameClaim: string | null;
  verificationStatus: ContactVerificationStatus;
  corroboratingSignals: string[];
  sourceUrl: string;
  rationale: string;
  discoveredAt: string;
}

export interface EmailCandidate {
  email: string;
  verificationStatus: ContactVerificationStatus;
  method: "site_mailto_link" | "pattern_inferred";
  sourceUrl: string | null;
  rationale: string;
  discoveredAt: string;
}

export interface CategoryResult<T> {
  status: RunStatus;
  candidates: T[];
  error?: string;
}

export interface ContactDiscoveryResult {
  runAt: string;
  people: CategoryResult<PersonCandidate>;
  linkedin: CategoryResult<LinkedInCandidate>;
  email: CategoryResult<EmailCandidate>;
  meta: {
    tavilyQueriesRun: number;
    tavilyResultsFound: number;
    model: string | null;
    estimatedCostUSD: number | null;
  };
}

export interface TavilyResult {
  query: string;
  title: string;
  url: string;
  content: string;
}

async function tavilySearch(query: string, maxResults = 8): Promise<{ title: string; url: string; content: string }[]> {
  const apiKey = Deno.env.get("TAVILY_API_KEY") ?? "";
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ query, search_depth: "basic", max_results: maxResults }),
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 429) {
    throw Object.assign(new Error("Tavily rate limited"), { rateLimited: true });
  }
  if (!res.ok) {
    throw new Error(`Tavily search error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.results ?? []).map((r: { title?: string; url?: string; content?: string }) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: (r.content ?? "").slice(0, 600),
  }));
}

// ── Email discovery — the scanned company's own site, not search. A
// mailto: link the company itself published is stronger provenance than
// anything a third-party search result could offer, and needs no API key
// at all — this category degrades independently of Tavily/DeepSeek. ────

/** Pure — no network. Extracts real mailto: addresses from raw HTML, filtering obvious platform/tooling addresses that aren't a real human contact. */
export function extractMailtoEmails(html: string): string[] {
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  mailtoRegex.lastIndex = 0;
  while ((m = mailtoRegex.exec(html))) {
    const email = m[1].toLowerCase();
    if (email.endsWith("@sentry.io") || email.endsWith("wixpress.com")) continue;
    found.add(email);
  }
  return [...found];
}

/**
 * Pure — no network. An inferred email is only ever built from a NAME this
 * run actually found and cited (never fabricated from the domain alone),
 * capped at 2 people so this can't look like a dense list of fake
 * confidence, and skips any pattern that duplicates an already-found real
 * mailto: address.
 */
export function buildInferredEmailCandidates(
  domain: string,
  peopleFound: PersonCandidate[],
  alreadyFoundEmails: Set<string>,
): EmailCandidate[] {
  const out: EmailCandidate[] = [];
  for (const person of peopleFound.slice(0, 2)) {
    const first = person.name.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z-]/g, "");
    if (!first) continue;
    const guess = `${first}@${domain}`;
    if (alreadyFoundEmails.has(guess)) continue;
    out.push({
      email: guess,
      verificationStatus: "inferred",
      method: "pattern_inferred",
      sourceUrl: null,
      rationale: `Guessed from the common "firstname@domain" pattern using "${person.name}" (found above). Not validated against any real source — likely wrong if this company uses a different email convention.`,
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

export async function discoverEmail(domain: string, peopleFound: PersonCandidate[]): Promise<CategoryResult<EmailCandidate>> {
  const paths = ["", "/contact", "/about", "/team", "/about-us"];
  const found = new Map<string, string>();
  let anyFetchSucceeded = false;
  let lastError: string | null = null;

  for (const path of paths) {
    try {
      const res = await fetch(`https://${domain}${path}`, {
        headers: { "User-Agent": "SignalFrictionContactDiscovery/1.0 (+https://signal-and-friction.pages.dev)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status} at ${path || "/"}`;
        continue;
      }
      anyFetchSucceeded = true;
      const html = await res.text();
      for (const email of extractMailtoEmails(html)) {
        if (!found.has(email)) found.set(email, `https://${domain}${path}`);
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch failed";
    }
  }

  const candidates: EmailCandidate[] = [...found.entries()].map(([email, sourceUrl]) => ({
    email,
    verificationStatus: "candidate",
    method: "site_mailto_link",
    sourceUrl,
    rationale: `Found as a real mailto: link published on the company's own site (${sourceUrl}).`,
    discoveredAt: new Date().toISOString(),
  }));

  candidates.push(...buildInferredEmailCandidates(domain, peopleFound, new Set(found.keys())));

  if (candidates.length > 0) return { status: "ok", candidates };
  if (!anyFetchSucceeded) return { status: "provider_error", candidates: [], error: lastError ?? "could not fetch the site" };
  return { status: "unavailable", candidates: [] };
}

const PERSON_LINKEDIN_SYSTEM_PROMPT = `You are a fact-extraction assistant for B2B lead research at Signal & Friction. You will be given a numbered list of REAL web search results about ONE specific company. Extract ONLY information explicitly present in the text below — never use outside or training-data knowledge about this company, never guess, never infer a role from a name alone.

For each PERSON you can identify as a founder, co-founder, or CEO of this company — role stated EXPLICITLY in the text, never inferred:
- name: exactly as written in the source
- roleClaim: the exact role phrase used in the source (e.g. "CEO", "co-founder and CEO")
- sourceIndex: the [N] number of the result this came from

For each LinkedIn profile URL (linkedin.com/in/...) in the text that plausibly belongs to a person at this company:
- url: the exact linkedin.com/in/... URL as written
- personNameClaim: the name associated with it in the text, if stated, else null
- sourceIndex: the [N] number of the result this came from

Return empty arrays for a category with nothing genuine to report — do not invent an entry to look thorough. At most 5 people, at most 5 linkedin profiles.

Output ONLY JSON, no markdown fences: {"people": [{"name": "...", "roleClaim": "...", "sourceIndex": 1}], "linkedin": [{"url": "...", "personNameClaim": "...", "sourceIndex": 1}]}`;

export interface RawPerson { name?: string; roleClaim?: string; sourceIndex?: number }
export interface RawLinkedIn { url?: string; personNameClaim?: string | null; sourceIndex?: number }

export function textIncludes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase().trim());
}

/**
 * Pure — no network. The hard backstop for a person claim: it only
 * survives if the claimed name is literally present in the exact result
 * text the model cited by sourceIndex — never trusted on the model's word
 * alone. Returns null for anything that fails the backstop, malformed
 * input, or an out-of-range/missing sourceIndex.
 */
export function validatePersonCandidate(raw: RawPerson, results: TavilyResult[]): PersonCandidate | null {
  const idx = (raw.sourceIndex ?? 0) - 1;
  const src = results[idx];
  const name = (raw.name ?? "").trim();
  if (!src || !name || !raw.roleClaim) return null;
  const cited = `${src.title} ${src.content}`;
  if (!textIncludes(cited, name)) return null;
  return {
    name,
    roleClaim: raw.roleClaim.trim(),
    verificationStatus: "candidate",
    sourceUrl: src.url,
    sourceSnippet: src.content.slice(0, 300),
    rationale: `Named as "${raw.roleClaim.trim()}" in a real search result from ${new URL(src.url).hostname}.`,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Pure — no network. Same backstop principle for a LinkedIn URL claim: the
 * URL (or its claimed person name) must be literally present in the cited
 * result text. Corroboration (company name/domain co-occurring in the same
 * snippet) only ever affects the rationale text — it can never upgrade
 * verificationStatus past "candidate"; there is no independent LinkedIn-side
 * verification source in this system.
 */
export function validateLinkedInCandidate(
  raw: RawLinkedIn,
  results: TavilyResult[],
  subject: string,
  domain: string,
): LinkedInCandidate | null {
  const idx = (raw.sourceIndex ?? 0) - 1;
  const src = results[idx];
  const url = (raw.url ?? "").trim();
  if (!src || !url || !/linkedin\.com\/in\//i.test(url)) return null;
  const cited = `${src.title} ${src.content}`;
  if (!cited.includes(url) && !(raw.personNameClaim && textIncludes(cited, raw.personNameClaim))) return null;
  const corroboratingSignals: string[] = [];
  if (textIncludes(cited, subject)) corroboratingSignals.push(`Company name "${subject}" appears in the same search result`);
  if (textIncludes(cited, domain)) corroboratingSignals.push(`Domain "${domain}" appears in the same search result`);
  return {
    url,
    personNameClaim: raw.personNameClaim?.trim() || null,
    verificationStatus: "candidate",
    corroboratingSignals,
    sourceUrl: src.url,
    rationale: corroboratingSignals.length > 0
      ? `LinkedIn URL found alongside the company's own name/domain in a real search result.`
      : `LinkedIn URL found in a real search result, but the company name/domain did not co-occur in the same snippet — weaker corroboration than usual.`,
    discoveredAt: new Date().toISOString(),
  };
}

export async function discoverPeopleAndLinkedIn(
  domain: string,
  companyName: string | null,
): Promise<{
  people: CategoryResult<PersonCandidate>;
  linkedin: CategoryResult<LinkedInCandidate>;
  tavilyQueriesRun: number;
  tavilyResultsFound: number;
  model: string | null;
  estimatedCostUSD: number | null;
}> {
  const empty = (status: RunStatus, error?: string) => ({
    people: { status, candidates: [], error } as CategoryResult<PersonCandidate>,
    linkedin: { status, candidates: [], error } as CategoryResult<LinkedInCandidate>,
    tavilyQueriesRun: 0,
    tavilyResultsFound: 0,
    model: null,
    estimatedCostUSD: null,
  });

  if (!Deno.env.get("TAVILY_API_KEY")) {
    return empty("configuration_missing", "TAVILY_API_KEY is not configured");
  }
  if (!Deno.env.get("DEEPSEEK_API_KEY")) {
    return empty("configuration_missing", "DEEPSEEK_API_KEY is not configured");
  }

  const subject = companyName || domain;
  const queries = [
    `"${subject}" founder CEO`,
    `"${subject}" co-founder`,
    `"${subject}" leadership team executives`,
    `site:linkedin.com/in "${subject}" CEO OR founder`,
  ];

  let outcomes: PromiseSettledResult<{ title: string; url: string; content: string }[]>[];
  try {
    outcomes = await Promise.allSettled(queries.map((q) => tavilySearch(q)));
  } catch (err) {
    return empty("provider_error", err instanceof Error ? err.message : "Tavily request failed");
  }

  const rateLimited = outcomes.some(
    (o) => o.status === "rejected" && (o.reason as { rateLimited?: boolean })?.rateLimited,
  );
  const seenUrls = new Set<string>();
  const results: TavilyResult[] = [];
  outcomes.forEach((o, i) => {
    if (o.status !== "fulfilled") return;
    for (const r of o.value) {
      if (!r.url || seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);
      results.push({ query: queries[i], ...r });
    }
  });

  if (results.length === 0) {
    if (rateLimited) return empty("rate_limited", "Tavily rate limited every query for this candidate");
    const allFailed = outcomes.every((o) => o.status === "rejected");
    return empty(allFailed ? "provider_error" : "unavailable", allFailed ? "All Tavily queries failed" : undefined);
  }

  const resultsText = results
    .map((r, i) => `[${i + 1}] found via: "${r.query}"\nTitle: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`)
    .join("\n\n");

  let model: string | null = null;
  let estimatedCostUSD: number | null = null;
  let rawPeople: RawPerson[] = [];
  let rawLinkedIn: RawLinkedIn[] = [];
  try {
    const result = await route({
      tier: "core",
      system: PERSON_LINKEDIN_SYSTEM_PROMPT,
      user: `COMPANY: ${subject} (${domain})\n\nSEARCH RESULTS:\n\n${resultsText}`,
      maxTokens: 1500,
      temperature: 0.1,
    });
    model = result.model;
    estimatedCostUSD = result.estimatedCostUSD;
    const cleaned = result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { people?: RawPerson[]; linkedin?: RawLinkedIn[] };
    rawPeople = Array.isArray(parsed.people) ? parsed.people : [];
    rawLinkedIn = Array.isArray(parsed.linkedin) ? parsed.linkedin : [];
  } catch (err) {
    return {
      people: { status: "provider_error", candidates: [], error: err instanceof Error ? err.message : "extraction failed" },
      linkedin: { status: "provider_error", candidates: [], error: err instanceof Error ? err.message : "extraction failed" },
      tavilyQueriesRun: queries.length,
      tavilyResultsFound: results.length,
      model,
      estimatedCostUSD,
    };
  }

  // Hard backstop, factored out into validatePersonCandidate/
  // validateLinkedInCandidate above so it's testable without any network
  // call: a claimed name/URL only survives if it's literally present in
  // the exact result text the model cited — not "somewhere in the
  // corpus", not trusted on the model's word alone.
  const people = rawPeople
    .map((p) => validatePersonCandidate(p, results))
    .filter((p): p is PersonCandidate => p !== null);

  const linkedin = rawLinkedIn
    .map((l) => validateLinkedInCandidate(l, results, subject, domain))
    .filter((l): l is LinkedInCandidate => l !== null);

  return {
    people: { status: "ok", candidates: people },
    linkedin: { status: "ok", candidates: linkedin },
    tavilyQueriesRun: queries.length,
    tavilyResultsFound: results.length,
    model,
    estimatedCostUSD,
  };
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json().catch(() => ({})) as { domain?: string; companyName?: string | null };
    const domain = (body.domain ?? "").trim().toLowerCase();
    if (!domain) {
      return new Response(JSON.stringify({ error: "domain is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const companyName = body.companyName?.trim() || null;

    const peopleLinkedIn = await discoverPeopleAndLinkedIn(domain, companyName);
    const email = await discoverEmail(domain, peopleLinkedIn.people.candidates);

    const result: ContactDiscoveryResult = {
      runAt: new Date().toISOString(),
      people: peopleLinkedIn.people,
      linkedin: peopleLinkedIn.linkedin,
      email,
      meta: {
        tavilyQueriesRun: peopleLinkedIn.tavilyQueriesRun,
        tavilyResultsFound: peopleLinkedIn.tavilyResultsFound,
        model: peopleLinkedIn.model,
        estimatedCostUSD: peopleLinkedIn.estimatedCostUSD !== null
          ? parseFloat(peopleLinkedIn.estimatedCostUSD.toFixed(6))
          : null,
      },
    };

    return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
