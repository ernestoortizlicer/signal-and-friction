-- ═════════════════════════════════════════════════════════════════════════════
-- FINANCE OS v2.1 — multi-jurisdiction / digital-nomad foundation
-- Migration ID: 20260813160000_finance_jurisdiction_stack
--
-- This migration deliberately does NOT encode country tax rules. It adds the
-- structure required to represent several simultaneous jurisdictional roles
-- without pretending that one profile has one legally decisive country.
-- Country packs remain evidence-driven and versioned separately.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.finance_jurisdiction_packs (
  jurisdiction_code text PRIMARY KEY,
  display_name text NOT NULL,
  pack_version integer NOT NULL DEFAULT 1 CHECK (pack_version > 0),
  coverage_status text NOT NULL DEFAULT 'research' CHECK (
    coverage_status IN ('research','beta','active','retired')
  ),
  default_currency text,
  default_locale text,
  coverage_topics text[] NOT NULL DEFAULT ARRAY[]::text[],
  source_policy_version text NOT NULL DEFAULT 'official-source-first-v1',
  last_reviewed_at timestamptz,
  next_review_due_at timestamptz,
  reviewed_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jurisdiction_code = upper(jurisdiction_code)),
  CHECK (length(jurisdiction_code) BETWEEN 2 AND 8)
);
ALTER TABLE public.finance_jurisdiction_packs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.finance_profile_jurisdictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.finance_profiles(id) ON DELETE CASCADE,
  jurisdiction_code text NOT NULL,
  role text NOT NULL CHECK (role IN (
    'business_registration',
    'tax_residency',
    'vat_gst',
    'payroll_social',
    'personal_residency',
    'banking',
    'work_authorization',
    'permanent_establishment_review',
    'other'
  )),
  status text NOT NULL DEFAULT 'unknown' CHECK (
    status IN ('unknown','self_reported','authority_verified','professional_verified')
  ),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  source_id uuid REFERENCES public.finance_compliance_sources(id) ON DELETE SET NULL,
  evidence_ref text,
  requires_professional_review boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jurisdiction_code = upper(jurisdiction_code)),
  CHECK (length(jurisdiction_code) BETWEEN 2 AND 8),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CHECK (
    status NOT IN ('authority_verified','professional_verified')
    OR source_id IS NOT NULL
    OR evidence_ref IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_profile_jurisdiction_period
  ON public.finance_profile_jurisdictions(profile_id,jurisdiction_code,role,effective_from);
CREATE INDEX IF NOT EXISTS idx_finance_profile_jurisdictions_active
  ON public.finance_profile_jurisdictions(profile_id,role,effective_from,effective_to);
ALTER TABLE public.finance_profile_jurisdictions ENABLE ROW LEVEL SECURITY;

-- Backfill the old single-jurisdiction field when it was explicitly populated.
-- Current NULL/unknown profiles remain unknown; we do not infer residency.
INSERT INTO public.finance_profile_jurisdictions(
  profile_id,jurisdiction_code,role,status,effective_from,requires_professional_review,notes
)
SELECT id,upper(jurisdiction_code),'business_registration',
       CASE WHEN jurisdiction_status='professional_verified' THEN 'professional_verified'
            WHEN jurisdiction_status='self_reported' THEN 'self_reported'
            ELSE 'unknown' END,
       effective_from,true,'Backfilled from finance_profiles.jurisdiction_code; role requires human confirmation.'
FROM public.finance_profiles
WHERE jurisdiction_code IS NOT NULL
ON CONFLICT(profile_id,jurisdiction_code,role,effective_from) DO NOTHING;

-- Readable by the finance admin in browser contexts; mutations stay behind
-- the admin-gated server API/service-role boundary.
CREATE POLICY finance_admin_read ON public.finance_jurisdiction_packs
  FOR SELECT TO authenticated USING (public.finance_is_admin());
CREATE POLICY finance_admin_read ON public.finance_profile_jurisdictions
  FOR SELECT TO authenticated USING (public.finance_is_admin());

REVOKE ALL ON public.finance_jurisdiction_packs,public.finance_profile_jurisdictions FROM anon;
REVOKE INSERT,UPDATE,DELETE ON public.finance_jurisdiction_packs,public.finance_profile_jurisdictions FROM authenticated;
GRANT SELECT ON public.finance_jurisdiction_packs,public.finance_profile_jurisdictions TO authenticated;

COMMENT ON COLUMN public.finance_profiles.jurisdiction_code IS
  'Compatibility field only. Finance OS v2.1 jurisdiction truth is finance_profile_jurisdictions; never infer tax residence from this field alone.';
COMMENT ON TABLE public.finance_jurisdiction_packs IS
  'Versioned metadata for supported jurisdiction packs. A row does not itself establish any user legal/tax status.';
COMMENT ON TABLE public.finance_profile_jurisdictions IS
  'Time-bounded, role-specific jurisdiction assertions for business/personal/nomad finance. Status is evidence-labelled; no row alone determines tax residence.';
