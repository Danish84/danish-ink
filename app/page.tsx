import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Summary = {
  id: string;
  date: string;
  slot: "morning" | "evening";
  content: string | null;
  status: "success" | "error";
  error_msg: string | null;
  generated_at: string;
};

type HomeProps = {
  searchParams?: Promise<{ state?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const previewError =
    process.env.NODE_ENV === "development" && params?.state === "error";

  const supabase = await createClient();
  const { data: summary } = await supabase
    .from("summaries")
    .select("id, date, slot, content, status, error_msg, generated_at")
    .order("date", { ascending: false })
    .order("slot", { ascending: false })
    .limit(1)
    .maybeSingle<Summary>();

  const displaySummary = previewError
    ? {
        id: "dev-preview",
        date: new Date().toISOString().slice(0, 10),
        slot: "evening" as const,
        content: null,
        status: "error" as const,
        error_msg: "Development preview",
        generated_at: new Date().toISOString(),
      }
    : summary;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          danish.ink
        </h1>
        {displaySummary ? (
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {formatHeader(displaySummary.date, displaySummary.slot)}
          </p>
        ) : (
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            A twice-daily world briefing
          </p>
        )}
      </header>

      {displaySummary?.status === "error" ? (
        <p className="text-lg text-muted-foreground">
          Summary unavailable for this slot.
        </p>
      ) : displaySummary?.content ? (
        <article className="whitespace-pre-wrap text-lg leading-relaxed">
          {displaySummary.content}
        </article>
      ) : (
        <p className="text-lg text-muted-foreground">
          No digest yet. Check back soon.
        </p>
      )}
    </main>
  );
}

function formatHeader(date: string, slot: "morning" | "evening") {
  const d = new Date(`${date}T00:00:00`);
  const pretty = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${pretty} · ${slot}`;
}
