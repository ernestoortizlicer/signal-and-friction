import fs from 'node:fs';
import ts from 'typescript';

const failures = [];
const legacyModule = '../../../src/server/stripe/legacy-handler';
const policyModule = '../../../src/server/stripe-webhook-boundary.mjs';

function inspectRoute(publicRoute, { dedicatedPaymentsSecret = false } = {}) {
  if (!fs.existsSync(publicRoute)) {
    failures.push(`${publicRoute} is missing`);
    return;
  }

  const source = fs.readFileSync(publicRoute, 'utf8');
  const ast = ts.createSourceFile(publicRoute, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
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

  if (!imports.has(legacyModule)) failures.push(`${publicRoute} must delegate to ${legacyModule}`);
  if (!imports.has(policyModule)) failures.push(`${publicRoute} must import transport policy from ${policyModule}`);

  for (const forbidden of ['stripe', '@supabase/supabase-js']) {
    if (imports.has(forbidden)) {
      failures.push(`${publicRoute} must not own ${forbidden} business/infrastructure logic`);
    }
  }

  if (!exportedHandler) {
    failures.push(`${publicRoute} must export onRequestPost`);
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

    if (!callsLegacy) failures.push(`${publicRoute} must invoke legacyOnRequestPost`);
    if (!callsPolicy) failures.push(`${publicRoute} must classify the internal response before returning`);
  }

  const mentionsDedicatedSecret = source.includes('STRIPE_PAYMENTS_WEBHOOK_SECRET');
  if (dedicatedPaymentsSecret) {
    if (!mentionsDedicatedSecret) {
      failures.push(`${publicRoute} must require STRIPE_PAYMENTS_WEBHOOK_SECRET`);
    }
    if (!/STRIPE_WEBHOOK_SECRET\s*:\s*context\.env\.STRIPE_PAYMENTS_WEBHOOK_SECRET/.test(source)) {
      failures.push(`${publicRoute} must map STRIPE_PAYMENTS_WEBHOOK_SECRET into the private handler verification slot`);
    }
  } else if (mentionsDedicatedSecret) {
    failures.push(`${publicRoute} must remain isolated from STRIPE_PAYMENTS_WEBHOOK_SECRET`);
  }
}

function inspectPaymentClientContract() {
  const handlerPath = 'src/server/stripe/legacy-handler.ts';
  const migrationPath = 'supabase/migrations/20260813093000_payment_client_reference_contract.sql';

  if (!fs.existsSync(handlerPath)) {
    failures.push('private compatibility handler is missing');
    return;
  }
  if (!fs.existsSync(migrationPath)) {
    failures.push(`${migrationPath} is missing`);
    return;
  }

  const handler = fs.readFileSync(handlerPath, 'utf8');
  const migration = fs.readFileSync(migrationPath, 'utf8');

  if (!handler.includes(".from('clients')")) {
    failures.push('Stripe payment handler must resolve the canonical client from clients');
  }
  if (!/client_id\s*:\s*clientId/.test(handler)) {
    failures.push('Stripe payment insert must persist clients.id in payments.client_id');
  }
  if (/lead_id\s*:\s*clientId/.test(handler)) {
    failures.push('Stripe payment handler must never write clients.id into payments.lead_id');
  }
  if (!/\.eq\('client_id',\s*clientId\)/.test(handler)) {
    failures.push('Downstream scaffold flagging must use the canonical clientId');
  }

  if (!migration.includes('ADD COLUMN IF NOT EXISTS client_id UUID')) {
    failures.push('payment-client migration must add payments.client_id');
  }
  if (!migration.includes('payments_client_id_fkey')) {
    failures.push('payment-client migration must name the client FK deterministically');
  }
  if (!/REFERENCES\s+public\.clients\(id\)/.test(migration)) {
    failures.push('payments.client_id must reference public.clients(id)');
  }
  if (!migration.includes("Legacy lead reference. FK → public.leads(id). Never store clients.id here.")) {
    failures.push('payment-client migration must preserve and document lead_id semantics');
  }
}

inspectRoute('functions/api/stripe/webhook.ts');
inspectRoute('functions/api/stripe/payments-webhook.ts', { dedicatedPaymentsSecret: true });
inspectPaymentClientContract();

if (!fs.existsSync('src/server/stripe-webhook-boundary.mjs')) {
  failures.push('Stripe webhook transport policy module is missing');
}

if (failures.length > 0) {
  console.error('❌ Stripe webhook boundary invariant failed');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('✅ Stripe webhook boundaries: isolated signing secrets, retry semantics, and canonical payment→client referential truth are enforced');
