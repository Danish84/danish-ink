import { splitDigestParagraphs } from "../paragraphs";
import { createClient } from "../supabase/server";

export type Slot = "morning" | "evening";
export type ArcStatus = "active" | "closure_candidate" | "closed";

export type Arc = {
  id: string;
  slug: string;
  title: string;
  status: ArcStatus;
  opened_at: string;
  closed_at: string | null;
};

export type LoadArcArgs = { slug: string };

export type LoadArcEntry = {
  paragraph: string;
  date: string;
  slot: Slot;
  generatedAt: string;
  dayNumber: number;
};

export type LoadArcResult = { arc: Arc; entries: LoadArcEntry[] } | null;

type Assignment = {
  paragraph_index: number;
  day_number: number;
  summaries:
    | {
        date: string;
        slot: Slot;
        content: string | null;
        generated_at: string;
        status: "success" | "error";
      }
    | {
        date: string;
        slot: Slot;
        content: string | null;
        generated_at: string;
        status: "success" | "error";
      }[]
    | null;
};

export function slotRank(slot: Slot) {
  return slot === "evening" ? 1 : 0;
}

export async function loadArc({
  slug,
}: LoadArcArgs): Promise<LoadArcResult> {
  const supabase = await createClient();

  const { data: arc } = await supabase
    .from("arcs")
    .select("id, slug, title, status, opened_at, closed_at")
    .eq("slug", slug)
    .maybeSingle<Arc>();

  if (!arc) return null;

  const { data: assignmentRows } = await supabase
    .from("slot_arcs")
    .select(
      "paragraph_index, day_number, summaries(date, slot, content, generated_at, status)",
    )
    .eq("arc_id", arc.id)
    .returns<Assignment[]>();

  const entries: LoadArcEntry[] = (assignmentRows ?? [])
    .map((assignment) => {
      const summary = Array.isArray(assignment.summaries)
        ? assignment.summaries[0]
        : assignment.summaries;
      if (!summary?.content || summary.status !== "success") return null;

      const paragraph = splitDigestParagraphs(summary.content)[
        assignment.paragraph_index
      ];
      if (!paragraph) return null;

      return {
        paragraph,
        date: summary.date,
        slot: summary.slot,
        generatedAt: summary.generated_at,
        dayNumber: assignment.day_number,
      };
    })
    .filter((entry): entry is LoadArcEntry => Boolean(entry))
    .sort((a, b) => {
      const generatedDiff =
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
      if (generatedDiff !== 0) return generatedDiff;
      return slotRank(b.slot) - slotRank(a.slot);
    });

  return { arc, entries };
}
