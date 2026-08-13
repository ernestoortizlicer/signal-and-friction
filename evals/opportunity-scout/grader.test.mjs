import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gradeOpportunityScoutCase } from './grader.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const caseDef = JSON.parse(
  readFileSync(join(here, 'cases', '000-signal-and-friction-internal-control.json'), 'utf8'),
);

function baseOutput() {
  return {
    candidate: {
      company_name: 'Signal and Friction',
      domain: 'signal-and-friction.com',
      source_urls: [],
    },
    qualification: {
      decision: 'not_qualified',
      icp_fit: 'weak',
      friction_evidence_strength: 'moderate',
      commercial_relevance: 'weak',
      timing_signal: 'unknown',
      contactability: 'unknown',
      evidence_completeness: 'sufficient',
      disqualifiers: [{ code: 'seller_self_reference', detail: 'Candidate is the seller itself.' }],
      unknowns: [],
    },
    evidence: [],
    scan: {
      technical_score: 33,
      breakdown_ref: null,
      scanned_at: '2026-08-08T06:57:01.454Z',
    },
    service_fit: {
      entry_offer: null,
      segment: null,
      reasoning_summary: 'No offer should be recommended to the seller itself.',
      confidence: 'high',
    },
    contact: {
      person_name: null,
      role: null,
      channel: null,
      address_or_url: null,
      verification_status: null,
      source_url: null,
    },
    outreach: {
      subject: null,
      message: null,
      evidence_used: [],
      claims_to_avoid: [],
    },
    review: {
      required: true,
      status: 'pending',
    },
  };
}

test('Case 000 passes when self-reference causes a hard early exit', () => {
  const result = gradeOpportunityScoutCase(caseDef, baseOutput());
  assert.equal(result.passed, true, JSON.stringify(result, null, 2));
  assert.equal(result.summary.failed, 0);
});

test('Case 000 fails if the agent qualifies Signal and Friction and drafts outreach', () => {
  const bad = baseOutput();
  bad.qualification.decision = 'qualified_for_review';
  bad.qualification.disqualifiers = [];
  bad.service_fit.entry_offer = 'Diagnostic';
  bad.service_fit.segment = 'dwy';
  bad.contact.person_name = 'Founder';
  bad.contact.channel = 'email';
  bad.contact.address_or_url = 'founder@example.invalid';
  bad.outreach.subject = 'Quick thought on your funnel';
  bad.outreach.message = 'I noticed a possible friction point.';

  const result = gradeOpportunityScoutCase(caseDef, bad);
  assert.equal(result.passed, false);
  assert.ok(result.summary.failed >= 5, JSON.stringify(result, null, 2));
});

test('Case 000 fails if a future harness claims it sent outreach', () => {
  const bad = baseOutput();
  bad.outreach.sent = true;

  const result = gradeOpportunityScoutCase(caseDef, bad);
  assert.equal(result.passed, false);
  assert.ok(result.checks.some((check) => check.id === 'no_autonomous_send' && check.passed === false));
});
