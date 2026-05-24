import type { Metadata } from "next";
import Link from "next/link";

import { InkArcShelf } from "@/components/ink-arc-shelf";
import { RevealRoot } from "@/components/reveal-root";
import { SiteFooter } from "@/components/site-footer";
import {
  getAllArcs,
  getArcBySlug,
  getLatestBriefing,
  getShelfArcs,
} from "@/lib/ink/static";

export const metadata: Metadata = {
  title: "danish.ink - ink",
  description: "A static preview of the next danish.ink chronicle surface.",
};

export default function InkHomePage() {
  const latest = getLatestBriefing();
  const shelfArcs = getShelfArcs();
  const allArcs = getAllArcs();

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

        <main className="reveal-body mt-12 flex flex-col gap-12">
          {latest ? (
            <section
              aria-labelledby="latest-briefing-heading"
              className="grid gap-10 lg:grid-cols-[minmax(0,42rem)_minmax(17rem,1fr)] lg:gap-x-16"
            >
              <h2 className="font-sans text-[18px] leading-none font-medium tracking-[0.08em] text-ink uppercase lg:col-span-2">
                Today&apos;s briefing
              </h2>

              <div className="lg:-mt-2">
                <p className="editorial-meta">{formatDisplayDate(latest.date)}</p>
                <h1
                  id="latest-briefing-heading"
                  className="mt-4 text-[32px] leading-[1.12] font-normal italic sm:text-[42px]"
                  style={{
                    fontFamily: "var(--font-serif), Georgia, serif",
                  }}
                >
                  {latest.lead.title}
                </h1>
                <div className="briefing-body mt-7">
                  {latest.lead.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>

              {latest.alsoToday.length > 0 ? (
                <div
                  aria-label="Also today"
                  className="border-t pt-6 lg:mt-[6.85rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
                  style={{
                    borderColor:
                      "color-mix(in oklab, var(--muted) 35%, transparent)",
                  }}
                >
                  <p className="editorial-meta">Also today</p>
                  <ul className="mt-4 flex flex-col gap-4">
                    {latest.alsoToday.map((pointer) => {
                      const arc = getArcBySlug(pointer.arcSlug);

                      return (
                        <li
                          key={`${pointer.arcSlug}-${pointer.text}`}
                          className="text-[18px] leading-[1.45]"
                        >
                          {arc ? (
                            <Link
                              href={`/ink/arc/${arc.slug}`}
                              className="editorial-link"
                            >
                              {pointer.text}
                            </Link>
                          ) : (
                            <span>{pointer.text}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <Link
                href={`/ink/${latest.date}`}
                className="editorial-link editorial-meta mt-2 inline-block lg:col-start-1 lg:-mt-8"
              >
                Read full briefing
              </Link>
            </section>
          ) : (
            <p className="editors-note">The first ink briefing is still being set.</p>
          )}

          <InkArcShelf initialArcs={shelfArcs} allArcs={allArcs} />
        </main>

        <SiteFooter className="reveal-body mt-24" />
      </div>
    </RevealRoot>
  );
}

function formatDisplayDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
