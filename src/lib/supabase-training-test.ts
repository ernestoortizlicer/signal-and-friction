import { createClient } from '@supabase/supabase-js';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * CLIENTE AISLADO — SOLO PROYECTO DE PRUEBA (signal-friction-batchc-test)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Este cliente NO lee de .env.local y NO comparte configuración con
 * src/lib/supabase.ts (que apunta al proyecto real / producción).
 *
 * Proyecto: yowwjipozswrwahvvevo — "signal-friction-batchc-test"
 * Uso exclusivo: App Training Flow v1, mientras Layer A/B y RD-11
 * permanezcan sin resolver. NO USAR para nada que toque producción.
 *
 * La clave incluida es la "anon" (legacy JWT), diseñada para ser pública —
 * su seguridad depende de los GRANT/REVOKE de columna y RLS ya verificados
 * en el proyecto, no de mantener esta clave en secreto.
 */

const TRAINING_TEST_SUPABASE_URL = 'https://yowwjipozswrwahvvevo.supabase.co';
const TRAINING_TEST_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvd3dqaXBvenN3cndhaHZ2ZXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTI1NDIsImV4cCI6MjEwMTY4ODU0Mn0.j4SuAGVhUmiFesCxOXH7yBVpYo7IZBqQPC-Q6D7AZzQ';

export const supabaseTrainingTest = createClient(
  TRAINING_TEST_SUPABASE_URL,
  TRAINING_TEST_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'sf-training-test-auth',
      flowType: 'pkce',
    },
  }
);
