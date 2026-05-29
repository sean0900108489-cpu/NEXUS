export const NEXUS_STYLE_CHECKSUM_ALGORITHM_V1 = "fnv1a32" as const;
export const NEXUS_STYLE_CHECKSUM_PREFIX_V1 =
  `nexus-style-${NEXUS_STYLE_CHECKSUM_ALGORITHM_V1}:` as const;

export function createNexusStyleChecksumV1(value: unknown): string {
  const canonical = createNexusStyleCanonicalJsonV1(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `${NEXUS_STYLE_CHECKSUM_PREFIX_V1}${(hash >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

export function createNexusStyleCanonicalJsonV1(value: unknown): string {
  return JSON.stringify(stabilizeNexusStyleValueV1(value)) ?? "null";
}

function stabilizeNexusStyleValueV1(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stabilizeNexusStyleValueV1);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nextValue]) => [
        key,
        stabilizeNexusStyleValueV1(nextValue),
      ]),
  );
}
