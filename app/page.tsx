import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Summary = {
  id: string;
  date: string;
  slot: "morning" | "evening";
  content: string | null;
  status: "success" | "error";
  generated_at: string;
};

export default async function Home() {
  const supabase = await createClient();
  const { data: summary } = await supabase
    .from("summaries")
    .select("id, date, slot, content, status, generated_at")
    .eq("status", "success")
    .order("date", { ascending: false })
    .order("slot", { ascending: false })
    .limit(1)
    .maybeSingle<Summary>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          danish.ink
        </h1>
        {summary ? (
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {formatHeader(summary.date, summary.slot)}
          </p>
        ) : (
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            A twice-daily world briefing
          </p>
        )}
      </header>

      {summary?.content ? (
        <article className="whitespace-pre-wrap text-lg leading-relaxed">
          {summary.content}
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
