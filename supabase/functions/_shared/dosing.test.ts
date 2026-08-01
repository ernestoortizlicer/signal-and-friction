/**
 * Regression tests for the commercial dosing engine. Run with:
 *   deno test supabase/functions/_shared/dosing.test.ts
 *
 * The single most important assertion in this file is the first one:
 * the free teaser must NEVER leak the_decision or what_to_avoid, in any
 * form, for any scaffold. Everything else is secondary to that.
 */

import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { applyDosing, generateTeaser, NOT_YET_DELIVERED, type ScaffoldJudgment } from "./dosing.ts";

const SAMPLE: ScaffoldJudgment = {
  friction_mechanism: "trust_deficit",
  specific_friction_point:
    "Pricing page shows 3 tiers but never states what happens after the trial ends — no auto-charge notice, no cancellation policy, no card-required disclosure.",
  why_blocks_conversion:
    "Visitors comparing plans hit an unanswered question right at the decision moment — 'what happens to my card?' — and without an answer, closing the tab is safer than guessing.",
  projected_impact: "Likely costing a meaningful share of otherwise-ready signups at this exact step.",
  the_decision:
    "Add 'Cancel anytime, no charge until day 15' directly under the CTA on all 3 tiers, plus a one-line card notice before the trial starts.",
  what_to_avoid: "Don't bury this in a FAQ or Terms link — it has to be adjacent to the CTA, same visual moment.",
  confidence_and_why:
    "High — this is a well-documented trust pattern (NN/g, Baymard) and directly observable on the page.",
  funnel_stage: "pricing",
  projected_impact_magnitude: "moderate",
  confidence_level: "high",
  dfy_execution_summary: null,
  dfy_monitoring_findings: null,
  dfy_handoff_documentation: null,
};

Deno.test("teaser never contains the_decision text, in any form", () => {
  const teaser = generateTeaser(SAMPLE);
  assertEquals(teaser.includes(SAMPLE.the_decision!), false);
  // Also check for a fragment, not just the full string — catches an
  // accidental partial leak, not only a verbatim copy.
  assertEquals(teaser.includes("Cancel anytime"), false);
});

Deno.test("teaser never contains what_to_avoid text, in any form", () => {
  const teaser = generateTeaser(SAMPLE);
  assertEquals(teaser.includes(SAMPLE.what_to_avoid!), false);
  assertEquals(teaser.includes("bury this"), false);
});

Deno.test("teaser DOES surface the mechanism, region, and a causal sentence", () => {
  const teaser = generateTeaser(SAMPLE);
  assertEquals(teaser.includes("trust deficit"), true);
  assertEquals(teaser.includes("your pricing page"), true);
  assertEquals(teaser.includes("visitors read the silence as risk"), true);
});

Deno.test("teaser never contains a bare number for projected impact", () => {
  const teaser = generateTeaser(SAMPLE);
  // The magnitude phrase is directional prose, never a numeral — this
  // regex would catch a stray "%" or digit accidentally introduced later.
  assertEquals(/\d/.test(teaser), false);
});

Deno.test("DWY beta_diagnostic omits the_decision and what_to_avoid entirely (not just empty)", () => {
  const dosed = applyDosing(SAMPLE, "dwy", "beta_diagnostic");
  assertStrictEquals(dosed.fields.the_decision, undefined);
  assertStrictEquals(dosed.fields.what_to_avoid, undefined);
  assertEquals("the_decision" in dosed.fields, false);
  assertEquals("what_to_avoid" in dosed.fields, false);
  // But the diagnosis itself is fully present.
  assertEquals(dosed.fields.specific_friction_point, SAMPLE.specific_friction_point);
  assertEquals(dosed.fields.why_blocks_conversion, SAMPLE.why_blocks_conversion);
});

Deno.test("DWY intervention reveals the_decision and what_to_avoid in full", () => {
  const dosed = applyDosing(SAMPLE, "dwy", "intervention");
  assertEquals(dosed.fields.the_decision, SAMPLE.the_decision);
  assertEquals(dosed.fields.what_to_avoid, SAMPLE.what_to_avoid);
});

Deno.test("DFY beta_diagnostic reveals all 7 fields immediately", () => {
  const dosed = applyDosing(SAMPLE, "dfy", "beta_diagnostic");
  assertEquals(dosed.fields.the_decision, SAMPLE.the_decision);
  assertEquals(dosed.fields.what_to_avoid, SAMPLE.what_to_avoid);
});

Deno.test("DFY delivery content is honestly 'Not yet delivered' when no real work is logged", () => {
  const dosed = applyDosing(SAMPLE, "dfy", "intervention");
  assertEquals(dosed.dfyDelivery?.execution_summary, NOT_YET_DELIVERED);
});

Deno.test("DFY delivery content reveals real work once logged — never fabricated", () => {
  const withWork: ScaffoldJudgment = { ...SAMPLE, dfy_execution_summary: "Shipped the CTA copy change on 2026-08-10; verified live." };
  const dosed = applyDosing(withWork, "dfy", "intervention");
  assertEquals(dosed.dfyDelivery?.execution_summary, "Shipped the CTA copy change on 2026-08-10; verified live.");
});

Deno.test("DFY monitoring_findings stays placeholder at intervention tier even if data exists (out of scope for that tier)", () => {
  const withData: ScaffoldJudgment = { ...SAMPLE, dfy_monitoring_findings: "Conversion up 4pp since the fix shipped." };
  const dosed = applyDosing(withData, "dfy", "intervention");
  assertEquals(dosed.dfyDelivery?.monitoring_findings, NOT_YET_DELIVERED);
});
