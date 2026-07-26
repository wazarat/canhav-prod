/**
 * Shared Metrics-tab time-range vocabulary (CAN-61). Importable from both
 * server components (series slicing in creditRollup) and client components
 * (RangeChipBar), so keep this module dependency-free.
 */
export type TimeRange = "24h" | "7d" | "30d" | "90d";

export const TIME_RANGES: TimeRange[] = ["24h", "7d", "30d", "90d"];
export const DEFAULT_TIME_RANGE: TimeRange = "30d";

export function resolveTimeRange(raw: string | undefined): TimeRange {
  return (TIME_RANGES as string[]).includes(raw ?? "") ? (raw as TimeRange) : DEFAULT_TIME_RANGE;
}
