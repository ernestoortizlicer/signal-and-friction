import fs from 'node:fs';
import ts from 'typescript';

const publicRoute = 'functions/api/stripe/webhook.ts';
const source = fs.readFileSync(publicRoute, 'utf8');
const ast = ts.createSourceFile(publicRoute, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const failures = [];
const imports = new Map();
let exportedHandler = null;

for (const statement of ast.statements) {
  if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
    imports.set(statement.moduleSpecifier.text, statement);
  }

  if (ts.isVariableStatement(statement)) {
    const isExported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === 'onRequestPost') {
        exportedHandler = declaration.initializer;
      }
    }
  }
}

const legacyModule = '../../../src/server/stripe/legacy-handler';
const policyModule = '../../../src/server/stripe-webhook-boundary.mjs';

if (!imports.has(legacyModule)) failures.push(`public webhook must delegate to ${legacyModule}`);
if (!imports.has(policyModule)) failures.push(`public webhook must import transport policy from ${policyModule}`);

for (const forbidden of ['stripe', '@supabase/supabase-js']) {
  if (imports.has(forbidden)) {
    failures.push(`public webhook boundary must not own ${forbidden} business/infrastructure logic`);
  }
}

if (!exportedHandler) {
  failures.push('public webhook must export onRequestPost');
} else {
  let callsLegacy = false;
  let callsPolicy = false;

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'legacyOnRequestPost') callsLegacy = true;
      if (node.expression.text === 'classifyLegacyWebhookResponse') callsPolicy = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(exportedHandler);

  if (!callsLegacy) failures.push('public webhook onRequestPost must invoke legacyOnRequestPost');
  if (!callsPolicy) failures.push('public webhook onRequestPost must classify the internal response before returning');
}

if (!fs.existsSync('src/server/stripe/legacy-handler.ts')) {
  failures.push('private compatibility handler is missing');
}
if (!fs.existsSync('src/server/stripe-webhook-boundary.mjs')) {
  failures.push('Stripe webhook transport policy module is missing');
}

if (failures.length > 0) {
  console.error('❌ Stripe webhook boundary invariant failed');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('✅ Stripe webhook boundary: public route delegates processing and owns only transport classification');
