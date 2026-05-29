import {
  NEXUS_STYLE_COMPILER_VERSION,
  compileNexusStyleManifestV1,
  type NexusCompilerReportV1,
} from "./compiler";
import { createNexusStyleChecksumV1 } from "./checksum";
import {
  NEXUS_STYLE_MANIFEST_VERSION,
  type NexusStyleManifestV1,
  type NexusStyleValidationIssueV1,
} from "./manifest";
import { createNexusStylePreviewPatchV1 } from "./preview";
import { validateNexusStyleManifestV1 } from "./validator";

export const NEXUS_STYLE_GOVERNANCE_VERSION_V1 =
  "nexus-style-governance-v1" as const;

export type NexusStylePackLifecycleStateV1 =
  | "draft"
  | "validated"
  | "warning"
  | "rejected"
  | "deprecated"
  | "retired"
  | "quarantined";

export type NexusStylePackCompatibilityV1 =
  | "compatible"
  | "compatible_with_warnings"
  | "requires_upgrade"
  | "requires_downgrade"
  | "incompatible";

export type NexusStylePackPermissionsV1 = {
  canPreview: boolean;
  canApply: boolean;
  reasonCodes: string[];
};

export type NexusStylePackReviewV1 = {
  governanceVersion: typeof NEXUS_STYLE_GOVERNANCE_VERSION_V1;
  state: NexusStylePackLifecycleStateV1;
  compatibility: NexusStylePackCompatibilityV1;
  permissions: NexusStylePackPermissionsV1;
  adapterCoverage?: NexusCompilerReportV1["adapterCoverage"];
  previewVariableCount?: number;
  manifestId?: string;
  manifestVersion?: typeof NEXUS_STYLE_MANIFEST_VERSION;
  compilerVersion?: typeof NEXUS_STYLE_COMPILER_VERSION;
  checksums: {
    normalizedManifest?: string;
    compiledOutput?: string;
    report: string;
  };
  validation: {
    accepted: boolean;
    errorCount: number;
    warningCount: number;
    errors: NexusStyleValidationIssueV1[];
    warnings: NexusStyleValidationIssueV1[];
  };
  rejectionCodes: string[];
};

export function reviewNexusStylePackV1(candidate: unknown): NexusStylePackReviewV1 {
  const validation = validateNexusStyleManifestV1(candidate);
  const validationSummary = {
    accepted: validation.accepted,
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length,
    errors: validation.errors,
    warnings: validation.warnings,
  };

  if (!validation.accepted) {
    return withReportChecksum({
      compatibility: "incompatible",
      governanceVersion: NEXUS_STYLE_GOVERNANCE_VERSION_V1,
      manifestId: validation.manifestId,
      permissions: getNexusStylePackPermissionsV1("rejected"),
      rejectionCodes: validation.errors.map((error) => error.code),
      state: "rejected",
      validation: validationSummary,
    });
  }

  const compiled = compileNexusStyleManifestV1(candidate as NexusStyleManifestV1);

  if (!compiled.accepted) {
    const rejectionCodes = compiled.errors.map((error) => error.code);

    return withReportChecksum({
      compatibility: "incompatible",
      governanceVersion: NEXUS_STYLE_GOVERNANCE_VERSION_V1,
      manifestId: validation.manifestId,
      manifestVersion: NEXUS_STYLE_MANIFEST_VERSION,
      permissions: getNexusStylePackPermissionsV1("rejected"),
      rejectionCodes,
      state: "rejected",
      validation: {
        accepted: false,
        errorCount: compiled.errors.length,
        errors: compiled.errors,
        warningCount: compiled.warnings.length,
        warnings: compiled.warnings,
      },
    });
  }

  const state: NexusStylePackLifecycleStateV1 =
    validation.warnings.length > 0 ? "warning" : "validated";
  const previewPatch = createNexusStylePreviewPatchV1(compiled.style);

  return withReportChecksum({
    adapterCoverage: compiled.style.report.adapterCoverage,
    checksums: {
      compiledOutput: createNexusStyleChecksumV1(compiled.style),
      normalizedManifest: compiled.style.manifestChecksum,
    },
    compatibility:
      state === "warning" ? "compatible_with_warnings" : "compatible",
    compilerVersion: compiled.style.compilerVersion,
    governanceVersion: NEXUS_STYLE_GOVERNANCE_VERSION_V1,
    manifestId: compiled.style.manifestId,
    manifestVersion: NEXUS_STYLE_MANIFEST_VERSION,
    permissions: getNexusStylePackPermissionsV1(state),
    previewVariableCount: Object.keys(previewPatch.variables).length,
    rejectionCodes: [],
    state,
    validation: validationSummary,
  });
}

export function getNexusStylePackPermissionsV1(
  state: NexusStylePackLifecycleStateV1,
): NexusStylePackPermissionsV1 {
  switch (state) {
    case "validated":
      return {
        canApply: true,
        canPreview: true,
        reasonCodes: [],
      };
    case "warning":
      return {
        canApply: false,
        canPreview: true,
        reasonCodes: ["style.pack.warningRequiresReview"],
      };
    case "deprecated":
      return {
        canApply: false,
        canPreview: true,
        reasonCodes: ["style.pack.deprecated"],
      };
    case "draft":
      return {
        canApply: false,
        canPreview: false,
        reasonCodes: ["style.pack.draftNotValidated"],
      };
    case "retired":
      return {
        canApply: false,
        canPreview: false,
        reasonCodes: ["style.pack.retired"],
      };
    case "quarantined":
      return {
        canApply: false,
        canPreview: false,
        reasonCodes: ["style.pack.quarantined"],
      };
    case "rejected":
      return {
        canApply: false,
        canPreview: false,
        reasonCodes: ["style.pack.rejected"],
      };
  }
}

function withReportChecksum(
  review: Omit<NexusStylePackReviewV1, "checksums"> & {
    checksums?: Omit<NexusStylePackReviewV1["checksums"], "report">;
  },
): NexusStylePackReviewV1 {
  const checksums = {
    ...review.checksums,
  };
  const report = createNexusStyleChecksumV1({
    ...review,
    checksums,
  });

  return {
    ...review,
    checksums: {
      ...checksums,
      report,
    },
  };
}
