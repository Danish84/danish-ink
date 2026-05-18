import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { splitDigestParagraphs } from "../lib/paragraphs";
import type { Slot } from "./summarize";

export type ArcStatus = "proposed" | "active" | "closure_candidate" | "closed";

export type ArcForAssignment = {
  id: string;
  slug?: string;
  title: string;
  description: string | null;
  status: ArcStatus;
};

export type DigestParagraph = {
  index: number;
  text: string;
};

export type SavedSummaryForArcs = {
  id: string;
  date: string;
  slot: Slot;
  content: string | null;
};

export type ArcDecision =
  | { paragraph_index: number; type: "existing"; arc_id: string }
  | {
      paragraph_index: number;
      type: "new";
      proposed_title: string;
      proposed_description: string;
    }
  | { paragraph_index: number; type: "none" };

export type PersistArcAssignmentsResult = {
  decisions: number;
  none: number;
  created: number;
  matched: {
    proposed: number;
    active: number;
    closure_candidate: number;
    closed: number;
  };
};

export const ARC_ASSIGNMENT_SYSTEM_PROMPT = `You assign paragraphs from a twice-daily world news digest to story arcs.

A story arc is a SPECIFIC ongoing event that meets ALL THREE criteria:
1. A discrete, named event currently in progress (not a broad topic or category).
2. Will plausibly generate further news updates in coming days or weeks.
3. Has a foreseeable end — a moment when the story will resolve or conclude.

Arcs can be long-running or short-running, as long as they have a beginning and an expected end.

Examples that ARE arcs:
- "Russia-Ukraine war" — began Feb 2022, ongoing, will end.
- "Trump's visit to China" — defined trip with daily updates and a clear end.
- "US presidential election 2026" — bounded campaign with a known conclusion.
- "Gaza ceasefire talks, May 2026" — a specific negotiation round.
- "Search for missing flight MH-X" — bounded effort with an eventual resolution.

Examples that are NOT arcs (return "none"):
- Single incidents with no expected follow-up: "Plane crashes in Denver," "Mayor arrested for fraud."
- Broad topics or categories: "Climate change," "Inflation," "Tensions in the Middle East."
- Routine policy announcements with no ongoing narrative.

Updates inside an existing arc are not their own arcs:
A paragraph about a single Russian drone strike on Kyiv is an UPDATE of the "Russia-Ukraine war" arc, not a new arc. Match such paragraphs to the existing arc via "existing" instead of creating duplicates. If the parent arc isn't in the list yet, propose the broader arc as "new" rather than the individual update.

Decision order — follow this sequence for every paragraph:
1. Scan the ENTIRE list of existing arcs first. If any existing arc plausibly covers the paragraph's event — even loosely — choose "existing" with that arc's id. Read each arc's title AND description before deciding it doesn't match.
2. Only if no existing arc fits, evaluate whether the paragraph describes a new event that meets all three criteria above. If yes, choose "new".
3. Otherwise, return "none".

Prefer matching to existing arcs. Creating a duplicate of an arc that already exists is worse than missing a new one — a curator can always add a new arc later, but reconciling duplicates is costly. When in doubt between "existing" and "new", choose "existing".

Each paragraph can have at most one arc.

Title guidance: 3-7 words, naming the event itself ("Iran nuclear talks 2026"), not a headline summary of the latest development.

Return only strict JSON in this shape:
{
  "assignments": [
    { "paragraph_index": 0, "type": "existing", "arc_id": "uuid-from-list" },
    { "paragraph_index": 1, "type": "new", "proposed_title": "Short bounded title", "proposed_description": "One sentence description." },
    { "paragraph_index": 2, "type": "none" }
  ]
}`;

type RawAssignment = {
  paragraph_index?: unknown;
  type?: unknown;
  arc_id?: unknown;
  proposed_title?: unknown;
  title?: unknown;
  proposed_description?: unknown;
  description?: unknown;
};

export function paragraphsFromContent(content: string): DigestParagraph[] {
  return splitDigestParagraphs(content).map((text, index) => ({ index, text }));
}

export function buildArcAssignmentPrompt(
  paragraphs: DigestParagraph[],
  arcs: ArcForAssignment[],
): string {
  const arcLines =
    arcs.length === 0
      ? "[]"
      : JSON.stringify(
          arcs.map((arc) => ({
            id: arc.id,
            title: arc.title,
            description: arc.description ?? "",
            status: arc.status,
          })),
          null,
          2,
        );

  const paragraphLines = JSON.stringify(paragraphs, null, 2);

  const prompt = `Existing arcs:
${arcLines}

Digest paragraphs:
${paragraphLines}

Decide for each paragraph whether it belongs to one existing arc, starts one new bounded arc, or belongs to no arc.`;
  return `${prompt}

Closed arcs are included for resurgence detection. Choose a closed arc only when the paragraph is an unambiguous continuation of that exact bounded story.`;
}

