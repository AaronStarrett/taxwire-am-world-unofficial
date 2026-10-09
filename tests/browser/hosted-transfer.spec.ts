import { test, expect, chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
test("move real localhost exports into a fresh hosted browser profile", async () => {
  const base = process.env.TEST_BASE_URL!;
  expect(base).toMatch(/^https:/);
  const training = resolve(process.env.TRANSFER_INPUT!);
  const world = resolve(process.env.TRANSFER_WORLD!);
  const input = JSON.parse(await readFile(training, "utf8"));
  expect(
    input.missions.find((m: { id: string }) => m.id === "M-T01").status,
  ).toBe("completed");
  await mkdir(resolve(".local/exports"), { recursive: true });
  const context = await chromium.launchPersistentContext(
    resolve(".local/browser-tests/transfer-" + Date.now()),
    {
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : process.platform === "win32"
          ? { channel: "chrome" }
          : {}),
      viewport: { width: 1280, height: 720 },
      acceptDownloads: true,
      downloadsPath: resolve(".local/exports"),
      ...(process.env.RECORD_GAMEPLAY === "1"
        ? {
            recordVideo: {
              dir: resolve(".local/evidence/recordings"),
              size: { width: 1280, height: 720 },
            },
          }
        : {}),
      args: [
        ...(process.platform === "linux"
          ? ["--use-gl=angle", "--use-angle=swiftshader"]
          : []),
        "--disable-breakpad",
        "--disable-crash-reporter",
        "--disable-component-update",
      ],
    },
  );
  try {
    const page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(15000);
    const localRequests: string[] = [];
    page.on("request", (r) => {
      if (
        /^https?:/.test(r.url()) &&
        ["localhost", "127.0.0.1"].includes(new URL(r.url()).hostname)
      )
        localRequests.push(r.url());
    });
    await page.goto(base);
    await page.getByRole("button", { name: /Explore freely/ }).click();
    await page.getByRole("button", { name: "Cases", exact: true }).click();
    await expect(
      page.locator('.mission-card[data-case-id="M-T01"]'),
    ).not.toContainText("Replay");
    await page
      .locator(".nav-bottom")
      .getByRole("button", { name: "Saves & export" })
      .click();
    await page
      .getByLabel("Import compatible learning history")
      .setInputFiles(training);
    await expect(
      page.getByText("Compatible format", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Merge history without downgrading" })
      .click();
    await expect(
      page.getByText(/Imported self-reported progress/),
    ).toBeVisible();
    const transferDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export training progress", exact: true })
      .click();
    const transferred = resolve(".local/exports/hosted-transfer-readback.json");
    await (await transferDownload).saveAs(transferred);
    const output = JSON.parse(await readFile(transferred, "utf8"));
    expect(
      output.missions.find((m: { id: string }) => m.id === "M-T01").status,
    ).toBe("completed");
    expect(output.extensions.importProvenance.length).toBeGreaterThan(0);
    await page
      .getByLabel("Import world checkpoint", { exact: true })
      .setInputFiles(world);
    await expect(
      page.getByRole("button", { name: "Back up and restore world" }),
    ).toBeVisible();
    const backup = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Back up and restore world" })
      .click();
    await (
      await backup
    ).saveAs(resolve(".local/exports/hosted-before-restore.json"));
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByText("Saved in this browser", { exact: false }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: /Explore freely/ }).click();
    await page.getByRole("button", { name: "Cases", exact: true }).click();
    await expect(
      page.locator('.mission-card[data-case-id="M-T01"]'),
    ).toContainText("Replay");
    expect(localRequests).toEqual([]);
    await page.screenshot({
      path: resolve(".local/evidence/hosted-transfer.png"),
    });
  } finally {
    await context.close();
  }
});
