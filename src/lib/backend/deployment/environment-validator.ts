import type { DeploymentEnvironment } from "@/lib/nexus-types";

import type { EnvironmentValidationResult } from "./deployment-types";

export type EnvironmentValidatorOptions = {
  env?: Record<string, string | undefined>;
};

const PUBLIC_REQUIRED_ENV = [
  {
    envKey: "NEXT_PUBLIC_SUPABASE_URL",
    safeKey: "supabaseUrlConfigured",
    safeMissingKey: "supabaseUrl",
  },
  {
    envKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    safeKey: "supabaseAnonConfigured",
    safeMissingKey: "supabaseAnon",
  },
] as const;

const LIVE_PROVIDER_ENV = [
  {
    envKey: "OPENAI_API_KEY",
    safeKey: "providerCredentialConfigured",
    safeMissingKey: "providerCredential",
  },
] as const;

export class EnvironmentValidator {
  constructor(private readonly options: EnvironmentValidatorOptions = {}) {}

  validate(environment = this.getEnvironment()): EnvironmentValidationResult {
    const env = this.options.env ?? process.env;
    const runtimeMode = getRuntimeMode(env, environment);
    const checks: Record<string, boolean> = {};
    const missing: string[] = [];

    for (const { envKey, safeKey, safeMissingKey } of PUBLIC_REQUIRED_ENV) {
      const present = hasValue(env[envKey]);
      checks[safeKey] = present;

      if (!present) {
        missing.push(safeMissingKey);
      }
    }

    const liveProviderRequired = isServerProviderCredentialRequired(
      env,
      environment,
      runtimeMode,
    );
    checks.serverProviderCredentialRequired = liveProviderRequired;

    for (const { envKey, safeKey, safeMissingKey } of LIVE_PROVIDER_ENV) {
      const present = hasValue(env[envKey]);
      checks[safeKey] = present;

      if (liveProviderRequired && !present) {
        missing.push(safeMissingKey);
      }
    }

    checks.serverCredentialConfigured = hasValue(
      env.SUPABASE_SERVICE_ROLE_KEY,
    );
    checks.clientServerCredentialExposed = Object.keys(env).some(
      (key) =>
        key.startsWith("NEXT_PUBLIC_") &&
        key.toLowerCase().includes("service") &&
        key.toLowerCase().includes("role"),
    );

    const status =
      checks.clientServerCredentialExposed || (environment === "production" && missing.length > 0)
        ? "blocked"
        : missing.length > 0
          ? "failed"
          : "passed";

    return {
      checks,
      missing,
      mode: environment,
      runtimeMode,
      status,
    };
  }

  getEnvironment(): DeploymentEnvironment {
    const env = this.options.env ?? process.env;
    const explicit = env.DEPLOYMENT_ENV ?? env.NEXUS_DEPLOYMENT_ENV;

    if (explicit === "production" || explicit === "staging" || explicit === "local") {
      return explicit;
    }

    if (env.VERCEL_ENV === "production") {
      return "production";
    }

    if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "staging") {
      return "staging";
    }

    if (env.NODE_ENV === "production") {
      return "production";
    }

    return "local";
  }
}

function getRuntimeMode(
  env: Record<string, string | undefined>,
  environment: DeploymentEnvironment,
): EnvironmentValidationResult["runtimeMode"] {
  const explicit = env.NEXUS_RUNTIME_MODE ?? env.RUNTIME_MODE;

  if (explicit === "live" || explicit === "mock" || explicit === "local") {
    return explicit;
  }

  if (environment === "local") {
    return "local";
  }

  return "live";
}

function isServerProviderCredentialRequired(
  env: Record<string, string | undefined>,
  environment: DeploymentEnvironment,
  runtimeMode: EnvironmentValidationResult["runtimeMode"],
) {
  if (runtimeMode !== "live") {
    return false;
  }

  const explicit =
    env.NEXUS_REQUIRE_SERVER_PROVIDER_CREDENTIAL ??
    env.REQUIRE_SERVER_PROVIDER_CREDENTIAL;

  if (typeof explicit === "string") {
    return ["1", "true", "yes"].includes(explicit.trim().toLowerCase());
  }

  return environment === "production";
}

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}
