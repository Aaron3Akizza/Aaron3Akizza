import { createClient } from "@supabase/supabase-js";

// Vite exposes VITE_* env vars to the browser.
// NEXT_PUBLIC_* is a Next.js convention and does NOT work in Vite.
const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL    as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: true,   // picks up ?code= and #access_token= from email links
      },
    })
  : null;
