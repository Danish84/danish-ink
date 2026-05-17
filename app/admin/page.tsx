import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";

import {
  closeArcAction,
  confirmProposalAction,
  dismissProposalAction,
  editDescriptionAction,
  keepActiveAction,
  leaveClosedAction,
  loadAdminDashboardData,
  mergeProposalAction,
  renameArcAction,
  renameConfirmProposalAction,
  reopenArcAction,
  type AdminArc,
  type AdminDashboardData,
  type AdminExcerpt,
} from "@/lib/arcs/admin";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<{ key?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const adminKey = params?.key;
  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    notFound();
  }

  const data = await loadAdminDashboardData();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-10 sm:py-16">
      <header>
        <p className="admin-kicker">Story Arcs</p>
        <h1 className="mt-3 font-sans text-[32px] uppercase leading-tight sm:text-[44px]">
          Admin
        </h1>
      </header>

      <AdminSection title="New Arc Proposals" count={data.proposals.length}>
        {data.proposals.length > 0 ? (
          <div className="flex flex-col gap-6">
            {data.proposals.map((arc) => (
              <article key={arc.id} className="admin-card">
                <ArcHeading arc={arc} />
                <p className="admin-description">
                  {arc.description || "No description."}
                </p>
                <Excerpt excerpt={arc.excerpt} />

                <div className="admin-actions">
                  <form action={confirmProposalAction}>
                    <HiddenFields adminKey={adminKey} arc={arc} />
                    <button className="admin-button" type="submit">
                      Confirm
                    </button>
                  </form>

                  <form className="admin-inline-form" action={renameConfirmProposalAction}>
                    <HiddenFields adminKey={adminKey} arc={arc} />
                    <input
                      className="admin-input"
                      name="title"
                      defaultValue={arc.title}
                      aria-label="Proposal title"
                    />
                    <textarea
                      className="admin-textarea"
                      name="description"
                      defaultValue={arc.description ?? ""}
                      aria-label="Proposal description"
                      rows={2}
                    />
                    <button className="admin-button" type="submit">
                      Rename + Confirm
                    </button>
                  </form>

                  {data.mergeTargets.length > 0 ? (
                    <form className="admin-select-form" action={mergeProposalAction}>
                      <HiddenFields adminKey={adminKey} arc={arc} />
                      <select
                        className="admin-select"
                        name="targetArcId"
                        aria-label="Merge target"
                        required
                      >
                        {data.mergeTargets.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.title} ({formatStatus(target.status)})
                          </option>
                        ))}
                      </select>
                      <button className="admin-button" type="submit">
                        Merge
                      </button>
                    </form>
                  ) : null}

                  <form action={dismissProposalAction}>
                    <HiddenFields adminKey={adminKey} arc={arc} />
                    <button className="admin-button admin-button-muted" type="submit">
                      Dismiss
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>No proposed arcs are waiting.</EmptyState>
        )}
      </AdminSection>

      <AdminSection title="Closure Candidates" count={data.closureCandidates.length}>
        {data.closureCandidates.length > 0 ? (
          <div className="admin-list">
            {data.closureCandidates.map((arc) => (
              <div key={arc.id} className="admin-row">
                <div>
                  <ArcHeading arc={arc} />
                  <p className="admin-meta">
                    {arc.daysSinceLastMention} days since last mention ·{" "}
                    {arc.dayCount} {arc.dayCount === 1 ? "day" : "days"}
                  </p>
                </div>
                <div className="admin-row-actions">
                  <form action={closeArcAction}>
                    <HiddenFields adminKey={adminKey} arc={arc} />
                    <button className="admin-button" type="submit">
                      Close
                    </button>
                  </form>
                  <form action={keepActiveAction}>
                    <HiddenFields adminKey={adminKey} arc={arc} />
                    <button className="admin-button admin-button-muted" type="submit">
                      Keep active
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No arcs are ready for closure.</EmptyState>
        )}
      </AdminSection>

      <AdminSection title="Reopen Candidates" count={data.reopenCandidates.length}>
        {data.reopenCandidates.length > 0 ? (
          <div className="admin-list">
            {data.reopenCandidates.map((arc) => (
              <div key={arc.id} className="admin-row admin-row-stack">
                <div>
                  <ArcHeading arc={arc} />
                  <p className="admin-meta">
                    Closed {formatShortDate(arc.closedAt)} ·{" "}
                    {arc.newMentionCount} new{" "}
                    {arc.newMentionCount === 1 ? "mention" : "mentions"}
                  </p>
                  <Excerpt excerpt={arc.latestExcerpt} />
                </div>
                <div className="admin-row-actions">
                  <form action={reopenArcAction}>
                    <HiddenFields adminKey={adminKey} arc={arc} />
                    <button className="admin-button" type="submit">
                      Reopen
                    </button>
                  </form>
                  <form action={leaveClosedAction}>
                    <HiddenFields adminKey={adminKey} arc={arc} />
                    <button className="admin-button admin-button-muted" type="submit">
                      Leave closed
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No closed arcs have fresh mentions.</EmptyState>
        )}
      </AdminSection>

      <AdminSection title="Active Arcs" count={data.activeArcs.length}>
        <ArcManagementList arcs={data.activeArcs} adminKey={adminKey} />
      </AdminSection>

      <AdminSection title="Closed Arcs" count={data.closedArcs.length}>
        {data.closedArcs.length > 0 ? (
          <div className="admin-list">
            {data.closedArcs.map((arc) => (
              <div key={arc.id} className="admin-row">
                <div>
                  <ArcHeading arc={arc} />
                  <p className="admin-meta">
                    Closed {arc.closed_at ? formatShortDate(arc.closed_at) : "unknown"} ·{" "}
                    {arc.mentionCount}{" "}
                    {arc.mentionCount === 1 ? "mention" : "mentions"}
                  </p>
                </div>
                <div className="admin-row-actions">
                  <form action={reopenArcAction}>
                    <HiddenFields adminKey={adminKey} arc={arc} />
                    <button className="admin-button" type="submit">
                      Reopen
                    </button>
                  </form>
                  <ViewLink slug={arc.slug} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No closed arcs yet.</EmptyState>
        )}
      </AdminSection>
    </main>
  );
}

function ArcManagementList({
  arcs,
  adminKey,
}: {
  arcs: AdminDashboardData["activeArcs"];
  adminKey: string;
}) {
  if (arcs.length === 0) return <EmptyState>No active arcs yet.</EmptyState>;

  return (
    <div className="admin-list">
      {arcs.map((arc) => (
        <div key={arc.id} className="admin-row admin-row-stack">
          <div>
            <ArcHeading arc={arc} />
            <p className="admin-meta">
              Last mentioned {formatShortDate(arc.last_mentioned_at)} ·{" "}
              {arc.dayCount} {arc.dayCount === 1 ? "day" : "days"} ·{" "}
              {arc.mentionCount} {arc.mentionCount === 1 ? "mention" : "mentions"}
            </p>
          </div>

          <div className="admin-actions">
            <form className="admin-inline-form" action={renameArcAction}>
              <HiddenFields adminKey={adminKey} arc={arc} />
              <input
                className="admin-input"
                name="title"
                defaultValue={arc.title}
                aria-label="Arc title"
              />
              <input
                className="admin-input"
                name="slug"
                defaultValue={arc.slug}
                aria-label="Arc slug"
              />
              <button className="admin-button" type="submit">
                Rename
              </button>
            </form>

            <form className="admin-inline-form" action={editDescriptionAction}>
              <HiddenFields adminKey={adminKey} arc={arc} />
              <textarea
                className="admin-textarea"
                name="description"
                defaultValue={arc.description ?? ""}
                aria-label="Arc description"
                rows={2}
              />
              <button className="admin-button" type="submit">
                Save Description
              </button>
            </form>

            <form action={closeArcAction}>
              <HiddenFields adminKey={adminKey} arc={arc} />
              <button className="admin-button admin-button-muted" type="submit">
                Manual close
              </button>
            </form>
            <ViewLink slug={arc.slug} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-section">
      <header className="admin-section-header">
        <h2>{title}</h2>
        <span>{count}</span>
      </header>
      {children}
    </section>
  );
}

function ArcHeading({ arc }: { arc: AdminArc }) {
  return (
    <div>
      <h3 className="admin-arc-title">{arc.title}</h3>
      <p className="admin-meta">
        {formatStatus(arc.status)} · /arc/{arc.slug}
      </p>
    </div>
  );
}

function Excerpt({ excerpt }: { excerpt: AdminExcerpt | null }) {
  if (!excerpt) {
    return <p className="admin-excerpt admin-excerpt-empty">No excerpt found.</p>;
  }

  return (
    <figure className="admin-excerpt">
      <figcaption>
        {formatShortDate(excerpt.date)} · {excerpt.slot}
      </figcaption>
      <blockquote>{excerpt.text}</blockquote>
    </figure>
  );
}

function HiddenFields({ adminKey, arc }: { adminKey: string; arc: AdminArc }) {
  return (
    <>
      <input type="hidden" name="adminKey" value={adminKey} />
      <input type="hidden" name="arcId" value={arc.id} />
      <input type="hidden" name="currentSlug" value={arc.slug} />
    </>
  );
}

function ViewLink({ slug }: { slug: string }) {
  return (
    <Link className="admin-button admin-button-link" href={`/arc/${slug}`}>
      View
    </Link>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="editors-note">{children}</p>;
}

function formatStatus(status: AdminArc["status"]) {
  return status === "closure_candidate" ? "closure candidate" : status;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
