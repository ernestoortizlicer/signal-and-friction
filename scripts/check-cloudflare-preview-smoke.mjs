#!/usr/bin/env node

/**
 * Read-only Frontend OS preview smoke test.
 *
 * This script runs only in pull-request CI. It waits for the Cloudflare Pages
 * check attached to the same GITHUB_SHA, extracts that immutable deployment
 * URL, verifies the sf-build-sha marker, then checks critical public routes.
 * It performs GET requests only and never submits forms, creates a Checkout
 * Session, charges a customer, mutates Supabase, or signs into Admin.
 */

const repo = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;
const token = process.env.GITHUB_TOKEN;

if (!repo || !sha || !token) {
  console.error("Preview smoke requires GITHUB_REPOSITORY, GITHUB_SHA and GITHUB_TOKEN.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getChecks() {
  const response = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/check-runs`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "signal-and-friction-preview-smoke",
    },
  });
  if (!response.ok) throw new Error(`GitHub checks lookup failed (${response.status}).`);
  return response.json();
}

function deploymentUrlFromSummary(summary = "") {
  const matches = [...summary.matchAll(/https:\/\/[a-z0-9-]+\.signal-and-friction\.pages\.dev/g)];
  if (!matches.length) return null;
  // Cloudflare summary contains the immutable deployment URL before the branch URL.
  return matches[0][0];
}

async function waitForCloudflare() {
  const deadline = Date.now() + 6 * 60_000;
  while (Date.now() < deadline) {
    const payload = await getChecks();
    const check = payload.check_runs?.find(
      (item) => item.name === "Cloudflare Pages" && item.head_sha === sha,
    );

    if (!check) {
      console.log("Cloudflare check not attached yet; waiting…");
      await sleep(5_000);
      continue;
    }

    if (check.status !== "completed") {
      console.log(`Cloudflare status: ${check.status}; waiting…`);
      await sleep(5_000);
      continue;
    }

    if (check.conclusion !== "success") {
      throw new Error(`Cloudflare Pages concluded ${check.conclusion}.`);
    }

    const url = deploymentUrlFromSummary(check.output?.summary || "");
    if (!url) throw new Error("Cloudflare succeeded but immutable deployment URL was not found in check output.");
    return url;
  }

  throw new Error("Timed out waiting for Cloudflare Pages on the exact candidate SHA.");
}

function hasBuildSha(html) {
  const marker = /<meta[^>]+name=["']sf-build-sha["'][^>]+content=["']([^"']+)["'][^>]*>/i.exec(html)
    || /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']sf-build-sha["'][^>]*>/i.exec(html);
  return marker?.[1] === sha;
}

const routes = [
  { path: "/", marker: "Isolate the highest-confidence friction" },
  { path: "/sg/", marker: "APAC" },
  { path: "/scan/", marker: "Technical Signal Scan" },
  { path: "/pricing/", marker: "Start with evidence" },
  { path: "/portfolio/", marker: "Illustrative Sample" },
  { path: "/certified/", marker: "not accepting new enrollments" },
  { path: "/confirmed/", marker: "Intake received" },
  { path: "/confirmed/success/", marker: "Checkout return" },
];

async function checkRoute(baseUrl, route) {
  const response = await fetch(new URL(route.path, `${baseUrl}/`), {
    redirect: "follow",
    headers: { "User-Agent": "signal-and-friction-preview-smoke" },
  });
  const html = await response.text();

  if (!response.ok) throw new Error(`${route.path} returned ${response.status}.`);
  if (!hasBuildSha(html)) throw new Error(`${route.path} is not the exact candidate SHA ${sha}.`);
  if (!html.includes(route.marker)) throw new Error(`${route.path} missing expected marker: ${route.marker}`);

  console.log(`✓ ${route.path} — ${response.status}, exact SHA, expected marker present`);
}

try {
  const deploymentUrl = await waitForCloudflare();
  console.log(`Cloudflare exact deployment: ${deploymentUrl}`);

  for (const route of routes) {
    await checkRoute(deploymentUrl, route);
  }

  console.log("✓ Frontend public preview smoke passed on the exact Cloudflare deployment.");
} catch (error) {
  console.error(`✗ FRONTEND PREVIEW SMOKE: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
