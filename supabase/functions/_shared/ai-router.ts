/**
 * AI Router — Signal & Friction
 *
 * 4 tiers ordered by cost. Rule of 5x: subir un nivel nunca cuesta más de
 * 5x el tier anterior (micro→core→sharp). blade es la excepción consciente:
 * se usa únicamente para outputs estratégicos o de cara al cliente donde
 * la voz y el razonamiento de Claude marcan la diferencia.
 *
 * ┌──────┬────────────────────────┬──────────┬───────────────────────────────────────┐
 * │ Tier │ Model                  │ $/M tok  │ When                                  │
 * ├──────┼────────────────────────┼──────────┼───────────────────────────────────────┤
 * │micro │ gemini-2.5-flash       │ 0.15 in  │ Clasificación, extracción, boilerplate │
 * │core  │ deepseek-v4-flash      │ 0.14 in  │ Análisis, código, lógica interna       │
 * │sharp │ deepseek-v4-pro        │ 0.44 in  │ Razonamiento complejo multi-paso       │
 * │blade │ claude-opus-4-8        │ 15.00 in │ Outputs B2B, diagnósticos, voz marca   │
 * └──────┴────────────────────────┴──────────┴───────────────────────────────────────┘
 *
 * core/sharp updated 2026-08-02: DeepSeek discontinued the deepseek-chat
 * and deepseek-reasoner model IDs on 2026-07-24 (announced in their
 * changelog 2026-04-24), replacing them with deepseek-v4-flash and
 * deepseek-v4-pro — confirmed against api-docs.deepseek.com directly, not
 * assumed. These are NOT simply renamed — v4-pro is a larger, separately-
 * sized model (1.6T total/49B active params vs v4-flash's 284B/13B), not
 * "deepseek-reasoner's thinking mode" (DeepSeek's own transition-period
 * docs mapped the old reasoner name to a thinking MODE of v4-flash, not
 * to v4-pro at all) — sharp→v4-pro here is the closest faithful match to
 * "heavier reasoning tier" in this router's own terms, not a rediscovered
 * equivalence. Pricing above is the standard (cache-miss) input rate from
 * DeepSeek's pricing page; both models also have a much cheaper cache-hit
 * input rate not reflected in this table.
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   OPENROUTER_API_KEY  — micro (Gemini Flash)
 *   DEEPSEEK_API_KEY    — core + sharp
 *   ANTHROPIC_API_KEY   — blade
 */

export type Tier = "micro" | "core" | "sharp" | "blade";

export interface RouteOptions {
  tier: Tier;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface RouteResult {
  text: string;
  model: string;
  tier: Tier;
  estimatedCostUSD: number;
  // "length" means max_tokens was hit before the model finished — for a
  // thinking-mode model this can mean text came back empty because the
  // whole budget went to reasoning. Callers that can't tolerate a silent
  // empty/truncated result should check this rather than only `text`.
  finishReason: string | null;
}

// ── Cost table (USD per 1M tokens) ──────────────────────────────────────────
const COST: Record<Tier, { in: number; out: number }> = {
  micro: { in: 0.15,  out: 0.60  },
  core:  { in: 0.14,  out: 0.28  }, // deepseek-v4-flash, cache-miss rate
  sharp: { in: 0.435, out: 0.87  }, // deepseek-v4-pro, cache-miss rate
  blade: { in: 15.00, out: 75.00 },
};

// Takes a character COUNT, not text — callers already have inChars/outChars
// as numbers (from .length on the real prompt/response strings). Found via
// live testing 2026-08-01: estimateCost was calling this as
// roughTokens(inChars.toString()) — turning a number like 998 into the
// 3-character string "998" and measuring THAT string's length, instead of
// treating 998 as an actual character count. Every cost this function has
// ever returned has been near-zero regardless of real prompt/response
// size — not a rounding error, a full unit-type bug. Fixed at the source
// (drop the .toString() round-trip below) rather than patched at the call
// site, since nothing should ever pass a stringified number in here again.
function roughTokens(charCount: number): number {
  return Math.ceil(charCount / 4);
}

function estimateCost(tier: Tier, inChars: number, outChars: number): number {
  const c = COST[tier];
  return (roughTokens(inChars) / 1_000_000) * c.in +
         (roughTokens(outChars) / 1_000_000) * c.out;
}

// ── OpenAI-compatible call (OpenRouter + DeepSeek) ──────────────────────────
interface CompletionResult {
  text: string;
  finishReason: string | null;
}

async function callOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  temperature: number,
  extraHeaders: Record<string, string> = {},
): Promise<CompletionResult> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${model} error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    text: (choice?.message?.content as string) ?? "",
    // "length" means max_tokens was hit — for a thinking-mode model
    // (deepseek-v4-pro's default), that can mean the whole budget was
    // spent on reasoning before any final answer was written, returning
    // text: "" with no other signal something went wrong. Surfacing this
    // lets a caller tell "the model legitimately said nothing" apart from
    // "it ran out of room" instead of treating both the same.
    finishReason: (choice?.finish_reason as string) ?? null,
  };
}

// ── Anthropic native call (blade) ────────────────────────────────────────────
async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<CompletionResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    text: (data.content?.[0]?.text as string) ?? "",
    finishReason: (data.stop_reason as string) ?? null,
  };
}

