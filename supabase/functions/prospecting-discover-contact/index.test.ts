/**
 * Regression tests for contact discovery. Run with:
 *   deno test supabase/functions/prospecting-discover-contact/index.test.ts
 *
 * Covers the epistemic contract this whole feature exists to enforce:
 * provenance on every candidate, honest status classification (never
 * collapsing "not configured" or "provider failed" into "no result"),
 * multiple-candidate handling (never silently picking a winner), inferred
 * vs. found-on-site email handling, and that a person/LinkedIn claim the
 * model makes is REJECTED unless it's literally backed by the cited
 * source text.
 */

import { assert, assertEquals, assertStrictEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  extractMailtoEmails,
  buildInferredEmailCandidates,
  validatePersonCandidate,
  validateLinkedInCandidate,
  discoverPeopleAndLinkedIn,
  discoverEmail,
  type TavilyResult,
  type PersonCandidate,
  type RawPerson,
  type RawLinkedIn,
} from "./index.ts";

const RESULTS: TavilyResult[] = [
  {
    query: "q1",
    title: "Meet Acme's founder",
    url: "https://producthunt.com/posts/acme",
    content: "Jane Doe is the CEO and co-founder of Acme, a CRM for solopreneurs. Find her on linkedin.com/in/janedoe.",
  },
  {
    query: "q2",
    title: "Acme raises seed round",
    url: "https://techcrunch.com/acme-seed",
    content: "Acme, based in Austin, closed a seed round led by unnamed investors.",
  },
];

// ── extractMailtoEmails ─────────────────────────────────────────────────

Deno.test("extractMailtoEmails: finds a real mailto: link", () => {
  const html = `<a href="mailto:hello@acme.com">Email us</a>`;
  assertEquals(extractMailtoEmails(html), ["hello@acme.com"]);
});

Deno.test("extractMailtoEmails: dedupes repeated addresses", () => {
  const html = `<a href="mailto:hello@acme.com">A</a><a href="mailto:HELLO@acme.com">B</a>`;
  assertEquals(extractMailtoEmails(html), ["hello@acme.com"]);
});

Deno.test("extractMailtoEmails: filters known platform/tooling addresses", () => {
  const html = `<a href="mailto:report@sentry.io">err</a><a href="mailto:real@acme.com">us</a>`;
  assertEquals(extractMailtoEmails(html), ["real@acme.com"]);
});

Deno.test("extractMailtoEmails: returns empty array, not an error, when nothing found", () => {
  assertEquals(extractMailtoEmails("<html><body>no contact here</body></html>"), []);
});

// ── buildInferredEmailCandidates ────────────────────────────────────────

const JANE: PersonCandidate = {
  name: "Jane Doe",
  roleClaim: "CEO",
  verificationStatus: "candidate",
  sourceUrl: "https://producthunt.com/posts/acme",
  sourceSnippet: "Jane Doe is the CEO...",
  rationale: "test",
  discoveredAt: new Date().toISOString(),
};

Deno.test("buildInferredEmailCandidates: labels the result inferred, never candidate or verified", () => {
  const out = buildInferredEmailCandidates("acme.com", [JANE], new Set());
  assertEquals(out.length, 1);
  assertStrictEquals(out[0].verificationStatus, "inferred");
  assertStrictEquals(out[0].method, "pattern_inferred");
  assertStrictEquals(out[0].email, "jane@acme.com");
  assertStrictEquals(out[0].sourceUrl, null); // no real page backs a guess
});

Deno.test("buildInferredEmailCandidates: never fabricates from the domain alone (zero people in -> zero out)", () => {
  assertEquals(buildInferredEmailCandidates("acme.com", [], new Set()).length, 0);
});

Deno.test("buildInferredEmailCandidates: caps at 2 people even if more were found", () => {
  const people = [JANE, { ...JANE, name: "Bob Smith" }, { ...JANE, name: "Third Person" }];
  const out = buildInferredEmailCandidates("acme.com", people, new Set());
  assertEquals(out.length, 2);
});

Deno.test("buildInferredEmailCandidates: skips a guess that duplicates a real found email", () => {
  const out = buildInferredEmailCandidates("acme.com", [JANE], new Set(["jane@acme.com"]));
  assertEquals(out.length, 0);
});

// ── validatePersonCandidate — the hard backstop ─────────────────────────

Deno.test("validatePersonCandidate: accepts a name literally present in the cited result", () => {
  const raw: RawPerson = { name: "Jane Doe", roleClaim: "CEO and co-founder", sourceIndex: 1 };
  const out = validatePersonCandidate(raw, RESULTS);
  assert(out !== null);
  assertStrictEquals(out!.name, "Jane Doe");
  assertStrictEquals(out!.verificationStatus, "candidate"); // never "verified" — no independent corroboration source exists
  assertStrictEquals(out!.sourceUrl, RESULTS[0].url);
});

Deno.test("validatePersonCandidate: rejects a name NOT present in the cited result (hallucination backstop)", () => {
  const raw: RawPerson = { name: "Someone Invented", roleClaim: "CEO", sourceIndex: 1 };
  assertStrictEquals(validatePersonCandidate(raw, RESULTS), null);
});

Deno.test("validatePersonCandidate: rejects an out-of-range sourceIndex rather than falling back to result 0", () => {
  const raw: RawPerson = { name: "Jane Doe", roleClaim: "CEO", sourceIndex: 99 };
  assertStrictEquals(validatePersonCandidate(raw, RESULTS), null);
});

