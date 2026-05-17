import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assignArcs,
  loadArcsForAssignment,
  paragraphsFromContent,
  persistArcAssignments,
  type ArcDecision,
  type ArcForAssignment,
  type DigestParagraph,
  type PersistArcAssignmentsResult,
} from "./arcs";
import { createServiceClient } from "./persistence";
import type { Slot } from "./summarize";

type Logger = Pick<typeof console, "log" | "error">;

export type BackfillSummary = {
  id: string;
  date: string;
  slot: Slot;
  content: string;
};

export type BackfillOptions = {
  from?: string;
  to?: string;
  reset?: boolean;
  client?: SupabaseClient;
  logger?: Logger;
  loadArcs?: (client: SupabaseClient) => Promise<ArcForAssignment[]>;
  loadSummariesForBackfill?: (
    client: SupabaseClient,
    range: { from?: string; to?: string },
  ) => Promise<BackfillSummary[]>;
  resetExistingAssignments?: (
    client: SupabaseClient,
    range: { from?: string; to?: string },
  ) => Promise<number>;
  assign?: (input: {
    paragraphs: DigestParagraph[];
    arcs: ArcForAssignment[];
  }) => Promise<ArcDecision[]>;
  persist?: typeof persistArcAssignments;
};

export type BackfillResult = {
  summariesProcessed: number;
  arcsCreated: number;
  arcsMatched: {
    proposed: number;
    active: number;
    closure_candidate: number;
    closed: number;
  };
  arcsDeleted: number;
  paragraphsSkipped: number;
  failures: number;
};

export function parseBackfillArgs(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      from: { type: "string" },
      to: { type: "string" },
      reset: { type: "boolean", default: false },
    },
  });
  return {
    from: values.from,
    to: values.to,
    reset: values.reset ?? false,
  };
}

