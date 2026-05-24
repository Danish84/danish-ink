import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DatePickerNav } from "@/components/date-picker-nav";
import { RevealRoot } from "@/components/reveal-root";
import { SiteFooter } from "@/components/site-footer";
import {
  formatArcLabel,
  getAdjacentBriefings,
  getBriefingDates,
  getBriefingByDate,
  getMovementArc,
} from "@/lib/ink/static";

type InkBriefingPageProps = {
  params: Promise<{ date: string }>;
};

export async function generateMetadata({
  params,
}: InkBriefingPageProps): Promise<Metadata> {
  const { date } = await params;
  const briefing = getBriefingByDate(date);

  if (!briefing) {
    return {
      title: "danish.ink - briefing not found",
    };
  }

  return {
    title: `danish.ink - ${formatDisplayDate(briefing.date)}`,
    description: briefing.lead.title,
  };
}

export default async function InkBriefingPage({
  params,
}: InkBriefingPageProps) {
  const { date } = await params;
  const briefing = getBriefingByDate(date);

  if (!briefing) {
    notFound();
  }

  const adjacent = getAdjacentBriefings(briefing.date);
  const availableDates = getBriefingDates();

  return (
    <RevealRoot className="contents">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:py-16 lg:px-10">
        <header className="relative z-50 flex flex-col">
          <Link
            href="/ink"
            className="reveal-wordmark text-ink w-fit font-medium tracking-tight lowercase text-[48px] leading-[1.05] sm:text-[72px]"
          >
            danish.ink
          </Link>
          <div
            className="reveal-rule mt-6 h-px w-full"
            style={{
              background:
                "color-mix(in oklab, var(--muted) 60%, transparent)",
            }}
          />
        </header>

        <main className="reveal-body mt-12 flex flex-col">
          <article className="grid gap-y-8 lg:grid-cols-[minmax(0,42rem)_minmax(17rem,1fr)] lg:gap-x-16">
            <h2 className="font-sans text-[18px] leading-none font-medium tracking-[0.08em] text-ink uppercase">
              Today&apos;s briefing
            </h2>

            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 lg:col-start-2 lg:row-start-1 lg:justify-end">
              <Link href="/ink" className="editorial-link editorial-meta w-fit">
                Back to ink
              </Link>
              <span aria-hidden="true" className="hidden text-muted lg:inline">
                /
              </span>
              <DatePickerNav
                dateLabel={formatDisplayDate(briefing.date)}
                selectedDate={briefing.date}
                availableDates={availableDates}
                latestDate={availableDates[0] ?? briefing.date}
                routeMode="ink"
                variant="meta"
              />
            </div>

            <div className="w-full lg:col-span-2">
              <h1
                className="text-[32px] leading-[1.12] font-normal italic sm:text-[42px]"
                style={{
                  fontFamily: "var(--font-serif), Georgia, serif",
                }}
              >
                {briefing.lead.title}
              </h1>

              <IssueSection label="LEAD" className="mt-10">
                <div className="briefing-body">
                  {briefing.lead.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </IssueSection>

              <IssueSection label="WHAT CHANGED">
                <div className="flex flex-col gap-6">
                  {briefing.whatChanged.map((movement) => {
                    const arc = getMovementArc(movement);

                    return (
                      <section
                        key={movement.arcSlug}
                        className="grid gap-3 border-t pt-5 first:border-t-0 first:pt-0 sm:grid-cols-[8.5rem_1fr] sm:gap-5"
                        style={{
                          borderColor:
                            "color-mix(in oklab, var(--muted) 30%, transparent)",
                        }}
                      >
                        <div>
                          {arc ? (
                            <Link
                              href={`/ink/arc/${arc.slug}`}
                              className="group block w-fit"
                              aria-label={`Open ${formatArcLabel(arc)}: ${arc.title}`}
                            >
                              <span className="editorial-link editorial-meta inline-flex items-center gap-1.5">
                                {formatArcLabel(arc)}
                                <span aria-hidden="true">-&gt;</span>
                              </span>
                              <span className="mt-1 block text-[15px] leading-[1.35] italic transition-colors group-hover:text-accent group-focus-visible:text-accent">
                                {arc.title}
                              </span>
                            </Link>
                          ) : (
                            <p className="editorial-meta">Arc</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-3 text-[17px] leading-[1.62]">
                          {movement.body.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </IssueSection>

              {briefing.elsewhere.length > 0 ? (
                <IssueSection label="ELSEWHERE">
                  <div className="flex flex-col gap-6">
                    {briefing.elsewhere.map((item) => (
                      <section
                        key={item.title}
                        className="border-t pt-5 first:border-t-0 first:pt-0"
                        style={{
                          borderColor:
                            "color-mix(in oklab, var(--muted) 30%, transparent)",
                        }}
                      >
                        <h2 className="text-[21px] leading-[1.25] italic">
                          {item.title}
                        </h2>
                        <div className="mt-3 flex flex-col gap-3 text-[17px] leading-[1.62]">
                          {item.body.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </IssueSection>
              ) : null}

              {briefing.kicker && briefing.kicker.length > 0 ? (
                <IssueSection label="KICKER">
                  <div className="editors-note flex flex-col gap-3">
                    {briefing.kicker.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </IssueSection>
              ) : null}
            </div>
          </article>

          {(adjacent.previous || adjacent.next) && (
            <nav
              aria-label="Briefing archive"
              className="mt-14 grid gap-4 border-t pt-6 sm:grid-cols-2"
              style={{
                borderColor:
                  "color-mix(in oklab, var(--muted) 42%, transparent)",
              }}
            >
              <AdjacentBriefingLink
                label="Previous briefing"
                briefing={adjacent.previous}
              />
              <AdjacentBriefingLink label="Next briefing" briefing={adjacent.next} />
            </nav>
          )}
        </main>

        <SiteFooter className="reveal-body mt-24" />
      </div>
    </RevealRoot>
  );
}

function IssueSection({
  label,
  children,
  className = "mt-12",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div
        className="mb-5 h-px w-full"
        style={{
          background: "color-mix(in oklab, var(--muted) 38%, transparent)",
        }}
      />
      <p className="mb-5 font-sans text-[15px] leading-none font-medium tracking-[0.08em] text-ink uppercase">
        {label}
      </p>
      <div
        className="mb-5 h-px w-full"
        style={{
          background: "color-mix(in oklab, var(--muted) 24%, transparent)",
        }}
      />
      {children}
    </section>
  );
}

function AdjacentBriefingLink({
  label,
  briefing,
}: {
  label: string;
  briefing:
    | {
        date: string;
        edition: string;
        lead: { title: string };
      }
    | null;
}) {
  if (!briefing) {
    return <div aria-hidden="true" />;
  }

  return (
    <Link
      href={`/ink/${briefing.date}`}
      className={`editorial-link block ${
        label === "Next briefing" ? "sm:justify-self-end sm:text-right" : ""
      }`}
      aria-label={`${label}: ${briefing.edition}, ${formatDisplayDate(
        briefing.date,
      )}`}
    >
      <span className="editorial-meta block">{label}</span>
      <span className="mt-2 block text-[17px] leading-[1.45] italic">
        {formatDisplayDate(briefing.date)}
      </span>
    </Link>
  );
}

function formatDisplayDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
