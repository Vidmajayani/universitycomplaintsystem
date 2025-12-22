import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jxkbluyzqgmljvpgmrot.supabase.co'
// Use Vite's environment variable system (import.meta.env)
// The key must be prefixed with VITE_ to be exposed to the client
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseKey) {
  console.error('Supabase key is missing! Please set VITE_SUPABASE_KEY in your .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
  }
});

export { supabase }
