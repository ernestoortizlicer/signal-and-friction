// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: PROSPECTING — AI-SUGGESTED LEADS
// Path: supabase/functions/prospecting-suggest-leads/index.ts
//
// Writes NOTHING to the database. Takes the ICP, returns an ephemeral
// JSON list of candidate companies for a human to review in the browser.
// Nothing here is ever treated as a real prospect — that only happens if
// a human clicks Add in the Prospecting UI, which inserts a normal
// prospect_candidates row (source='ai_suggested') that then has to
// survive the exact same scan the rest of this pipeline already requires.
//
// GROUNDING DESIGN (2026-08-01, DeepSeek + Tavily — cheaper than the
// original Anthropic-native-web_search version, same safety guarantee):
// DeepSeek has no server-side search tool of its own, so this function
// does the grounding itself: real Tavily search results are fetched
// FIRST, and DeepSeek only ever sees that real text — it is instructed
// to extract companies present in it, never to invent or use training-
// data recall. That instruction alone is a prompt, not a guarantee, so
// there's a hard backstop below it: every domain DeepSeek returns is
// cross-checked against the actual Tavily result URLs, and anything not
// backed by a real result is dropped before a human ever sees it. On top
// of that, this function ALSO does a lightweight real fetch of each
// surviving domain (not the full PageSpeed-backed scan — just plain
// HTML, cheap and fast) to catch a dead/parked domain, and surfaces the
// real fetched page title next to whatever was claimed. A full scan
// still runs, via the existing pipeline, once a suggestion is actually
// added — that's the final, unconditional gate this whole feature is
// built around.
//
// Anthropic's routeWithWebSearch() in ai-router.ts is untouched and
// still there — the intended path back once there's budget for it,
// requiring only a call-site swap here, not a redesign.
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

// ── Fixed ICP-derived search queries ────────────────────────────────────
// Deliberately hardcoded rather than model-generated — one fewer moving
// part, one fewer place this could go subtly wrong, and cheaper. A model
// generating queries is a reasonable future upgrade for more variety
// across repeated runs, not needed for a first version.
const ICP_QUERIES = [
  "founder-led B2B SaaS startup self-serve signup United States",
  "bootstrapped indie B2B SaaS free trial self-serve pricing",
  "Singapore B2B SaaS startup self-serve pricing page",
  "small team B2B SaaS product launch self-serve signup",
  "new B2B SaaS self-serve trial no sales call",
];

// ── Synthesis prompt — tune this, this is the part meant for review ────────
const SYNTHESIS_SYSTEM_PROMPT = `You are a lead-research assistant for a solo B2B consulting practice (Signal & Friction — conversion/friction diagnostics for B2B SaaS websites).

You will be given a numbered list of REAL web search results below, each with a title, URL, and snippet. Your ONLY job is to identify which of these results describe a real company matching the ICP below, and extract that company's name and domain FROM THE PROVIDED TEXT.

HARD RULE: You may only suggest a company if it is explicitly named in the search results below, with a URL from the search results below. Never suggest a company from your own training-data knowledge, never invent a company, never guess a domain that isn't shown in the results. If none of the results are a good ICP fit, return an empty array — do not pad with anything not present in the text below.

ICP — all of these should plausibly hold for each company:
- Headquartered in the United States or Singapore
- A B2B SaaS product with genuine self-serve signup (a visitor can start using or trialing the product without first talking to a salesperson) — NOT an enterprise-sales-only / demo-gated-only product
- Founder-led, or run by a small team — not a large or well-funded organization
- Small enough in scale that a single independent consultant is a realistic fit to work with directly — not a company any informed observer would expect to already have an in-house growth/CRO team
- Ideally showing signs the product is live and actively marketed (real pricing page, real signup flow) — since the whole point is I diagnose conversion friction on a working funnel. A pre-launch company with no real product to scan is a poor fit.

Output ONLY a JSON array, no markdown code fences, no commentary before or after it:
[{"company_name": "...", "domain": "example.com", "rationale": "one sentence — why this fits the ICP, referencing what the search result actually said"}]

Return at most 15 companies.`;

interface TavilyResult {
  query: string;
  title: string;
  url: string;
  content: string;
}

interface RawSuggestion {
  company_name?: string;
  domain?: string;
  rationale?: string;
}

interface Suggestion {
  company_name: string;
  domain: string;
  url: string;
  rationale: string;
  sourceUrl: string;
  domainResolved: boolean;
  fetchedTitle: string | null;
  fetchError: string | null;
}

async function tavilySearch(query: string, maxResults = 6): Promise<Array<{ title: string; url: string; content: string }>> {
  const apiKey = Deno.env.get("TAVILY_API_KEY") ?? "";
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ query, search_depth: "basic", max_results: maxResults }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Tavily search error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.results ?? []).map((r: { title?: string; url?: string; content?: string }) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: (r.content ?? "").slice(0, 500), // cap — keeps the DeepSeek context reasonable
  }));
}

