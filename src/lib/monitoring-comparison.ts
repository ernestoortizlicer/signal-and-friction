/**
 * Monitoring signal comparison — Phase 6.3.
 * ════════════════════════════════════════════════════════════════════════════
 * Pure function, no React/JSX dependency (kept in a plain .ts file
 * specifically so it stays testable via plain `node`, same reason
 * src/lib/hypothesis-translation.ts and delivery-policy.ts are shaped
 * this way — a .tsx file can't be run directly with Node's type-stripping).
 *
 * Compares two REAL scanner snapshots (functions/api/_scan.ts's
 * RawTechnicalSignals, loosely typed here since this file has no
 * dependency on that Cloudflare-Function-only type) and returns only the
 * rows where both sides actually have that field — never fabricates a
 * comparison for a signal only one side measured. This is the entire
 * Monitoring launch-state fix: real measured evidence, before vs. after,
 * from the same scan engine that has produced every "measured" evidence
 * row since Phase 1 — not a new pipeline, not a simulated one.
 */

export interface TechnicalSignalSnapshot {
  lcp?: { ms: number; label: string; status: string };
  performanceScore?: number;
  securityBadges?: "found" | "not_found" | "undetermined";
  onSiteTestimonial?: "found" | "not_found" | "undetermined";
  thirdPartyReviewLink?: "found" | "not_found" | "undetermined";
}

export interface TechnicalMovementRow {
  label: string;
  before: string;
  after: string;
  moved: boolean;
}

export function formatPresence(p: unknown): string {
  if (p === "found") return "Found";
  if (p === "not_found") return "Not found";
  return "Undetermined";
}

/**
 * Never invents a row: only compares a field when BOTH the baseline and
 * the current snapshot actually have it. Returns [] (not an error, not a
 * placeholder row) when nothing comparable is present on both sides.
 */
export function computeTechnicalMovement(
  baseline: Record<string, unknown>,
  current: Record<string, unknown>
): TechnicalMovementRow[] {
  const b = baseline as TechnicalSignalSnapshot;
  const c = current as TechnicalSignalSnapshot;
  const rows: TechnicalMovementRow[] = [];

  if (b.lcp && c.lcp) {
    rows.push({ label: "Largest Contentful Paint", before: b.lcp.label, after: c.lcp.label, moved: b.lcp.ms !== c.lcp.ms });
  }
  if (typeof b.performanceScore === "number" && typeof c.performanceScore === "number") {
    rows.push({
      label: "Performance Score",
      before: `${b.performanceScore}/100`,
      after: `${c.performanceScore}/100`,
      moved: b.performanceScore !== c.performanceScore,
    });
  }
  const presenceFields: Array<[keyof TechnicalSignalSnapshot, string]> = [
    ["securityBadges", "Security Badges"],
    ["onSiteTestimonial", "On-Site Testimonial"],
    ["thirdPartyReviewLink", "Third-Party Review Link"],
  ];
  for (const [key, label] of presenceFields) {
    if (b[key] && c[key]) {
      rows.push({ label, before: formatPresence(b[key]), after: formatPresence(c[key]), moved: b[key] !== c[key] });
    }
  }

  return rows;
}
