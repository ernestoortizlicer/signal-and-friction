import SLAClientView from "../[clientKey]/SLAClientView";

/**
 * PUBLISH-WITHOUT-REBUILD SHELL for /sla — target of the `/sla/*` rewrite
 * in public/_redirects. Same mechanism as src/app/deliverable/live/page.tsx;
 * see that file's comment for the full explanation.
 */
export default function SLALiveShell() {
  return <SLAClientView staticClientKey="" />;
}
