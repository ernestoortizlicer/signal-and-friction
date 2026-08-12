import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Environment values are configuration tokens, not user input. Normalize only
// surrounding whitespace so a dashboard copy/paste newline cannot turn a valid
// credential into an opaque build failure. Quotes or other content remain invalid.
const supabaseUrl = rawSupabaseUrl?.trim()
const supabaseAnonKey = rawSupabaseAnonKey?.trim()

// A real Supabase project URL is always https://<20-char-lowercase-alphanumeric-ref>.supabase.co
// A legacy Supabase anon key is a JWT (three base64url segments, starts with "eyJ").
// This project still uses the legacy client variable during the current release gate;
// publishable-key migration is a separate change.
const VALID_SUPABASE_URL = /^https:\/\/[a-z0-9]{20}\.supabase\.co$/
const VALID_SUPABASE_ANON_KEY = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

function fatalConfigError(message: string): never {
  if (typeof window !== 'undefined') {
    console.error(`❌ FATAL: ${message}`)
    document.body.innerHTML = `
      <div style="font-family: -apple-system; padding: 40px; text-align: center; background: #0A0908; color: #D4A853; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
        <h1>⚠️ Configuration Error</h1>
        <p>${message}</p>
        <p style="font-size: 0.9em; opacity: 0.7;">This is a deployment issue, not a user error.</p>
      </div>
    `
  }
  throw new Error(`Supabase config invalid: ${message}`)
}

if (!supabaseUrl || !VALID_SUPABASE_URL.test(supabaseUrl)) {
  fatalConfigError(
    `NEXT_PUBLIC_SUPABASE_URL is missing or not a real Supabase project URL (got: "${supabaseUrl ?? '(unset)'}"). ` +
    `Expected https://<project-ref>.supabase.co. Refusing to build a client against a placeholder value.`
  )
}

if (!supabaseAnonKey || !VALID_SUPABASE_ANON_KEY.test(supabaseAnonKey)) {
  fatalConfigError(
    `NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or not a real Supabase anon key (expected a JWT). ` +
    `Refusing to build a client against a placeholder value.`
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getAuthHeaders(): Record<string, string> {
  let token = supabaseAnonKey;
  if (typeof window !== 'undefined') {
    const cookieMatch = document.cookie.match(/sf-admin-session=([^;]+)/);
    if (cookieMatch && cookieMatch[1]) {
      token = cookieMatch[1];
    }
  }
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
  };
}
