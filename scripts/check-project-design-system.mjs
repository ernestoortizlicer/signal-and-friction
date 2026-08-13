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
requireText("docs/architecture/project-design-system-v1.md", "ACTIVE PROJECT-WIDE VISUAL AUTHORITY", "Project design authority is active rather than proposed");
requireText("docs/canonical/CURRENT.md", "docs/decision-log-2026-08-13-project-design-system-v1.md", "CURRENT points to the design/lifecycle decision record");
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
  ['.sf-admin[data-path="/admin/prospecting"] tbody > tr', "Prospecting uses a responsive operational row-card projection"],
  ["grid-template-areas:", "Prospecting layout is explicit rather than horizontal-scroll dependent"],
]) {
  if (css.includes(needle)) pass(label);
  else fail(`${label} — missing ${JSON.stringify(needle)}`);
}

requireText("src/lib/admin-module-registry.ts", 'href: "/admin/sales"', "Sales primary navigation points to the lifecycle hub");
requireText("src/lib/admin-module-registry.ts", '{ href: "/admin/prospecting", label: "Prospects" }', "Sales exposes Prospects as a lifecycle stage");
requireText("src/lib/admin-module-registry.ts", '{ href: "/admin/opportunities", label: "Opportunities" }', "Sales exposes Opportunities as a lifecycle stage");
requireText("src/lib/admin-module-registry.ts", '{ href: "/admin/clients", label: "Clients" }', "Sales exposes Clients as a lifecycle stage");
forbidText("src/lib/admin-module-registry.ts", "Continuous Learning OS", "System learning is not a Sales navigation concept");

requireFile("src/app/admin/opportunities/page.tsx", "Opportunities has a first-class surface");
requireFile("src/app/admin/clients/page.tsx", "Clients has a first-class surface");
requireText("src/app/admin/sales/page.tsx", "Prospects → Opportunities → Clients", "Sales communicates one coherent lifecycle");
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
