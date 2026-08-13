import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const failures = [];
const pass = (label) => console.log(`✓ ${label}`);
const fail = (label) => failures.push(label);
const requireText = (file, needle, label) => {
  const source = read(file);
  if (source.includes(needle)) pass(label);
  else fail(`${label} — missing ${JSON.stringify(needle)} in ${file}`);
};
const forbidText = (file, needle, label) => {
  const source = read(file);
  if (!source.includes(needle)) pass(label);
  else fail(`${label} — forbidden ${JSON.stringify(needle)} in ${file}`);
};
const requireFile = (file, label) => {
  if (exists(file)) pass(label);
  else fail(`${label} — missing ${file}`);
};

console.log("Project Design System contract\n");

requireFile("src/styles/sf-design-system.css", "Project visual authority exists");
requireFile("docs/decision-log-2026-08-13-project-design-system-v1.md", "Material design/lifecycle decision has a Decision Log");
requireFile("docs/decision-log-2026-08-13-command-center-visual-contract-v2.md", "Command Center visual-contract decision is recorded");
requireFile("docs/decision-log-2026-08-13-atomic-prospect-promotion.md", "Atomic promotion decision is recorded");
requireText("docs/architecture/project-design-system-v1.md", "ACTIVE PROJECT-WIDE VISUAL AUTHORITY", "Project design authority is active rather than proposed");
requireText("docs/canonical/CURRENT.md", "docs/decision-log-2026-08-13-project-design-system-v1.md", "CURRENT points to the design/lifecycle decision record");
requireText("docs/canonical/CURRENT.md", "docs/decision-log-2026-08-13-command-center-visual-contract-v2.md", "CURRENT points to Command Center visual contract v2");
requireText("docs/canonical/CURRENT.md", "docs/decision-log-2026-08-13-atomic-prospect-promotion.md", "CURRENT points to atomic prospect promotion authority");
requireText("src/app/template.tsx", "@/styles/sf-design-system.css", "Design authority is loaded at the app root");
requireText("src/app/template.tsx", "sf-product", "Every application surface receives the project design scope");
requireText("src/app/admin/layout.tsx", "@/styles/sf-design-system.css", "Command Center explicitly loads the same design authority");
requireText("src/app/admin/AdminShellV3.tsx", 'className="sf-admin', "Command Center is scoped by one shell design contract");
requireText("src/app/admin/AdminShellV3.tsx", "data-path={normalizedPath}", "Command Center exposes route context for workflow-specific composition");
requireText("src/app/admin/AdminShellV3.tsx", "sf-admin-content", "Command Center content width and gutters are centralized");

const css = read("src/styles/sf-design-system.css");
for (const [needle, label] of [
  ["--sf-type-micro: 0.75rem", "Operational microcopy floor is 12px"],
  ["--sf-type-page:", "Page-title scale is centralized"],
  ["--sf-space-4:", "Spacing rhythm is centralized"],
  ["--sf-radius-card:", "Card radius hierarchy is centralized"],
  [".sf-admin-content header:has(h1)", "Every semantic Command Center page header is normalized by the shell design authority"],
  ['.sf-admin[data-path="/admin/prospecting"] tbody > tr', "Prospecting uses a responsive operational row-card projection"],
  ["grid-template-areas:", "Prospecting layout is explicit rather than horizontal-scroll dependent"],
]) {
  if (css.includes(needle)) pass(label);
  else fail(`${label} — missing ${JSON.stringify(needle)}`);
}

requireText("src/components/admin/AdminComponents.tsx", '<header className="sf-page-header', "Legacy AdminSectionHeader delegates to the canonical page-header composition");
requireText("src/components/admin/AdminComponents.tsx", '<h1 className="sf-page-title', "Legacy AdminSectionHeader uses semantic h1 page-title authority");
requireText("src/components/admin/AdminPagePrimitives.tsx", '<h1 className="sf-page-title', "Canonical AdminPageHeader uses the same semantic h1 authority");

const firstClassSurfaces = [
  "src/app/admin/overview/page.tsx",
  "src/app/admin/priorities/page.tsx",
  "src/app/admin/sales/page.tsx",
  "src/app/admin/prospecting/page.tsx",
  "src/app/admin/opportunities/page.tsx",
  "src/app/admin/clients/page.tsx",
  "src/app/admin/scaffolds/page.tsx",
  "src/app/admin/training/page.tsx",
  "src/app/admin/finance/page.tsx",
  "src/app/admin/reliability/page.tsx",
];
for (const file of firstClassSurfaces) {
  const source = read(file);
  const hasPageHeading = source.includes("AdminPageHeader") || source.includes("AdminSectionHeader") || source.includes("<h1");
  if (hasPageHeading) pass(`${file} exposes a page-heading contract`);
  else fail(`${file} — first-class Command Center surface has no semantic page-heading contract`);
}

requireText("src/lib/admin-module-registry.ts", 'href: "/admin/sales"', "Sales primary navigation points to the lifecycle hub");
requireText("src/lib/admin-module-registry.ts", '{ href: "/admin/prospecting", label: "Prospects" }', "Sales exposes Prospects as a lifecycle stage");
requireText("src/lib/admin-module-registry.ts", '{ href: "/admin/opportunities", label: "Opportunities" }', "Sales exposes Opportunities as a lifecycle stage");
requireText("src/lib/admin-module-registry.ts", '{ href: "/admin/clients", label: "Clients" }', "Sales exposes Clients as a lifecycle stage");
forbidText("src/lib/admin-module-registry.ts", "Continuous Learning OS", "System learning is not a Sales navigation concept");

requireFile("src/app/admin/opportunities/page.tsx", "Opportunities has a first-class surface");
requireFile("src/app/admin/clients/page.tsx", "Clients has a first-class surface");
requireText("src/app/admin/sales/page.tsx", "Prospects → Opportunities → Clients", "Sales communicates one coherent lifecycle");
requireText("src/app/admin/prospecting/page.tsx", 'eyebrow="Sales · Prospects"', "Prospecting names itself inside the Sales lifecycle");
requireText("src/app/admin/prospecting/page.tsx", 'title="Prospects"', "Prospecting uses the canonical operator-facing surface name");
requireText("src/app/admin/prospecting/ContactDiscoveryCell.tsx", "View evidence ↓", "Contact Discovery uses progressive disclosure");
requireText("src/app/admin/prospecting/ContactDiscoveryCell.tsx", "never fills founder contact", "Contact Discovery preserves the human-contact boundary");
requireText("src/app/admin/reliability/page.tsx", "System learning belongs here", "Reliability remains the home of system learning");
requireFile("src/app/admin/dashboard/legacy-dashboard.css", "Legacy Sales compatibility surface is explicitly bounded");
requireText("src/app/admin/dashboard/legacy-dashboard.css", "display: none !important", "Misplaced legacy learning tabs are hidden from Sales");

if (failures.length) {
  console.error("\nProject Design System contract FAILED:\n");
  for (const item of failures) console.error(`✗ ${item}`);
  process.exit(1);
}

console.log("\nProject Design System contract passed.");
