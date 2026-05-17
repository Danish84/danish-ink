import { redirect } from "next/navigation";

import { DatePickerNav } from "@/components/date-picker-nav";
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

type HomeProps = {
  searchParams?: Promise<{ state?: string; date?: string }>;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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
        .select("id, date, slot, content, status, error_msg, generated_at")
        .eq("date", targetDate)
        .order("generated_at", { ascending: false })
        .returns<Summary[]>()
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
        },
      ]
    : orderByLatestProcessed(rows);

  const displayDate = summaries[0]?.date ?? targetDate;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          danish.ink
        </h1>
        {displayDate ? (
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {formatDate(displayDate)}
          </p>
        ) : (
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            A twice-daily world briefing
          </p>
        )}
        {availableDates.length > 0 && latestDate ? (
          <div className="mt-2">
            <DatePickerNav
              selectedDate={displayDate ?? latestDate}
              availableDates={availableDates}
              latestDate={latestDate}
            />
          </div>
        ) : null}
      </header>

      {summaries.length > 0 ? (
        <div className="flex flex-col gap-12">
          {summaries.map((summary) => (
            <section
              key={summary.id}
              className="border-t border-border pt-6 first:border-t-0 first:pt-0"
            >
              <header className="mb-5 flex flex-col gap-1">
                <h2 className="text-xl font-semibold tracking-tight">
                  {formatSlot(summary.slot)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Generated {formatGeneratedAt(summary.generated_at)}
                </p>
              </header>

              {summary.status === "error" ? (
                <p className="text-lg text-muted-foreground">
                  Summary unavailable for this slot.
                </p>
              ) : summary.content ? (
                <article className="whitespace-pre-wrap text-lg leading-relaxed">
                  {summary.content}
                </article>
              ) : null}
            </section>
          ))}
        </div>
      ) : (
        <p className="text-lg text-muted-foreground">
          No digest yet. Check back soon.
        </p>
      )}
    </main>
  );
}

function orderByLatestProcessed(summaries: Summary[]): Summary[] {
  return [...summaries].sort((a, b) => {
    const generatedDiff =
      new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
    if (generatedDiff !== 0) {
      return generatedDiff;
    }
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

  if (generatedDate !== summaryDate) {
    return true;
  }

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

function formatSlot(slot: Slot) {
  return slot === "morning" ? "Morning Briefing" : "Evening Briefing";
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
