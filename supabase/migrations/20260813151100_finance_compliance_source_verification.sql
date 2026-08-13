-- Compliance source records are not trusted merely because a URL was entered.
ALTER TABLE public.finance_compliance_sources
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'recorded',
  ADD COLUMN IF NOT EXISTS verified_by text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_note text;

DO $$ BEGIN
  ALTER TABLE public.finance_compliance_sources ADD CONSTRAINT finance_compliance_source_verification_check
    CHECK (verification_status IN ('recorded','verified','revoked'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.verify_finance_compliance_source(
  p_source_id uuid,
  p_note text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF NOT public.finance_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.finance_compliance_sources
  SET verification_status='verified',
      verified_by=COALESCE(auth.jwt()->>'email',auth.uid()::text),
      verified_at=now(),
      verification_note=NULLIF(btrim(p_note),'')
  WHERE id=p_source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.verify_finance_compliance_source(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verify_finance_compliance_source(uuid,text) TO authenticated;
