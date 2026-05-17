import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  closeArc,
  confirmProposedArc,
  dismissProposedArc,
  editArcDescription,
  keepArcActive,
  leaveArcClosed,
  mergeProposedArc,
  nextAvailableSlug,
  renameAndConfirmProposedArc,
  renameArc,
  reopenArc,
  shouldSurfaceReopenCandidate,
  type ArcAdminStore,
  type ArcPatch,
} from "./admin-core";

const NOW = new Date("2026-05-17T12:00:00.000Z");

class FakeStore implements ArcAdminStore {
  takenSlugs = ["gaza-talks", "gaza-talks-2", "old-title"];
  updates: Array<{ arcId: string; patch: ArcPatch }> = [];
  merged: Array<{ proposedArcId: string; targetArcId: string }> = [];
  deletedAssignments: string[] = [];
  deletedArcs: string[] = [];

  async listTakenSlugs(excludeArcId?: string) {
    return excludeArcId === "keep-old-title"
      ? this.takenSlugs.filter((slug) => slug !== "old-title")
      : this.takenSlugs;
  }

  async updateArc(arcId: string, patch: ArcPatch) {
    this.updates.push({ arcId, patch });
  }

  async mergeProposedArc(proposedArcId: string, targetArcId: string) {
    this.merged.push({ proposedArcId, targetArcId });
  }

  async deleteAssignmentsForArc(arcId: string) {
    this.deletedAssignments.push(arcId);
  }

  async deleteArc(arcId: string) {
    this.deletedArcs.push(arcId);
  }
}

function fixedClock() {
  return NOW;
}

let store: FakeStore;

beforeEach(() => {
  store = new FakeStore();
});

describe("admin arc helpers", () => {
  it("generates collision-safe slugs", () => {
    expect(nextAvailableSlug("Gaza Talks", store.takenSlugs)).toBe("gaza-talks-3");
    expect(nextAvailableSlug("  !!!  ", store.takenSlugs)).toBe("arc");
  });

  it("confirms a proposed arc without changing its id", async () => {
    await confirmProposedArc(store, { arcId: "proposal-1" }, fixedClock);

    expect(store.updates).toEqual([
      {
        arcId: "proposal-1",
        patch: {
          status: "active",
          last_mentioned_at: NOW.toISOString(),
        },
      },
    ]);
  });

  it("renames and confirms with a collision-safe slug", async () => {
    await renameAndConfirmProposedArc(
      store,
      {
        arcId: "proposal-1",
        title: "Gaza Talks",
        description: "  ceasefire updates  ",
      },
      fixedClock,
    );

    expect(store.updates[0]).toEqual({
      arcId: "proposal-1",
      patch: {
        title: "Gaza Talks",
        slug: "gaza-talks-3",
        description: "ceasefire updates",
        status: "active",
        last_mentioned_at: NOW.toISOString(),
      },
    });
  });

  it("merges a proposal into an existing arc through the store transaction", async () => {
    await mergeProposedArc(store, {
      proposedArcId: "proposal-1",
      targetArcId: "closed-target",
    });

    expect(store.merged).toEqual([
      { proposedArcId: "proposal-1", targetArcId: "closed-target" },
    ]);
  });

  it("rejects self-merge before hitting the store", async () => {
    await expect(
      mergeProposedArc(store, {
        proposedArcId: "same",
        targetArcId: "same",
      }),
    ).rejects.toThrow("Cannot merge an arc into itself");

    expect(store.merged).toEqual([]);
  });

  it("dismisses a proposal by deleting assignments before the arc", async () => {
    await dismissProposedArc(store, { arcId: "proposal-1" });

    expect(store.deletedAssignments).toEqual(["proposal-1"]);
    expect(store.deletedArcs).toEqual(["proposal-1"]);
  });

  it("renames an active arc while preserving the uuid", async () => {
    await renameArc(store, {
      arcId: "keep-old-title",
      title: "Old Title",
      slug: "Gaza Talks",
    });

    expect(store.updates[0]).toEqual({
      arcId: "keep-old-title",
      patch: {
        title: "Old Title",
        slug: "gaza-talks-3",
      },
    });
  });

  it("edits descriptions and normalizes blank values to null", async () => {
    await editArcDescription(store, {
      arcId: "arc-1",
      description: "   ",
    });

    expect(store.updates[0]).toEqual({
      arcId: "arc-1",
      patch: { description: null },
    });
  });

  it("closes, keeps active, reopens, and leaves closed with timestamped patches", async () => {
    await closeArc(store, { arcId: "arc-1" }, fixedClock);
    await keepArcActive(store, { arcId: "arc-2" }, fixedClock);
    await reopenArc(store, { arcId: "arc-3" }, fixedClock);
    await leaveArcClosed(store, { arcId: "arc-4" }, fixedClock);

    expect(store.updates).toEqual([
      {
        arcId: "arc-1",
        patch: { status: "closed", closed_at: NOW.toISOString() },
      },
      {
        arcId: "arc-2",
        patch: {
          status: "active",
          last_mentioned_at: NOW.toISOString(),
        },
      },
      {
        arcId: "arc-3",
        patch: {
          status: "active",
          closed_at: null,
          reopen_dismissed_at: null,
          last_mentioned_at: NOW.toISOString(),
        },
      },
      {
        arcId: "arc-4",
        patch: { reopen_dismissed_at: NOW.toISOString() },
      },
    ]);
  });

  it("surfaces reopen candidates only after closure and latest leave-closed", () => {
    expect(
      shouldSurfaceReopenCandidate({
        status: "closed",
        closedAt: "2026-05-10T00:00:00.000Z",
        assignmentCreatedAt: "2026-05-11T00:00:00.000Z",
      }),
    ).toBe(true);

    expect(
      shouldSurfaceReopenCandidate({
        status: "closed",
        closedAt: "2026-05-10T00:00:00.000Z",
        reopenDismissedAt: "2026-05-12T00:00:00.000Z",
        assignmentCreatedAt: "2026-05-11T00:00:00.000Z",
      }),
    ).toBe(false);

    expect(
      shouldSurfaceReopenCandidate({
        status: "active",
        closedAt: null,
        assignmentCreatedAt: "2026-05-11T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("does not make unexpected store calls during rename validation failure", async () => {
    const spy = vi.spyOn(store, "listTakenSlugs");

    await expect(
      renameArc(store, {
        arcId: "arc-1",
        title: " ",
      }),
    ).rejects.toThrow("title is required");

    expect(spy).not.toHaveBeenCalled();
    expect(store.updates).toEqual([]);
  });
});
