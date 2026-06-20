import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getAuthHeaders() {
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
