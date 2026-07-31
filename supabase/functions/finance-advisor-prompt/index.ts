// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: FINANCE ADVISOR PROMPT
// Path: supabase/functions/finance-advisor-prompt/index.ts
// Tier: blade (Claude Sonnet 4.6) — strategic financial analysis
//       Override with body.tier = "sharp" for cheaper bulk queries.
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { route, Tier } from "../_shared/ai-router.ts";

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

interface FinancialContext {
  accounts?: Array<{ name: string; type: string; currency: string }>;
  investments?: Array<{ name: string; type: string; cost_basis: number; current_value: number; projected_annual_roi_pct?: number }>;
  goals?: Array<{ name: string; target_amount: number; current_amount: number }>;
  transactions?: Array<{ date: string; description: string }>;
}

function buildContext(ctx: FinancialContext): string {
  const lines: string[] = [];

  if (ctx.accounts?.length) {
    lines.push("ACCOUNTS:");
    ctx.accounts.forEach((a) => lines.push(`  - ${a.name} (${a.type}, ${a.currency})`));
  }

  if (ctx.investments?.length) {
    lines.push("INVESTMENTS:");
    ctx.investments.forEach((inv) => {
      const gain = inv.current_value - inv.cost_basis;
      const gainPct = inv.cost_basis > 0 ? ((gain / inv.cost_basis) * 100).toFixed(1) : "N/A";
      lines.push(
        `  - ${inv.name} (${inv.type}): cost $${(inv.cost_basis / 100).toFixed(0)}, ` +
        `current $${(inv.current_value / 100).toFixed(0)}, gain ${gainPct}%` +
        (inv.projected_annual_roi_pct ? `, projected ROI ${inv.projected_annual_roi_pct}%` : ""),
      );
    });
  }

  if (ctx.goals?.length) {
    lines.push("FINANCIAL GOALS:");
    ctx.goals.forEach((g) => {
      const pct = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100).toFixed(0) : "0";
      lines.push(
        `  - ${g.name}: $${(g.current_amount / 100).toFixed(0)} / $${(g.target_amount / 100).toFixed(0)} (${pct}%)`,
      );
    });
  }

  if (ctx.transactions?.length) {
    const recent = ctx.transactions.slice(0, 5);
    lines.push("RECENT TRANSACTIONS (last 5):");
    recent.forEach((tx) => lines.push(`  - ${tx.date.slice(0, 10)}: ${tx.description}`));
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are Signal & Friction's financial intelligence engine.
You analyze Ernesto Ortiz's personal and business finances and deliver precise, actionable insights.

Operating context:
- Solo B2B consultant, zero-call model, high-ticket ($2K–$5K per engagement)
- Wyoming LLC via Mercury; IPT pension baseline ~€9,813/yr
- Revenue: DFY segment ($2K–$5K) and DWY microdosing ($350–$1.5K)

Hard boundary — never cross this: you do not compute, estimate, or optimize
tax liability, tax residency status, or any jurisdiction's tax treatment,
under any framing (savings, "optimization," relocation, entity structuring).
Ernesto's actual situation (Spain → Finland transition, not yet registered
autónomo, cross-border income from US/Singapore clients, a prior
insolvency) is too complex and too consequential for an LLM to get right,
and a plausible-but-wrong number here risks real penalties with a real tax
authority — not a UX bug. If a question touches tax in any way, say
plainly that this is outside what you'll estimate and that it needs a
licensed accountant or tax advisor in the relevant jurisdiction, then
answer only the non-tax parts of the question, if any remain.

Style rules:
- Bisturí: direct, quantified, zero fluff. No bullet avalanches.
- Lead with the number or the decision, not the explanation.
- If data is insufficient, say what's missing in one line and answer anyway with assumptions stated.
- Use USD unless context specifies EUR.
- Max 300 words unless the question requires more depth.`;

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json() as {
      question: string;
      context?: FinancialContext;
      tier?: Tier;
    };

    const { question, context = {}, tier = "blade" } = body;

    if (!question?.trim()) {
      return new Response(
        JSON.stringify({ error: "question is required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const contextBlock = buildContext(context);
    const userPrompt = contextBlock
      ? `FINANCIAL DATA:\n${contextBlock}\n\nQUESTION: ${question}`
      : `QUESTION: ${question}`;

    const result = await route({
      tier,
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 512,
      temperature: 0.4,
    });

    return new Response(
      JSON.stringify({
        answer: result.text,
        meta: {
          model: result.model,
          tier: result.tier,
          estimatedCostUSD: parseFloat(result.estimatedCostUSD.toFixed(6)),
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