Deno.test("validatePersonCandidate: rejects a claim with no stated role (never infers a role from a name alone)", () => {
  const raw: RawPerson = { name: "Jane Doe", sourceIndex: 1 };
  assertStrictEquals(validatePersonCandidate(raw, RESULTS), null);
});

// ── validateLinkedInCandidate — the hard backstop ───────────────────────

Deno.test("validateLinkedInCandidate: accepts a URL literally present in the cited result, records corroboration", () => {
  const raw: RawLinkedIn = { url: "linkedin.com/in/janedoe", personNameClaim: "Jane Doe", sourceIndex: 1 };
  const out = validateLinkedInCandidate(raw, RESULTS, "Acme", "acme.com");
  assert(out !== null);
  assertStrictEquals(out!.verificationStatus, "candidate"); // never "verified"
  assert(out!.corroboratingSignals.length > 0);
});

Deno.test("validateLinkedInCandidate: rejects a linkedin.com/in/ URL not present in the cited text", () => {
  const raw: RawLinkedIn = { url: "linkedin.com/in/nobodyhere", personNameClaim: null, sourceIndex: 1 };
  assertStrictEquals(validateLinkedInCandidate(raw, RESULTS, "Acme", "acme.com"), null);
});

Deno.test("validateLinkedInCandidate: rejects a non-profile LinkedIn URL (e.g. a company page)", () => {
  const raw: RawLinkedIn = { url: "linkedin.com/company/acme", personNameClaim: null, sourceIndex: 1 };
  assertStrictEquals(validateLinkedInCandidate(raw, RESULTS, "Acme", "acme.com"), null);
});

Deno.test("validateLinkedInCandidate: accepted result with no company/domain co-occurrence still surfaces, but with an empty corroboratingSignals and a weaker rationale", () => {
  const noCorroboration: TavilyResult[] = [
    { query: "q", title: "Some directory listing", url: "https://directory.example/x", content: "linkedin.com/in/janedoe listed here." },
  ];
  const raw: RawLinkedIn = { url: "linkedin.com/in/janedoe", personNameClaim: null, sourceIndex: 1 };
  const out = validateLinkedInCandidate(raw, noCorroboration, "Acme", "acme.com");
  assert(out !== null);
  assertEquals(out!.corroboratingSignals, []);
  assert(out!.rationale.includes("weaker corroboration"));
});

// ── discoverPeopleAndLinkedIn — configuration_missing (no mocking needed:
// these run with no TAVILY_API_KEY/DEEPSEEK_API_KEY set in the test env,
// which is the real, honest "not configured" case, not a simulated one) ──

Deno.test("discoverPeopleAndLinkedIn: missing TAVILY_API_KEY -> configuration_missing on both categories, not 'unavailable'", async () => {
  const hadTavily = Deno.env.get("TAVILY_API_KEY");
  const hadDeepseek = Deno.env.get("DEEPSEEK_API_KEY");
  Deno.env.delete("TAVILY_API_KEY");
  Deno.env.delete("DEEPSEEK_API_KEY");
  try {
    const out = await discoverPeopleAndLinkedIn("acme.com", "Acme");
    assertStrictEquals(out.people.status, "configuration_missing");
    assertStrictEquals(out.linkedin.status, "configuration_missing");
    assertEquals(out.people.candidates, []);
    assert(out.people.error?.includes("TAVILY_API_KEY"));
  } finally {
    if (hadTavily) Deno.env.set("TAVILY_API_KEY", hadTavily);
    if (hadDeepseek) Deno.env.set("DEEPSEEK_API_KEY", hadDeepseek);
  }
});

// ── discoverEmail — degrades independently of Tavily/DeepSeek, and a
// provider failure must never be reported as "no contact exists" ───────

Deno.test("discoverEmail: every site fetch failing -> provider_error, not unavailable (a fetch failure is not a verified absence)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("simulated network failure");
  }) as typeof fetch;
  try {
    const out = await discoverEmail("doesnotresolve.invalid", []);
    assertStrictEquals(out.status, "provider_error");
    assertEquals(out.candidates, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("discoverEmail: site reachable but no mailto: and no people found -> unavailable, not an error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response("<html><body>nothing here</body></html>", { status: 200 }))) as typeof fetch;
  try {
    const out = await discoverEmail("acme.com", []);
    assertStrictEquals(out.status, "unavailable");
    assertEquals(out.candidates, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("discoverEmail: real mailto: found on site is 'candidate', not 'verified' or 'inferred'", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((url: string) => {
    if (url === "https://acme.com") {
      return Promise.resolve(new Response('<a href="mailto:hello@acme.com">Email</a>', { status: 200 }));
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  }) as typeof fetch;
  try {
    const out = await discoverEmail("acme.com", []);
    assertStrictEquals(out.status, "ok");
    assertEquals(out.candidates.length, 1);
    assertStrictEquals(out.candidates[0].verificationStatus, "candidate");
    assertStrictEquals(out.candidates[0].method, "site_mailto_link");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("discoverEmail: mailto: found AND a person found -> both a candidate and an inferred entry present, never merged into one", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((url: string) => {
    if (url === "https://acme.com") {
      return Promise.resolve(new Response('<a href="mailto:hello@acme.com">Email</a>', { status: 200 }));
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  }) as typeof fetch;
  try {
    const out = await discoverEmail("acme.com", [JANE]);
    assertStrictEquals(out.status, "ok");
    const statuses = out.candidates.map((c) => c.verificationStatus).sort();
    assertEquals(statuses, ["candidate", "inferred"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
