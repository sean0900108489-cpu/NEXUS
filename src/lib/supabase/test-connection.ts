import * as nextEnv from "@next/env";

import { getNexusSupabaseClient } from "./client";

type DiagnosticResult = {
  connectionStatus: "success" | "failure";
  env: {
    anonKey: "present" | "missing";
    url: "present" | "missing";
  };
  error?: {
    code?: string;
    message: string;
  };
  rowsRead?: number;
};

const nextEnvCompat = nextEnv as typeof nextEnv & { default?: typeof nextEnv };
const loadEnvConfig =
  nextEnv.loadEnvConfig ?? nextEnvCompat.default?.loadEnvConfig;

loadEnvConfig?.(process.cwd());

function getEnvStatus() {
  return {
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "present" : "missing",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "present" : "missing",
  } satisfies DiagnosticResult["env"];
}

function toError(error: unknown): DiagnosticResult["error"] {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; message?: unknown };

    return {
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : "Unknown Supabase connection error.",
    };
  }

  return {
    message: error instanceof Error ? error.message : "Unknown Supabase connection error.",
  };
}

async function main() {
  const env = getEnvStatus();

  try {
    const { data, error } = await getNexusSupabaseClient()
      .from("workspaces")
      .select("*")
      .limit(1);

    if (error) {
      const result: DiagnosticResult = {
        connectionStatus: "failure",
        env,
        error: toError(error),
      };
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = 1;
      return;
    }

    const result: DiagnosticResult = {
      connectionStatus: "success",
      env,
      rowsRead: data?.length ?? 0,
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const result: DiagnosticResult = {
      connectionStatus: "failure",
      env,
      error: toError(error),
    };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  }
}

void main();
