import Link from "next/link";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className = "" }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`site-footer flex flex-col items-center gap-2 pt-8 text-center ${className}`}
    >
      <p className="editorial-meta">
        Danish.ink &middot; Twice Daily &middot;{" "}
        <Link className="editorial-link" href="/arcs">
          Arcs
        </Link>{" "}
        &middot; {year}
      </p>
      <p className="site-footer-note">
        Headlines from BBC, Reuters, AP, Al Jazeera, Times of India &mdash;
        synthesized by Claude.
      </p>
    </footer>
  );
}
