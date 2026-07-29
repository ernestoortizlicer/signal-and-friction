/**
 * Central model configuration for the Command Center AI engine.
 * ════════════════════════════════════════════════════════════════════════════
 * Single source of truth for the Anthropic model used across Cloudflare Pages
 * Functions. Do NOT hardcode model-ID strings at call sites — import from here.
 *
 * Lives under functions/ (not src/lib) because Cloudflare esbuild cannot resolve
 * cross-directory imports into src/ at function compile time. The leading `_`
 * keeps Pages from treating this module as a route.
 *
 * Model ID verified against the Anthropic catalog: Claude Opus 4.8 — the most
 * capable Opus-tier model, 1M-token context. Use the bare ID as-is; never
 * append a date suffix.
 */
export const CLAUDE_MODEL = 'claude-opus-4-8' as const;

/**
 * Output ceiling for the structured-JSON diagnostic. The previous value (1024)
 * risked truncating the JSON body (stop_reason: "max_tokens"), which then failed
 * JSON.parse and surfaced as an intermittent 422. 4096 gives the schema headroom.
 */
export const DIAGNOSTIC_MAX_TOKENS = 4096;

/**
 * Output ceiling for the Loom outreach script (target 400-550 words, plain
 * text, no JSON overhead). 2048 gives generous headroom without inviting
 * the model to run long.
 */
export const LOOM_SCRIPT_MAX_TOKENS = 2048;
