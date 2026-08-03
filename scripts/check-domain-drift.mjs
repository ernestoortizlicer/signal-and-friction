#!/usr/bin/env node
/**
 * Drift protection for the duplicated-by-necessity code trees this repo
 * carries — src/domain/reasoning and src/lib/dosing.ts each have a
 * mirrored copy under supabase/functions/_shared/, and src/lib/training-
 * workflow.ts (Diagnostic Calibration v3's stage-gating + hidden-verdict-
 * stripping logic) has a mirrored copy under functions/api/training/
 * _shared.ts — because Cloudflare Pages Functions, Next.js, and Supabase
 * Deno Edge Functions are three separate build/import contexts with no
 * shared module resolution path between them. That's a real, load-bearing
 * constraint (documented in functions/api/diagnose.ts and elsewhere) —
 * this script doesn't try to remove the duplication, it makes silent
 * divergence between the copies a build failure instead of something
 * nobody notices until it's wrong in production.
 *
 * Two comparison strategies:
 *   1. Full-file — for src/domain/reasoning/*, which has zero legitimate
 *      reason to differ between copies (pure data/types, no runtime-
 *      specific code on either side). Any difference at all is drift.
 *   2. Marker-bounded — for dosing.ts, which legitimately has a
 *      Next.js-only section (the publish-path integration) that the Deno
 *      copy correctly doesn't have. Only the text between the
 *      MIRROR-SYNC-START/MIRROR-SYNC-END comments in each file is
 *      compared.
 *
 * Run via `node scripts/check-domain-drift.mjs`. Exits 1 on any drift,
 * printing exactly which file pair and where.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let failed = false;

function read(relPath) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

function extractBetweenMarkers(content, file) {
  const startMarker = content.indexOf("MIRROR-SYNC-START");
  const endMarker = content.indexOf("MIRROR-SYNC-END");
  if (startMarker === -1 || endMarker === -1) {
    throw new Error(`${file}: missing MIRROR-SYNC-START/END marker — cannot check drift`);
  }
  // Start extraction from the line AFTER the marker, and end it at the
  // start of the marker's own line — so any explanatory text sharing a
  // line with either marker (which legitimately differs between the two
  // files' comments) never enters the compared region, only the actual
  // shared code/content between them does.
  const startOfSharedRegion = content.indexOf("\n", startMarker) + 1;
  const startOfEndMarkerLine = content.lastIndexOf("\n", endMarker) + 1;
  return content.slice(startOfSharedRegion, startOfEndMarkerLine);
}

function checkFullFile(a, b) {
  const contentA = read(a);
  const contentB = read(b);
  if (contentA !== contentB) {
    console.error(`✗ DRIFT: ${a} and ${b} are not identical.`);
    const linesA = contentA.split("\n");
    const linesB = contentB.split("\n");
    for (let i = 0; i < Math.max(linesA.length, linesB.length); i++) {
      if (linesA[i] !== linesB[i]) {
        console.error(`  first difference at line ${i + 1}:`);
        console.error(`    ${a}: ${linesA[i] ?? "(end of file)"}`);
        console.error(`    ${b}: ${linesB[i] ?? "(end of file)"}`);
        break;
      }
    }
    failed = true;
  } else {
    console.log(`✓ ${a} === ${b}`);
  }
}

function checkMarkerBounded(a, b) {
  const sharedA = extractBetweenMarkers(read(a), a);
  const sharedB = extractBetweenMarkers(read(b), b);
  if (sharedA !== sharedB) {
    console.error(`✗ DRIFT: ${a} and ${b} differ within their MIRROR-SYNC-START/END shared region.`);
    failed = true;
  } else {
    console.log(`✓ ${a} === ${b} (shared region only)`);
  }
}

const REASONING_FILES = ["types.ts", "families.ts", "mechanisms.ts", "selectors.ts", "diagnosis.ts", "learning-prompts.ts", "index.ts"];
for (const f of REASONING_FILES) {
  checkFullFile(`src/domain/reasoning/${f}`, `supabase/functions/_shared/reasoning/${f}`);
}

checkMarkerBounded("src/lib/dosing.ts", "supabase/functions/_shared/dosing.ts");

checkFullFile("src/lib/training-workflow.ts", "functions/api/training/_shared.ts");
checkFullFile("src/lib/calibration-readiness.ts", "functions/api/training/_shared-readiness.ts");

if (failed) {
  console.error("\nDrift detected — sync the copies above before committing.");
  process.exit(1);
}
console.log("\nNo drift detected.");
