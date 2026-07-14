import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// A real Supabase project URL is always https://<20-char-lowercase-alphanumeric-ref>.supabase.co
// A real Supabase anon key is always a JWT (three base64url segments, starts with "eyJ").
// Checking for the literal substring 'placeholder' let 'https://dummy.supabase.co' and a
// bare 'dummy' key through silently — both are truthy and neither contains that word. This
// checks the actual SHAPE of a real credential instead of guessing at bad-value spellings,
// so it can't be defeated by the next placeholder someone happens to type.
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
  // Always throw — client or server, build or runtime. A silent fallback to a fake
  // client is worse than a hard crash: it fails invisibly, page by page, instead of
  // failing once, loudly, at the moment it's introduced.
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

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

export function getAuthHeaders(): Record<string, string> {
  let token = supabaseAnonKey ?? '';
  if (typeof window !== 'undefined') {
    const cookieMatch = document.cookie.match(/sf-admin-session=([^;]+)/);
    if (cookieMatch && cookieMatch[1]) {
      token = cookieMatch[1];
    }
  }
  return {
    apikey: supabaseAnonKey ?? '',
    Authorization: `Bearer ${token}`,
  };
}