// ── Web-search-grounded call (Anthropic server-side web_search tool) ────────
// Distinct from the 4 completion tiers above — those never touch the live
// web, they only complete from training data plus whatever's in the prompt.
// This exists specifically for AI-suggested prospecting leads, where an
// unverified company name/domain is only ever a starting point — nothing
// from this function is treated as fact until the existing scan engine
// independently confirms the domain resolves (see
// prospecting-suggest-leads/index.ts, which also does its own lightweight
// real-fetch check on every suggestion before returning it to the browser).
//
// Anthropic's web_search tool is a SERVER tool: Anthropic's own
// infrastructure executes the actual search and injects results back into
// the same request/response cycle — no client-side tool-use loop needed
// here, unlike a typical function-calling flow.
//
// Model choice: Sonnet, not Opus/blade. This task is search-result
// synthesis + ICP judgment, not the brand-voice/strategic-diagnosis work
// blade is reserved for — Opus pricing (15/75 per M tokens) would be pure
// overkill here. Not Haiku either: judging whether a company is genuinely
// founder-led/self-serve/small-enough from search snippets needs more
// multi-step reasoning than Haiku's tier is built for.
//
// Cost note: SEARCH_COST below is token cost only. Anthropic also bills a
// small per-search-call fee for this tool on top of token cost — that rate
// isn't hardcoded here because it hasn't been independently verified
// against a live account from this environment. estimatedCostUSD is a
// floor, not the real total — check actual Anthropic billing after the
// first real run.
//
// Tool type string and the anthropic-beta header below are based on
// Anthropic's documented web-search tool naming at the time this was
// written, not verified against a live call from this environment. If the
// first real request 400s on the tool definition, check Anthropic's
// current API docs for the current tool `type` string and whether a beta
// header is still required — that's the one part of this integration
// that couldn't be confirmed working before you run it for real.
const SEARCH_MODEL = "claude-sonnet-5";
const SEARCH_COST = { in: 3.00, out: 15.00 }; // $/M tokens, Sonnet — separate from the 4-tier COST table above

export interface WebSearchRouteResult {
  text: string;
  model: string;
  searchesUsed: number;
  estimatedCostUSD: number; // token cost only — see note above
}

export async function routeWithWebSearch(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  maxSearches?: number;
}): Promise<WebSearchRouteResult> {
  const { system, user, maxTokens = 4000, maxSearches = 8 } = opts;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: SEARCH_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic web-search call error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const blocks: Array<{ type: string; text?: string }> = data.content ?? [];

  // The final answer is the last text block — search-tool activity produces
  // its own block types (server_tool_use, web_search_tool_result) interleaved
  // before it, which are deliberately not treated as output text.
  const textBlocks = blocks.filter((b) => b.type === "text" && typeof b.text === "string");
  const text = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text! : "";
  const searchesUsed = blocks.filter((b) => b.type === "server_tool_use").length;

  const estimatedCostUSD =
    (roughTokens(system.length + user.length) / 1_000_000) * SEARCH_COST.in +
    (roughTokens(text.length) / 1_000_000) * SEARCH_COST.out;

  return { text, model: SEARCH_MODEL, searchesUsed, estimatedCostUSD };
}

// ── PostHog capture (fire-and-forget) ────────────────────────────────────────
async function captureEvent(
  apiKey: string,
  event: string,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch("https://app.posthog.com/capture/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: "ernesto-sf-admin",
        properties,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch { /* silent */ }
}

// ── Public router ─────────────────────────────────────────────────────────────
export async function route(opts: RouteOptions): Promise<RouteResult> {
  const {
    tier,
    system,
    user,
    maxTokens = 1024,
    temperature = 0.7,
  } = opts;

  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  const deepseekKey   = Deno.env.get("DEEPSEEK_API_KEY")   ?? "";
  const anthropicKey  = Deno.env.get("ANTHROPIC_API_KEY")  ?? "";
  const posthogKey    = Deno.env.get("POSTHOG_API_KEY")    ?? "";

  let text: string;
  let finishReason: string | null;
  let model: string;

  switch (tier) {
    case "micro": {
      model = "google/gemini-2.5-flash-preview-05-20";
      ({ text, finishReason } = await callOpenAI(
        "https://openrouter.ai/api/v1",
        openrouterKey,
        model,
        system,
        user,
        maxTokens,
        temperature,
        { "HTTP-Referer": "https://signal-and-friction.com", "X-Title": "S&F AI Router" },
      ));
      break;
    }
    case "core": {
      model = "deepseek-v4-flash";
      ({ text, finishReason } = await callOpenAI(
        "https://api.deepseek.com/v1",
        deepseekKey,
        model,
        system,
        user,
        maxTokens,
        temperature,
      ));
      break;
    }
    case "sharp": {
      model = "deepseek-v4-pro";
      // Thinking mode is on by default for v4-pro (DeepSeek's docs:
      // "enabled by default, with the default effort being high") and
      // ignores temperature/top_p entirely (accepted, but has no effect)
      // — passing it through anyway so this behaves normally if a caller
      // ever runs sharp against a non-thinking model instead.
      ({ text, finishReason } = await callOpenAI(
        "https://api.deepseek.com/v1",
        deepseekKey,
        model,
        system,
        user,
        maxTokens,
        temperature,
      ));
      break;
    }
    case "blade": {
      model = "claude-opus-4-8";
      ({ text, finishReason } = await callAnthropic(anthropicKey, model, system, user, maxTokens));
      break;
    }
  }

  const estimatedCostUSD = estimateCost(tier, system.length + user.length, text.length);

  if (posthogKey) {
    await captureEvent(posthogKey, "ai_router_call", {
      tier,
      model,
      estimated_cost_usd: estimatedCostUSD,
      input_chars: system.length + user.length,
      output_chars: text.length,
    });
  }

  return { text, model, tier, estimatedCostUSD, finishReason };
}
