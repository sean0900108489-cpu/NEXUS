import { createNexusStyleCanonicalJsonV1 } from "./checksum";
import {
  type NexusStyleManifestV1,
  type NexusStyleValidationIssueV1,
} from "./manifest";
import {
  type NexusStylePackCompatibilityV1,
  type NexusStylePackPermissionsV1,
  type NexusStylePackReviewV1,
  type NexusStylePackLifecycleStateV1,
  reviewNexusStylePackV1,
} from "./governance";

export const NEXUS_STYLE_EXPORT_FORMAT_VERSION_V1 = 1 as const;
export const NEXUS_STYLE_EXPORT_KIND_V1 = "nexus-style-pack" as const;

export type NexusStyleExchangeReviewV1 = {
  state: NexusStylePackLifecycleStateV1;
  compatibility: NexusStylePackCompatibilityV1;
  permissions: NexusStylePackPermissionsV1;
  adapterCoverage?: NexusStylePackReviewV1["adapterCoverage"];
  previewVariableCount?: NexusStylePackReviewV1["previewVariableCount"];
  manifestId?: string;
  manifestVersion?: 1;
  validatorVersion: string;
  compilerVersion?: string;
  checksums: NexusStylePackReviewV1["checksums"];
  validation: {
    accepted: boolean;
    errorCount: number;
    warningCount: number;
    errors: NexusStyleValidationIssueV1[];
    warnings: NexusStyleValidationIssueV1[];
  };
  rejectionCodes: string[];
};

export type NexusStyleExportPackageV1 = {
  formatVersion: typeof NEXUS_STYLE_EXPORT_FORMAT_VERSION_V1;
  kind: typeof NEXUS_STYLE_EXPORT_KIND_V1;
  manifest: NexusStyleManifestV1;
  review: NexusStyleExchangeReviewV1;
};

export type NexusStyleExportResultV1 =
  | {
      accepted: true;
      exportPackage: NexusStyleExportPackageV1;
      review: NexusStyleExchangeReviewV1;
    }
  | {
      accepted: false;
      review: NexusStyleExchangeReviewV1;
    };

export type NexusStyleImportNormalizationResultV1 =
  | {
      accepted: true;
      source: "export-package" | "manifest";
      manifest: NexusStyleManifestV1;
      review: NexusStyleExchangeReviewV1;
    }
  | {
      accepted: false;
      source: "export-package" | "manifest" | "unknown";
      review: NexusStyleExchangeReviewV1;
    };

export function createNexusStyleExportPackageV1(
  manifest: NexusStyleManifestV1,
): NexusStyleExportResultV1 {
  const review = reviewNexusStylePackV1(manifest);
  const exchangeReview = redactNexusStyleReviewForExchangeV1(review);

  if (!review.permissions.canPreview) {
    return {
      accepted: false,
      review: exchangeReview,
    };
  }

  return {
    accepted: true,
    exportPackage: {
      formatVersion: NEXUS_STYLE_EXPORT_FORMAT_VERSION_V1,
      kind: NEXUS_STYLE_EXPORT_KIND_V1,
      manifest: cloneCanonicalNexusStyleValueV1(manifest),
      review: exchangeReview,
    },
    review: exchangeReview,
  };
}

export function normalizeNexusStyleImportCandidateV1(
  candidate: unknown,
): NexusStyleImportNormalizationResultV1 {
  const source = getImportSource(candidate);
  const manifestCandidate =
    source === "export-package" && isRecord(candidate)
      ? candidate.manifest
      : candidate;
  const review = reviewNexusStylePackV1(manifestCandidate);
  const exchangeReview = redactNexusStyleReviewForExchangeV1(review);

  if (source === "unknown" || !review.permissions.canPreview) {
    return {
      accepted: false,
      review: exchangeReview,
      source,
    };
  }

  return {
    accepted: true,
    manifest: cloneCanonicalNexusStyleValueV1(
      manifestCandidate as NexusStyleManifestV1,
    ),
    review: exchangeReview,
    source,
  };
}

export function redactNexusStyleReviewForExchangeV1(
  review: NexusStylePackReviewV1,
): NexusStyleExchangeReviewV1 {
  return {
    checksums: review.checksums,
    ...(review.adapterCoverage ? { adapterCoverage: review.adapterCoverage } : {}),
    compatibility: review.compatibility,
    ...(review.compilerVersion ? { compilerVersion: review.compilerVersion } : {}),
    ...(review.manifestId ? { manifestId: review.manifestId } : {}),
    ...(review.manifestVersion ? { manifestVersion: review.manifestVersion } : {}),
    ...(review.previewVariableCount !== undefined
      ? { previewVariableCount: review.previewVariableCount }
      : {}),
    permissions: review.permissions,
    rejectionCodes: [...review.rejectionCodes].sort(),
    state: review.state,
    validatorVersion: review.validatorVersion,
    validation: {
      accepted: review.validation.accepted,
      errorCount: review.validation.errorCount,
      errors: review.validation.errors,
      warningCount: review.validation.warningCount,
      warnings: review.validation.warnings,
    },
  };
}

function getImportSource(
  candidate: unknown,
): NexusStyleImportNormalizationResultV1["source"] {
  if (!isRecord(candidate)) {
    return "unknown";
  }

  if (
    candidate.kind === NEXUS_STYLE_EXPORT_KIND_V1 &&
    candidate.formatVersion === NEXUS_STYLE_EXPORT_FORMAT_VERSION_V1 &&
    "manifest" in candidate
  ) {
    return "export-package";
  }

  return "manifest";
}

function cloneCanonicalNexusStyleValueV1<T>(value: T): T {
  return JSON.parse(createNexusStyleCanonicalJsonV1(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
