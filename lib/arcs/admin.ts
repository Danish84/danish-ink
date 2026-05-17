import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import {
  closeArc,
  confirmProposedArc,
  dismissProposedArc,
  editArcDescription,
  keepArcActive,
  leaveArcClosed,
  mergeProposedArc,
  renameAndConfirmProposedArc,
  renameArc,
  reopenArc,
  type ArcAdminStore,
  type ArcPatch,
  type ArcStatus,
} from "@/lib/arcs/admin-core";
import { splitDigestParagraphs } from "@/lib/paragraphs";

type Slot = "morning" | "evening";

type ArcRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: ArcStatus;
  opened_at: string;
  closed_at: string | null;
  last_mentioned_at: string;
  proposed_from_summary_id: string | null;
  proposed_from_paragraph_index: number | null;
  reopen_dismissed_at: string | null;
};

type SummaryJoin =
  | {
      id: string;
      date: string;
      slot: Slot;
      content: string | null;
      generated_at: string;
      status: "success" | "error";
    }
  | {
      id: string;
      date: string;
      slot: Slot;
      content: string | null;
      generated_at: string;
      status: "success" | "error";
    }[]
  | null;

type AssignmentRow = {
  arc_id: string;
  paragraph_index: number;
  day_number: number;
  created_at: string;
  summaries: SummaryJoin;
};

export type AdminExcerpt = {
  text: string;
  date: string;
  slot: Slot;
};

export type AdminArc = ArcRow & {
  mentionCount: number;
  dayCount: number;
};

export type ProposedArc = AdminArc & {
  excerpt: AdminExcerpt | null;
};

export type ClosureCandidate = AdminArc & {
  daysSinceLastMention: number;
};

export type ReopenCandidate = AdminArc & {
  closedAt: string;
  newMentionCount: number;
  latestExcerpt: AdminExcerpt | null;
};

export type AdminDashboardData = {
  proposals: ProposedArc[];
  closureCandidates: ClosureCandidate[];
  reopenCandidates: ReopenCandidate[];
  activeArcs: AdminArc[];
  closedArcs: AdminArc[];
  mergeTargets: AdminArc[];
};

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "createServiceClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function loadAdminDashboardData(
  client: SupabaseClient = createServiceClient(),
): Promise<AdminDashboardData> {
  const { data: arcs, error: arcsError } = await client
    .from("arcs")
    .select(
      "id, slug, title, description, status, opened_at, closed_at, last_mentioned_at, proposed_from_summary_id, proposed_from_paragraph_index, reopen_dismissed_at",
    )
    .order("last_mentioned_at", { ascending: false })
    .returns<ArcRow[]>();

  if (arcsError) throw new Error(`loadAdminDashboardData: ${arcsError.message}`);

  const { data: assignments, error: assignmentsError } = await client
    .from("slot_arcs")
    .select(
      "arc_id, paragraph_index, day_number, created_at, summaries(id, date, slot, content, generated_at, status)",
    )
    .returns<AssignmentRow[]>();

  if (assignmentsError) {
    throw new Error(`loadAdminDashboardData: ${assignmentsError.message}`);
  }

  const assignmentGroups = groupAssignments(assignments ?? []);
  const enriched = (arcs ?? []).map((arc) =>
    enrichArc(arc, assignmentGroups.get(arc.id) ?? []),
  );

  const proposals = enriched
    .filter((arc) => arc.status === "proposed")
    .map((arc) => ({
      ...arc,
      excerpt: findProposedExcerpt(arc, assignmentGroups.get(arc.id) ?? []),
    }));

  const closureCandidates = enriched
    .filter((arc) => arc.status === "closure_candidate")
    .map((arc) => ({
      ...arc,
      daysSinceLastMention: daysBetween(arc.last_mentioned_at, new Date()),
    }));

  const reopenCandidates = enriched
    .filter((arc): arc is AdminArc & { closed_at: string } =>
      Boolean(arc.status === "closed" && arc.closed_at),
    )
    .map((arc) => {
      const freshAssignments = (assignmentGroups.get(arc.id) ?? []).filter(
        (assignment) =>
          shouldSurfaceReopenCandidateLocal({
            closedAt: arc.closed_at,
            dismissedAt: arc.reopen_dismissed_at,
            createdAt: assignment.created_at,
          }),
      );
      return { arc, freshAssignments };
    })
    .filter(({ freshAssignments }) => freshAssignments.length > 0)
    .map(({ arc, freshAssignments }) => ({
      ...arc,
      closedAt: arc.closed_at,
      newMentionCount: freshAssignments.length,
      latestExcerpt: latestExcerpt(freshAssignments),
    }));

  return {
    proposals,
    closureCandidates,
    reopenCandidates,
    activeArcs: enriched.filter((arc) => arc.status === "active"),
    closedArcs: enriched.filter((arc) => arc.status === "closed"),
    mergeTargets: enriched.filter((arc) =>
      ["active", "closure_candidate", "closed"].includes(arc.status),
    ),
  };
}

