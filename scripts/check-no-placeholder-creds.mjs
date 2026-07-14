#!/usr/bin/env node
/**
 * Pre-deploy guard — hard-fails if the static export in out/ contains any
 * placeholder/dummy credential string.
 *
 * Root incident this exists to prevent: on 2026-07-14, a production deploy
 * shipped with NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co baked into
 * every JS chunk, because local verification builds used dummy env vars and
 * the exact same out/ directory was later deployed to production without
 * ever rebuilding with real credentials. `npm run build` succeeded (dummy
 * values are syntactically valid strings), so nothing caught it before
 * `wrangler pages deploy` shipped it live. This script is the catch.
 *
 * Wired into `npm run deploy` (see package.json) so there is exactly one
 * supported way to deploy, and it cannot skip this check.
 */
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "out";

// Any of these appearing in a shipped JS/HTML file means a build ran with
// fake credentials. Extend this list if a new placeholder convention shows
// up — it should never grow because the check should catch it here first.
//
// Deliberately NOT matching a bare /placeholder/i substring: it's a common,
// legitimate word in this codebase (HTML placeholder="" attributes, Loom
// URL detection via url.includes("placeholder"), marketing copy) and a
// broad match on it produced nothing but false positives the first time
// this script ran. Match the specific fake-domain strings instead — those
// can't appear in a build with real credentials, by construction.
const BAD_PATTERNS = [
  /dummy\.supabase\.co/i,
  /your-supabase\.supabase\.co/i,
];

// Positive check: a real Supabase project URL must appear somewhere in the
// build. Its absence is just as bad a sign as a placeholder's presence —
// it would mean the env var was empty and every Supabase call is broken.
const REAL_SUPABASE_URL_PATTERN = /https:\/\/[a-z0-9]{20}\.supabase\.co/;

// File types worth scanning — HTML shells and JS chunks are where an
// inlined NEXT_PUBLIC_* value would land.
const SCAN_EXTENSIONS = new Set([".js", ".html", ".txt"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

let outFiles;
try {
  outFiles = walk(OUT_DIR);
} catch (e) {
  console.error(`❌ Could not read ${OUT_DIR}/ — did the build run? (${e.message})`);
  process.exit(1);
}

const hits = [];
let foundRealSupabaseUrl = false;
for (const file of outFiles) {
  const ext = file.slice(file.lastIndexOf("."));
  if (!SCAN_EXTENSIONS.has(ext)) continue;
  let content;
  try {
    content = readFileSync(file, "utf-8");
  } catch {
    continue; // binary or unreadable — not a credential-bearing file
  }
  for (const pattern of BAD_PATTERNS) {
    if (pattern.test(content)) {
      hits.push({ file, pattern: pattern.toString() });
    }
  }
  if (!foundRealSupabaseUrl && REAL_SUPABASE_URL_PATTERN.test(content)) {
    foundRealSupabaseUrl = true;
  }
}

if (!foundRealSupabaseUrl) {
  console.error(
    "❌ PRE-DEPLOY GUARD FAILED — no real Supabase project URL " +
    `(https://<20-char-ref>.supabase.co) found anywhere in ${OUT_DIR}/. ` +
    "NEXT_PUBLIC_SUPABASE_URL was likely empty or unset for this build. Refusing to deploy."
  );
  process.exit(1);
}

if (hits.length > 0) {
  console.error("❌ PRE-DEPLOY GUARD FAILED — placeholder/dummy credentials found in build output:\n");
  for (const { file, pattern } of hits) {
    console.error(`  ${file}  (matched ${pattern})`);
  }
  console.error(
    "\nThis build was almost certainly produced with dummy env vars (e.g. an explicit " +
    "NEXT_PUBLIC_SUPABASE_URL=... override on the command line, which takes precedence over " +
    ".env.local). Rebuild with `npm run build` — no inline env var overrides — and confirm " +
    ".env.local has real credentials, then try again. Refusing to deploy."
  );
  process.exit(1);
}

console.log(`✅ Pre-deploy guard passed — scanned ${outFiles.length} files in ${OUT_DIR}/, no placeholder credentials found.`);
