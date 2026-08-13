-- ═════════════════════════════════════════════════════════════════════════════
-- TRAINING HARDENED RECONCILIATION — canonical repository contract
-- Migration ID: 20260813125000_training_hardened_reconciliation
--
-- WHY THIS EXISTS
-- Production acquired a materially stronger Training integrity contract during
-- the 2026-08-07/08 hardening batches before those SQL changes were represented
-- in GitHub. The older 20260813000000_diagnostic_calibration_v3 migration is the
-- pedagogical base; this migration upgrades that base to the production-grade
-- contract BEFORE the 20260813130000+ reveal/completion/freeze hardening files.
--
-- Design invariant: practice calibration and certification evidence are separate.
-- A case is certification-eligible only when its reference is independently
-- sourced, rights + independence are currently verified for the exact version /
-- content hash, and the answer key is locked. Repeated revealed attempts never
-- become fresh gate evidence.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── 1. Professional disposition / abstention ────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.case_disposition AS ENUM (
    'behavioral_diagnosis',
    'technical_blocker',
    'mixed_condition',
    'insufficient_evidence',
    'scope_change_required'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.training_cases
  ADD COLUMN IF NOT EXISTS reference_disposition public.case_disposition
    NOT NULL DEFAULT 'behavioral_diagnosis',
  ADD COLUMN IF NOT EXISTS reference_source text NOT NULL DEFAULT 'operator_authored',
  ADD COLUMN IF NOT EXISTS gate_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reference_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source_owner text,
  ADD COLUMN IF NOT EXISTS rights_basis text,
  ADD COLUMN IF NOT EXISTS exclusion_reason text,
  ADD COLUMN IF NOT EXISTS content_hash text;

ALTER TABLE public.training_cases ALTER COLUMN reference_mechanism DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.training_cases ADD CONSTRAINT training_cases_reference_source_check
    CHECK (reference_source IN ('operator_authored','independent_hidden'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.training_cases ADD CONSTRAINT training_cases_rights_basis_check
    CHECK (rights_basis IS NULL OR rights_basis IN
      ('owned_original','synthetic_constructed','licensed','public_domain','undocumented'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.training_cases ADD CONSTRAINT training_cases_mechanism_iff_behavioral
    CHECK (
      (reference_disposition IN ('behavioral_diagnosis','mixed_condition') AND reference_mechanism IS NOT NULL)
      OR
      (reference_disposition NOT IN ('behavioral_diagnosis','mixed_condition') AND reference_mechanism IS NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.training_attempts
  ADD COLUMN IF NOT EXISTS analyst_id uuid,
  ADD COLUMN IF NOT EXISTS judgment_disposition public.case_disposition,
  ADD COLUMN IF NOT EXISTS disposition_correct boolean,
  ADD COLUMN IF NOT EXISTS is_gate_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ref_disposition_snapshot public.case_disposition,
  ADD COLUMN IF NOT EXISTS ref_mechanism_snapshot text,
  ADD COLUMN IF NOT EXISTS adjudication_id uuid;

ALTER TABLE public.training_attempts ALTER COLUMN judgment_mechanism DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.training_attempts ADD CONSTRAINT training_attempts_mechanism_iff_behavioral
    CHECK (
      judgment_disposition IS NULL
      OR (judgment_disposition IN ('behavioral_diagnosis','mixed_condition') AND judgment_mechanism IS NOT NULL)
      OR (judgment_disposition NOT IN ('behavioral_diagnosis','mixed_condition') AND judgment_mechanism IS NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_eligible_attempt_per_analyst_case
  ON public.training_attempts(analyst_id, case_id) WHERE is_gate_eligible;

-- ── 2. Independent adjudication boundary ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_adjudications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.training_attempts(id) ON DELETE CASCADE,
  adjudicated_at timestamptz NOT NULL DEFAULT now(),
  challenge text NOT NULL,
  operator_response text,
  outcome text NOT NULL CHECK (outcome IN ('defensible','not_defensible')),
  model text NOT NULL,
  prompt_version text NOT NULL
);
ALTER TABLE public.training_adjudications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE public.training_attempts
    ADD CONSTRAINT training_attempts_adjudication_id_fkey
    FOREIGN KEY (adjudication_id) REFERENCES public.training_adjudications(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.training_attempts
    ADD CONSTRAINT defensible_requires_adjudication
    CHECK (disagreement_defensible IS NOT TRUE OR adjudication_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_adjudication_boundary()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.disagreement_defensible IS TRUE THEN
    IF NEW.adjudication_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM public.training_adjudications a
         WHERE a.id = NEW.adjudication_id
           AND a.attempt_id = NEW.id
           AND a.outcome = 'defensible'
       ) THEN
      RAISE EXCEPTION 'disagreement_defensible=true requires a linked defensible adjudication'
        USING ERRCODE='integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_b_adjudication_boundary ON public.training_attempts;
CREATE TRIGGER trg_b_adjudication_boundary
  BEFORE INSERT OR UPDATE ON public.training_attempts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_adjudication_boundary();

-- ── 3. Case versioning, rights and independence evidence ────────────────────
CREATE OR REPLACE FUNCTION public.case_material_hash(tc public.training_cases)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  SELECT encode(extensions.digest(convert_to(jsonb_build_array(
    tc.landing_page, tc.pricing_page, tc.onboarding_flow, tc.checkout_flow,
    tc.technical_findings, tc.contextual_info, tc.reference_disposition::text,
    tc.reference_mechanism, tc.reference_diagnosis, tc.reference_recommendation,
    tc.reference_result, tc.rights_basis, tc.source_owner)::text, 'UTF8'),'sha256'),'hex');
$$;

UPDATE public.training_cases
SET content_hash = public.case_material_hash(training_cases.*)
WHERE content_hash IS NULL;
ALTER TABLE public.training_cases ALTER COLUMN content_hash SET NOT NULL;

CREATE OR REPLACE FUNCTION public.manage_case_version_and_hash()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE new_hash text; old_hash text;
BEGIN
  new_hash := public.case_material_hash(NEW);
  IF TG_OP='INSERT' THEN
    NEW.version := 1;
    NEW.content_hash := new_hash;
    RETURN NEW;
  END IF;
  old_hash := public.case_material_hash(OLD);
  IF new_hash IS DISTINCT FROM old_hash THEN
    NEW.version := OLD.version + 1;
    NEW.content_hash := new_hash;
    NEW.reference_locked := false;
  ELSE
    NEW.version := OLD.version;
    NEW.content_hash := old_hash;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_manage_case_version ON public.training_cases;
CREATE TRIGGER trg_manage_case_version
  BEFORE INSERT OR UPDATE ON public.training_cases
  FOR EACH ROW EXECUTE FUNCTION public.manage_case_version_and_hash();

CREATE TABLE IF NOT EXISTS public.case_verification (
  verification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.training_cases(id),
  case_version integer NOT NULL,
  verification_type text NOT NULL CHECK (verification_type IN ('rights','independence')),
  verification_method text NOT NULL,
  evidence_ref text,
  verifier_identity text NOT NULL,
  verifier_is_analyst boolean NOT NULL DEFAULT false,
  verification_result text NOT NULL CHECK (verification_result IN ('pass','fail','revoked')),
  verified_at timestamptz NOT NULL DEFAULT now(),
  supersedes_verification_id uuid REFERENCES public.case_verification(verification_id),
  verified_content_hash text,
  scope_note text,
  CONSTRAINT cv_pass_requires_evidence CHECK (verification_result <> 'pass' OR evidence_ref IS NOT NULL),
  CONSTRAINT cv_pass_requires_independent_verifier CHECK (verification_result <> 'pass' OR verifier_is_analyst = false)
);
ALTER TABLE public.case_verification ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS uq_supersedes_once
  ON public.case_verification(supersedes_verification_id)
  WHERE supersedes_verification_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.issue_verification(
  p_case_id uuid, p_type text, p_method text, p_evidence_ref text,
  p_verifier_identity text, p_verifier_is_analyst boolean, p_result text,
  p_supersedes uuid DEFAULT NULL, p_scope text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_version integer; v_hash text; new_id uuid; s record;
BEGIN
  SELECT version, content_hash INTO v_version, v_hash
  FROM public.training_cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown case'; END IF;
  IF v_hash IS NULL THEN RAISE EXCEPTION 'case has no content_hash; cannot issue verification'; END IF;
  IF p_type NOT IN ('rights','independence') THEN RAISE EXCEPTION 'bad verification_type'; END IF;
  IF p_result NOT IN ('pass','fail','revoked') THEN RAISE EXCEPTION 'bad result'; END IF;
  IF p_result='pass' THEN
    IF p_verifier_is_analyst THEN RAISE EXCEPTION 'independence violated: verifier is the analyst'; END IF;
    IF p_evidence_ref IS NULL OR length(btrim(p_evidence_ref))=0 THEN RAISE EXCEPTION 'pass requires non-empty evidence_ref'; END IF;
    IF p_method IS NULL OR length(btrim(p_method))=0 THEN RAISE EXCEPTION 'pass requires non-empty method'; END IF;
    IF p_verifier_identity IS NULL OR length(btrim(p_verifier_identity))=0 THEN RAISE EXCEPTION 'pass requires non-empty verifier_identity'; END IF;
  END IF;
  IF p_supersedes IS NOT NULL THEN
    SELECT case_id, case_version, verification_type INTO s
    FROM public.case_verification WHERE verification_id = p_supersedes;
    IF NOT FOUND THEN RAISE EXCEPTION 'supersedes target not found'; END IF;
    IF s.case_id <> p_case_id OR s.case_version <> v_version OR s.verification_type <> p_type THEN
      RAISE EXCEPTION 'supersedes target must match case/version/type';
    END IF;
  END IF;
  INSERT INTO public.case_verification(
    case_id,case_version,verification_type,verification_method,evidence_ref,
    verifier_identity,verifier_is_analyst,verification_result,
    supersedes_verification_id,verified_content_hash,scope_note
  ) VALUES (
    p_case_id,v_version,p_type,p_method,p_evidence_ref,p_verifier_identity,
    p_verifier_is_analyst,p_result,p_supersedes,v_hash,p_scope
  ) RETURNING verification_id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE VIEW public.v_case_verification_current AS
WITH terminal AS (
  SELECT cv.case_id, cv.verification_type, cv.verification_result
  FROM public.case_verification cv
  JOIN public.training_cases tc
    ON tc.id=cv.case_id
   AND cv.case_version=tc.version
   AND cv.verified_content_hash=tc.content_hash
  WHERE NOT EXISTS (
    SELECT 1 FROM public.case_verification s
    WHERE s.supersedes_verification_id=cv.verification_id
  )
)
SELECT case_id, verification_type,
       (count(*)=1 AND bool_and(verification_result='pass')) AS verified_current
FROM terminal GROUP BY case_id, verification_type;

CREATE OR REPLACE VIEW public.v_case_eligibility_derived AS
SELECT tc.id AS case_id, tc.case_key, tc.version, tc.reference_disposition,
       tc.reference_mechanism, tc.reference_source, tc.rights_basis,
       (tc.reference_source='independent_hidden'
        AND tc.reference_locked=true
        AND tc.rights_basis IN ('owned_original','synthetic_constructed')
        AND COALESCE((SELECT verified_current FROM public.v_case_verification_current v WHERE v.case_id=tc.id AND v.verification_type='rights'),false)
        AND COALESCE((SELECT verified_current FROM public.v_case_verification_current v WHERE v.case_id=tc.id AND v.verification_type='independence'),false)
       ) AS derived_eligible,
       COALESCE((SELECT verified_current FROM public.v_case_verification_current v WHERE v.case_id=tc.id AND v.verification_type='rights'),false) AS rights_verified_current,
       COALESCE((SELECT verified_current FROM public.v_case_verification_current v WHERE v.case_id=tc.id AND v.verification_type='independence'),false) AS independence_verified_current
FROM public.training_cases tc;

CREATE OR REPLACE VIEW public.v_bank_readiness AS
WITH elig AS (SELECT * FROM public.v_case_eligibility_derived WHERE derived_eligible)
SELECT (SELECT count(*) FROM elig) AS eligible_cases,
  (SELECT count(DISTINCT reference_mechanism) FROM elig WHERE reference_mechanism IS NOT NULL) AS mechanisms_covered,
  (SELECT COALESCE(min(c),0) FROM (SELECT count(*) c FROM elig WHERE reference_mechanism IS NOT NULL GROUP BY reference_mechanism) x) AS min_per_mechanism,
  (SELECT count(*) FROM elig WHERE reference_disposition IN ('technical_blocker','insufficient_evidence','scope_change_required')) AS eligible_abstention_cases,
  COALESCE((SELECT bool_and(reference_source='independent_hidden') FROM elig),false) AS provenance_allowed,
  COALESCE((SELECT bool_and(rights_verified_current) FROM elig),false) AS rights_ok,
  COALESCE((SELECT bool_and(independence_verified_current) FROM elig),false) AS independence_ok,
  (SELECT count(*) FROM elig)>=30 AS cases_ok,
  (SELECT count(DISTINCT reference_mechanism) FROM elig WHERE reference_mechanism IS NOT NULL)=6 AS six_mechanisms_ok,
  (SELECT COALESCE(min(c),0) FROM (SELECT count(*) c FROM elig WHERE reference_mechanism IS NOT NULL GROUP BY reference_mechanism) x)>=3 AS per_mechanism_ok,
  (SELECT count(*) FROM elig WHERE reference_disposition IN ('technical_blocker','insufficient_evidence','scope_change_required'))>=8 AS abstention_ok;

-- ── 4. Answer-key revision audit / locking ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.answer_key_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.training_cases(id),
  old_disposition public.case_disposition,
  new_disposition public.case_disposition,
  old_mechanism text,
  new_mechanism text,
  revised_at timestamptz NOT NULL DEFAULT now(),
  revised_by text NOT NULL
);
ALTER TABLE public.answer_key_revisions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.revise_answer_key(
  p_case_id uuid, p_disposition public.case_disposition, p_mechanism text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE revealed int; locked boolean;
BEGIN
  SELECT reference_locked INTO locked FROM public.training_cases WHERE id=p_case_id;
  IF locked IS TRUE THEN
    RAISE EXCEPTION 'reference_locked: case is independently certified; use explicit unlock/re-certification lifecycle';
  END IF;
  SELECT count(*) INTO revealed FROM public.training_attempts
    WHERE case_id=p_case_id AND verdict_revealed_at IS NOT NULL;
  IF revealed > 0 THEN RAISE EXCEPTION 'answer_key_locked: % revealed attempt(s) exist', revealed; END IF;
  IF p_disposition IN ('behavioral_diagnosis','mixed_condition') AND p_mechanism IS NULL THEN
    RAISE EXCEPTION 'mechanism required for behavioral/mixed disposition';
  END IF;
  IF p_disposition NOT IN ('behavioral_diagnosis','mixed_condition') AND p_mechanism IS NOT NULL THEN
    RAISE EXCEPTION 'mechanism must be null for abstention disposition';
  END IF;
  INSERT INTO public.answer_key_revisions(
    case_id, old_disposition, new_disposition, old_mechanism, new_mechanism, revised_by
  ) SELECT id, reference_disposition, p_disposition, reference_mechanism, p_mechanism,
           COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', 'role:'||current_user)
    FROM public.training_cases WHERE id=p_case_id;
  UPDATE public.training_cases
  SET reference_disposition=p_disposition, reference_mechanism=p_mechanism, updated_at=now()
  WHERE id=p_case_id;
END $$;

-- ── 5. Gate scoring — completed reflection only ─────────────────────────────
CREATE OR REPLACE VIEW public.v_training_attempt_scores AS
SELECT a.id, a.case_id, a.analyst_id, tc.case_key, a.completed_at, a.verdict_revealed_at,
       a.ref_disposition_snapshot AS reference_disposition,
       a.judgment_disposition,
       a.ref_mechanism_snapshot AS reference_mechanism,
       a.judgment_mechanism, a.judgment_confidence,
       (a.ref_disposition_snapshot <> ALL (ARRAY['behavioral_diagnosis','mixed_condition']::public.case_disposition[])) AS is_abstention_case,
       a.disposition_correct, a.mechanism_correct,
       (a.disposition_correct AND a.mechanism_correct) AS scored_correct,
       a.disagreement_defensible,
       ((a.disposition_correct AND a.mechanism_correct) OR a.disagreement_defensible) AS passed,
       (((a.disposition_correct AND a.mechanism_correct) IS NOT TRUE) AND (a.disagreement_defensible IS TRUE)) AS rescued_by_disagreement,
       ((a.ref_disposition_snapshot <> ALL (ARRAY['behavioral_diagnosis','mixed_condition']::public.case_disposition[])) AND (a.judgment_mechanism IS NOT NULL)) AS forced_mechanism_critical_failure
FROM public.training_attempts a
JOIN public.training_cases tc ON tc.id=a.case_id
WHERE a.is_gate_eligible=true;

CREATE OR REPLACE FUNCTION public.gate_track_a(p_window integer DEFAULT 40)
RETURNS TABLE(
  attempts_scored bigint, passes bigint, rescued bigint, pct_rescued numeric,
  a4_cap_ok boolean, abstention_seen bigint, abstention_correct bigint,
  a3_ok boolean, mechanisms_covered bigint, critical_failures bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  WITH w AS (
    SELECT * FROM public.v_training_attempt_scores
    WHERE completed_at IS NOT NULL AND verdict_revealed_at IS NOT NULL
      AND analyst_id = auth.uid()
    ORDER BY completed_at DESC LIMIT p_window
  )
  SELECT count(*), count(*) FILTER (WHERE passed),
    count(*) FILTER (WHERE rescued_by_disagreement),
    round(100.0*count(*) FILTER (WHERE rescued_by_disagreement)/NULLIF(count(*) FILTER (WHERE passed),0),1),
    COALESCE(100.0*count(*) FILTER (WHERE rescued_by_disagreement)/NULLIF(count(*) FILTER (WHERE passed),0),0) <= 20.0,
    count(*) FILTER (WHERE is_abstention_case),
    count(*) FILTER (WHERE is_abstention_case AND scored_correct),
    count(*) FILTER (WHERE is_abstention_case)>=8 AND count(*) FILTER (WHERE is_abstention_case AND scored_correct)>=6,
    count(DISTINCT reference_mechanism) FILTER (WHERE reference_mechanism IS NOT NULL),
    count(*) FILTER (WHERE forced_mechanism_critical_failure)
  FROM w;
$$;

-- ── 6. Least-privilege database surface ─────────────────────────────────────
DROP POLICY IF EXISTS admin_all_training_cases ON public.training_cases;
DROP POLICY IF EXISTS admin_all_training_attempts ON public.training_attempts;
DROP POLICY IF EXISTS tc_select ON public.training_cases;
DROP POLICY IF EXISTS tc_insert ON public.training_cases;
DROP POLICY IF EXISTS tc_update ON public.training_cases;
DROP POLICY IF EXISTS ta_select ON public.training_attempts;
DROP POLICY IF EXISTS ta_insert ON public.training_attempts;
DROP POLICY IF EXISTS ta_update ON public.training_attempts;
DROP POLICY IF EXISTS read_adjudications ON public.training_adjudications;

CREATE POLICY tc_select ON public.training_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY tc_insert ON public.training_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY tc_update ON public.training_cases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ta_select ON public.training_attempts FOR SELECT TO authenticated USING (analyst_id=auth.uid());
CREATE POLICY ta_insert ON public.training_attempts FOR INSERT TO authenticated WITH CHECK (analyst_id=auth.uid());
CREATE POLICY ta_update ON public.training_attempts FOR UPDATE TO authenticated USING (analyst_id=auth.uid()) WITH CHECK (analyst_id=auth.uid());
CREATE POLICY read_adjudications ON public.training_adjudications FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.case_verification FROM public, anon, authenticated;
REVOKE ALL ON public.answer_key_revisions FROM public, anon, authenticated;
REVOKE ALL ON public.training_adjudications FROM authenticated, anon;
GRANT SELECT ON public.training_adjudications TO authenticated;

REVOKE ALL ON FUNCTION public.issue_verification(uuid,text,text,text,text,boolean,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_verification(uuid,text,text,text,text,boolean,text,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.revise_answer_key(uuid, public.case_disposition, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revise_answer_key(uuid, public.case_disposition, text) TO service_role;
REVOKE ALL ON FUNCTION public.gate_track_a(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gate_track_a(integer) TO authenticated;

REVOKE ALL ON public.v_training_attempt_scores FROM authenticated, anon;
REVOKE ALL ON public.v_bank_readiness FROM authenticated, anon;
GRANT SELECT ON public.v_training_attempt_scores, public.v_bank_readiness TO service_role;

-- The authoritative finalize function is deliberately defined by the later
-- 20260813131000 migration, after this schema contract exists.