import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { aggregateArcCounts, type ArcStatus } from "@/lib/arc-metrics";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "danish.ink - story arcs",
};

type Arc = {
  id: string;
  slug: string;
  title: string;
  status: Exclude<ArcStatus, "proposed">;
  opened_at: string;
  closed_at: string | null;
  last_mentioned_at: string;
};

type SlotArcCountRow = {
  arc_id: string;
  day_number: number;
};

const ACTIVE_EMPTY_COPY =
  "No developing arcs have been opened for public reading yet.";
const CLOSED_EMPTY_COPY = "No arcs have reached the archive yet.";

export default async function ArcsIndexPage() {
  const supabase = await createClient();

  const { data: arcs } = await supabase
    .from("arcs")
    .select("id, slug, title, status, opened_at, closed_at, last_mentioned_at")
    .in("status", ["active", "closure_candidate", "closed"])
    .returns<Arc[]>();

  const arcRows = arcs ?? [];
  const arcIds = arcRows.map((arc) => arc.id);

  const { data: slotArcRows } =
    arcIds.length > 0
      ? await supabase
          .from("slot_arcs")
          .select("arc_id, day_number")
          .in("arc_id", arcIds)
          .returns<SlotArcCountRow[]>()
      : { data: [] as SlotArcCountRow[] };

  const countsByArc = aggregateArcCounts(slotArcRows ?? []);
  const activeArcs = arcRows
    .filter((arc) => arc.status === "active" || arc.status === "closure_candidate")
    .sort(
      (a, b) =>
        new Date(b.last_mentioned_at).getTime() -
        new Date(a.last_mentioned_at).getTime(),
    );
  const closedArcs = arcRows
    .filter((arc) => arc.status === "closed")
    .sort(
      (a, b) =>
        new Date(b.closed_at ?? 0).getTime() -
        new Date(a.closed_at ?? 0).getTime(),
    );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10 sm:py-16">
      <header
        className="mb-12 border-b pb-8"
        style={{
          borderColor: "color-mix(in oklab, var(--muted) 45%, transparent)",
        }}
      >
        <p className="editorial-meta">Danish.ink</p>
        <h1 className="mt-4 font-sans text-[28px] uppercase leading-tight sm:text-[40px]">
          Story Arcs
        </h1>
        <p className="editors-note mt-4">
          Developing threads and finished stories from the briefing archive.
        </p>
      </header>

      <div className="arc-index flex flex-col gap-14">
        <ArcSection
          title="Active"
          emptyCopy={ACTIVE_EMPTY_COPY}
          arcs={activeArcs.map((arc) => {
            const counts = countsByArc.get(arc.id);
            return {
              slug: arc.slug,
              title: arc.title,
              dayCount: counts?.dayCount ?? 0,
              mentionCount: counts?.mentionCount ?? 0,
              dateLabel: `most recent ${formatShortDate(arc.last_mentioned_at)}`,
            };
          })}
        />
        <ArcSection
          title="Closed"
          emptyCopy={CLOSED_EMPTY_COPY}
          arcs={closedArcs.map((arc) => {
            const counts = countsByArc.get(arc.id);
            return {
              slug: arc.slug,
              title: arc.title,
              dayCount: counts?.dayCount ?? 0,
              mentionCount: counts?.mentionCount ?? 0,
              dateLabel: arc.closed_at
                ? `closed ${formatShortDate(arc.closed_at)}`
                : "closed",
            };
          })}
        />
      </div>

      <SiteFooter className="mt-12" />
    </main>
  );
}

function ArcSection({
  title,
  emptyCopy,
  arcs,
}: {
  title: string;
  emptyCopy: string;
  arcs: {
    slug: string;
    title: string;
    dayCount: number;
    mentionCount: number;
    dateLabel: string;
  }[];
}) {
  return (
    <section>
      <h2 className="editorial-meta">{title}</h2>
      {arcs.length > 0 ? (
        <ol className="mt-5">
          {arcs.map((arc) => (
            <li key={arc.slug} className="arc-index-entry">
              <Link className="arc-index-title" href={`/arc/${arc.slug}`}>
                {arc.title}
              </Link>
              <p className="editorial-meta mt-2">
                {formatCount(arc.dayCount, "day")} &middot;{" "}
                {formatCount(arc.mentionCount, "mention")} &middot;{" "}
                {arc.dateLabel}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="editors-note mt-5">{emptyCopy}</p>
      )}
    </section>
  );
}

function formatCount(count: number, singular: string) {
  const label = count === 1 ? singular : `${singular}s`;
  return `${count} ${label}`;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
