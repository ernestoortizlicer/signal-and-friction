import fs from 'node:fs';
import ts from 'typescript';

const target = 'functions/api/leads/submit.ts';
const source = fs.readFileSync(target, 'utf8');
const ast = ts.createSourceFile(target, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const failures = [];
const interactionInserts = [];
let mappedMechanismIdentifiers = 0;

function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return null;
}

function isBodyFunnelPain(node) {
  return (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'body' &&
    node.name.text === 'funnelPain'
  );
}

function isInteractionsInsert(node) {
  if (!ts.isCallExpression(node)) return false;
  if (!ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'insert') return false;

  const receiver = node.expression.expression;
  if (!ts.isCallExpression(receiver)) return false;
  if (!ts.isPropertyAccessExpression(receiver.expression) || receiver.expression.name.text !== 'from') return false;

  const [table] = receiver.arguments;
  return Boolean(table && ts.isStringLiteral(table) && table.text === 'interactions');
}

function visit(node) {
  if (ts.isIdentifier(node) && node.text === 'mappedMechanism') mappedMechanismIdentifiers += 1;

  if (isInteractionsInsert(node)) {
    const payload = node.arguments[0];
    if (!payload || !ts.isObjectLiteralExpression(payload)) {
      failures.push('interactions insert must use an explicit object literal payload');
    } else {
      interactionInserts.push(payload);
    }
  }

  ts.forEachChild(node, visit);
}

visit(ast);

if (mappedMechanismIdentifiers > 0) {
  failures.push('native intake must not derive or carry a mapped diagnostic mechanism');
}

if (interactionInserts.length !== 1) {
  failures.push(`expected exactly one interactions insert, found ${interactionInserts.length}`);
} else {
  const payload = interactionInserts[0];
  const properties = new Map();

  for (const property of payload.properties) {
    if (!ts.isPropertyAssignment(property)) {
      failures.push('interactions insert must use explicit property assignments only');
      continue;
    }
    const name = propertyName(property.name);
    if (!name) {
      failures.push('interactions insert contains an unsupported computed property');
      continue;
    }
    properties.set(name, property.initializer);
  }

  const allowed = new Set(['client_id', 'funnel_signal', 'dominant_friction_mechanism']);
  for (const name of properties.keys()) {
    if (!allowed.has(name)) failures.push(`interactions insert uses unverified/unauthorized column: ${name}`);
  }

  if (!properties.has('client_id')) failures.push('interactions insert must retain client_id');

  const funnelSignal = properties.get('funnel_signal');
  if (!funnelSignal || !isBodyFunnelPain(funnelSignal)) {
    failures.push('funnel_signal must persist the self-reported body.funnelPain evidence');
  }

  const mechanism = properties.get('dominant_friction_mechanism');
  if (!mechanism || mechanism.kind !== ts.SyntaxKind.NullKeyword) {
    failures.push('dominant_friction_mechanism must remain NULL at native intake');
  }
}

if (failures.length > 0) {
  console.error('❌ Native intake product-truth invariant failed');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('✅ Native intake product truth: intake persists evidence only; diagnostic mechanism remains unresolved');
