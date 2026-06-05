import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type NexusSupabaseRequestClient = SupabaseClient<Database>;

export function hasSupabaseRequestClientConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function createNexusSupabaseRequestClient(
  accessToken: string | null | undefined,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const token = accessToken?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !token) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
