import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { PUBLIC_CONFIG_ROUTE, type NexusPublicConfig } from "@/lib/public-config";
import type { Database } from "@/lib/supabase/database.types";

export type NexusSupabaseClient = SupabaseClient<Database>;

type SupabaseClientConfig = {
  supabaseAnonKey: string;
  supabaseUrl: string;
};

const MISSING_SUPABASE_CONFIG_MESSAGE =
  "Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

let client: NexusSupabaseClient | undefined;
let runtimeConfig: SupabaseClientConfig | undefined;
let configRequest: Promise<SupabaseClientConfig> | undefined;

function getSupabaseEnv() {
  const buildTimeConfig = normalizeSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const config = buildTimeConfig ?? runtimeConfig;

  if (!config) {
    throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  return config;
}

export function createNexusSupabaseClient() {
  const { supabaseAnonKey, supabaseUrl } = getSupabaseEnv();

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function getNexusSupabaseClient() {
  client ??= createNexusSupabaseClient();

  return client;
}

export async function ensureNexusSupabaseClientConfigured() {
  try {
    return getSupabaseEnv();
  } catch (error) {
    if (typeof window === "undefined") {
      throw error;
    }
  }

  configRequest ??= fetchRuntimeConfig().catch((error: unknown) => {
    configRequest = undefined;
    throw error;
  });

  return configRequest;
}

function normalizeSupabaseConfig(
  supabaseUrl: string | null | undefined,
  supabaseAnonKey: string | null | undefined,
): SupabaseClientConfig | undefined {
  const url = supabaseUrl?.trim();
  const anonKey = supabaseAnonKey?.trim();

  if (!url || !anonKey) {
    return undefined;
  }

  return {
    supabaseAnonKey: anonKey,
    supabaseUrl: url,
  };
}

async function fetchRuntimeConfig() {
  const response = await fetch(PUBLIC_CONFIG_ROUTE, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  const envelope = (await response.json()) as {
    data?: NexusPublicConfig;
  };
  const supabase = envelope.data?.supabase;
  const config = normalizeSupabaseConfig(supabase?.url, supabase?.anonKey);

  if (!supabase?.configured || !config) {
    throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  runtimeConfig = config;

  return config;
}
