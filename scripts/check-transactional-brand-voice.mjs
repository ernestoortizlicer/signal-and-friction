import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const FILES = [
  'functions/api/notify-delivery/[clientKey].ts',
  'src/server/stripe/legacy-handler.ts',
];
const PLURAL = /\b(?:we|We|us|Us|our|Our|ours|Ours|ourselves|Ourselves|we're|We're|we've|We've|we'll|We'll|we'd|We'd)\b/;

function strings(sourceFile) {
  const hits = [];
  const visit = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const text = node.text;
      if (text && PLURAL.test(text)) {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        hits.push({ line: pos.line + 1, text: text.replace(/\s+/g, ' ').trim() });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
}

let failed = false;
for (const file of FILES) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const hit of strings(parsed)) {
    console.error(`✗ ${file}:${hit.line} plural provider voice: ${JSON.stringify(hit.text.slice(0, 180))}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nTransactional Signal & Friction copy must use I/me/my or neutral Signal & Friction.');
  process.exit(1);
}

console.log('✓ Transactional provider copy uses singular or neutral Signal & Friction voice.');
