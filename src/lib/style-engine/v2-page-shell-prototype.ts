import {
  NEXUS_WORKSPACE_LAYOUT_REGION_IDS_V1,
  NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1,
  NEXUS_WORKSPACE_LAYOUT_SLOT_REGISTRY_V1,
  type NexusWorkspaceLayoutPageShellIdV1,
  type NexusWorkspaceLayoutPresetReviewResultV1,
  type NexusWorkspaceLayoutRegionIdV1,
  type NexusWorkspaceLayoutSlotIdV1,
} from "./v2-layout-boundary";
import {
  NEXUS_PAGE_SHELL_FEATURE_REGISTRY_V1,
  type NexusPageShellFeatureIdV1,
  type NexusPageShellFeatureMountPlanReviewResultV1,
} from "./v2-page-shell-feature-registry";

export const NEXUS_PAGE_SHELL_PROTOTYPE_VERSION_V1 =
  "nexus-page-shell-prototype-v1" as const;

export type NexusPageShellPrototypeIssueCodeV1 =
  | "pageShellPrototype.layoutRejected"
  | "pageShellPrototype.featurePlanRejected"
  | "pageShellPrototype.pageShellMismatch"
  | "pageShellPrototype.unknownSlot"
  | "pageShellPrototype.unknownFeature";

export type NexusPageShellPrototypeIssueV1 = {
  code: NexusPageShellPrototypeIssueCodeV1;
  path: string;
  message: string;
};

export type NexusPageShellPrototypeFeatureV1 = {
  featureId: NexusPageShellFeatureIdV1;
  label: string;
  mode: "enabled" | "review-only";
};

export type NexusPageShellPrototypeSlotV1 = {
  slotId: NexusWorkspaceLayoutSlotIdV1;
  label: string;
  owner: string;
  features: NexusPageShellPrototypeFeatureV1[];
};

export type NexusPageShellPrototypeRegionV1 = {
  regionId: NexusWorkspaceLayoutRegionIdV1;
  slots: NexusPageShellPrototypeSlotV1[];
};

export type NexusPageShellPrototypeV1 = {
  kind: "nexus-page-shell-prototype";
  version: typeof NEXUS_PAGE_SHELL_PROTOTYPE_VERSION_V1;
  prototypeId: string;
  pageShell: NexusWorkspaceLayoutPageShellIdV1;
  arrangement: string;
  layoutPresetId: string;
  featurePlanId: string;
  regions: NexusPageShellPrototypeRegionV1[];
  featurePlacementSummary: Array<{
    featureId: NexusPageShellFeatureIdV1;
    label: string;
    slotId: NexusWorkspaceLayoutSlotIdV1;
    regionId: NexusWorkspaceLayoutRegionIdV1;
    mode: "enabled" | "review-only";
  }>;
  visualPrimitiveHints: {
    panel: ".nexus-panel";
    glass: ".nexus-glass";
    workspace: ".nexus-workspace";
  };
  protectedBoundary: "style-lab-only-production-layout-blocked";
};

export type NexusPageShellPrototypeResultV1 =
  | {
      accepted: true;
      prototype: NexusPageShellPrototypeV1;
      issues: NexusPageShellPrototypeIssueV1[];
    }
  | {
      accepted: false;
      issues: NexusPageShellPrototypeIssueV1[];
    };

const approvedSlotIds = new Set<string>(NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1);

