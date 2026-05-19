import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const ARC_FALLBACK_PATH = "/?date=2026-05-18";

async function gotoBriefingWithArc(page: Page) {
  await page.goto("/");

  const markers = page.locator(".arc-marker");
  if ((await markers.count()) > 0) return markers.first();

  await page.goto(ARC_FALLBACK_PATH);
  if ((await markers.count()) > 0) return markers.first();

  test.skip(true, "No story arc markers are available locally.");
  return markers.first();
}

async function expectNoPanelFor(
  page: Page,
  durationMs: number,
) {
  const deadline = Date.now() + durationMs;

  while (Date.now() < deadline) {
    await expect(page.locator("[data-arc-panel]")).toHaveCount(0);
    await expect(page.locator("[data-arc-panel-skeleton]")).toHaveCount(0);
    await page.waitForTimeout(100);
  }
}

async function expectNoSkeletonFor(page: Page, durationMs: number) {
  const deadline = Date.now() + durationMs;

  while (Date.now() < deadline) {
    await expect(page.locator("[data-arc-panel-skeleton]")).toHaveCount(0);
    await page.waitForTimeout(100);
  }
}

test.describe("arc panel", () => {
  test("opens, closes, and reopens the same story arc on desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const firstMarker = await gotoBriefingWithArc(page);
    await firstMarker.click();

    await expect(page).toHaveURL(/\/arc\/[^/]+$/);
    await expect(page.locator("[data-arc-panel]")).toBeVisible();
    await expect(page.locator("[data-arc-panel-skeleton]")).toHaveCount(0);
    await expect(page.locator(".panel-title")).toBeVisible();

    await page.locator(".panel-close").click();

    await expect(page).toHaveURL(/\/(\?date=2026-05-18)?$/);
    await expect(page.locator("[data-arc-panel]")).toHaveCount(0);

    await firstMarker.click();

    await expect(page).toHaveURL(/\/arc\/[^/]+$/);
    await expect(page.locator("[data-arc-panel]")).toBeVisible();
    await expect(page.locator("[data-arc-panel-skeleton]")).toHaveCount(0);
    await expect(page.locator(".panel-title")).toBeVisible();
  });

  test("does not remount a loading panel after close", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const firstMarker = await gotoBriefingWithArc(page);
    await firstMarker.click();
    await expect(page.locator(".panel-title")).toBeVisible();

    await page.locator(".panel-close").click();
    await expectNoSkeletonFor(page, 1_200);
    await expect(page.locator("[data-arc-panel]")).toHaveCount(0);

    await expectNoPanelFor(page, 1_200);
  });
});
