export type AdminModuleId =
  | "command"
  | "sales"
  | "delivery"
  | "training"
  | "finance"
  | "reliability";

export type AdminConnectionStatus = "live" | "planned";

export type AdminModuleConnection = {
  target: AdminModuleId | "premium_authorization" | "operator";
  status: AdminConnectionStatus;
  contract: string;
};

export type AdminModuleSurface = {
  href: string;
  label: string;
};

export type AdminModuleDefinition = {
  id: AdminModuleId;
  code: string;
  label: string;
  href: string;
  aliases: string[];
  purpose: string;
  sourceOfTruth: string;
  owns: string;
  receives: string[];
  produces: string[];
  surfaces: AdminModuleSurface[];
  connections: AdminModuleConnection[];
};

/**
 * Canonical operator-facing module map.
 *
 * This is deliberately not a database/domain authority. It is the product
 * projection of docs/architecture/capability-registry.md: one place that tells
 * the operator what each backend module is for, what truth it owns, and which
 * cross-module contracts are actually live versus merely planned.
 */
export const ADMIN_MODULES: readonly AdminModuleDefinition[] = [
  {
    id: "command",
    code: "CMD",
    label: "Command",
    href: "/admin/priorities",
    aliases: [],
    purpose: "Decide what deserves attention now and why.",
    sourceOfTruth: "priority_tasks is a derived action projection, not business truth.",
    owns: "Action ranking, operator queue, priority score history.",
    receives: ["Sales project state", "High/critical reliability incidents", "Manual operator tasks"],
    produces: ["Ranked next actions", "Explicit do/schedule/delegate/eliminate decisions"],
    surfaces: [{ href: "/admin/priorities", label: "Priority Queue" }],
    connections: [
      { target: "sales", status: "live", contract: "beta_projects state is projected into priority_tasks." },
      { target: "reliability", status: "live", contract: "High/critical ai_incidents are projected into priority_tasks." },
      { target: "operator", status: "live", contract: "Operator executes, edits or closes the ranked queue." },
      { target: "finance", status: "planned", contract: "Priority Engine v2 will consume canonical financial/economic signals." },
    ],
  },
  {
    id: "sales",
    code: "SAL",
    label: "Sales",
    href: "/admin/sales",
    aliases: ["/admin/dashboard"],
    purpose: "Move a company from evidence-backed prospect to opportunity, client and paid diagnostic work.",
    sourceOfTruth: "prospect_candidates + clients + beta_projects; commercial value comes from offer/payment contracts.",
    owns: "Prospect review, human promotion, opportunity stage, outreach and client commercial progression.",
    receives: ["Prospect candidates", "Contact evidence", "Payment state", "Commercial offer policy"],
    produces: ["Qualified opportunities", "Project stage transitions", "Client relationships", "Paid-work handoff"],
    surfaces: [
      { href: "/admin/prospecting", label: "Prospects" },
      { href: "/admin/opportunities", label: "Opportunities" },
      { href: "/admin/clients", label: "Clients" },
    ],
    connections: [
      { target: "command", status: "live", contract: "beta_projects changes create/reconcile commercial actions." },
      { target: "delivery", status: "live", contract: "Paid project/scaffold provisioning creates the diagnostic delivery workspace." },
      { target: "finance", status: "planned", contract: "Stripe/payment events must post idempotently into canonical Finance rather than remain a parallel money view." },
    ],
  },
  {
    id: "delivery",
    code: "DLV",
    label: "Delivery",
    href: "/admin/scaffolds",
    aliases: [],
    purpose: "Turn measured evidence into a reviewable human judgment and client deliverable.",
    sourceOfTruth: "diagnostic_scaffolds + canonical reasoning domain + delivery/dosing policy.",
    owns: "Evidence workspace, reasoning challenge, diagnosis draft, deliverable preparation and baseline capture.",
    receives: ["Measured scan evidence", "Paid/project context", "Canonical reasoning mechanisms"],
    produces: ["Human-approved diagnosis", "Deliverable state", "Monitoring baseline"],
    surfaces: [{ href: "/admin/scaffolds", label: "Diagnostic Workspace" }],
    connections: [
      { target: "sales", status: "live", contract: "Commercial/payment provisioning can create the scaffold used for delivery." },
      { target: "training", status: "planned", contract: "Representative delivery failures should become training/eval cases without leaking client data." },
      { target: "reliability", status: "planned", contract: "Material delivery/tool failures should automatically enter the incident/eval improvement loop." },
    ],
  },
  {
    id: "training",
    code: "TRN",
    label: "Training",
    href: "/admin/training",
    aliases: ["/admin/learning"],
    purpose: "Build analyst capability and prove it with timed, evidence-bearing practice.",
    sourceOfTruth: "learning_sessions + training_attempts + deterministic premium-readiness views.",
    owns: "Deliberate-practice sessions, diagnostic calibration and capability evidence.",
    receives: ["Training cases", "Hidden reference verdicts", "Calibration failure modes"],
    produces: ["Practice evidence", "Calibration profile", "Readiness evidence"],
    surfaces: [{ href: "/admin/training", label: "Training OS" }],
    connections: [
      { target: "premium_authorization", status: "live", contract: "Only deterministic readiness contracts can authorize premium work; course completion cannot." },
      { target: "delivery", status: "planned", contract: "Production failure taxonomy should seed representative regression practice." },
    ],
  },
  {
    id: "finance",
    code: "FIN",
    label: "Finance",
    href: "/admin/finance",
    aliases: ["/admin/finance/jurisdictions"],
    purpose: "Keep money truth deterministic and financial judgment reviewable.",
    sourceOfTruth: "accounts + transactions + transaction_entries + finance_* policy/compliance objects.",
    owns: "Ledger, financial metrics, compliance evidence, treasury policy and reviewed finance recommendations.",
    receives: ["Human-posted transactions", "Verified compliance sources", "Approved treasury/investment policy"],
    produces: ["Ledger truth", "Runway/cash metrics", "Review-required recommendations"],
    surfaces: [
      { href: "/admin/finance", label: "Finance OS" },
      { href: "/admin/finance/jurisdictions", label: "Jurisdictions" },
    ],
    connections: [
      { target: "sales", status: "planned", contract: "Stripe/payment events will post to Finance with canonical external IDs and fee accounting." },
      { target: "command", status: "planned", contract: "Verified economic signals will inform Priority Engine v2 without duplicating ledger truth." },
    ],
  },
  {
    id: "reliability",
    code: "REL",
    label: "Reliability",
    href: "/admin/reliability",
    aliases: [],
    purpose: "Turn failures into fixes, regression guards and safer future behavior.",
    sourceOfTruth: "ai_incidents + CI/eval artifacts; production runtime truth outranks repository intention.",
    owns: "Incident ledger, root cause, resolution, lessons and regression follow-through.",
    receives: ["Production/tool/process failures", "CI/eval failures", "Operator incident reports"],
    produces: ["Root-cause record", "Mitigation", "Regression/eval work"],
    surfaces: [{ href: "/admin/reliability", label: "Incident Ledger" }],
    connections: [
      { target: "command", status: "live", contract: "High/critical unresolved incidents become ranked operator actions." },
      { target: "training", status: "planned", contract: "Human skill failures should become de-identified calibration/regression practice where appropriate." },
      { target: "delivery", status: "planned", contract: "Delivery failures should enter the incident → eval → fix loop automatically." },
    ],
  },
] as const;

export const ADMIN_MODULE_BY_ID = Object.fromEntries(
  ADMIN_MODULES.map((module) => [module.id, module]),
) as Record<AdminModuleId, AdminModuleDefinition>;

export function moduleForPath(pathname: string): AdminModuleDefinition | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const module of ADMIN_MODULES) {
    const paths = [module.href, ...module.aliases, ...module.surfaces.map((surface) => surface.href)];
    if (paths.some((path) => normalized === path || normalized.startsWith(`${path}/`))) return module;
  }
  return null;
}
