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
 * │core  │ deepseek-chat (V3)     │ 0.27 in  │ Análisis, código, lógica interna       │
 * │sharp │ deepseek-reasoner (R1) │ 0.55 in  │ Razonamiento complejo multi-paso       │
 * │blade │ claude-sonnet-4-6      │ 3.00 in  │ Outputs B2B, diagnósticos, voz marca   │
 * └──────┴────────────────────────┴──────────┴───────────────────────────────────────┘
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
}

// ── Cost table (USD per 1M tokens) ──────────────────────────────────────────
const COST: Record<Tier, { in: number; out: number }> = {
  micro: { in: 0.15,  out: 0.60  },
  core:  { in: 0.27,  out: 1.10  },
  sharp: { in: 0.55,  out: 2.19  },
  blade: { in: 3.00,  out: 15.00 },
};

function roughTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimateCost(tier: Tier, inChars: number, outChars: number): number {
  const c = COST[tier];
  return (roughTokens(inChars.toString()) / 1_000_000) * c.in +
         (roughTokens(outChars.toString()) / 1_000_000) * c.out;
}

// ── OpenAI-compatible call (OpenRouter + DeepSeek) ──────────────────────────
async function callOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  temperature: number,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
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
  return (data.choices?.[0]?.message?.content as string) ?? "";
}

// ── Anthropic native call (blade) ────────────────────────────────────────────
async function callAnthropic(
  apiKey: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
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
  return (data.content?.[0]?.text as string) ?? "";
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

  let text: string;
  let model: string;

  switch (tier) {
    case "micro": {
      model = "google/gemini-2.5-flash-preview-05-20";
      text = await callOpenAI(
        "https://openrouter.ai/api/v1",
        openrouterKey,
        model,
        system,
        user,
        maxTokens,
        temperature,
        { "HTTP-Referer": "https://signal-and-friction.com", "X-Title": "S&F AI Router" },
      );
      break;
    }
    case "core": {
      model = "deepseek-chat";
      text = await callOpenAI(
        "https://api.deepseek.com/v1",
        deepseekKey,
        model,
        system,
        user,
        maxTokens,
        temperature,
      );
      break;
    }
    case "sharp": {
      model = "deepseek-reasoner";
      text = await callOpenAI(
        "https://api.deepseek.com/v1",
        deepseekKey,
        model,
        system,
        user,
        maxTokens,
        0, // R1 ignores temperature
      );
      break;
    }
    case "blade": {
      model = "claude-sonnet-4-6";
      text = await callAnthropic(anthropicKey, system, user, maxTokens);
      break;
    }
  }

  const estimatedCostUSD = estimateCost(tier, system.length + user.length, text.length);

  return { text, model, tier, estimatedCostUSD };
}
