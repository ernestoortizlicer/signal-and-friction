export type PublicClaimStatus = 'approved' | 'conditional' | 'forbidden';
export type PublicClaimKind = 'delivery' | 'method' | 'guarantee' | 'outcome' | 'market' | 'quantitative';

export interface PublicClaim {
  id: string;
  kind: PublicClaimKind;
  status: PublicClaimStatus;
  copy: string;
  authority: string;
  evidenceBoundary: string;
  reviewedAt: string;
  revisitWhen: string;
}

/**
 * Public-facing claims authority.
 *
 * This is intentionally small. Adding a marketing claim is not a copy-only
 * change: it needs a named authority, evidence boundary and revisit trigger.
 */
export const PUBLIC_CLAIMS = {
  async72h: {
    id: 'async-72h',
    kind: 'delivery',
    status: 'approved',
    copy: '72h async delivery.',
    authority: 'Commercial delivery policy',
    evidenceBoundary: 'Delivery-time commitment only; does not guarantee client outcome.',
    reviewedAt: '2026-08-13',
    revisitWhen: 'Measured delivery SLA materially changes.',
  },
  evidenceRanked: {
    id: 'evidence-ranked-diagnosis',
    kind: 'method',
    status: 'approved',
    copy: 'Measured signals, explicit hypotheses, uncertainty and a reviewable decision.',
    authority: 'Canonical Diagnosis model + reasoning registry',
    evidenceBoundary: 'Describes method, not correctness of any specific diagnosis.',
    reviewedAt: '2026-08-13',
    revisitWhen: 'Canonical Diagnosis model changes.',
  },
  abstention: {
    id: 'evidence-insufficient-abstention',
    kind: 'method',
    status: 'approved',
    copy: 'If the evidence is insufficient, we say so.',
    authority: 'Diagnostic Calibration / professional abstention contract',
    evidenceBoundary: 'The system may abstain; this is not a promise that every case yields one dominant mechanism.',
    reviewedAt: '2026-08-13',
    revisitWhen: 'Abstention policy changes.',
  },
  specificityGuarantee: {
    id: 'specificity-guarantee',
    kind: 'guarantee',
    status: 'approved',
    copy: "If it isn't specific to your product, you don't pay.",
    authority: 'Commercial guarantee / offer policy',
    evidenceBoundary: 'Guarantees specificity of work, not conversion, revenue or implementation outcome.',
    reviewedAt: '2026-08-13',
    revisitWhen: 'Guarantee or payment policy changes.',
  },
  fixedLift: {
    id: 'fixed-conversion-lift',
    kind: 'quantitative',
    status: 'forbidden',
    copy: 'Do not publish a fixed or generic conversion/revenue lift as an expected client outcome.',
    authority: 'Evidence policy',
    evidenceBoundary: 'Any projected impact must be case-specific, assumption-labelled and not presented as a guarantee.',
    reviewedAt: '2026-08-13',
    revisitWhen: 'A validated benchmark with a defensible target population and uncertainty model exists.',
  },
  revenueCausality: {
    id: 'revenue-causality-before-diagnosis',
    kind: 'outcome',
    status: 'forbidden',
    copy: 'Do not state that an observed friction is killing revenue before causal evidence supports that conclusion.',
    authority: 'Canonical evidence → observation → hypothesis → judgment boundary',
    evidenceBoundary: 'Observed/technical signals are not causal revenue proof.',
    reviewedAt: '2026-08-13',
    revisitWhen: 'A case-specific causal/economic analysis supports the claim.',
  },
  apacCompliance: {
    id: 'apac-compliance-capability',
    kind: 'market',
    status: 'forbidden',
    copy: 'Do not advertise JCB, PayNow, PDPA or other regional checks unless an implemented and evaluated workflow actually performs them.',
    authority: 'Capability Registry + tool/evidence policy',
    evidenceBoundary: 'A market route is commercial routing, not a capability claim.',
    reviewedAt: '2026-08-13',
    revisitWhen: 'A corresponding implemented capability has passed evals and production verification.',
  },
} satisfies Record<string, PublicClaim>;
