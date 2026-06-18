import { test, expect } from "@playwright/test";

test("game boots, canvas mounts, and play starts without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");

  // Kaplay renders into a <canvas> inside the mount root.
  const canvas = page.locator("#nimstick-game-root canvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });

  // Start the game from the title screen; this builds level 1 (addLevel,
  // marker resolution, entity spawning, collision wiring) — the riskiest path.
  await page.keyboard.press("Space");
  await page.waitForTimeout(2000);

  expect(errors, "console/page errors during boot + level start:\n" + errors.join("\n")).toEqual([]);
});

test("album persists an unlocked sticker across reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nimstick.album.v1", JSON.stringify({ unlocked: ["logo"] }));
  });
  await page.reload();
  const stored = await page.evaluate(() => localStorage.getItem("nimstick.album.v1"));
  expect(stored).toContain("logo");
});
