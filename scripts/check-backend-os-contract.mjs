#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(path.join(root,p),"utf8");
let failed=false;
function need(body,text,label){if(body.includes(text))console.log(`✓ ${label}`);else{failed=true;console.error(`✗ ${label}`)}}
function avoid(body,text,label){if(body.includes(text)){failed=true;console.error(`✗ ${label}`)}else console.log(`✓ ${label}`)}
const registry=read("src/lib/admin-module-registry.ts");
const shell=read("src/app/admin/AdminShellV3.tsx");
const layout=read("src/app/admin/layout.tsx");
const overview=read("src/app/admin/overview/page.tsx");
const api=read("functions/api/system/overview.ts");
for(const label of ["Command","Sales","Delivery","Training","Finance","Reliability"])need(registry,`label: \"${label}\"`,`module ${label}`);
need(registry,'status: "live"',"live connection vocabulary");
need(registry,'status: "planned"',"planned-gap vocabulary");
need(registry,'derived action projection',"Command truth boundary");
need(registry,'premium_authorization',"Training readiness boundary");
need(layout,'./AdminShellV3',"admin shell cutover");
need(shell,'ADMIN_MODULES',"navigation comes from registry");
need(shell,'/api/system/overview',"shell reads live health");
avoid(shell,'label: "Certified"',"Certified removed from primary navigation");
avoid(shell,'label: "Learning"',"Learning removed from primary navigation");
need(overview,'ADMIN_MODULE_BY_ID',"overview shares module registry");
need(overview,'PLANNED',"overview exposes gaps");
need(api,'requireAdmin',"health API admin boundary");
for(const table of ["priority_tasks","beta_projects","diagnostic_scaffolds","learning_sessions","finance_obligations","ai_incidents"])need(api,`.from('${table}')`,`health reads ${table}`);
if(failed){console.error("\nBackend OS contract failed.");process.exit(1)}
console.log("\nBackend OS contract passed.");

// Stripe -> Finance is now a first-class Backend OS interconnection. Keep its
// deterministic projection/idempotency/fail-closed contract in the same CI
// gate even when the workflow file itself is intentionally stable.
await import("./check-stripe-finance-projection.mjs");
