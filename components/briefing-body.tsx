type Props = {
  content: string;
};

export function BriefingBody({ content }: Props) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <article className="briefing-body">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <p className="end-mark" aria-hidden="true">
        ◆
      </p>
    </article>
  );
}
