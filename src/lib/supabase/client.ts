import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type NexusSupabaseClient = SupabaseClient<Database>;

let client: NexusSupabaseClient | undefined;

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    supabaseAnonKey,
    supabaseUrl,
  };
}

export function createNexusSupabaseClient() {
  const { supabaseAnonKey, supabaseUrl } = getSupabaseEnv();

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function getNexusSupabaseClient() {
  client ??= createNexusSupabaseClient();

  return client;
}