export async function confirmProposalAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  const arcId = requireField(formData, "arcId");
  await confirmProposedArc(createSupabaseArcAdminStore(), { arcId });
  revalidateAdminSurfaces();
}

export async function renameConfirmProposalAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  const arcId = requireField(formData, "arcId");
  await renameAndConfirmProposedArc(createSupabaseArcAdminStore(), {
    arcId,
    title: requireField(formData, "title"),
    description: optionalField(formData, "description"),
  });
  revalidateAdminSurfaces();
}

export async function mergeProposalAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  await mergeProposedArc(createSupabaseArcAdminStore(), {
    proposedArcId: requireField(formData, "arcId"),
    targetArcId: requireField(formData, "targetArcId"),
  });
  revalidateAdminSurfaces();
}

export async function dismissProposalAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  await dismissProposedArc(createSupabaseArcAdminStore(), {
    arcId: requireField(formData, "arcId"),
  });
  revalidateAdminSurfaces();
}

export async function renameArcAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  await renameArc(createSupabaseArcAdminStore(), {
    arcId: requireField(formData, "arcId"),
    title: requireField(formData, "title"),
    slug: optionalField(formData, "slug"),
  });
  revalidateAdminSurfaces(optionalField(formData, "currentSlug"));
}

export async function editDescriptionAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  await editArcDescription(createSupabaseArcAdminStore(), {
    arcId: requireField(formData, "arcId"),
    description: optionalField(formData, "description"),
  });
  revalidateAdminSurfaces(optionalField(formData, "currentSlug"));
}

export async function closeArcAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  await closeArc(createSupabaseArcAdminStore(), {
    arcId: requireField(formData, "arcId"),
  });
  revalidateAdminSurfaces(optionalField(formData, "currentSlug"));
}

export async function keepActiveAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  await keepArcActive(createSupabaseArcAdminStore(), {
    arcId: requireField(formData, "arcId"),
  });
  revalidateAdminSurfaces(optionalField(formData, "currentSlug"));
}

export async function reopenArcAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  await reopenArc(createSupabaseArcAdminStore(), {
    arcId: requireField(formData, "arcId"),
  });
  revalidateAdminSurfaces(optionalField(formData, "currentSlug"));
}

export async function leaveClosedAction(formData: FormData) {
  "use server";
  requireAdminKey(formData);
  await leaveArcClosed(createSupabaseArcAdminStore(), {
    arcId: requireField(formData, "arcId"),
  });
  revalidateAdminSurfaces(optionalField(formData, "currentSlug"));
}