export function createNexusPageShellPrototypeV1({
  featurePlanResult,
  layoutResult,
}: {
  featurePlanResult: NexusPageShellFeatureMountPlanReviewResultV1;
  layoutResult: NexusWorkspaceLayoutPresetReviewResultV1;
}): NexusPageShellPrototypeResultV1 {
  if (!layoutResult.accepted) {
    return rejectPrototype([
      createIssue(
        "pageShellPrototype.layoutRejected",
        "$.layout",
        "Page shell prototype requires an accepted layout preset review result.",
      ),
    ]);
  }

  if (!featurePlanResult.accepted) {
    return rejectPrototype([
      createIssue(
        "pageShellPrototype.featurePlanRejected",
        "$.featurePlan",
        "Page shell prototype requires an accepted feature mount plan review result.",
      ),
    ]);
  }

  if (layoutResult.summary.pageShell !== featurePlanResult.summary.pageShell) {
    return rejectPrototype([
      createIssue(
        "pageShellPrototype.pageShellMismatch",
        "$.pageShell",
        "Layout preset and feature mount plan must target the same page shell.",
      ),
    ]);
  }

  const issues: NexusPageShellPrototypeIssueV1[] = [];
  const slotToRegion = new Map<NexusWorkspaceLayoutSlotIdV1, NexusWorkspaceLayoutRegionIdV1>();
  const featureBySlot = new Map<
    NexusWorkspaceLayoutSlotIdV1,
    NexusPageShellPrototypeFeatureV1[]
  >();

  for (const region of layoutResult.summary.regions) {
    for (const slotId of region.slots) {
      if (!approvedSlotIds.has(slotId)) {
        issues.push(
          createIssue(
            "pageShellPrototype.unknownSlot",
            `$.layout.regions.${region.regionId}`,
            "Layout review summary contained an unknown slot.",
          ),
        );
        continue;
      }

      slotToRegion.set(slotId, region.regionId);
    }
  }

  for (const feature of featurePlanResult.summary.features) {
    if (!approvedSlotIds.has(feature.slotId)) {
      issues.push(
        createIssue(
          "pageShellPrototype.unknownSlot",
          `$.featurePlan.features.${feature.featureId}.slotId`,
          "Feature mount summary referenced an unknown slot.",
        ),
      );
      continue;
    }

    const definition = NEXUS_PAGE_SHELL_FEATURE_REGISTRY_V1[feature.featureId];

    if (!definition) {
      issues.push(
        createIssue(
          "pageShellPrototype.unknownFeature",
          `$.featurePlan.features.${feature.featureId}`,
          "Feature mount summary referenced an unknown feature.",
        ),
      );
      continue;
    }

    const features = featureBySlot.get(feature.slotId) ?? [];

    features.push({
      featureId: feature.featureId,
      label: definition.label,
      mode: feature.mode,
    });
    featureBySlot.set(feature.slotId, features);
  }

  if (issues.length > 0) {
    return rejectPrototype(issues);
  }

  const regions: NexusPageShellPrototypeRegionV1[] =
    NEXUS_WORKSPACE_LAYOUT_REGION_IDS_V1.map((regionId) => {
      const sourceRegion = layoutResult.summary.regions.find(
        (region) => region.regionId === regionId,
      );
      const slots = sourceRegion?.slots ?? [];

      return {
        regionId,
        slots: slots.map((slotId) => ({
          features: featureBySlot.get(slotId) ?? [],
          label: NEXUS_WORKSPACE_LAYOUT_SLOT_REGISTRY_V1[slotId].label,
          owner: NEXUS_WORKSPACE_LAYOUT_SLOT_REGISTRY_V1[slotId].owner,
          slotId,
        })),
      };
    });

  const featurePlacementSummary = featurePlanResult.summary.features.map(
    (feature) => ({
      featureId: feature.featureId,
      label: NEXUS_PAGE_SHELL_FEATURE_REGISTRY_V1[feature.featureId].label,
      mode: feature.mode,
      regionId: slotToRegion.get(feature.slotId) ?? "floating",
      slotId: feature.slotId,
    }),
  );

  return {
    accepted: true,
    issues: [],
    prototype: {
      arrangement: layoutResult.summary.arrangement,
      featurePlacementSummary,
      featurePlanId: featurePlanResult.summary.planId,
      kind: "nexus-page-shell-prototype",
      layoutPresetId: layoutResult.summary.presetId,
      pageShell: layoutResult.summary.pageShell,
      protectedBoundary: "style-lab-only-production-layout-blocked",
      prototypeId: `${layoutResult.summary.presetId}:${featurePlanResult.summary.planId}`,
      regions,
      version: NEXUS_PAGE_SHELL_PROTOTYPE_VERSION_V1,
      visualPrimitiveHints: {
        glass: ".nexus-glass",
        panel: ".nexus-panel",
        workspace: ".nexus-workspace",
      },
    },
  };
}

function rejectPrototype(
  issues: NexusPageShellPrototypeIssueV1[],
): NexusPageShellPrototypeResultV1 {
  return {
    accepted: false,
    issues: sortIssues(issues),
  };
}

function createIssue(
  code: NexusPageShellPrototypeIssueCodeV1,
  path: string,
  message: string,
): NexusPageShellPrototypeIssueV1 {
  return { code, message, path };
}

function sortIssues(issues: NexusPageShellPrototypeIssueV1[]) {
  return [...issues].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);

    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}
