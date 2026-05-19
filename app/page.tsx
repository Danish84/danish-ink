import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BriefingBody } from "@/components/briefing-body";
import { DatePickerNav } from "@/components/date-picker-nav";
import { RevealRoot } from "@/components/reveal-root";
import { SiteFooter } from "@/components/site-footer";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Slot = "morning" | "evening";

type Summary = {
  id: string;
  date: string;
  slot: Slot;
  content: string | null;
  status: "success" | "error";
  error_msg: string | null;
  generated_at: string;
};

type ArcStatus = "proposed" | "active" | "closure_candidate" | "closed";

type SummaryArcRow = {
  paragraph_index: number;
  day_number: number;
  arcs:
    | {
        slug: string;
        title: string;
        status: ArcStatus;
      }
    | {
        slug: string;
        title: string;
        status: ArcStatus;
      }[]
    | null;
};

type SummaryWithArcs = Summary & {
  slot_arcs?: SummaryArcRow[] | null;
};

type HomeProps = {
  searchParams?: Promise<{ state?: string; date?: string }>;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({
  searchParams,
}: HomeProps): Promise<Metadata> {
  const params = await searchParams;
  if (params?.date && ISO_DATE.test(params.date)) {
    return { title: `danish.ink — ${formatDate(params.date)}` };
  }
  return { title: "danish.ink — today's edition" };
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const previewError =
    process.env.NODE_ENV === "development" && params?.state === "error";
  const requestedDate =
    params?.date && ISO_DATE.test(params.date) ? params.date : undefined;

  const supabase = await createClient();

  const { data: successDateRows } = await supabase
    .from("summaries")
    .select("date")
    .eq("status", "success")
    .order("date", { ascending: false })
    .returns<Pick<Summary, "date">[]>();

  const availableDates = Array.from(
    new Set((successDateRows ?? []).map((r) => r.date)),
  );
  const latestDate = availableDates[0];

  if (requestedDate && !availableDates.includes(requestedDate)) {
    redirect("/");
  }

  const targetDate = requestedDate ?? latestDate;

  const { data } = targetDate
    ? await supabase
        .from("summaries")
        .select(
          "id, date, slot, content, status, error_msg, generated_at, slot_arcs(paragraph_index, day_number, arcs(slug, title, status))",
        )
        .eq("date", targetDate)
        .order("generated_at", { ascending: false })
        .returns<SummaryWithArcs[]>()
    : { data: null };

  const isLatestView = !requestedDate;
  const rows = (data ?? []).filter((row) =>
    isLatestView ? hasReachedSlotWindow(row) : true,
  );

  const summaries = previewError
    ? [
        {
          id: "dev-preview",
          date: new Date().toISOString().slice(0, 10),
          slot: "evening" as const,
          content: null,
          status: "error" as const,
          error_msg: "Development preview",
          generated_at: new Date().toISOString(),
          slot_arcs: [],
        },
      ]
    : orderByLatestProcessed(rows);

  const displayDate = summaries[0]?.date ?? targetDate;
  const dateLabel = displayDate ? formatDate(displayDate) : null;
  const pendingArcCount = await getPendingArcCount();

  return (
    <RevealRoot className="contents">
      <main className="briefing-shift mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-6 py-10 sm:py-16">
        <header className="relative z-50 flex flex-col">
          <h1 className="reveal-wordmark text-ink font-medium tracking-tight lowercase text-[48px] leading-[1.05] sm:text-[72px]">
            danish.ink
          </h1>
          <div
            className="reveal-rule mt-6 h-px w-full"
            style={{
              background:
                "color-mix(in oklab, var(--muted) 60%, transparent)",
            }}
          />
          <div className="reveal-meta mt-4">
            {availableDates.length > 0 && latestDate && dateLabel ? (
              <DatePickerNav
                dateLabel={dateLabel}
                selectedDate={displayDate ?? latestDate}
                availableDates={availableDates}
                latestDate={latestDate}
              />
            ) : (
              <p
                className="text-[15px] italic"
                style={{
                  color: "var(--muted)",
                  fontFamily: "var(--font-serif), Georgia, serif",
                }}
              >
                A twice-daily world briefing
              </p>
            )}
            {pendingArcCount > 0 ? (
              <Link className="pending-pill mt-3" href="/admin">
                {pendingArcCount} arcs pending
              </Link>
            ) : null}
          </div>
        </header>

        <div className="reveal-body flex flex-col">
          {summaries.length > 0 ? (
            <div className="flex flex-col gap-12">
              {summaries.map((summary, index) => (
                <BriefingSection
                  key={summary.id}
                  summary={summary}
                  isFirst={index === 0}
                />
              ))}
            </div>
          ) : (
            <p className="editors-note">The first edition is still being set.</p>
          )}
        </div>

        <SiteFooter className="reveal-body mt-12" />
      </main>
    </RevealRoot>
  );
}

function BriefingSection({
  summary,
  isFirst,
}: {
  summary: SummaryWithArcs;
  isFirst: boolean;
}) {
  const mark = summary.slot === "morning" ? "☼" : "☾";
  const label =
    summary.slot === "morning" ? "Morning Briefing" : "Evening Briefing";

  return (
    <section
      className={
        isFirst
          ? ""
          : "pt-12 border-t"
      }
      style={
        isFirst
          ? undefined
          : {
              borderColor:
                "color-mix(in oklab, var(--muted) 45%, transparent)",
            }
      }
    >
      <header className="mb-6 flex flex-col gap-1.5">
        <h2
          className="flex items-baseline gap-3 text-[22px] italic"
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            color: "var(--ink)",
            fontWeight: 400,
          }}
        >
          <span
            aria-hidden="true"
            className="not-italic text-[20px]"
            style={{ color: "var(--accent)" }}
          >
            {mark}
          </span>
          <span>{label}</span>
        </h2>
        <p
          className="font-sans text-[10.5px] uppercase"
          style={{
            color: "var(--muted)",
            letterSpacing: "0.16em",
          }}
        >
          Generated {formatGeneratedAt(summary.generated_at)}
        </p>
      </header>

      {summary.status === "error" ? (
        <p className="editors-note">This edition could not be issued.</p>
      ) : summary.content ? (
        <BriefingBody
          content={summary.content}
          arcsByParagraph={buildArcsByParagraph(summary.slot_arcs)}
        />
      ) : (
        <p className="editors-note">Awaiting press time.</p>
      )}
    </section>
  );
}

