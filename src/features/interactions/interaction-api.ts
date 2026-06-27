/**
 * NEXUS Window OS — Interaction Primitive API
 *
 * Local-only viewer interaction state. This is not a backend and does not
 * represent durable social graph or reaction storage.
 *
 * @module features/interactions
 */

import type {
  NexusInteractionCounts,
  NexusInteractionSnapshot,
  NexusInteractionState,
  NexusInteractionTarget,
  NexusReactionKind,
} from "./interaction-types";

const STORAGE_PREFIX = "nexus-interactions:v1";

export type InteractionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type InteractionApiOptions = {
  storage?: InteractionStorage;
};

function getBrowserStorage(): InteractionStorage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function createVolatileStorage(): InteractionStorage {
  const records = new Map<string, string>();
  return {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => {
      records.set(key, value);
    },
    removeItem: (key) => {
      records.delete(key);
    },
  };
}

function targetKey(target: NexusInteractionTarget): string {
  return `${STORAGE_PREFIX}:${target.type}:${target.id}`;
}

function cloneCounts(counts?: NexusInteractionCounts): NexusInteractionCounts {
  return {
    ...(typeof counts?.comments === "number" ? { comments: counts.comments } : {}),
    ...(typeof counts?.saves === "number" ? { saves: counts.saves } : {}),
    ...(counts?.reactions ? { reactions: { ...counts.reactions } } : {}),
  };
}

function cloneState(state?: NexusInteractionState): NexusInteractionState {
  return {
    ...(state?.viewerSaved !== undefined ? { viewerSaved: state.viewerSaved } : {}),
    ...(state?.viewerReacted
      ? { viewerReacted: { ...state.viewerReacted } }
      : {}),
  };
}

function readSnapshot(
  storage: InteractionStorage,
  target: NexusInteractionTarget,
  baseCounts?: NexusInteractionCounts,
  baseState?: NexusInteractionState,
): NexusInteractionSnapshot {
  const fallback = {
    counts: cloneCounts(baseCounts),
    state: cloneState(baseState),
  };

  try {
    const raw = storage.getItem(targetKey(target));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<NexusInteractionSnapshot>;
    return {
      counts: cloneCounts(parsed.counts ?? baseCounts),
      state: cloneState(parsed.state ?? baseState),
    };
  } catch {
    return fallback;
  }
}

function writeSnapshot(
  storage: InteractionStorage,
  target: NexusInteractionTarget,
  snapshot: NexusInteractionSnapshot,
) {
  storage.setItem(targetKey(target), JSON.stringify(snapshot));
}

export function createInteractionApi(options: InteractionApiOptions = {}) {
  const storage = options.storage ?? getBrowserStorage() ?? createVolatileStorage();

  return {
    getSnapshot(
      target: NexusInteractionTarget,
      baseCounts?: NexusInteractionCounts,
      baseState?: NexusInteractionState,
    ): NexusInteractionSnapshot {
      return readSnapshot(storage, target, baseCounts, baseState);
    },

    toggleReaction(
      target: NexusInteractionTarget,
      kind: NexusReactionKind,
      baseCounts?: NexusInteractionCounts,
    ): NexusInteractionSnapshot {
      const snapshot = readSnapshot(storage, target, baseCounts);
      const reactions = { ...(snapshot.counts.reactions ?? {}) };
      const viewerReacted = { ...(snapshot.state.viewerReacted ?? {}) };
      const currentlyReacted = viewerReacted[kind] === true;
      const currentCount = reactions[kind] ?? baseCounts?.reactions?.[kind] ?? 0;

      reactions[kind] = currentlyReacted
        ? Math.max(0, currentCount - 1)
        : currentCount + 1;
      viewerReacted[kind] = !currentlyReacted;

      const next = {
        counts: { ...snapshot.counts, reactions },
        state: { ...snapshot.state, viewerReacted },
      };
      writeSnapshot(storage, target, next);
      return next;
    },

    markSaved(
      target: NexusInteractionTarget,
      baseCounts?: NexusInteractionCounts,
    ): NexusInteractionSnapshot {
      const snapshot = readSnapshot(storage, target, baseCounts);
      if (snapshot.state.viewerSaved) return snapshot;

      const next = {
        counts: {
          ...snapshot.counts,
          saves: (snapshot.counts.saves ?? baseCounts?.saves ?? 0) + 1,
        },
        state: { ...snapshot.state, viewerSaved: true },
      };
      writeSnapshot(storage, target, next);
      return next;
    },

    clearTarget(target: NexusInteractionTarget) {
      storage.removeItem(targetKey(target));
    },
  };
}

export const interactionApi = createInteractionApi();
