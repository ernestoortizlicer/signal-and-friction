import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 🔴 CRITICAL: Validate that credentials are NOT placeholders
if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  if (typeof window !== 'undefined') {
    console.error('❌ FATAL: NEXT_PUBLIC_SUPABASE_URL is missing or placeholder. Database queries will fail.')
    document.body.innerHTML = `
      <div style="font-family: -apple-system; padding: 40px; text-align: center; background: #0A0908; color: #D4A853; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
        <h1>⚠️ Configuration Error</h1>
        <p>Supabase URL is not configured. Please set NEXT_PUBLIC_SUPABASE_URL environment variable.</p>
        <p style="font-size: 0.9em; opacity: 0.7;">This is a deployment issue, not a user error.</p>
      </div>
    `
  } else {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing or placeholder in environment configuration')
  }
}

if (!supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
  if (typeof window !== 'undefined') {
    console.error('❌ FATAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or placeholder. Database queries will fail.')
  } else {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or placeholder in environment configuration')
  }
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
