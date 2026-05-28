import { getDefaultObservabilityService, type ObservabilityService } from "./observability-service";

export type EventRetentionPolicy = {
  systemEventTtlDays?: number;
  usageMetricTtlDays?: number;
};

export class EventRetentionWorker {
  constructor(
    private readonly service: ObservabilityService = getDefaultObservabilityService(),
    private readonly policy: EventRetentionPolicy = {},
  ) {}

  async cleanup(now = new Date()) {
    const systemEventTtlDays = this.policy.systemEventTtlDays ?? 30;
    const usageMetricTtlDays = this.policy.usageMetricTtlDays ?? 180;
    const [systemEventsRemoved, usageMetricsRemoved] = await Promise.all([
      this.service.cleanupSystemEvents(daysBefore(now, systemEventTtlDays)),
      this.service.cleanupUsageMetrics(daysBefore(now, usageMetricTtlDays)),
    ]);

    return {
      systemEventsRemoved,
      usageMetricsRemoved,
    };
  }
}

function daysBefore(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
