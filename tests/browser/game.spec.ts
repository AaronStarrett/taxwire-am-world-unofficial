import { test, expect, chromium } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { content } from "../../src/content";
test.describe.configure({ mode: "serial" });
let context: BrowserContext, page: Page;
const evidence = resolve(".local/evidence");
const failures: string[] = [];
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
  context = await chromium.launchPersistentContext(
    resolve(".local/browser-tests/profile-" + Date.now()),
    {
      headless: true,
      ...(process.platform === "win32" ? { channel: "chrome" } : {}),
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: resolve(".local/evidence/recordings"),
        size: { width: 1280, height: 720 },
      },
      acceptDownloads: true,
      downloadsPath: resolve(".local/exports"),
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
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("response", (r) => {
    if (
      r.status() >= 400 &&
      r.url().startsWith(process.env.TEST_BASE_URL || "http://127.0.0.1:4173/")
    )
      failures.push(`${r.status()} ${r.url()}`);
  });
});
test.afterEach(async ({ browserName: _browserName }, info) => {
  if (info.status !== info.expectedStatus && page && !page.isClosed()) {
    await page.screenshot({ path: resolve(evidence, "failure.png") });
    await writeFile(
      resolve(evidence, "failure-dom.txt"),
      await page.locator("body").innerText(),
    );
  }
});
test.afterAll(async () => {
  if (context) await context.close();
});
test("loads original world and enters with visible unofficial disclaimer", async () => {
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:4173/");
  await expect(
    page.getByRole("button", { name: /Enter your world/ }),
  ).toBeEnabled();
  await expect(page.locator(".disclaimer")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: resolve(evidence, "welcome.png") });
  await page.getByRole("button", { name: /Enter your world/ }).click();
  await expect(
    page.getByRole("button", { name: /Choose a case/ }),
  ).toBeVisible();
  await page.screenshot({ path: resolve(evidence, "home-world.png") });
});
test("movement, wall collision, drag camera, typing focus and meaningful desk interaction", async () => {
  const pos = await page.locator("#world-shell").getAttribute("data-position");
  await page.keyboard.down("w");
  await page.waitForTimeout(1200);
  await page.keyboard.up("w");
  await expect
    .poll(() => page.locator("#world-shell").getAttribute("data-position"))
    .not.toBe(pos);
  const before = await page.screenshot();
  await page.mouse.move(500, 330);
  await page.mouse.down();
  await page.mouse.move(780, 370, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(Buffer.compare(before, await page.screenshot())).not.toBe(0);
  await page.keyboard.press("r");
  await page.waitForTimeout(700);
  const clockBefore = await page
    .locator("#world-shell")
    .getAttribute("data-clock");
  await page.keyboard.down("s");
  await page.waitForTimeout(3500);
  const wallPosition = await page
    .locator("#world-shell")
    .getAttribute("data-position");
  await page.waitForTimeout(1500);
  await page.keyboard.up("s");
  expect(await page.locator("#world-shell").getAttribute("data-position")).toBe(
    wallPosition,
  );
  expect(await page.locator("#world-shell").getAttribute("data-clock")).toBe(
    clockBefore,
  );
  await page.keyboard.press("j");
  await expect(
    page.getByRole("heading", { name: "Your working history" }),
  ).toBeVisible();
  const frozen = await page
    .locator("#world-shell")
    .getAttribute("data-position");
  await page
    .getByRole("textbox", { name: "Journal note" })
    .fill("WASD work record, with named owner and evidence.");
  await page.keyboard.type("wasd");
  expect(await page.locator("#world-shell").getAttribute("data-position")).toBe(
    frozen,
  );
  await page.getByRole("button", { name: "Save reflection" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("world transition, source desk and save/reload persist state", async () => {
  await page.keyboard.press("m");
  await page
    .getByRole("button", { name: /Taxwire training HQ/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await expect(
    page.getByText("Taxwire training HQ", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: resolve(evidence, "training-hq.png") });
  await page.keyboard.press("m");
  await page
    .getByRole("button", { name: /Account operations/ })
    .first()
    .click();
  await page.waitForTimeout(700);
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".statusbar")).toContainText(
    "Saved in this browser",
  );
  const position = await page
    .locator("#world-shell")
    .getAttribute("data-position");
  await page.reload();
  await page.getByRole("button", { name: /Enter your world/ }).click();
  await expect(
    page.getByText("Account operations", { exact: true }),
  ).toBeVisible();
  expect(await page.locator("#world-shell").getAttribute("data-position")).toBe(
    position,
  );
});
test("complete vertical slice using research, meeting, evidence, specialist, update, verification and debrief", async () => {
  await page.getByRole("button", { name: "Cases", exact: true }).click();
  const first = content.missions.find((m) => m.id === "M-T01")!;
  const card = page.locator('.mission-card[data-case-id="M-T01"]');
  await card.getByRole("button", { name: /Begin/ }).click();
  for (const step of first.steps) {
    await expect(page.locator(".step-heading h2")).toHaveText(step.title);
    if (step === first.steps[2]) {
      await expect(page.locator(".statusbar")).toContainText(
        "Saved in this browser",
      );
      await page.reload();
      await page.getByRole("button", { name: /Enter your world/ }).click();
      await expect(page.locator(".step-heading h2")).toHaveText(step.title);
    }
    const best = [...step.choices]
      .filter((c) => !c.criticalFailure)
      .sort(
        (a, b) =>
          Object.values(b.scores).reduce((x, y) => x + y, 0) -
          Object.values(a.scores).reduce((x, y) => x + y, 0),
      )[0];
    if (step.expectedValue !== undefined)
      await page
        .getByRole("spinbutton", { name: "Calculated result" })
        .fill(String(step.expectedValue));
    if (step.draftPrompt) {
      await page
        .getByRole("textbox", { name: "Mission work product" })
        .fill(
          step.modelAnswer ||
            "Confirmed records and scope. Account owner follows up with verified evidence at the promised date. Specialist reviews uncertainty.",
        );
      await page.getByRole("checkbox", { name: /I compared my work/ }).check();
    }
    await page.getByRole("radio", { name: best.label, exact: true }).check();
    await page
      .getByRole("button", { name: "Commit action & continue →" })
      .click();
  }
  await expect(
    page.getByText(/Completed/, { exact: false }).first(),
  ).toBeVisible();
  await page
    .locator(".workbench-nav")
    .getByRole("button", { name: "Reviews", exact: true })
    .click();
  await expect(page.getByText(/Attempt 1 · guided.*Passed/)).toBeVisible();
  await page.screenshot({ path: resolve(evidence, "mission-debrief.png") });
});
test("exports/imports actual progress and world saves without shared-origin assumptions", async () => {
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Saves & export" })
    .click();
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export training progress", exact: true })
    .click();
  const download = await dl;
  const target = resolve(".local/exports/local-training.json");
  await download.saveAs(target);
  const packet = JSON.parse(await readFile(target, "utf8"));
  expect(packet.format).toBe("taxwire-am-training");
  expect(
    packet.missions.find((m: { id: string }) => m.id === "M-T01").status,
  ).toBe("completed");
  await page
    .getByLabel("Import compatible learning history")
    .setInputFiles(target);
  await expect(
    page.getByText("Compatible format", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Merge history without downgrading" })
    .click();
  await expect(page.getByText(/Imported self-reported progress/)).toBeVisible();
  const worldDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export world checkpoint" }).click();
  const worldFile = await worldDownload;
  const worldTarget = resolve(".local/exports/local-world.json");
  await worldFile.saveAs(worldTarget);
  await page
    .getByLabel("Import world checkpoint", { exact: true })
    .setInputFiles(worldTarget);
  await expect(
    page.getByRole("button", { name: "Back up and restore world" }),
  ).toBeVisible();
  await page.screenshot({ path: resolve(evidence, "save-transfer.png") });
  const backup = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back up and restore world" }).click();
  await (await backup).saveAs(resolve(".local/exports/backup-world.json"));
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Cases", exact: true }).click();
  await expect(
    page.locator('.mission-card[data-case-id="M-T01"]'),
  ).toContainText("Replay");
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Saves & export" })
    .click();
});
test("calendar rejects conflicts, accessibility, narrow workbench and context-loss recovery", async () => {
  await page
    .locator(".workbench-nav")
    .getByRole("button", { name: "Calendar", exact: true })
    .click();
  await page
    .getByLabel("Contact", { exact: true })
    .selectOption(content.contacts.find((c) => c.accountId === "internal")!.id);
  await page.getByLabel("Simulated day", { exact: true }).fill("2");
  await page.getByLabel("Start time", { exact: true }).selectOption("600");
  await page.getByRole("button", { name: "Schedule 30 minutes" }).click();
  await page.getByRole("button", { name: "Schedule 30 minutes" }).click();
  await expect(page.locator(".inline-status")).toContainText(
    /conflict|already|overlap/i,
  );
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Reduced motion", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Use accessible 2D workbench", exact: true })
    .check();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Make this world yours" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: resolve(evidence, "narrow-workbench.png") });
  await page
    .getByRole("checkbox", { name: "Use accessible 2D workbench", exact: true })
    .uncheck();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press("Escape");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    canvas?.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  });
  await expect(
    page.getByRole("heading", { name: "Choose your next case" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/3D graphics unavailable/)).toBeVisible();
});
test("direct hash navigation, assets and rendering measurement", async () => {
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:4173/";
  await page.goto(base + "#knowledge");
  await page.reload();
  await page.getByRole("button", { name: /Enter your world/ }).click();
  await expect(
    page.getByRole("heading", { name: "Learn it. Then put it to work." }),
  ).toBeVisible();
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Retry 3D graphics" }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const gl = canvas?.getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer:
        gl && ext
          ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : "unavailable",
      userAgent: navigator.userAgent,
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      status: document.querySelector(".statusbar")?.textContent,
    };
  });
  await writeFile(
    resolve(evidence, "renderer-measurement.json"),
    JSON.stringify(info, null, 2),
  );
  const notices = await page.request.get(base + "THIRD_PARTY_LICENSES.txt");
  expect(notices.ok()).toBe(true);
  expect(await notices.text()).toContain("Permission is hereby granted");
  expect(failures).toEqual([]);
  await page.screenshot({ path: resolve(evidence, "final-world.png") });
});

test("selected profiles resume on refresh and switching flushes recent work", async () => {
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Saves & export" })
    .click();
  await page.getByRole("button", { name: "Create another learner" }).click();
  await expect(
    page.getByRole("button", { name: /Enter your world/ }),
  ).toBeVisible();
  await page.getByLabel("Learner display name").fill("Practice Two");
  await page.getByRole("button", { name: /Enter your world/ }).click();
  await page.keyboard.press("j");
  await page
    .getByRole("textbox", { name: "Journal note" })
    .fill("Recent reflection retained across immediate profile switching.");
  await page.getByRole("button", { name: "Save reflection" }).click();
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Saves & export" })
    .click();
  await page
    .locator(".profile-button")
    .filter({ hasText: /^Learner$/ })
    .click();
  await page.getByRole("button", { name: /Enter your world/ }).click();
  await page.getByRole("button", { name: "Cases", exact: true }).click();
  await expect(
    page.locator('.mission-card[data-case-id="M-T01"]'),
  ).toContainText("Replay");
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Saves & export" })
    .click();
  await page
    .locator(".profile-button")
    .filter({ hasText: /^Practice Two$/ })
    .click();
  await expect(page.getByLabel("Learner display name")).toHaveValue(
    "Practice Two",
  );
  await page.reload();
  await expect(page.getByLabel("Learner display name")).toHaveValue(
    "Practice Two",
  );
  await page.getByRole("button", { name: /Enter your world/ }).click();
  await page.keyboard.press("j");
  await page
    .locator("details.document")
    .filter({
      hasText: "Recent reflection retained across immediate profile switching.",
    })
    .locator("summary")
    .click();
  await expect(
    page.getByText(
      "Recent reflection retained across immediate profile switching.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(failures).toEqual([]);
});
