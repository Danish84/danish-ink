export type ArcStatus =
  | "proposed"
  | "active"
  | "closure_candidate"
  | "closed";

export type ArcAssignmentCountRow = {
  arc_id: string;
  day_number: number;
};

export type ArcCounts = {
  mentionCount: number;
  dayCount: number;
};

const PENDING_STATUSES = new Set<ArcStatus>([
  "proposed",
  "closure_candidate",
]);

export function countPendingArcStatuses(statuses: ArcStatus[]) {
  return statuses.reduce(
    (count, status) => count + (PENDING_STATUSES.has(status) ? 1 : 0),
    0,
  );
}

export function aggregateArcCounts(
  rows: ArcAssignmentCountRow[],
): Map<string, ArcCounts> {
  const counts = new Map<string, ArcCounts>();

  for (const row of rows) {
    const current = counts.get(row.arc_id) ?? {
      mentionCount: 0,
      dayCount: 0,
    };

    counts.set(row.arc_id, {
      mentionCount: current.mentionCount + 1,
      dayCount: Math.max(current.dayCount, row.day_number),
    });
  }

  return counts;
}
