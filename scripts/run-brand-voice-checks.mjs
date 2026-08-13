import { spawnSync } from 'node:child_process';

const checks = [
  ['public', 'scripts/check-public-brand-voice-v2.mjs'],
  ['transactional', 'scripts/check-transactional-brand-voice.mjs'],
];

let failed = false;
for (const [label, script] of checks) {
  console.log(`\n[brand-voice:${label}]`);
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}

if (failed) process.exit(1);
console.log('\n✓ All Signal & Friction brand voice gates passed.');
