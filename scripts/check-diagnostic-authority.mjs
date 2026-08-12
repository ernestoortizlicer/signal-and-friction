import fs from 'node:fs';

const diagnosePath = 'functions/api/diagnose.ts';
const leadsPath = 'functions/api/leads.ts';
const diagnose = fs.readFileSync(diagnosePath, 'utf8');
const leads = fs.readFileSync(leadsPath, 'utf8');

const failures = [];

function requireText(source, text, reason) {
  if (!source.includes(text)) failures.push(`MISSING: ${reason}`);
}

function forbidText(source, text, reason) {
  if (source.includes(text)) failures.push(`FORBIDDEN: ${reason}`);
}

requireText(
  diagnose,
  "code: 'legacy_autonomous_diagnosis_retired'",
  'legacy public diagnosis route must remain an explicit retired boundary',
);
requireText(
  diagnose,
  '{ status: 410, headers: RESPONSE_HEADERS }',
  'stale diagnosis callers must fail explicitly with HTTP 410',
);

forbidText(
  diagnose,
  'sovereign diagnostic engine',
  'public runtime must not restore autonomous final-diagnosis authority',
);
forbidText(
  diagnose,
  'api.anthropic.com',
  'retired public route must not invoke a model provider',
);
forbidText(
  diagnose,
  'get_anthropic_key',
  'retired public route must not access the model secret boundary',
);

forbidText(
  leads,
  '/api/diagnose',
  'lead ingestion must not invoke final diagnosis',
);
forbidText(
  leads,
  'runAutodiagnosis',
  'lead ingestion must not contain an autonomous diagnostic workflow',
);
forbidText(
  leads,
  'auto_diagnosis',
  'lead ingestion must not persist AI-generated diagnosis state',
);

if (failures.length > 0) {
  console.error('❌ Diagnostic authority invariant failed');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('✅ Diagnostic authority: software/AI may assist, but public lead intake cannot create final diagnosis');
