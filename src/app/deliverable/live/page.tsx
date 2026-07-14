import DeliverableClientView from "../[clientKey]/DeliverableClientView";
import { DeliverableData } from "../fallback";

/**
 * PUBLISH-WITHOUT-REBUILD SHELL — target of the `/deliverable/*` rewrite
 * in public/_redirects.
 *
 * output: "export" requires every [clientKey] to be enumerated at build
 * time via generateStaticParams(), or Cloudflare 404s the route before any
 * JS ever runs — so a brand-new client written to the `deliverables` table
 * has nowhere to load. This page is the fix: Cloudflare serves this exact
 * built file for any /deliverable/<anything> path that doesn't already have
 * its own static file (the 4 demo clients + command-center-guide keep
 * being served from their own files, untouched — static-file match always
 * wins over a _redirects rule).
 *
 * DeliverableClientView derives the real clientKey from the actual browser
 * URL (usePathname()), not from this file's location, so it fetches the
 * correct client's data from /api/deliverable/<key> regardless of which
 * static file Cloudflare actually served to get here.
 *
 * The seed data below is intentionally empty (no clientName) — that's what
 * makes DeliverableClientView's existing loading skeleton render first,
 * and (if the fetch fails) the explicit "Access Unavailable" state, rather
 * than silently rendering a broken page with blank sections.
 */
const EMPTY_SEED: DeliverableData = {
  clientName: "",
  date: "",
  consultant: "",
  loomUrl: "",
  diagnosis: {
    signal: "",
    friction: { mechanism: "", rootCause: "" },
    decisions: [],
  },
};

export default function DeliverableLiveShell() {
  return <DeliverableClientView data={EMPTY_SEED} />;
}
