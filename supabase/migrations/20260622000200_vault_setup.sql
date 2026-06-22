-- ── SUPABASE VAULT — ANTHROPIC API KEY ENCRYPTION LAYER ──
-- The Vault extension uses AES-256-GCM (via pgsodium) — zero raw key
-- exposure in environment files or pg_settings.
--
-- RUNTIME SETUP (run once via Supabase SQL editor or psql — NOT in CI):
--   SELECT vault.create_secret(
--     'sk-ant-YOUR_KEY_HERE',      -- secret value
--     'ANTHROPIC_API_KEY',         -- friendly name
--     'Anthropic Claude API key — S&F production'  -- description
--   );
--
-- Retrieval in Edge Functions (Deno):
--   const { data } = await supabase.rpc('get_anthropic_key');
--   const key = data;
--
-- This migration only creates the retrieval helper — the secret itself
-- must be injected at runtime via the Supabase dashboard or CLI to
-- prevent raw key leakage in version control.

-- Ensure pgsodium / vault extensions are active (Supabase Pro has both by default)
-- If not yet enabled, run: CREATE EXTENSION IF NOT EXISTS vault;

-- Secure retrieval function — callable by service_role only
CREATE OR REPLACE FUNCTION public.get_anthropic_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret
    INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'ANTHROPIC_API_KEY'
   LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'ANTHROPIC_API_KEY not found in Vault. Run vault.create_secret() to initialize.';
  END IF;

  RETURN v_secret;
END;
$$;

-- Revoke public access; only service_role may call this function
REVOKE ALL ON FUNCTION public.get_anthropic_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_anthropic_key() TO service_role;
