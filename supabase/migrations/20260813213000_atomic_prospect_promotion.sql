-- Atomic Prospect -> Client -> Opportunity promotion
-- One command owns the state transition. The existing clients trigger remains
-- the canonical beta_project provisioner; the frontend must never insert a
-- second beta_project.

CREATE OR REPLACE FUNCTION public.promote_prospect_candidate(
  p_candidate_id UUID,
  p_founder_contact TEXT,
  p_contact_email TEXT
)
RETURNS TABLE(client_id UUID, project_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_candidate public.prospect_candidates%ROWTYPE;
  v_client_id UUID;
  v_project_id UUID;
BEGIN
  IF p_founder_contact IS NULL OR btrim(p_founder_contact) = '' THEN
    RAISE EXCEPTION 'Founder contact is required';
  END IF;

  IF p_contact_email IS NULL
     OR btrim(p_contact_email) = ''
     OR btrim(p_contact_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'A valid contact email is required';
  END IF;

  SELECT *
    INTO v_candidate
    FROM public.prospect_candidates
   WHERE id = p_candidate_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect candidate not found';
  END IF;

  -- Safe retry: a repeated request returns the already-created relationship
  -- instead of manufacturing another client/project pair.
  IF v_candidate.status = 'promoted' THEN
    IF v_candidate.promoted_client_id IS NULL THEN
      RAISE EXCEPTION 'Promoted candidate is missing promoted_client_id';
    END IF;

    SELECT bp.id
      INTO v_project_id
      FROM public.beta_projects bp
     WHERE bp.client_id = v_candidate.promoted_client_id;

    IF v_project_id IS NULL THEN
      RAISE EXCEPTION 'Promoted candidate is missing its beta_project';
    END IF;

    RETURN QUERY SELECT v_candidate.promoted_client_id, v_project_id;
    RETURN;
  END IF;

  -- Promotion is a human approval of an evidence-bearing scanned prospect.
  -- Other states must be resolved explicitly rather than silently advanced.
  IF v_candidate.status <> 'scanned' THEN
    RAISE EXCEPTION 'Only scanned candidates can be promoted (current status: %)', v_candidate.status;
  END IF;

  INSERT INTO public.clients (
    company_name,
    contact_name,
    contact_email,
    contact_profile_url,
    industry,
    estimated_mrr,
    source_platform
  )
  VALUES (
    COALESCE(NULLIF(btrim(v_candidate.company_name), ''), v_candidate.domain),
    btrim(p_founder_contact),
    lower(btrim(p_contact_email)),
    v_candidate.url,
    'Unknown',
    0,
    'prospecting_seed_list'
  )
  RETURNING id INTO v_client_id;

  -- trigger_client_created is the one beta_project provisioning authority.
  -- Because it runs in this same transaction, absence here is a hard failure
  -- and rolls the entire promotion back.
  SELECT bp.id
    INTO v_project_id
    FROM public.beta_projects bp
   WHERE bp.client_id = v_client_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Client provisioning did not create a beta_project';
  END IF;

  UPDATE public.prospect_candidates
     SET status = 'promoted',
         founder_contact = btrim(p_founder_contact),
         promoted_client_id = v_client_id
   WHERE id = p_candidate_id;

  RETURN QUERY SELECT v_client_id, v_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_prospect_candidate(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_prospect_candidate(UUID, TEXT, TEXT) TO authenticated;
