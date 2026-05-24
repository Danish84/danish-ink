import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InkArcTimeline } from "@/components/ink-arc-timeline";
import { InkRouteScrollReset } from "@/components/ink-route-scroll-reset";
import { RevealRoot } from "@/components/reveal-root";
import { SiteFooter } from "@/components/site-footer";
import { formatArcLabel, getArcBySlug, inkArcs } from "@/lib/ink/static";

type InkArcPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return inkArcs.map((arc) => ({ slug: arc.slug }));
}

export async function generateMetadata({
  params,
}: InkArcPageProps): Promise<Metadata> {
  const { slug } = await params;
  const arc = getArcBySlug(slug);

  return {
    title: arc ? `danish.ink - ${arc.title}` : "danish.ink",
  };
}

export default async function InkArcPage({ params }: InkArcPageProps) {
  const { slug } = await params;
  const arc = getArcBySlug(slug);

  if (!arc) notFound();

  return (
    <RevealRoot className="contents">
      <InkRouteScrollReset />
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
          <header className="relative z-10 grid gap-y-8 lg:grid-cols-[minmax(0,42rem)_minmax(17rem,1fr)] lg:gap-x-16">
            <div>
              <p className="editorial-meta">
                {formatArcLabel(arc)} &middot; {arc.state}
              </p>
              <h1 className="mt-4 max-w-4xl font-sans text-[34px] font-medium uppercase leading-[1.02] sm:text-[56px]">
                {arc.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 lg:justify-end">
              <Link className="editorial-meta editorial-link w-fit" href="/ink">
                back to ink
              </Link>
            </div>

            <p className="max-w-2xl font-serif text-[18px] italic leading-[1.55] text-muted sm:text-[20px] lg:col-span-2">
              {arc.dek}
            </p>
          </header>

          <section className="mt-12 sm:mt-16" aria-label={`${arc.title} timeline`}>
            <InkArcTimeline chapters={arc.chapters} />
          </section>
        </main>

        <SiteFooter className="reveal-body mt-16" />
      </div>
    </RevealRoot>
  );
}
