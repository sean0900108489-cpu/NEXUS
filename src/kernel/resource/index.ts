/**
 * NEXUS Window OS — Resource Kernel Public API
 */

export type { NexusResourceType, NexusResourceRef, NexusResourceAction } from "./resource-ref";
export { createResourceRef, isResourceRef } from "./resource-ref";
export { openResource, attachmentToResourceRef } from "./resource-actions";
