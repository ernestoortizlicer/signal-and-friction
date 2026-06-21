import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente de SERVIDOR. Usa la service_role key, que bypassa RLS.
// NUNCA importar esto en un componente de cliente ni en código que llegue al navegador.
// La service_role key solo vive en variables de entorno del servidor.

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.'
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
