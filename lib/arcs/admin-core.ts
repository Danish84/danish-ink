export type ArcStatus = "proposed" | "active" | "closure_candidate" | "closed";

export type ArcPatch = {
  title?: string;
  slug?: string;
  description?: string | null;
  status?: ArcStatus;
  closed_at?: string | null;
  last_mentioned_at?: string;
  reopen_dismissed_at?: string | null;
};

export type ArcAdminStore = {
  listTakenSlugs(excludeArcId?: string): Promise<string[]>;
  updateArc(arcId: string, patch: ArcPatch): Promise<void>;
  mergeProposedArc(proposedArcId: string, targetArcId: string): Promise<void>;
  deleteAssignmentsForArc(arcId: string): Promise<void>;
  deleteArc(arcId: string): Promise<void>;
};

export type Clock = () => Date;

export function slugifyTitle(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "arc";
}

export function nextAvailableSlug(
  titleOrSlug: string,
  takenSlugs: Iterable<string>,
) {
  const base = slugifyTitle(titleOrSlug);
  const taken = new Set(takenSlugs);

  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export async function confirmProposedArc(
  store: ArcAdminStore,
  input: { arcId: string },
  clock: Clock = () => new Date(),
) {
  await store.updateArc(input.arcId, {
    status: "active",
    last_mentioned_at: clock().toISOString(),
  });
}

export async function renameAndConfirmProposedArc(
  store: ArcAdminStore,
  input: { arcId: string; title: string; description?: string | null },
  clock: Clock = () => new Date(),
) {
  const takenSlugs = await store.listTakenSlugs(input.arcId);
  await store.updateArc(input.arcId, {
    title: normalizeRequired(input.title, "title"),
    slug: nextAvailableSlug(input.title, takenSlugs),
    description: normalizeOptional(input.description),
    status: "active",
    last_mentioned_at: clock().toISOString(),
  });
}

export async function mergeProposedArc(
  store: ArcAdminStore,
  input: { proposedArcId: string; targetArcId: string },
) {
  if (input.proposedArcId === input.targetArcId) {
    throw new Error("Cannot merge an arc into itself");
  }
  await store.mergeProposedArc(input.proposedArcId, input.targetArcId);
}

export async function dismissProposedArc(
  store: ArcAdminStore,
  input: { arcId: string },
) {
  await store.deleteAssignmentsForArc(input.arcId);
  await store.deleteArc(input.arcId);
}

export async function renameArc(
  store: ArcAdminStore,
  input: { arcId: string; title: string; slug?: string | null },
) {
  const title = normalizeRequired(input.title, "title");
  const slugSource = input.slug?.trim() ? input.slug : title;
  const takenSlugs = await store.listTakenSlugs(input.arcId);

  await store.updateArc(input.arcId, {
    title,
    slug: nextAvailableSlug(slugSource, takenSlugs),
  });
}

export async function editArcDescription(
  store: ArcAdminStore,
  input: { arcId: string; description?: string | null },
) {
  await store.updateArc(input.arcId, {
    description: normalizeOptional(input.description),
  });
}

export async function closeArc(
  store: ArcAdminStore,
  input: { arcId: string },
  clock: Clock = () => new Date(),
) {
  await store.updateArc(input.arcId, {
    status: "closed",
    closed_at: clock().toISOString(),
  });
}

export async function keepArcActive(
  store: ArcAdminStore,
  input: { arcId: string },
  clock: Clock = () => new Date(),
) {
  await store.updateArc(input.arcId, {
    status: "active",
    last_mentioned_at: clock().toISOString(),
  });
}

export async function reopenArc(
  store: ArcAdminStore,
  input: { arcId: string },
  clock: Clock = () => new Date(),
) {
  await store.updateArc(input.arcId, {
    status: "active",
    closed_at: null,
    reopen_dismissed_at: null,
    last_mentioned_at: clock().toISOString(),
  });
}

export async function leaveArcClosed(
  store: ArcAdminStore,
  input: { arcId: string },
  clock: Clock = () => new Date(),
) {
  await store.updateArc(input.arcId, {
    reopen_dismissed_at: clock().toISOString(),
  });
}

export function shouldSurfaceReopenCandidate(input: {
  status: ArcStatus;
  closedAt: string | null;
  reopenDismissedAt?: string | null;
  assignmentCreatedAt: string;
}) {
  if (input.status !== "closed" || !input.closedAt) return false;

  const assignmentTime = new Date(input.assignmentCreatedAt).getTime();
  const closedTime = new Date(input.closedAt).getTime();
  const dismissedTime = input.reopenDismissedAt
    ? new Date(input.reopenDismissedAt).getTime()
    : Number.NEGATIVE_INFINITY;

  return assignmentTime > closedTime && assignmentTime > dismissedTime;
}

function normalizeRequired(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
