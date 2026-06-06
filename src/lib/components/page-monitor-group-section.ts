import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
import type { TimestampStatusCount } from "$lib/server/types/db";

interface MutableAggregatedStatus extends TimestampStatusCount {
  latencyCount: number;
  latencySum: number;
}

function createEmptyAggregatedStatus(ts: number): MutableAggregatedStatus {
  return {
    ts,
    countOfUp: 0,
    countOfDown: 0,
    countOfDegraded: 0,
    countOfMaintenance: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: 0,
    latencyCount: 0,
    latencySum: 0,
  };
}

export function aggregateGroupUptimeData(monitorBars: MonitorBarResponse[]): TimestampStatusCount[] {
  const aggregatedByTimestamp = new Map<number, MutableAggregatedStatus>();

  for (const monitorBar of monitorBars) {
    for (const day of monitorBar.uptimeData) {
      const aggregated = aggregatedByTimestamp.get(day.ts) ?? createEmptyAggregatedStatus(day.ts);

      aggregated.countOfUp += day.countOfUp;
      aggregated.countOfDown += day.countOfDown;
      aggregated.countOfDegraded += day.countOfDegraded;
      aggregated.countOfMaintenance += day.countOfMaintenance;

      if (day.avgLatency > 0) {
        aggregated.latencySum += day.avgLatency;
        aggregated.latencyCount += 1;
      }

      if (day.maxLatency > 0) {
        aggregated.maxLatency = Math.max(aggregated.maxLatency, day.maxLatency);
      }

      if (day.minLatency > 0) {
        aggregated.minLatency =
          aggregated.minLatency === 0 ? day.minLatency : Math.min(aggregated.minLatency, day.minLatency);
      }

      aggregatedByTimestamp.set(day.ts, aggregated);
    }
  }

  return Array.from(aggregatedByTimestamp.values())
    .sort((left, right) => left.ts - right.ts)
    .map(({ latencyCount, latencySum, ...day }) => ({
      ...day,
      avgLatency: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
    }));
}
