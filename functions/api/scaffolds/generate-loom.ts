import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { LOOM_SCRIPT_MAX_TOKENS } from '../_models';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

interface EvidenceRow {
  tier: 'measured';
  label: string;
  value: string;
  source: string;
}

interface ScaffoldRow {
  id: string;
  domain: string;
  target_url: string;
  evidence: EvidenceRow[];
  friction_mechanism: string | null;
  specific_friction_point: string | null;
  why_blocks_conversion: string | null;
  projected_impact: string | null;
  the_decision: string | null;
}

// This is a rhetorical-restructuring step, not a fact-finding one: every
// input here is content a human already wrote into the scaffold. The model
// is never given room to add a finding, a number, or a claim of its own —
// only to turn real sentences into a spoken script. Deliberately excludes
// what_to_avoid and confidence_and_why: this is a cold-outreach teaser, and
// those two fields are exactly the "give away the fix" and "internal
// confidence framing" content that must NOT reach a prospect before they pay.
const SYSTEM_PROMPT = `You write short spoken scripts for cold-outreach Loom videos for Signal & Friction, a B2B conversion-diagnostics practice. You receive a human analyst's own findings about ONE company's website. You never invent findings — you only turn the analyst's real content into a natural spoken script.

HARD RULES:
- Use ONLY the facts given to you in the input. Never invent a number, a statistic, a finding, or a detail that is not present in the input. If no number is given, do not say a number.
- This is a teaser for a paid deliverable. Do NOT reveal the recommended fix, the specific technical solution, or what to avoid. You may let "the decision" content inform your tone, but never state the actual recommendation out loud.
- Total length: 400 to 550 words. This should read aloud in about 3 to 4 minutes at a natural, unhurried pace.
- Written for a NON-NATIVE ENGLISH SPEAKER to read aloud on camera. Use short sentences, under about 15 words each. Avoid tongue twisters and hard consonant clusters. Avoid idioms, phrasal verbs, and culturally-specific references. Use plain, common, everyday words.
- Output ONLY the words to be spoken. Plain text. No headers, no labels, no stage directions, no markdown, no bullet points, nothing in brackets or parentheses describing tone.

STRUCTURE — flow through these in order, but do not label or announce them in the output:
1. Hook (about 10 seconds, about 25 words): name the ONE friction issue, specific to their product. Concrete, not generic.
2. Evidence (about 60-90 seconds, about 150-220 words): describe what was actually observed, in plain language a non-technical founder understands. Translate the measured evidence into meaning — do not just read out raw numbers.
3. Why it matters (about 60 seconds, about 120-150 words): explain, in plausible and qualitative terms, how this could cost them conversions or trust. Only cite a specific projected-impact figure if one was given to you in the input — otherwise stay qualitative.
4. Teaser close (about 15-20 seconds, about 40-60 words): say there is a full diagnosis ready, with a clear next step, and invite a reply. Do not reveal the fix.

Return plain text only — no JSON, no markdown fences, nothing else.`;