export function parseArcAssignmentResponse(
  text: string,
  arcs: ArcForAssignment[],
): ArcDecision[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFence(text));
  } catch (error) {
    throw new Error(
      `parseArcAssignmentResponse: invalid JSON: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }

  const rawAssignments = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        "assignments" in parsed &&
        Array.isArray((parsed as { assignments: unknown }).assignments)
      ? (parsed as { assignments: unknown[] }).assignments
      : null;

  if (!rawAssignments) {
    throw new Error(
      'parseArcAssignmentResponse: expected an "assignments" array',
    );
  }

  const validArcIds = new Set(arcs.map((arc) => arc.id));
  const decisions: ArcDecision[] = [];

  for (const raw of rawAssignments as RawAssignment[]) {
    if (!raw || typeof raw !== "object") continue;
    if (!Number.isInteger(raw.paragraph_index)) continue;

    const paragraphIndex = raw.paragraph_index as number;
    if (raw.type === "none") {
      decisions.push({ paragraph_index: paragraphIndex, type: "none" });
      continue;
    }

    if (raw.type === "existing") {
      if (typeof raw.arc_id === "string" && validArcIds.has(raw.arc_id)) {
        decisions.push({
          paragraph_index: paragraphIndex,
          type: "existing",
          arc_id: raw.arc_id,
        });
      } else {
        decisions.push({
          paragraph_index: paragraphIndex,
          type: "new",
          proposed_title: "Review needed",
          proposed_description:
            "The model returned an existing arc id that was not in the prompt.",
        });
      }
      continue;
    }

    if (raw.type === "new") {
      const title = stringValue(raw.proposed_title) ?? stringValue(raw.title);
      const description =
        stringValue(raw.proposed_description) ?? stringValue(raw.description);
      if (!title || !description) continue;
      decisions.push({
        paragraph_index: paragraphIndex,
        type: "new",
        proposed_title: title,
        proposed_description: description,
      });
    }
  }

  return decisions;
}

export async function assignArcs({
  paragraphs,
  arcs,
  client,
  model = "claude-haiku-4-5",
}: {
  paragraphs: DigestParagraph[];
  arcs: ArcForAssignment[];
  client?: Anthropic;
  model?: string;
}): Promise<ArcDecision[]> {
  if (paragraphs.length === 0) return [];

  const anthropic =
    client ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const arcList = buildArcAssignmentPrompt([], arcs).replace(
    "Digest paragraphs:\n[]\n\nDecide for each paragraph whether it belongs to one existing arc, starts one new bounded arc, or belongs to no arc.",
    "",
  );

  const message = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: ARC_ASSIGNMENT_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: arcList.trim(),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: `Digest paragraphs:\n${JSON.stringify(paragraphs, null, 2)}`,
          },
        ],
      },
    ],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error("assignArcs: model returned no text block");
  }
  const decisions = parseArcAssignmentResponse(block.text, arcs);
  if (decisions.length === 0) {
    throw new Error("assignArcs: model returned zero assignment decisions");
  }
  return decisions;
}

export async function loadArcsForAssignment(
  client: SupabaseClient,
): Promise<ArcForAssignment[]> {
  const { data, error } = await client
    .from("arcs")
    .select("id, slug, title, description, status")
    .in("status", ["proposed", "active", "closure_candidate", "closed"])
    .order("last_mentioned_at", { ascending: false });

  if (error) throw new Error(`loadArcsForAssignment: ${error.message}`);
  return (data ?? []) as ArcForAssignment[];
}

export async function sweepClosureCandidates(
  client: SupabaseClient,
  now: Date = new Date(),
): Promise<number> {
  const threshold = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const { data, error } = await client
    .from("arcs")
    .update({ status: "closure_candidate" })
    .eq("status", "active")
    .lt("last_mentioned_at", threshold)
    .select("id");

  if (error) throw new Error(`sweepClosureCandidates: ${error.message}`);
  return (data ?? []).length;
}

export async function assignSavedSummaryArcs({
  summary,
  client,
  anthropic,
  model,
}: {
  summary: SavedSummaryForArcs;
  client: SupabaseClient;
  anthropic?: Anthropic;
  model?: string;
}): Promise<PersistArcAssignmentsResult> {
  if (!summary.content) return emptyPersistResult();
  const paragraphs = paragraphsFromContent(summary.content);
  const arcs = await loadArcsForAssignment(client);
  const decisions = await assignArcs({
    paragraphs,
    arcs,
    client: anthropic,
    model,
  });
  return persistArcAssignments({ client, summary, decisions, arcs });
}

export async function persistArcAssignments({
  client,
  summary,
  decisions,
  arcs,
}: {
  client: SupabaseClient;
  summary: SavedSummaryForArcs;
  decisions: ArcDecision[];
  arcs: ArcForAssignment[];
}): Promise<PersistArcAssignmentsResult> {
  const result = emptyPersistResult();
  result.decisions = decisions.length;
  const arcsById = new Map(arcs.map((arc) => [arc.id, arc]));
  const dayNumberCache = new Map<string, number>();

  for (const decision of decisions) {
    if (decision.type === "none") {
      result.none += 1;
      continue;
    }

    if (decision.type === "new") {
      const arc = await createProposedArc(client, {
        title: decision.proposed_title,
        description: decision.proposed_description,
        summaryId: summary.id,
        paragraphIndex: decision.paragraph_index,
      });
      await insertSlotArc(client, {
        summaryId: summary.id,
        paragraphIndex: decision.paragraph_index,
        arcId: arc.id,
        dayNumber: 1,
      });
      arcsById.set(arc.id, arc);
      result.created += 1;
      continue;
    }

    const arc = arcsById.get(decision.arc_id);
    if (!arc) continue;

    let dayNumber = dayNumberCache.get(decision.arc_id);
    if (!dayNumber) {
      dayNumber = await computeDayNumber(client, decision.arc_id, summary.date);
      dayNumberCache.set(decision.arc_id, dayNumber);
    }

    await insertSlotArc(client, {
      summaryId: summary.id,
      paragraphIndex: decision.paragraph_index,
      arcId: decision.arc_id,
      dayNumber,
    });

    const { error } = await client
      .from("arcs")
      .update({ last_mentioned_at: new Date().toISOString() })
      .eq("id", decision.arc_id);
    if (error) throw new Error(`update arc last_mentioned_at: ${error.message}`);

    result.matched[arc.status] += 1;
  }

  return result;
}

export async function computeDayNumber(
  client: SupabaseClient,
  arcId: string,
  summaryDate: string,
): Promise<number> {
  const { data, error } = await client
    .from("slot_arcs")
    .select("summaries!inner(date)")
    .eq("arc_id", arcId)
    .lt("summaries.date", summaryDate);

  if (error) throw new Error(`computeDayNumber: ${error.message}`);

  const dates = new Set<string>();
  for (const row of (data ?? []) as { summaries?: { date?: string } | null }[]) {
    if (row.summaries?.date) dates.add(row.summaries.date);
  }
  return dates.size + 1;
}

export async function createProposedArc(
  client: SupabaseClient,
  input: {
    title: string;
    description: string;
    summaryId: string;
    paragraphIndex: number;
  },
): Promise<ArcForAssignment> {
  const slug = await uniqueSlugForTitle(client, input.title);
  const { data, error } = await client
    .from("arcs")
    .insert({
      slug,
      title: input.title,
      description: input.description,
      status: "proposed",
      proposed_from_summary_id: input.summaryId,
      proposed_from_paragraph_index: input.paragraphIndex,
      last_mentioned_at: new Date().toISOString(),
    })
    .select("id, slug, title, description, status")
    .single();

  if (error) throw new Error(`createProposedArc: ${error.message}`);
  return data as ArcForAssignment;
}

export async function uniqueSlugForTitle(
  client: SupabaseClient,
  title: string,
): Promise<string> {
  const base = slugify(title);
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const { data, error } = await client
      .from("arcs")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`uniqueSlugForTitle: ${error.message}`);
    if (!data) return slug;
  }
  throw new Error(`uniqueSlugForTitle: could not find free slug for ${title}`);
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return slug || "story-arc";
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Haiku occasionally wraps strict-JSON output in a ```json ... ``` fence.
// JSON.parse rejects the backticks, so strip a leading + trailing fence if present.
export function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/.exec(trimmed);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

async function insertSlotArc(
  client: SupabaseClient,
  input: {
    summaryId: string;
    paragraphIndex: number;
    arcId: string;
    dayNumber: number;
  },
) {
  const { error } = await client.from("slot_arcs").upsert(
    {
      summary_id: input.summaryId,
      paragraph_index: input.paragraphIndex,
      arc_id: input.arcId,
      day_number: input.dayNumber,
    },
    { onConflict: "summary_id,paragraph_index" },
  );
  if (error) throw new Error(`insertSlotArc: ${error.message}`);
}

function emptyPersistResult(): PersistArcAssignmentsResult {
  return {
    decisions: 0,
    none: 0,
    created: 0,
    matched: {
      proposed: 0,
      active: 0,
      closure_candidate: 0,
      closed: 0,
    },
  };
}
