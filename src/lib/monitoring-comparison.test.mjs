/**
 * Regression tests for the Monitoring launch-state fix (Phase 6.3). Run:
 *   node src/lib/monitoring-comparison.test.mjs
 */
import assert from "node:assert/strict";
import { computeTechnicalMovement, formatPresence } from "./monitoring-comparison.ts";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`ok - ${name}`); }
  else { fail++; console.log(`FAIL - ${name}`); }
}

// ── No fabrication: empty/absent input never throws, never invents rows ──
check("both snapshots empty -> [] , no throw", computeTechnicalMovement({}, {}).length === 0);
check("only baseline populated, current empty -> [] (never compares one-sided)", computeTechnicalMovement({ performanceScore: 40 }, {}).length === 0);
check("only current populated, baseline empty -> [] (never compares one-sided)", computeTechnicalMovement({}, { performanceScore: 90 }).length === 0);

// ── Real comparison, only for fields present on BOTH sides ─────────────
const baseline = {
  lcp: { ms: 4200, label: "4.2s", status: "poor" },
  performanceScore: 41,
  securityBadges: "not_found",
  // onSiteTestimonial intentionally absent from baseline
};
const current = {
  lcp: { ms: 1800, label: "1.8s", status: "good" },
  performanceScore: 88,
  securityBadges: "found",
  onSiteTestimonial: "found",
};
const rows = computeTechnicalMovement(baseline, current);
const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));

check("compares exactly the 3 fields present on both sides, not the 4th (onSiteTestimonial) present only on current", rows.length === 3);
check("LCP row: before/after labels are the real scanner labels, not recomputed", byLabel["Largest Contentful Paint"]?.before === "4.2s" && byLabel["Largest Contentful Paint"]?.after === "1.8s");
check("LCP row: moved=true when ms actually differs", byLabel["Largest Contentful Paint"]?.moved === true);
check("Performance Score row: correct before/after formatting", byLabel["Performance Score"]?.before === "41/100" && byLabel["Performance Score"]?.after === "88/100");
check("Performance Score row: moved=true", byLabel["Performance Score"]?.moved === true);
check("Security Badges row: presence values translated to readable labels", byLabel["Security Badges"]?.before === "Not found" && byLabel["Security Badges"]?.after === "Found");
check("Security Badges row: moved=true when presence changed", byLabel["Security Badges"]?.moved === true);
check("onSiteTestimonial never appears — absent from baseline, never fabricated", !("On-Site Testimonial" in byLabel));

// ── No movement -> moved: false, not omitted ────────────────────────────
const identical = computeTechnicalMovement(
  { performanceScore: 75 },
  { performanceScore: 75 }
);
check("identical values still produce a row (moved=false), not silently dropped", identical.length === 1 && identical[0].moved === false);

// ── formatPresence — no invented states ─────────────────────────────────
check("formatPresence('found')", formatPresence("found") === "Found");
check("formatPresence('not_found')", formatPresence("not_found") === "Not found");
check("formatPresence('undetermined') and any unknown value both map to Undetermined, never guessed", formatPresence("undetermined") === "Undetermined" && formatPresence("something-else") === "Undetermined");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
