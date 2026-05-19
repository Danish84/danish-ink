import type { ArcStatus, LoadArcResult } from "@/lib/arcs/load-arc";

import { ArcPanelChrome } from "./arc-panel-chrome";

type Props = {
  result: LoadArcResult;
};

export function ArcPanel({ result }: Props) {
  if (!result) {
    return (
      <ArcPanelChrome slug={null}>
        <p className="editors-note">This arc could not be loaded.</p>
      </ArcPanelChrome>
    );
  }

  const { arc, entries } = result;
  const mentionCount = entries.length;
  const dayCount = Math.max(1, ...entries.map((entry) => entry.dayNumber));

  return (
    <ArcPanelChrome slug={arc.slug}>
      <p className="panel-eyebrow">Story Arc</p>
      <h2 className="panel-title">{arc.title}</h2>
      <p className="panel-meta">
        opened {formatShortDate(arc.opened_at)} &middot;{" "}
        {arc.status === "closed" && arc.closed_at
          ? `closed ${formatShortDate(arc.closed_at)}`
          : formatStatus(arc.status)}{" "}
        &middot; {dayCount} {dayCount === 1 ? "day" : "days"} &middot;{" "}
        {mentionCount} {mentionCount === 1 ? "mention" : "mentions"}
      </p>
      <a className="panel-open-full" href={`/arc/${arc.slug}`}>
        Open full arc &rarr;
      </a>
      <div className="panel-divider" />
      {entries.length > 0 ? (
        <div className="panel-log">
          {entries.map((entry, index) => (
            <section key={`${entry.generatedAt}-${entry.slot}-${index}`}>
              <p className="log-eyebrow">
                {formatLogDate(entry.date)} &middot; {entry.slot}
              </p>
              <p>{entry.paragraph}</p>
            </section>
          ))}
        </div>
      ) : (
        <p className="editors-note">No published mentions yet.</p>
      )}
    </ArcPanelChrome>
  );
}

function formatStatus(status: ArcStatus) {
  return status === "closure_candidate" ? "active" : status;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLogDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
