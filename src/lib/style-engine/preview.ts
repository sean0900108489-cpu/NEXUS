import type { NexusCompiledStyleV1 } from "./compiler";
import { emitReactFlowAdapterCssVariablesV1 } from "./react-flow-adapter";
import { emitWindowModalRecipeCssVariablesV1 } from "./window-modal-recipe-adapter";

export type NexusStylePreviewPatchV1 = {
  previewId: string;
  manifestId: string;
  manifestChecksum: string;
  variables: Record<string, string>;
};

export type NexusStylePreviewApplyResultV1 = {
  nextVariables: Record<string, string>;
  previousVariables: Record<string, string | undefined>;
};

export function createNexusStylePreviewPatchV1(
  style: NexusCompiledStyleV1,
): NexusStylePreviewPatchV1 {
  const variables = sortStringRecord({
    ...style.cssVariables,
    ...style.legacyCssVariables,
    ...emitReactFlowAdapterCssVariablesV1(style.adapters.reactFlow),
    ...emitWindowModalRecipeCssVariablesV1(style.adapters.windowModal),
  });

  return {
    manifestChecksum: style.manifestChecksum,
    manifestId: style.manifestId,
    previewId: `${style.manifestId}:${style.manifestChecksum}`,
    variables,
  };
}

export function applyNexusStylePreviewPatchV1(
  currentVariables: Record<string, string | undefined>,
  patch: NexusStylePreviewPatchV1,
): NexusStylePreviewApplyResultV1 {
  const previousEntries = Object.keys(patch.variables)
    .sort()
    .map((key) => [key, currentVariables[key]] as const);

  return {
    nextVariables: sortStringRecord({
      ...currentVariables,
      ...patch.variables,
    } as Record<string, string>),
    previousVariables: Object.fromEntries(previousEntries),
  };
}

export function revertNexusStylePreviewPatchV1(
  currentVariables: Record<string, string | undefined>,
  previousVariables: Record<string, string | undefined>,
): Record<string, string> {
  const next: Record<string, string | undefined> = {
    ...currentVariables,
  };

  for (const [key, value] of Object.entries(previousVariables)) {
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }

  return sortStringRecord(next);
}

function sortStringRecord(record: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(record)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}
