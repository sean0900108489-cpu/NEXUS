import { nexusApiClient } from "@/lib/api/nexus-api-client";
import type {
  HistoricalArtifactRecord,
  HistoricalDataPage,
  HistoricalDataQuery,
  HistoricalMessageRecord,
  IAsyncDataFetcher,
  MessageHistoryPageResponse,
} from "@/lib/nexus-types";

export class HistoricalDataFetcher implements IAsyncDataFetcher {
  async fetchHistoricalMessages(
    query: HistoricalDataQuery,
  ): Promise<HistoricalDataPage<HistoricalMessageRecord>> {
    if (!query.agentId) {
      return {
        hasMore: false,
        items: [],
      };
    }

    const params = new URLSearchParams({
      limit: String(query.limit ?? 50),
      workspaceId: query.workspaceId,
    });

    if (query.cursor) {
      params.set("cursor", query.cursor);
    }

    const response = await nexusApiClient.get<MessageHistoryPageResponse>(
      `/api/v1/agents/${encodeURIComponent(query.agentId)}/messages?${params.toString()}`,
      {
        userId: query.userId ?? "local-owner",
        workspaceId: query.workspaceId,
      },
    );

    return {
      hasMore: response.hasMore,
      items: response.messages.map((record) => ({
        agentId: response.agentId,
        message: {
          content: record.content,
          createdAt: record.createdAt,
          id: record.id,
          role: record.role,
        },
        workspaceId: response.workspaceId,
      })),
      nextCursor: response.nextCursor ?? undefined,
    };
  }

  async fetchHistoricalArtifacts(
    query: HistoricalDataQuery,
  ): Promise<HistoricalDataPage<HistoricalArtifactRecord>> {
    void query;

    return {
      hasMore: false,
      items: [],
    };
  }
}
