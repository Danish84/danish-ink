import { ArcMarker } from "@/components/arc-marker";
import { splitDigestParagraphs } from "@/lib/paragraphs";

type ArcMarker = {
  slug: string;
  title: string;
  dayNumber: number;
  status: "active" | "closure_candidate" | "closed" | "proposed";
};

type Props = {
  content: string;
  arcsByParagraph?: Map<number, ArcMarker>;
};

const PUBLIC_ARC_STATUSES = new Set<ArcMarker["status"]>([
  "active",
  "closure_candidate",
  "closed",
]);

export function BriefingBody({ content, arcsByParagraph }: Props) {
  const paragraphs = splitDigestParagraphs(content);

  if (paragraphs.length === 0) return null;

  return (
    <article className="briefing-body">
      {paragraphs.map((p, i) => {
        const arc = arcsByParagraph?.get(i);
        const shouldRenderMarker =
          arc && PUBLIC_ARC_STATUSES.has(arc.status);

        return (
          <p key={i}>
            {p}
            {shouldRenderMarker ? (
              <>
                {" "}
                <ArcMarker
                  slug={arc.slug}
                  title={arc.title}
                  dayNumber={arc.dayNumber}
                  status={arc.status}
                />
              </>
            ) : null}
          </p>
        );
      })}
      <p className="end-mark" aria-hidden="true">
        &#9670;
      </p>
    </article>
  );
}
