import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { splitDigestParagraphs } from "@/lib/paragraphs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Slot = "morning" | "evening";
type ArcStatus = "active" | "closure_candidate" | "closed";

type Arc = {
  id: string;
  slug: string;
  title: string;
  status: ArcStatus;
  opened_at: string;
  closed_at: string | null;
};

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

type ArcPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ArcPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: arc } = await supabase
    .from("arcs")
    .select("title")
    .eq("slug", slug)
    .maybeSingle<{ title: string }>();

  return {
    title: arc ? `danish.ink - ${arc.title}` : "danish.ink",
  };
}

export default async function ArcPage({ params }: ArcPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: arc } = await supabase
    .from("arcs")
    .select("id, slug, title, status, opened_at, closed_at")
    .eq("slug", slug)
    .maybeSingle<Arc>();

  if (!arc) notFound();

  const { data: assignmentRows } = await supabase
    .from("slot_arcs")
    .select(
      "paragraph_index, day_number, summaries(date, slot, content, generated_at, status)",
    )
    .eq("arc_id", arc.id)
    .returns<Assignment[]>();

  const entries = (assignmentRows ?? [])
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
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => {
      const generatedDiff =
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
      if (generatedDiff !== 0) return generatedDiff;
      return slotRank(b.slot) - slotRank(a.slot);
    });

  const mentionCount = entries.length;
  const dayCount = Math.max(1, ...entries.map((entry) => entry.dayNumber));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10 sm:py-16">
      <header className="mb-12">
        <p
          className="font-sans text-[10.5px] uppercase"
          style={{ color: "var(--muted)", letterSpacing: "0.18em" }}
        >
          Story Arc
        </p>
        <h1 className="mt-4 font-sans text-[28px] uppercase leading-tight sm:text-[40px]">
          {arc.title}
        </h1>
        <p
          className="mt-4 font-sans text-[10.5px] uppercase"
          style={{ color: "var(--muted)", letterSpacing: "0.16em" }}
        >
          opened {formatShortDate(arc.opened_at)} &middot;{" "}
          {arc.status === "closed" && arc.closed_at
            ? `closed ${formatShortDate(arc.closed_at)}`
            : formatStatus(arc.status)}{" "}
          &middot; {dayCount} {dayCount === 1 ? "day" : "days"} &middot;{" "}
          {mentionCount} {mentionCount === 1 ? "mention" : "mentions"}
        </p>
      </header>

      {entries.length > 0 ? (
        <article className="arc-log">
          {entries.map((entry, index) => (
            <section
              key={`${entry.generatedAt}-${entry.slot}-${index}`}
              className={index === 0 ? "" : "border-t pt-8"}
              style={
                index === 0
                  ? undefined
                  : {
                      borderColor:
                        "color-mix(in oklab, var(--muted) 45%, transparent)",
                    }
              }
            >
              <p
                className="font-sans text-[10.5px] uppercase"
                style={{ color: "var(--muted)", letterSpacing: "0.16em" }}
              >
                {formatLogDate(entry.date)} &middot; {entry.slot}
              </p>
              <p className="mt-4">{entry.paragraph}</p>
            </section>
          ))}
        </article>
      ) : (
        <p className="editors-note">No published mentions yet.</p>
      )}

      <SiteFooter className="mt-12" />
    </main>
  );
}

function slotRank(slot: Slot) {
  return slot === "evening" ? 1 : 0;
}

function formatStatus(status: ArcStatus) {
  return status === "closure_candidate" ? "active" : status;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLogDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