function buildUserContent(scaffold: ScaffoldRow): string {
  const lines: string[] = [`SOURCE MATERIAL — outreach script for ${scaffold.domain} (${scaffold.target_url})`, ''];

  lines.push('Friction mechanism (human judgment):', scaffold.friction_mechanism!.trim(), '');
  lines.push('Specific friction point (human judgment):', scaffold.specific_friction_point!.trim(), '');
  lines.push('Why this blocks conversion (human judgment):', scaffold.why_blocks_conversion!.trim(), '');
  if (scaffold.projected_impact?.trim()) {
    lines.push('Projected impact (human judgment — only cite this if it contains a specific figure):', scaffold.projected_impact.trim(), '');
  }
  lines.push('The decision (internal reference only — do NOT reveal this in the script):', scaffold.the_decision!.trim(), '');

  if (scaffold.evidence?.length) {
    lines.push('Measured evidence (real scan data — direct facts, use freely):');
    for (const row of scaffold.evidence) {
      lines.push(`- ${row.label}: ${row.value} (${row.source})`);
    }
  }

  return lines.join('\n');
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  let payload: { scaffoldId?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }
  if (!payload.scaffoldId) {
    return Response.json({ error: 'scaffoldId is required' }, { status: 400, headers: CORS });
  }

  const supabaseUrl = getSupabaseUrl(env);
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return Response.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500, headers: CORS });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: scaffold, error: fetchError } = await supabase
    .from('diagnostic_scaffolds')
    .select('id, domain, target_url, evidence, friction_mechanism, specific_friction_point, why_blocks_conversion, projected_impact, the_decision')
    .eq('id', payload.scaffoldId)
    .single<ScaffoldRow>();

  if (fetchError || !scaffold) {
    return Response.json({ error: 'Scaffold not found' }, { status: 404, headers: CORS });
  }

  // Server-side gate, not just a disabled button — an empty judgment field
  // has no real finding in it, so there is nothing honest to script from.
  const missing: string[] = [];
  if (!scaffold.friction_mechanism?.trim()) missing.push('friction_mechanism');
  if (!scaffold.specific_friction_point?.trim()) missing.push('specific_friction_point');
  if (!scaffold.why_blocks_conversion?.trim()) missing.push('why_blocks_conversion');
  if (!scaffold.the_decision?.trim()) missing.push('the_decision');
  if (missing.length > 0) {
    return Response.json(
      { error: `Fill in these judgment fields first — a Loom script needs your real findings, not blanks: ${missing.join(', ')}` },
      { status: 422, headers: CORS }
    );
  }

  // This is rhetorical restyling of sentences a human already wrote (see
  // the SYSTEM_PROMPT note above), not the fact-finding/structured-JSON
  // work diagnose.ts does — it doesn't need blade-tier reasoning, and
  // routing it through DeepSeek ('core' tier, same model prospecting's
  // AI-suggested-leads and the Learning tutor already run on) keeps it
  // working without Anthropic credits. Read directly from env, like every
  // other Cloudflare secret in this directory (Stripe, PostHog, PageSpeed,
  // Resend) — unlike diagnose.ts's Supabase-vault RPC, which this file
  // used to copy verbatim despite doing a different job.
  const deepseekKey = env.DEEPSEEK_API_KEY?.trim();
  if (!deepseekKey) {
    return Response.json(
      { error: 'Loom script generation is unavailable right now — no AI provider is configured for this feature yet.' },
      { status: 503, headers: CORS }
    );
  }

  const userContent = buildUserContent(scaffold);

  let deepseekResponse: Response;
  try {
    deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: LOOM_SCRIPT_MAX_TOKENS,
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (fetchErr) {
    return Response.json({ error: `AI provider unreachable: ${String(fetchErr)}` }, { status: 502, headers: CORS });
  }

  if (!deepseekResponse.ok) {
    const errBody = await deepseekResponse.text().catch(() => '');
    return Response.json({ error: `AI provider error ${deepseekResponse.status}`, detail: errBody }, { status: 502, headers: CORS });
  }

  const deepseekData = await deepseekResponse.json() as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const choice = deepseekData.choices?.[0];

  if (choice?.finish_reason === 'length') {
    return Response.json(
      { error: 'Script output was truncated at the token ceiling. Raise LOOM_SCRIPT_MAX_TOKENS.' },
      { status: 422, headers: CORS }
    );
  }

  const script = (choice?.message?.content ?? '').trim();
  if (!script) {
    return Response.json({ error: 'Model returned an empty script' }, { status: 422, headers: CORS });
  }

  const { data: updated, error: updateError } = await supabase
    .from('diagnostic_scaffolds')
    .update({
      loom_script: script,
      loom_script_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.scaffoldId)
    .select()
    .single();

  if (updateError || !updated) {
    return Response.json({ error: updateError?.message ?? 'Failed to save generated script' }, { status: 500, headers: CORS });
  }

  return Response.json(updated, { headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
