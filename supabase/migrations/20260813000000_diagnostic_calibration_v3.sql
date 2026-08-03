-- ════════════════════════════════════════════════════════════
-- MIGRATION: DIAGNOSTIC CALIBRATION SYSTEM v3
-- Migration ID: 20260813000000_diagnostic_calibration_v3
--
-- Replaces the training-case source used by /admin/learning's diagnostic-
-- craft mode. The prior mode (hyper_leap_sessions, see
-- 20260730000000_hyper_leap_sessions.sql and 20260801000000) graded
-- analysts against S&F's OWN past client deliverables — real diagnoses,
-- but not independent, and one of its four candidate cases (acme-corp)
-- was fictional demo data. Per the approved v3 spec: "Real prospects must
-- never be used as practice material... historical cases whose
-- conversion problems have already been diagnosed and resolved by elite
-- agencies or consultancies." hyper_leap_sessions is left untouched
-- (backward compatibility, real historical session data) — this is new,
-- additive schema for the new case pool and the new 10-stage workflow.
--
-- ── Case sourcing note ──
-- Every training_cases row below is a REAL, independently published case
-- with a cited source — found via web research this session, not
-- invented. Two of the six canonical mechanisms (trust_deficit,
-- identity_friction) have NO case yet: research did not surface a
-- real case meeting this system's provenance bar for those two. Per the
-- approved spec ("Do not populate the system with fabricated reference
-- cases merely to make the interface look complete"), those two are left
-- with zero cases rather than forced — the application layer must render
-- an honest empty state for them, not a fabricated one.
--
-- provenance is enforced structurally, not just by convention: the CHECK
-- constraint below requires every case to have EITHER a source_url OR a
-- source_note ("enough provenance to identify the source"), and at least
-- one populated observable-evidence field.
-- ════════════════════════════════════════════════════════════

-- ── 1. training_cases — the real, cited historical case bank ──

CREATE TABLE IF NOT EXISTS public.training_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    company_name TEXT, -- NULL when the original source withheld the company's identity (see source_note)

    source_type TEXT NOT NULL CHECK (source_type IN (
        'primary',              -- the diagnosing party's own published account
        'practitioner_account', -- firsthand account from someone at the company, publicly given but not a single canonical article
        'secondary_vendor',     -- a tool/service vendor's own customer case study — real, but has a structural incentive to look good
        'internal_sf_resolved'  -- Signal & Friction's own resolved client work, explicitly NOT "elite consultancy" — never claim otherwise
    )),
    source_url TEXT,
    source_note TEXT, -- provenance detail, caveats about source bias/withheld identity, etc. — always shown to the analyst, never hidden

    -- Observable material — everything visible before the verdict reveal.
    landing_page TEXT,
    pricing_page TEXT,
    onboarding_flow TEXT,
    checkout_flow TEXT,
    technical_findings TEXT,
    contextual_info TEXT,

    -- ── HIDDEN until verdict reveal (stage = 'verdict_revealed' or later
    -- on the attempt). Enforcement lives in src/lib/training-workflow.ts's
    -- visibleCaseFields() — every API response is built through that
    -- function, never a raw select * — but the naming here (reference_*)
    -- also documents the boundary at the schema level. ──
    reference_mechanism TEXT NOT NULL CHECK (reference_mechanism IN (
        'cognitive_load', 'trust_deficit', 'commitment_anxiety',
        'ordering_error', 'identity_friction', 'value_uncertainty'
    )),
    reference_mechanism_note TEXT, -- why this mechanism over a defensible alternative reading — real interpretive honesty, not false certainty
    reference_diagnosis TEXT NOT NULL,
    reference_recommendation TEXT NOT NULL,
    reference_result TEXT, -- measured outcome, when the source reports one

    is_published BOOLEAN NOT NULL DEFAULT false, -- draft cases (admin-authored, not yet reviewed) never reach the trainee-facing list

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT training_cases_has_provenance CHECK (source_url IS NOT NULL OR source_note IS NOT NULL),
    CONSTRAINT training_cases_has_observable_evidence CHECK (
        landing_page IS NOT NULL OR pricing_page IS NOT NULL OR onboarding_flow IS NOT NULL
        OR checkout_flow IS NOT NULL OR technical_findings IS NOT NULL OR contextual_info IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_training_cases_published ON public.training_cases(is_published);
CREATE INDEX IF NOT EXISTS idx_training_cases_mechanism ON public.training_cases(reference_mechanism);

ALTER TABLE public.training_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_training_cases ON public.training_cases
    FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── 2. training_attempts — the full 10-stage workflow, one row per attempt ──

CREATE TABLE IF NOT EXISTS public.training_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.training_cases(id),

    stage TEXT NOT NULL DEFAULT 'observation' CHECK (stage IN (
        'observation', 'evidence_review', 'hypothesis', 'counter_hypothesis',
        'socratic_challenge', 'revision', 'judgment', 'recommendation',
        'verdict_revealed', 'reflection_complete'
    )),

    -- Analyst-authored input, one column per stage (src/lib/training-
    -- workflow.ts's AttemptInputs — kept in exact correspondence).
    observation TEXT,
    evidence_notes TEXT,
    hypothesis_mechanism TEXT CHECK (hypothesis_mechanism IN (
        'cognitive_load', 'trust_deficit', 'commitment_anxiety',
        'ordering_error', 'identity_friction', 'value_uncertainty'
    )),
    hypothesis_reasoning TEXT,
    counter_hypothesis_mechanism TEXT CHECK (counter_hypothesis_mechanism IN (
        'cognitive_load', 'trust_deficit', 'commitment_anxiety',
        'ordering_error', 'identity_friction', 'value_uncertainty'
    )),
    counter_hypothesis_reasoning TEXT,
    -- [{question, response}, ...] — only ever written by the analyst's
    -- explicit save action, never by the Socratic AI call itself (that
    -- call is stateless; see supabase/functions/diagnostic-calibration-
    -- tutor). "Persist nothing unless the analyst explicitly saves."
    socratic_exchanges JSONB NOT NULL DEFAULT '[]',
    revision TEXT,
    judgment_mechanism TEXT CHECK (judgment_mechanism IN (
        'cognitive_load', 'trust_deficit', 'commitment_anxiety',
        'ordering_error', 'identity_friction', 'value_uncertainty'
    )),
    judgment_confidence TEXT CHECK (judgment_confidence IN ('low', 'moderate', 'high')),
    recommendation TEXT,
    uncertainty_notes TEXT,

    -- Set only at reveal, server-side, never analyst-editable.
    mechanism_correct BOOLEAN,
    -- NULL = agreed (n/a) or not yet assessed. Only meaningful when
    -- judgment_mechanism <> reference_mechanism. Assessed by the
    -- calibration step in diagnostic-calibration-tutor, using judgment
    -- (not a bare string match) — a disagreement can be defensible.
    disagreement_defensible BOOLEAN,
    evidence_discipline_pass BOOLEAN,
    -- {evidence_evaluation, hypothesis_generation, uncertainty_estimation,
    --  prioritization, differential_diagnosis, confidence_calibration,
    --  recommendation_quality} — each 1-5. The seven approved dimensions,
    -- generated once, at reveal, from the analyst's full staged reasoning
    -- trail compared against the now-unlocked reference material.
    calibration_profile JSONB,

    -- The 7 mandatory comparative-reflection Q&A pairs, analyst-authored,
    -- only writable once verdict_revealed_at is set.
    reflection_answers JSONB,

    verdict_revealed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ, -- set when stage reaches 'reflection_complete'

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_attempts_case ON public.training_attempts(case_id);
CREATE INDEX IF NOT EXISTS idx_training_attempts_stage ON public.training_attempts(stage);
CREATE INDEX IF NOT EXISTS idx_training_attempts_completed ON public.training_attempts(completed_at DESC);

ALTER TABLE public.training_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_training_attempts ON public.training_attempts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- Seed: real, cited historical cases (4 of 6 mechanisms covered — see
-- header note on why trust_deficit and identity_friction are absent).
-- ════════════════════════════════════════════════════════════

INSERT INTO public.training_cases (
    case_key, title, company_name, source_type, source_url, source_note,
    checkout_flow, technical_findings, contextual_info,
    reference_mechanism, reference_mechanism_note, reference_diagnosis, reference_recommendation, reference_result,
    is_published
) VALUES
(
    'uie-forced-registration-checkout',
    'The $300 Million Button',
    NULL,
    'primary',
    'https://archive.uie.com/brainsparks/2011/10/17/the-back-story-for-the-300-million-button/',
    'Original retailer name withheld by UIE (User Interface Engineering) in their own published account — described only as a large e-commerce retailer.',
    'Before completing a purchase, customers were required to authenticate: enter the email address used at signup, plus a password. Customers who could not recall their login — a large share of repeat customers, since account creation had often happened long before — were routed to a password-reset screen, which itself required the same forgotten email address. The reset flow then required receiving and clicking a link in an email that was frequently caught in spam filters.',
    'Usability lab sessions showed a consistent pattern: users repeatedly got stuck at the authentication screen immediately before checkout. Password-reset requests were running at roughly 160,000 per day; about 45% of visitors had multiple account registrations under different emails.',
    'Large e-commerce retailer, exact identity withheld in the original published account.',
    'commitment_anxiety',
    'Forced account creation asks for a bigger commitment (a persistent account relationship) before the visitor has completed — or sometimes even started — the purchase they came for. A defensible alternative reading is ordering_error (authentication demanded before value/purchase completion, i.e. the wrong step at the wrong time in the sequence). UIE''s own account frames the finding as the forced-authentication requirement itself, without naming a psychological mechanism — this mapping onto Signal & Friction''s taxonomy is an interpretation, not something UIE stated verbatim.',
    'Forcing account authentication before checkout blocked a large share of legitimate buyers — both first-time visitors unwilling to create an account before deciding to buy, and repeat customers who could no longer produce credentials created long before. The password-reset loop compounded the problem: it required the same forgotten information it was meant to recover.',
    'Remove the authentication requirement from the start of checkout. Add a guest-purchase path ("Continue as Guest") alongside — not instead of — the option to log in, with an explicit message that account creation is not required to complete a purchase.',
    'Sales increased by approximately $6,000,000 in the first week following the change, sustained afterward — extrapolated to roughly $300,000,000 over the following year. Password-reset requests dropped by about 80% in the first week.',
    true
),
(
    'expedia-company-field-address-mismatch',
    'Expedia — The Ambiguous "Company Name" Field',
    'Expedia',
    'practitioner_account',
    'https://www.themarysue.com/expedia-12-million-field-delete/',
    'Recounted publicly by Joe Megibow (then Expedia GM) at eMetrics Marketing Optimization Summit conference talks; corroborated across multiple independent secondary write-ups. No single canonical published article located — treat numeric specifics as a well-corroborated practitioner account, not a peer-reviewed figure.',
    'The booking form included a "Company Name" field alongside billing-address fields. The field''s purpose (intended for corporate/travel-agency bookings) was not clearly distinguished from the surrounding personal billing-address fields.',
    'Some customers, uncertain what the field meant, entered their bank''s name into it — then continued into the following address field with their bank''s address rather than their own. Card verification systems reject a transaction when the billing address doesn''t match the cardholder''s address on file, so these otherwise-valid transactions failed at payment.',
    'Large online travel-booking site, flight/hotel booking flow.',
    'cognitive_load',
    'The ambiguous field forced customers to interpret unclear intent mid-flow, and that interpretive burden produced a cascading data-entry error rather than a simple abandonment — a less typical presentation of Cognitive Load than pure choice-count overload, but it fits the mechanism''s core definition (interpretive/decision burden blocking completion). identity_friction is a weaker alternative reading (this wasn''t about the page failing to fit a segment) — rejected.',
    'A single ambiguous form field caused a subset of customers to misinterpret what was being asked, triggering a cascading data-entry error (bank name/address instead of their own) that caused otherwise-valid purchases to fail address verification at payment.',
    'Remove the "Company Name" field from the primary booking flow.',
    'Removing the field produced what was described as an immediate step-function increase in completed bookings, estimated at approximately $12,000,000 in additional profit per year.',
    true
),
(
    'ubisoft-for-honor-buy-now-scroll',
    'Ubisoft — "For Honor" Buy-Now Page',
    'Ubisoft',
    'secondary_vendor',
    'https://vwo.com/blog/ab-testing-examples/',
    'Published as a customer case study by VWO, the A/B-testing vendor whose tool was used to run this test — vendor case studies have a structural incentive to report favorable results. Treat the outcome number as vendor-reported, not independently audited.',
    NULL,
    NULL,
    'AAA video game pre-order/purchase page (France-based team); the purchase page required extensive scrolling before reaching the point of completing a purchase, with page length described as a source of drop-off before conversion. Tested via VWO''s A/B testing platform.',
    'ordering_error',
    'The purchase-relevant information and the ability to act on it were separated by unnecessary intervening content — the right elements existed but were sequenced/positioned such that completing the purchase required more navigation than the decision itself warranted. cognitive_load is a defensible alternative reading (more content = more to process) — coded primarily as an ordering/positioning problem because the vendor''s own framing emphasizes page length and scroll distance specifically.',
    'The buy-now page''s length and required scrolling distance between arrival and the purchase action itself introduced unnecessary friction between decision and completion.',
    'Simplify and shorten the page, reducing the scroll distance between page load and the purchase action.',
    'Reported conversion increase from 38% to 50% on the tested page, with a reported 12% increase in overall lead generation.',
    true
),
(
    'zalora-return-policy-visibility',
    'Zalora — Invisible Free-Returns Policy',
    'Zalora',
    'secondary_vendor',
    'https://vwo.com/blog/ab-testing-examples/',
    'Published as a customer case study by VWO, the A/B-testing vendor whose tool was used to run this test — treat the outcome number as vendor-reported, not independently audited.',
    NULL,
    NULL,
    'Fashion e-commerce, Asia-Pacific market. Product pages did not prominently surface Zalora''s existing free-returns and delivery policy — the policy existed but had low visibility at the point of decision.',
    'value_uncertainty',
    'Customers could not easily tell, at the point of deciding, that the risk of an unwanted purchase was mitigated by a free-returns policy — the value/risk tradeoff of buying was unclear even though the actual policy terms were favorable. trust_deficit is a defensible alternative reading (a return policy as a general trust signal, not just a value-clarity signal) — coded primarily as value_uncertainty since the missing information concerns the terms of the transaction itself.',
    'Customers were uncertain about the real cost/risk of a purchase because the free-returns and delivery policy — favorable to the customer — wasn''t visible at the point of the buying decision.',
    'Highlight the free-returns and delivery policy directly on product pages, at the point of decision.',
    'Reported 12.3% increase in checkout rate.',
    true
)
ON CONFLICT (case_key) DO NOTHING;

-- Verification query — expect 4 rows, all is_published = true, spanning
-- exactly 4 distinct reference_mechanism values (cognitive_load,
-- commitment_anxiety, ordering_error, value_uncertainty):
--   SELECT case_key, reference_mechanism, source_type, is_published
--   FROM public.training_cases ORDER BY case_key;