function createSupabaseArcAdminStore(
  client: SupabaseClient = createServiceClient(),
): ArcAdminStore {
  return {
    async listTakenSlugs(excludeArcId) {
      let query = client.from("arcs").select("slug");
      if (excludeArcId) query = query.neq("id", excludeArcId);
      const { data, error } = await query.returns<{ slug: string }[]>();
      if (error) throw new Error(`listTakenSlugs: ${error.message}`);
      return (data ?? []).map((row) => row.slug);
    },
    async updateArc(arcId, patch) {
      const { error } = await client.from("arcs").update(patch).eq("id", arcId);
      if (error) throw new Error(`updateArc: ${error.message}`);
    },
    async mergeProposedArc(proposedArcId, targetArcId) {
      const { error } = await client.rpc("merge_proposed_arc", {
        p_proposed_arc_id: proposedArcId,
        p_target_arc_id: targetArcId,
      });
      if (error) throw new Error(`mergeProposedArc: ${error.message}`);
    },
    async deleteAssignmentsForArc(arcId) {
      const { error } = await client.from("slot_arcs").delete().eq("arc_id", arcId);
      if (error) throw new Error(`deleteAssignmentsForArc: ${error.message}`);
    },
    async deleteArc(arcId) {
      const { error } = await client.from("arcs").delete().eq("id", arcId);
      if (error) throw new Error(`deleteArc: ${error.message}`);
    },
  };
}

function enrichArc(arc: ArcRow, assignments: AssignmentRow[]): AdminArc {
  return {
    ...arc,
    mentionCount: assignments.length,
    dayCount: Math.max(0, ...assignments.map((assignment) => assignment.day_number)),
  };
}

function groupAssignments(assignments: AssignmentRow[]) {
  const groups = new Map<string, AssignmentRow[]>();
  for (const assignment of assignments) {
    const group = groups.get(assignment.arc_id) ?? [];
    group.push(assignment);
    groups.set(assignment.arc_id, group);
  }
  return groups;
}

function findProposedExcerpt(arc: ArcRow, assignments: AssignmentRow[]) {
  const originating = assignments.find((assignment) => {
    const summary = normalizeSummary(assignment.summaries);
    return (
      summary?.id === arc.proposed_from_summary_id &&
      assignment.paragraph_index === arc.proposed_from_paragraph_index
    );
  });
  return excerptFromAssignment(originating ?? assignments[0]);
}

function latestExcerpt(assignments: AssignmentRow[]) {
  const latest = [...assignments].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
  return excerptFromAssignment(latest);
}

function excerptFromAssignment(assignment?: AssignmentRow) {
  if (!assignment) return null;
  const summary = normalizeSummary(assignment.summaries);
  if (!summary?.content || summary.status !== "success") return null;
  const paragraph = splitDigestParagraphs(summary.content)[assignment.paragraph_index];
  if (!paragraph) return null;

  return {
    text: paragraph,
    date: summary.date,
    slot: summary.slot,
  };
}

function normalizeSummary(summary: SummaryJoin) {
  return Array.isArray(summary) ? summary[0] : summary;
}

function daysBetween(from: string, to: Date) {
  const diff = to.getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function shouldSurfaceReopenCandidateLocal(input: {
  closedAt: string;
  dismissedAt: string | null;
  createdAt: string;
}) {
  const created = new Date(input.createdAt).getTime();
  const closed = new Date(input.closedAt).getTime();
  const dismissed = input.dismissedAt
    ? new Date(input.dismissedAt).getTime()
    : Number.NEGATIVE_INFINITY;
  return created > closed && created > dismissed;
}

function requireAdminKey(formData: FormData) {
  const expected = process.env.ADMIN_KEY;
  const actual = optionalField(formData, "adminKey");
  if (!expected || actual !== expected) {
    throw new Error("Unauthorized");
  }
}

function requireField(formData: FormData, name: string) {
  const value = optionalField(formData, name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : null;
}

function revalidateAdminSurfaces(currentSlug?: string | null) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/arcs");
  if (currentSlug) revalidatePath(`/arc/${currentSlug}`);
}

export type { ArcPatch };
