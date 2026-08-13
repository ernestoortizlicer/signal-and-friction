REVOKE EXECUTE ON FUNCTION public.promote_prospect_candidate(UUID, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_prospect_candidate(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.promote_prospect_candidate(UUID, TEXT, TEXT) TO service_role;
