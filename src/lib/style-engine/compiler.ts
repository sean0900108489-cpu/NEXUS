import {
  NEXUS_STYLE_TOKEN_GROUPS_V1,
  type NexusStyleAdaptersV1,
  type NexusStyleManifestV1,
  type NexusStyleRecipesV1,
  type NexusStyleValidationIssueV1,
} from "./manifest";
import { validateNexusStyleManifestV1 } from "./validator";

export const NEXUS_STYLE_COMPILER_VERSION = "nexus-style-compiler-v1" as const;

export type NexusCompiledStyleV1 = {
  compilerVersion: typeof NEXUS_STYLE_COMPILER_VERSION;
  manifestId: string;
  manifestChecksum: string;
  cssVariables: Record<string, string>;
  legacyCssVariables: Record<string, string>;
  recipes: NexusStyleRecipesV1;
  adapters: {
    reactFlow?: NexusStyleAdaptersV1["reactFlow"];
    nextThemes?: NexusStyleAdaptersV1["nextThemes"];
  };
  report: NexusCompilerReportV1;
};

export type NexusCompilerReportV1 = {
  accepted: true;
  warnings: NexusStyleValidationIssueV1[];
  emittedVariableCount: number;
  legacyBridgeUsed: boolean;
  adapterCoverage: {
    reactFlow: "none" | "partial" | "complete";
  };
};

export type NexusStyleCompilerResultV1 =
  | {
      accepted: true;
      style: NexusCompiledStyleV1;
    }
  | {
      accepted: false;
      errors: NexusStyleValidationIssueV1[];
      warnings: NexusStyleValidationIssueV1[];
    };

const legacyVariableMap: Record<string, string> = {
  "--bg-base": "--nexus-surface-app",
  "--border-subtle": "--nexus-border-subtle",
  "--glass-blur": "--nexus-blur-glass",
  "--panel-bg": "--nexus-surface-panel",
  "--shadow-panel": "--nexus-shadow-panel",
  "--surface-radius": "--nexus-radius-surface",
  "--text-main": "--nexus-text-primary",
  "--text-muted": "--nexus-text-muted",
  "--text-soft": "--nexus-text-secondary",
  "--theme-danger": "--nexus-status-danger",
  "--theme-primary": "--nexus-accent-primary",
  "--theme-primary-strong": "--nexus-accent-primary-strong",
  "--theme-success": "--nexus-status-success",
  "--theme-warning": "--nexus-status-warning",
  "--workspace-grid-primary": "--nexus-workspace-grid-primary",
};

export function compileNexusStyleManifestV1(
  manifest: NexusStyleManifestV1,
): NexusStyleCompilerResultV1 {
  const validation = validateNexusStyleManifestV1(manifest);

  if (!validation.accepted) {
    return {
      accepted: false,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  const cssVariables = emitCssVariables(manifest);
  const legacyCssVariables = emitLegacyCssVariables(cssVariables);
  const recipes = compileRecipes(manifest.recipes);
  const adapters = compileAdapters(manifest.adapters);

  return {
    accepted: true,
    style: {
      adapters,
      compilerVersion: NEXUS_STYLE_COMPILER_VERSION,
      cssVariables,
      legacyCssVariables,
      manifestChecksum: stableChecksum(manifest),
      manifestId: manifest.id,
      recipes,
      report: {
        accepted: true,
        adapterCoverage: {
          reactFlow: adapters.reactFlow ? "partial" : "none",
        },
        emittedVariableCount:
          Object.keys(cssVariables).length + Object.keys(legacyCssVariables).length,
        legacyBridgeUsed: Object.keys(legacyCssVariables).length > 0,
        warnings: validation.warnings,
      },
    },
  };
}

function emitCssVariables(manifest: NexusStyleManifestV1) {
  const entries: Array<[string, string]> = [];

  for (const group of NEXUS_STYLE_TOKEN_GROUPS_V1) {
    const tokens = manifest.tokens[group];

    for (const [tokenName, tokenValue] of Object.entries(tokens).sort()) {
      entries.push([
        toCssVariableName(group, tokenName),
        String(tokenValue),
      ]);
    }
  }

  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function emitLegacyCssVariables(cssVariables: Record<string, string>) {
  const entries = Object.entries(legacyVariableMap)
    .filter(([, semanticVariable]) => semanticVariable in cssVariables)
    .map(([legacyVariable, semanticVariable]) => [
      legacyVariable,
      `var(${semanticVariable})`,
    ]);

  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function compileRecipes(recipes: NexusStyleRecipesV1): NexusStyleRecipesV1 {
  const compiled = deepMapStrings(recipes, resolveSemanticReference);

  if (!isRecord(compiled)) {
    throw new Error("Compiled style recipes must be an object.");
  }

  return sortRecord(compiled) as NexusStyleRecipesV1;
}

function compileAdapters(adapters: NexusStyleManifestV1["adapters"]) {
  return sortRecord({
    ...(adapters.nextThemes ? { nextThemes: sortRecord(adapters.nextThemes) } : {}),
    ...(adapters.reactFlow ? { reactFlow: sortRecord(adapters.reactFlow) } : {}),
  }) as NexusCompiledStyleV1["adapters"];
}

function resolveSemanticReference(value: string) {
  const match = /^([a-z]+)\.([A-Za-z0-9]+)$/.exec(value);

  if (!match) {
    return value;
  }

  const [, group, tokenName] = match;

  return `var(${toCssVariableName(group, tokenName)})`;
}

function toCssVariableName(group: string, tokenName: string) {
  return `--nexus-${toKebabCase(group)}-${toKebabCase(tokenName)}`;
}

function toKebabCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s.]+/g, "-")
    .toLowerCase();
}

function deepMapStrings(
  value: unknown,
  mapper: (value: string) => string,
): unknown {
  if (typeof value === "string") {
    return mapper(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepMapStrings(item, mapper));
  }

  if (!isRecord(value)) {
    return value;
  }

  return sortRecord(
    Object.fromEntries(
      Object.entries(value).map(([key, nextValue]) => [
        key,
        deepMapStrings(nextValue, mapper),
      ]),
    ),
  );
}

function sortRecord<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [
        key,
        isRecord(value) ? sortRecord(value) : value,
      ]),
  ) as T;
}

function stableChecksum(value: unknown) {
  const canonical = JSON.stringify(stabilize(value));
  let hash = 0x811c9dc5;

  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `nexus-style-fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function stabilize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stabilize);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nextValue]) => [key, stabilize(nextValue)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
