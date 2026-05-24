"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import type {
  InkChapter,
  InkChapterDirection,
  InkRelatedArc,
} from "@/lib/ink/static";

type InkArcTimelineProps = {
  chapters: InkChapter[];
  inactiveOpacity?: number;
};

export function InkArcTimeline({
  chapters,
  inactiveOpacity = 0.66,
}: InkArcTimelineProps) {
  const [direction, setDirection] =
    useState<InkChapterDirection>("newest-first");
  const orderedChapters = useMemo(
    () => sortChapters(chapters, direction),
    [chapters, direction],
  );
  const [activeChapterId, setActiveChapterId] = useState(
    orderedChapters[0]?.id ?? "",
  );
  const [sidebarOffset, setSidebarOffset] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    function updateActiveChapter() {
      const viewportCenter = window.innerHeight / 2;
      let closestId = orderedChapters[0]?.id ?? "";
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const chapter of orderedChapters) {
        const node = chapterRefs.current.get(chapter.id);
        if (!node) continue;

        const rect = node.getBoundingClientRect();
        const chapterCenter = rect.top + rect.height / 2;
        const distance = Math.abs(chapterCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = chapter.id;
        }
      }

      if (closestId) {
        setActiveChapterId((current) =>
          current === closestId ? current : closestId,
        );
        const activeNode = chapterRefs.current.get(closestId);
        const mainNode = mainRef.current;

        if (activeNode && mainNode) {
          const nextOffset = Math.max(0, activeNode.offsetTop - mainNode.offsetTop);
          setSidebarOffset((current) =>
            Math.abs(current - nextOffset) < 1 ? current : nextOffset,
          );
        }
      }
    }

    updateActiveChapter();
    window.addEventListener("scroll", updateActiveChapter, { passive: true });
    window.addEventListener("resize", updateActiveChapter);

    return () => {
      window.removeEventListener("scroll", updateActiveChapter);
      window.removeEventListener("resize", updateActiveChapter);
    };
  }, [orderedChapters]);

  const activeChapter =
    orderedChapters.find((chapter) => chapter.id === activeChapterId) ??
    orderedChapters[0] ??
    null;
  const hasSidebarContext = Boolean(
    activeChapter &&
      ((activeChapter.cast?.length ?? 0) > 0 ||
        (activeChapter.elsewhere?.length ?? 0) > 0),
  );

  return (
    <div
      className="ink-arc-layout"
      style={
        {
          "--ink-arc-inactive-opacity": inactiveOpacity,
        } as CSSProperties
      }
    >
      <div className="ink-arc-main" ref={mainRef}>
        <div className="ink-arc-controls" aria-label="Chapter order">
          <button
            type="button"
            aria-pressed={direction === "newest-first"}
            onClick={() => setDirection("newest-first")}
          >
            latest first
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            aria-pressed={direction === "oldest-first"}
            onClick={() => setDirection("oldest-first")}
          >
            from the beginning
          </button>
        </div>

        <ol className="ink-arc-timeline">
          {orderedChapters.map((chapter) => (
            <li
              className="ink-arc-chapter"
              data-active={chapter.id === activeChapter?.id ? "true" : undefined}
              data-testid={chapter.id}
              key={chapter.id}
              ref={(node) => {
                if (node) {
                  chapterRefs.current.set(chapter.id, node);
                } else {
                  chapterRefs.current.delete(chapter.id);
                }
              }}
            >
              <article>
                <p className="ink-arc-date">{formatChapterDate(chapter)}</p>
                <h2>{chapter.title}</h2>
                <div className="ink-arc-prose">
                  {chapter.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <InlineContext chapter={chapter} />
              </article>
            </li>
          ))}
        </ol>
      </div>

      <aside
        className="ink-arc-sidebar"
        aria-live="polite"
        data-empty={hasSidebarContext ? undefined : "true"}
        style={
          {
            "--ink-arc-sidebar-offset": `${sidebarOffset}px`,
          } as CSSProperties
        }
      >
        {activeChapter ? <SidebarContext chapter={activeChapter} /> : null}
      </aside>
    </div>
  );
}

function InlineContext({ chapter }: { chapter: InkChapter }) {
  const hasCast = Boolean(chapter.cast?.length);
  const hasElsewhere = Boolean(chapter.elsewhere?.length);

  if (!hasCast && !hasElsewhere) return null;

  return (
    <div className="ink-arc-inline-context">
      {hasCast ? (
        <p>
          <span>cast</span> {chapter.cast?.join(", ")}
        </p>
      ) : null}
      {hasElsewhere ? (
        <p>
          <span>elsewhere</span>{" "}
          {chapter.elsewhere?.map((item, index) => (
            <RelatedArcLink
              item={item}
              key={item.slug}
              prefix={index > 0 ? ", " : ""}
            />
          ))}
        </p>
      ) : null}
    </div>
  );
}

function SidebarContext({ chapter }: { chapter: InkChapter }) {
  const hasCast = Boolean(chapter.cast?.length);
  const hasElsewhere = Boolean(chapter.elsewhere?.length);

  if (!hasCast && !hasElsewhere) {
    return null;
  }

  return (
    <div className="ink-arc-sidebar-inner">
      {hasCast ? (
        <section>
          <h2>cast</h2>
          <ul>
            {chapter.cast?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasElsewhere ? (
        <section>
          <h2>elsewhere</h2>
          <ul>
            {chapter.elsewhere?.map((item) => (
              <li key={item.slug}>
                <RelatedArcLink item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RelatedArcLink({
  item,
  prefix = "",
}: {
  item: InkRelatedArc;
  prefix?: string;
}) {
  return (
    <>
      {prefix}
      <Link className="editorial-link" href={`/ink/arc/${item.slug}`}>
        {item.label}
      </Link>
    </>
  );
}

function sortChapters(
  chapters: InkChapter[],
  direction: InkChapterDirection,
) {
  const sorted = [...chapters].sort((a, b) => b.date.localeCompare(a.date));
  return direction === "newest-first" ? sorted : sorted.reverse();
}

function formatChapterDate(chapter: InkChapter) {
  if (chapter.displayDate) return chapter.displayDate;

  return new Date(`${chapter.date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
