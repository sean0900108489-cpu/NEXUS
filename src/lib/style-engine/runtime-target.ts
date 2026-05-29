import type { NexusStylePreviewPatchV1 } from "./preview";

export type NexusStyleVariableTargetV1 = {
  style: {
    getPropertyValue(name: string): string;
    removeProperty(name: string): void;
    setProperty(name: string, value: string): void;
  };
};

export type NexusStyleVariablePreviewSessionV1 = {
  previewId: string;
  manifestId: string;
  manifestChecksum: string;
  appliedVariables: Record<string, string>;
  previousVariables: Record<string, string | undefined>;
};

export function startNexusStyleVariablePreviewV1(
  target: NexusStyleVariableTargetV1,
  patch: NexusStylePreviewPatchV1,
): NexusStyleVariablePreviewSessionV1 {
  const previousVariables: Record<string, string | undefined> = {};
  const appliedVariables = sortStringRecord(patch.variables);

  for (const [name, value] of Object.entries(appliedVariables)) {
    const previous = target.style.getPropertyValue(name);

    previousVariables[name] = previous.length > 0 ? previous : undefined;
    target.style.setProperty(name, value);
  }

  return {
    appliedVariables,
    manifestChecksum: patch.manifestChecksum,
    manifestId: patch.manifestId,
    previewId: patch.previewId,
    previousVariables: sortOptionalStringRecord(previousVariables),
  };
}

export function revertNexusStyleVariablePreviewV1(
  target: NexusStyleVariableTargetV1,
  session: NexusStyleVariablePreviewSessionV1,
) {
  for (const [name, previous] of Object.entries(session.previousVariables)) {
    if (previous === undefined) {
      target.style.removeProperty(name);
    } else {
      target.style.setProperty(name, previous);
    }
  }
}

function sortStringRecord(record: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function sortOptionalStringRecord(record: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}
