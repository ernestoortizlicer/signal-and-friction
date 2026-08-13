import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const FILES = [
  'src/lib/public-claims.ts',
  'src/lib/market-profiles.ts',
  'src/components/MarketLandingV21.tsx',
  'src/components/PricingV21.tsx',
  'src/components/CookieConsentBanner.tsx',
  'src/app/scan/page.tsx',
  'src/app/portfolio/page.tsx',
  'src/app/opengraph-image.tsx',
  'src/app/confirmed/success/page.tsx',
  'src/app/sla/[clientKey]/SLAClientView.tsx',
  'src/app/legal/guarantee/page.tsx',
  'src/app/legal/terms/page.tsx',
  'src/app/legal/privacy/page.tsx',
  'src/app/deliverable/[clientKey]/DeliverableClientView.tsx',
  'src/app/deliverable/[clientKey]/PolicyComposedDeliverable.tsx',
  'src/app/deliverable/[clientKey]/shared-modules.tsx',
];

const PLURAL = /\b(?:we|We|us|Us|our|Our|ours|Ours|ourselves|Ourselves|we're|We're|we've|We've|we'll|We'll|we'd|We'd)\b/;

function kind(file) {
  return file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function visibleStrings(sourceFile) {
  const hits = [];
  const add = (node, text) => {
    if (!text || !PLURAL.test(text)) return;
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    hits.push({ line: pos.line + 1, text: text.replace(/\s+/g, ' ').trim() });
  };
  const visit = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) add(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
}

let failed = false;
for (const file of FILES) {
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute)) {
    console.error(`✗ Missing public surface: ${file}`);
    failed = true;
    continue;
  }
  const source = fs.readFileSync(absolute, 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind(file));
  for (const hit of visibleStrings(parsed)) {
    console.error(`✗ ${file}:${hit.line} plural provider voice: ${JSON.stringify(hit.text.slice(0, 180))}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nSignal & Friction is currently a one-person business. Provider voice must use I/me/my or neutral Signal & Friction.');
  process.exit(1);
}

console.log('✓ Public provider surfaces use singular or neutral Signal & Friction voice.');
