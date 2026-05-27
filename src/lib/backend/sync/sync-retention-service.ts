import {
  createSyncOperationRepository,
  type SyncOperationRepository,
} from "./sync-operation-repository";

export type SyncRetentionServiceDependencies = {
  repository?: SyncOperationRepository;
};

export class SyncRetentionService {
  private readonly repository: SyncOperationRepository;

  constructor(dependencies: SyncRetentionServiceDependencies = {}) {
    this.repository = dependencies.repository ?? createSyncOperationRepository();
  }

  cleanupSyncedOperations({
    keepRecent = 500,
    olderThanDays = 14,
    workspaceId,
  }: {
    workspaceId: string;
    olderThanDays?: number;
    keepRecent?: number;
  }) {
    const olderThan = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    return this.repository.cleanupSyncedOperations(workspaceId, olderThan, keepRecent);
  }
}
