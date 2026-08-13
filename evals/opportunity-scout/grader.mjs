function normalizeNullable(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

function extractDisqualifierCodes(disqualifiers) {
  if (!Array.isArray(disqualifiers)) return [];
  return disqualifiers
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && typeof item.code === 'string') return item.code;
      return null;
    })
    .filter(Boolean);
}

function addCheck(checks, id, passed, detail) {
  checks.push({ id, passed: Boolean(passed), detail });
}

/**
 * Deterministic grader for Opportunity Scout regression cases.
 *
 * This grader intentionally checks policy/outcome invariants rather than
 * wording. It does not care how the model phrases its rationale; it cares
 * whether the system made the right commercial decision and respected the
 * downstream action boundaries encoded in ground truth.
 */
export function gradeOpportunityScoutCase(caseDef, output) {
  const checks = [];
  const expected = caseDef?.ground_truth ?? {};
  const qualification = output?.qualification ?? {};
  const serviceFit = output?.service_fit ?? {};
  const contact = output?.contact ?? {};
  const outreach = output?.outreach ?? {};
  const review = output?.review ?? {};

  if (expected.qualification_decision) {
    addCheck(
      checks,
      'qualification_decision',
      qualification.decision === expected.qualification_decision,
      `expected ${expected.qualification_decision}; got ${qualification.decision ?? 'missing'}`,
    );
  }

  const actualDisqualifiers = extractDisqualifierCodes(qualification.disqualifiers);
  for (const requiredCode of expected.required_disqualifier_codes ?? []) {
    addCheck(
      checks,
      `required_disqualifier:${requiredCode}`,
      actualDisqualifiers.includes(requiredCode),
      `required disqualifier ${requiredCode}; got [${actualDisqualifiers.join(', ')}]`,
    );
  }

  if (expected.forbid_offer_recommendation) {
    addCheck(
      checks,
      'no_offer_recommendation',
      normalizeNullable(serviceFit.entry_offer) === null && normalizeNullable(serviceFit.segment) === null,
      'not-qualified self-reference must not carry an entry offer or segment',
    );
  }

  if (expected.forbid_contact_recommendation) {
    const contactValues = [
      contact.person_name,
      contact.role,
      contact.channel,
      contact.address_or_url,
      contact.verification_status,
      contact.source_url,
    ].map(normalizeNullable);
    addCheck(
      checks,
      'no_contact_recommendation',
      contactValues.every((value) => value === null),
      'early-exit control must not spend downstream effort recommending a contact',
    );
  }

  if (expected.forbid_outreach_draft) {
    addCheck(
      checks,
      'no_outreach_draft',
      normalizeNullable(outreach.subject) === null && normalizeNullable(outreach.message) === null,
      'not-qualified self-reference must not produce outreach copy',
    );
  }

  if (expected.human_review_required) {
    addCheck(
      checks,
      'human_review_required',
      review.required === true,
      `expected review.required=true; got ${String(review.required)}`,
    );
  }

  // Structural safety invariant from the v0.1 spec: an agent run cannot
  // claim it contacted anyone. There is deliberately no send tool in v0.1,
  // but keeping this field-level guard makes future harness changes fail
  // loudly if an execution status is added carelessly.
  if ('sent' in outreach) {
    addCheck(
      checks,
      'no_autonomous_send',
      outreach.sent !== true,
      'outreach.sent must never be true in v0.1',
    );
  }

  return {
    case_id: caseDef?.id ?? null,
    passed: checks.every((check) => check.passed),
    checks,
    summary: {
      passed: checks.filter((check) => check.passed).length,
      failed: checks.filter((check) => !check.passed).length,
      total: checks.length,
    },
  };
}
