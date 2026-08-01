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
// This function DOES do one thing beyond the bare AI call: a lightweight
// real fetch of each suggested domain (not the full PageSpeed-backed scan
// engine — just plain HTML, cheap and fast) to catch a hallucinated,
// nonexistent domain before it's even shown to the human, and to surface
// the REAL fetched page title next to whatever the AI claimed the company
// was — the reality-check the review panel is built around.
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { routeWithWebSearch } from "../_shared/ai-router.ts";

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

// ── ICP prompt — tune this, this is the part meant for review ──────────────
const SYSTEM_PROMPT = `You are a lead-research assistant for a solo B2B consulting practice (Signal & Friction — conversion/friction diagnostics for B2B SaaS websites).

Use web search to find REAL, currently-operating companies. Every company you name must be one you found actual search results about during this session — never one you recall or infer without a search result backing it. If you're not confident a company is real and currently operating, leave it out rather than guess. A missing suggestion costs nothing; a fabricated one costs trust in this entire tool.

ICP — all of these should plausibly hold for each company:
- Headquartered in the United States or Singapore
- A B2B SaaS product with genuine self-serve signup (a visitor can start using or trialing the product without first talking to a salesperson) — NOT an enterprise-sales-only / demo-gated-only product
- Founder-led, or run by a small team — not a large or well-funded organization
- Small enough in scale that a single independent consultant is a realistic fit to work with directly — not a company any informed observer would expect to already have an in-house growth/CRO team
- Ideally showing signs the product is live and actively marketed (real pricing page, real signup flow) — since the whole point is I diagnose conversion friction on a working funnel. A pre-launch company with no real product to scan is a poor fit.

For each company: search for it, confirm it's real and operating, and find its actual website domain (the domain a visitor would type, not a marketing/blog subdomain).

Output ONLY a JSON array, no markdown code fences, no commentary before or after it:
[{"company_name": "...", "domain": "example.com", "rationale": "one sentence — why this fits the ICP, referencing what you actually found"}]

Return at most 15 companies. Fewer confident, real suggestions are better than padding to 15.`;

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
  domainResolved: boolean;
  fetchedTitle: string | null;
  fetchError: string | null;
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

    const userPrompt = existingDomains.length > 0
      ? `Do not suggest any of these domains — they're already in the pipeline:\n${existingDomains.join(", ")}`
      : "No existing domains to exclude yet.";

    const result = await routeWithWebSearch({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 3000,
      maxSearches: 10,
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

    // Normalize, drop anything malformed or already-known, dedupe within
    // this batch itself.
    const existingSet = new Set(existingDomains.map((d) => d.toLowerCase()));
    const seen = new Set<string>();
    const candidates: Array<{ company_name: string; domain: string; rationale: string }> = [];
    for (const item of raw) {
      const domain = item.domain ? normalizeDomain(item.domain) : null;
      const company_name = (item.company_name ?? "").trim();
      const rationale = (item.rationale ?? "").trim();
      if (!domain || !company_name) continue;
      if (existingSet.has(domain) || seen.has(domain)) continue;
      seen.add(domain);
      candidates.push({ company_name, domain, rationale });
    }
    const capped = candidates.slice(0, 15);

    // Reality-check every suggestion in parallel before returning any of
    // them — cheap plain fetches, not the full scan engine.
    const verified: Suggestion[] = await Promise.all(
      capped.map(async (c) => {
        const check = await verifyDomain(c.domain);
        return {
          company_name: c.company_name,
          domain: c.domain,
          url: `https://${c.domain}`,
          rationale: c.rationale,
          ...check,
        };
      }),
    );

    return new Response(
      JSON.stringify({
        suggestions: verified,
        meta: {
          model: result.model,
          searchesUsed: result.searchesUsed,
          estimatedCostUSD: parseFloat(result.estimatedCostUSD.toFixed(6)),
          rawSuggestionCount: raw.length,
          droppedCount: raw.length - verified.length,
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
