"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

import type { InkArcWithChapters } from "@/lib/ink/static";
import { formatArcLabel } from "@/lib/ink/static";

type InkArcShelfProps = {
  initialArcs: InkArcWithChapters[];
  allArcs: InkArcWithChapters[];
};

export function InkArcShelf({ initialArcs, allArcs }: InkArcShelfProps) {
  const [expanded, setExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const arcs = useMemo(() => {
    if (!normalizedQuery) return expanded ? allArcs : initialArcs;

    return allArcs.filter((arc) =>
      [arc.title, arc.dek, arc.state, formatArcLabel(arc), `arc ${arc.number}`]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [allArcs, expanded, initialArcs, normalizedQuery]);

  const hasMore = allArcs.length > initialArcs.length;

  return (
    <section
      aria-labelledby="arc-shelf-heading"
      className="border-t border-b py-10"
      style={{
        borderColor: "color-mix(in oklab, var(--muted) 55%, transparent)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="arc-shelf-heading"
          className="font-sans text-[18px] leading-none font-medium tracking-[0.08em] text-ink uppercase"
        >
          Arc shelf
        </h2>

        <div className="flex items-center gap-3">
          {searchOpen ? (
            <label className="ink-arc-search">
              <Search aria-hidden="true" size={14} strokeWidth={1.8} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search arcs"
              />
            </label>
          ) : null}
          <button
            type="button"
            className="ink-icon-button"
            aria-label={searchOpen ? "Close arc search" : "Search arcs"}
            onClick={() => {
              setSearchOpen((current) => {
                if (current) setQuery("");
                return !current;
              });
            }}
          >
            {searchOpen ? (
              <X aria-hidden="true" size={16} strokeWidth={1.8} />
            ) : (
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-x-12 gap-y-0 lg:grid-cols-2">
        {arcs.map((arc) => (
          <ArcShelfCard arc={arc} key={arc.slug} />
        ))}
      </div>

      {arcs.length === 0 ? (
        <p className="editors-note mt-6">No matching arcs.</p>
      ) : null}

      {!normalizedQuery && hasMore && !expanded ? (
        <button
          type="button"
          className="editorial-link editorial-meta mt-8 inline-block"
          onClick={() => setExpanded(true)}
        >
          Read more
        </button>
      ) : null}
    </section>
  );
}

function ArcShelfCard({ arc }: { arc: InkArcWithChapters }) {
  return (
    <article
      className="border-t py-6"
      style={{
        borderColor: "color-mix(in oklab, var(--muted) 30%, transparent)",
      }}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="editorial-meta">{formatArcLabel(arc)}</p>
        <p className="editorial-meta normal-case">{arc.state}</p>
      </div>
      <h3 className="mt-2">
        <Link href={`/ink/arc/${arc.slug}`} className="arc-index-title">
          {arc.title}
        </Link>
      </h3>
      <p className="mt-3 text-[17px] leading-[1.6] text-ink">{arc.dek}</p>
      <p className="editorial-meta mt-4 normal-case">
        Updated {formatDisplayDate(arc.updatedAt)}
      </p>
    </article>
  );
}

function formatDisplayDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