// The hard backstop: DeepSeek's claim only survives if a real Tavily
// result URL actually matches the domain it named. Not a prompt-trust
// check — a check against real fetched data.
function findMatchingResultUrl(domain: string, results: TavilyResult[]): string | null {
  for (const r of results) {
    try {
      const host = new URL(r.url).hostname.replace(/^www\./i, "").toLowerCase();
      if (host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`)) return r.url;
    } catch {
      // malformed URL in a search result — skip it, never match on it
    }
  }
  return null;
}

function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    // A domain needs at least one dot and no whitespace/invalid chars —
    // cheap sanity filter before ever attempting to fetch it.
    if (!host.includes(".") || /\s/.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

// Lightweight reality-check — plain fetch + title extraction, deliberately
// NOT the full functions/api/_scan.ts engine (that also calls PageSpeed,
// which is slower and quota-limited; wasteful to spend on suggestions the
// human hasn't even seen yet). A real scan still runs, via the existing
// pipeline, once a suggestion is actually added.
async function verifyDomain(domain: string): Promise<Pick<Suggestion, "domainResolved" | "fetchedTitle" | "fetchError">> {
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { "User-Agent": "SignalFrictionAudit/1.0 (+https://signal-and-friction.pages.dev)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return { domainResolved: false, fetchedTitle: null, fetchError: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const fetchedTitle = (ogTitleMatch?.[1] ?? titleMatch?.[1] ?? "").trim() || null;
    return { domainResolved: true, fetchedTitle, fetchError: null };
  } catch (err) {
    return {
      domainResolved: false,
      fetchedTitle: null,
      fetchError: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({})) as { existingDomains?: string[] };
    const existingDomains = Array.isArray(body.existingDomains)
      ? body.existingDomains.filter((d): d is string => typeof d === "string").slice(0, 500)
      : [];

    // ── Step 1: real search, before any model call ──
    const searchOutcomes = await Promise.allSettled(ICP_QUERIES.map((q) => tavilySearch(q)));
    const seenUrls = new Set<string>();
    const aggregatedResults: TavilyResult[] = [];
    searchOutcomes.forEach((outcome, i) => {
      if (outcome.status !== "fulfilled") return;
      for (const r of outcome.value) {
        if (!r.url || seenUrls.has(r.url)) continue;
        seenUrls.add(r.url);
        aggregatedResults.push({ query: ICP_QUERIES[i], ...r });
      }
    });

    if (aggregatedResults.length === 0) {
      const failures = searchOutcomes.filter((o) => o.status === "rejected") as PromiseRejectedResult[];
      return new Response(
        JSON.stringify({
          error: "Tavily returned no results for any query — check TAVILY_API_KEY and Tavily account status.",
          detail: failures[0]?.reason instanceof Error ? failures[0].reason.message : undefined,
        }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ── Step 2: DeepSeek synthesizes ONLY from the real results above ──
    const searchResultsText = aggregatedResults
      .map((r, i) => `[${i + 1}] found via: "${r.query}"\nTitle: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`)
      .join("\n\n");

    const result = await route({
      tier: "core",
      system: SYNTHESIS_SYSTEM_PROMPT,
      user: `SEARCH RESULTS:\n\n${searchResultsText}\n\nDo not suggest any of these domains — already in the pipeline:\n${existingDomains.join(", ") || "(none yet)"}`,
      maxTokens: 3000,
      temperature: 0.2, // extraction task — stick to the provided text, don't get creative
    });

    const cleaned = result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let raw: RawSuggestion[];
    try {
      raw = JSON.parse(cleaned);
      if (!Array.isArray(raw)) throw new Error("not an array");
    } catch {
      return new Response(
        JSON.stringify({ error: "Model returned non-JSON output", raw: result.text }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ── Step 3: hard cross-check against real search results, then dedupe ──
    const existingSet = new Set(existingDomains.map((d) => d.toLowerCase()));
    const seen = new Set<string>();
    const candidates: Array<{ company_name: string; domain: string; rationale: string; sourceUrl: string }> = [];
    for (const item of raw) {
      const domain = item.domain ? normalizeDomain(item.domain) : null;
      const company_name = (item.company_name ?? "").trim();
      const rationale = (item.rationale ?? "").trim();
      if (!domain || !company_name) continue;
      if (existingSet.has(domain) || seen.has(domain)) continue;
      const sourceUrl = findMatchingResultUrl(domain, aggregatedResults);
      if (!sourceUrl) continue; // DeepSeek claimed it, but no real search result backs it — reject
      seen.add(domain);
      candidates.push({ company_name, domain, rationale, sourceUrl });
    }
    const capped = candidates.slice(0, 15);

    // ── Step 4: lightweight real-fetch check, unchanged from before ──
    const verified: Suggestion[] = await Promise.all(
      capped.map(async (c) => {
        const check = await verifyDomain(c.domain);
        return {
          company_name: c.company_name,
          domain: c.domain,
          url: `https://${c.domain}`,
          rationale: c.rationale,
          sourceUrl: c.sourceUrl,
          ...check,
        };
      }),
    );

    return new Response(
      JSON.stringify({
        suggestions: verified,
        meta: {
          model: result.model,
          estimatedCostUSD: parseFloat(result.estimatedCostUSD.toFixed(6)),
          tavilyQueriesRun: ICP_QUERIES.length,
          tavilyResultsFound: aggregatedResults.length,
          rawSuggestionCount: raw.length,
          rejectedByCrossCheckCount: raw.length - candidates.length,
          finalCount: verified.length,
        },
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