function buildArcsByParagraph(slotArcs?: SummaryArcRow[] | null) {
  const arcsByParagraph = new Map<
    number,
    {
      slug: string;
      title: string;
      dayNumber: number;
      status: ArcStatus;
    }
  >();

  for (const slotArc of slotArcs ?? []) {
    const arc = Array.isArray(slotArc.arcs) ? slotArc.arcs[0] : slotArc.arcs;
    if (!arc) continue;

    arcsByParagraph.set(slotArc.paragraph_index, {
      slug: arc.slug,
      title: arc.title,
      dayNumber: slotArc.day_number,
      status: arc.status,
    });
  }

  return arcsByParagraph;
}

async function getPendingArcCount() {
  const supabase = createServiceClient();
  const [proposed, closureCandidates] = await Promise.all([
    supabase
      .from("arcs")
      .select("id", { count: "exact", head: true })
      .eq("status", "proposed"),
    supabase
      .from("arcs")
      .select("id", { count: "exact", head: true })
      .eq("status", "closure_candidate"),
  ]);

  return (proposed.count ?? 0) + (closureCandidates.count ?? 0);
}

function orderByLatestProcessed<T extends Summary>(summaries: T[]): T[] {
  return [...summaries].sort((a, b) => {
    const generatedDiff =
      new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
    if (generatedDiff !== 0) return generatedDiff;
    return slotRank(b.slot) - slotRank(a.slot);
  });
}

function slotRank(slot: Slot) {
  return slot === "evening" ? 1 : 0;
}

function hasReachedSlotWindow(summary: Summary) {
  const generated = partsInToronto(summary.generated_at);
  const summaryDate = summary.date;
  const generatedDate = `${generated.year}-${generated.month}-${generated.day}`;
  if (generatedDate !== summaryDate) return true;
  const releaseHour = summary.slot === "morning" ? 7 : 18;
  return generated.hour >= releaseHour;
}

function partsInToronto(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
  };
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
