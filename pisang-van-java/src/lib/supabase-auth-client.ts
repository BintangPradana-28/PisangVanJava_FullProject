import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client authenticated via the Auth.js Jose JWT Bridge.
 * This perfectly enforces Postgres Row Level Security (RLS) on Storage buckets.
 */
export function createSupabaseAuthClient(supabaseAccessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseAccessToken}`,
      },
    },
  });
}