export async function runBackfillArcs({
  from,
  to,
  reset = false,
  client = createServiceClient(),
  logger = console,
  loadArcs = loadArcsForAssignment,
  loadSummariesForBackfill = loadSummaries,
  resetExistingAssignments = resetAssignments,
  assign = ({ paragraphs, arcs }) => assignArcs({ paragraphs, arcs }),
  persist = persistArcAssignments,
}: BackfillOptions = {}): Promise<BackfillResult> {
  const result = emptyBackfillResult();
  const summaries = await loadSummariesForBackfill(client, { from, to });

  if (reset) {
    result.arcsDeleted = await resetExistingAssignments(client, { from, to });
  }

  for (const summary of summaries) {
    try {
      const paragraphs = paragraphsFromContent(summary.content);
      const existingIndexes = reset
        ? new Set<number>()
        : await loadAssignedParagraphIndexes(client, summary.id);
      const paragraphsToAssign = paragraphs.filter((paragraph) => {
        const skip = existingIndexes.has(paragraph.index);
        if (skip) result.paragraphsSkipped += 1;
        return !skip;
      });

      if (paragraphsToAssign.length === 0) {
        result.summariesProcessed += 1;
        continue;
      }

      const arcs = await loadArcs(client);
      const decisions = await assign({ paragraphs: paragraphsToAssign, arcs });
      const persisted = await persist({
        client,
        summary,
        decisions,
        arcs,
      });
      addPersistCounts(result, persisted);
      result.summariesProcessed += 1;
    } catch (err) {
      result.failures += 1;
      logger.error(
        `[backfill-arcs] ${summary.date} ${summary.slot} failed: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  logger.log(formatBackfillSummary(result, reset));
  return result;
}

export async function loadSummaries(
  client: SupabaseClient,
  range: { from?: string; to?: string },
): Promise<BackfillSummary[]> {
  let query = client
    .from("summaries")
    .select("id, date, slot, content")
    .eq("status", "success")
    .not("content", "is", null)
    .order("date", { ascending: true })
    .order("generated_at", { ascending: true });

  if (range.from) query = query.gte("date", range.from);
  if (range.to) query = query.lte("date", range.to);

  const { data, error } = await query;
  if (error) throw new Error(`loadSummaries: ${error.message}`);

  return ((data ?? []) as BackfillSummary[]).filter(
    (summary) => summary.content.trim().length > 0,
  );
}

export async function resetAssignments(
  client: SupabaseClient,
  range: { from?: string; to?: string },
): Promise<number> {
  const summaries = await loadSummaries(client, range);
  const summaryIds = summaries.map((summary) => summary.id);
  if (summaryIds.length === 0) return 0;

  const { data: rows, error: loadError } = await client
    .from("slot_arcs")
    .select("arc_id")
    .in("summary_id", summaryIds);
  if (loadError) throw new Error(`resetAssignments load: ${loadError.message}`);

  const touchedArcIds = Array.from(
    new Set(((rows ?? []) as { arc_id: string }[]).map((row) => row.arc_id)),
  );

  const { error: deleteError } = await client
    .from("slot_arcs")
    .delete()
    .in("summary_id", summaryIds);
  if (deleteError) {
    throw new Error(`resetAssignments delete slots: ${deleteError.message}`);
  }

  return deleteFullyOrphanedArcs(client, touchedArcIds);
}

export async function deleteFullyOrphanedArcs(
  client: SupabaseClient,
  touchedArcIds: string[],
): Promise<number> {
  let deleted = 0;
  for (const arcId of touchedArcIds) {
    const { data: remaining, error: remainingError } = await client
      .from("slot_arcs")
      .select("arc_id")
      .eq("arc_id", arcId)
      .limit(1);
    if (remainingError) {
      throw new Error(`resetAssignments check orphan: ${remainingError.message}`);
    }
    if ((remaining ?? []).length > 0) continue;

    const { error: arcDeleteError } = await client
      .from("arcs")
      .delete()
      .eq("id", arcId);
    if (arcDeleteError) {
      throw new Error(`resetAssignments delete arc: ${arcDeleteError.message}`);
    }
    deleted += 1;
  }

  return deleted;
}

export async function loadAssignedParagraphIndexes(
  client: SupabaseClient,
  summaryId: string,
): Promise<Set<number>> {
  const { data, error } = await client
    .from("slot_arcs")
    .select("paragraph_index")
    .eq("summary_id", summaryId);
  if (error) throw new Error(`loadAssignedParagraphIndexes: ${error.message}`);
  return new Set(
    ((data ?? []) as { paragraph_index: number }[]).map(
      (row) => row.paragraph_index,
    ),
  );
}

export function formatBackfillSummary(
  result: BackfillResult,
  includedResetCount: boolean,
) {
  const matched =
    result.arcsMatched.proposed +
    result.arcsMatched.active +
    result.arcsMatched.closure_candidate +
    result.arcsMatched.closed;
  const resetPart = includedResetCount
    ? `, arcsDeleted=${result.arcsDeleted}`
    : "";
  return `[backfill-arcs] complete: summariesProcessed=${result.summariesProcessed}, arcsCreated=${result.arcsCreated}, arcsMatched=${matched} (active=${result.arcsMatched.active}, closed=${result.arcsMatched.closed}), paragraphsSkipped=${result.paragraphsSkipped}, failures=${result.failures}${resetPart}`;
}

function addPersistCounts(
  result: BackfillResult,
  persisted: PersistArcAssignmentsResult,
) {
  result.arcsCreated += persisted.created;
  result.arcsMatched.proposed += persisted.matched.proposed;
  result.arcsMatched.active += persisted.matched.active;
  result.arcsMatched.closure_candidate += persisted.matched.closure_candidate;
  result.arcsMatched.closed += persisted.matched.closed;
}

function emptyBackfillResult(): BackfillResult {
  return {
    summariesProcessed: 0,
    arcsCreated: 0,
    arcsMatched: {
      proposed: 0,
      active: 0,
      closure_candidate: 0,
      closed: 0,
    },
    arcsDeleted: 0,
    paragraphsSkipped: 0,
    failures: 0,
  };
}

async function main() {
  await runBackfillArcs(parseBackfillArgs());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(
      `[backfill-arcs] failed: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  });
}
