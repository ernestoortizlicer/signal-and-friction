#!/usr/bin/env node
/**
 * Agent Build Gate
 *
 * Prevents greenfield agent directories from appearing without an explicit
 * reuse/authority/eval/approval contract. This does not judge whether the
 * architecture is good; it makes the discovery work impossible to omit
 * silently.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS_DIR = path.join(ROOT, "agents");

let failed = false;

function fail(message) {
  failed = true;
  console.error(`✗ ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

if (!existsSync(AGENTS_DIR)) {
  console.log("No agents/ directory — nothing to validate.");
  process.exit(0);
}

const agentDirs = readdirSync(AGENTS_DIR)
  .filter((name) => statSync(path.join(AGENTS_DIR, name)).isDirectory())
  .sort();

for (const dir of agentDirs) {
  const manifestPath = path.join(AGENTS_DIR, dir, "AGENT_MANIFEST.json");
  if (!existsSync(manifestPath)) {
    fail(`agents/${dir} is missing AGENT_MANIFEST.json`);
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    fail(`agents/${dir}/AGENT_MANIFEST.json is invalid JSON: ${err.message}`);
    continue;
  }

  const requiredStrings = ["id", "name", "status", "specPath", "decisionLogPath", "evalPath", "humanApprovalBoundary"];
  for (const field of requiredStrings) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) {
      fail(`agents/${dir} manifest requires non-empty string field '${field}'`);
    }
  }

  for (const field of ["canonicalAuthorities", "reusedCapabilities", "deterministicFirst"]) {
    if (!Array.isArray(manifest[field]) || manifest[field].length === 0 || manifest[field].some((v) => typeof v !== "string" || !v.trim())) {
      fail(`agents/${dir} manifest requires non-empty string array '${field}'`);
    }
  }

  for (const refField of ["specPath", "decisionLogPath", "evalPath"]) {
    const rel = manifest[refField];
    if (typeof rel === "string" && rel.trim() && !existsSync(path.join(ROOT, rel))) {
      fail(`agents/${dir} manifest ${refField} points to missing path: ${rel}`);
    }
  }

  if (typeof manifest.humanApprovalBoundary === "string" && manifest.humanApprovalBoundary.trim().length < 20) {
    fail(`agents/${dir} humanApprovalBoundary is too vague to be enforceable`);
  }

  if (!failed) ok(`agents/${dir} has a complete build manifest`);
}

if (failed) {
  console.error("\nAgent build gate failed. Run repository/capability discovery before adding or changing agent architecture.");
  process.exit(1);
}

console.log(`\nAgent build gate passed for ${agentDirs.length} agent director${agentDirs.length === 1 ? "y" : "ies"}.`);
