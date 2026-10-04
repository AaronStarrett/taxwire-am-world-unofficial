import { chromium, expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { content } from "../../src/content";
import {
  activeStep,
  createState,
  minuteOfDay,
  scoreDimensions,
  transition,
} from "../../src/engine";
import type { GameState } from "../../src/engine";
import { getLocationAt } from "../../src/world/locations";
import { isWalkable } from "../../src/world/collision";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:4173/";
const evidence = resolve(".local/evidence/upgrade-compatibility");
const exports = resolve(".local/exports/upgrade-compatibility");
const previousKeys = [
  "version",
  "contentVersion",
  "learner",
  "seed",
  "rngState",
  "clockMinutes",
  "day",
  "activeMissionId",
  "missions",
  "competencies",
  "events",
  "tasks",
  "appointments",
  "artifacts",
  "visitedLocations",
  "location",
  "npcMemory",
  "specialistCapacity",
  "accountHealth",
  "settings",
  "avatar",
  "position",
  "reviewQueue",
  "imports",
  "extensions",
  "processedActions",
  "notifications",
  "campaignStage",
];

/** Synthetic fixtures retain the exact prior top-level contract and never read actual learner data. */
function previousWorld(
  version: 1 | 2,
  status: "completed" | "in_progress",
  suffix: string,
) {
  let state = transition(
    createState(
      {
        id: `synthetic-ui-upgrade-${suffix}`,
        displayName: `Synthetic Legacy ${suffix}`,
      },
      20261003,
    ),
    { type: "START_MISSION", missionId: "M-A02", mode: "independent" },
    content,
  );
  for (let guard = 0; state.activeMissionId && guard < 80; guard++) {
    const step = activeStep(state, content)!;
    const npc = content.contacts.find((person) => person.id === step.npcId);
    const now = minuteOfDay(state.clockMinutes);
    if (npc && now < npc.availability[0]) {
      state = transition(
        state,
        { type: "WAIT", minutes: Math.min(240, npc.availability[0] - now) },
        content,
      );
      continue;
    }
    if (
      (npc && now + step.duration > npc.availability[1]) ||
      now + step.duration + 25 >= 1020
    ) {
      state = transition(state, { type: "END_DAY" }, content);
      continue;
    }
    const choice = [...step.choices]
      .filter((item) => !item.criticalFailure)
      .sort((a, b) => scoreDimensions(b.scores) - scoreDimensions(a.scores))[0];
    state = transition(
      state,
      {
        type: "ACT",
        id: `synthetic-${suffix}-${guard}`,
        stepId: step.id,
        choiceId: choice.id,
        value: step.expectedValue,
        draft: step.draftPrompt
          ? `Synthetic self-review: ${step.modelAnswer ?? "Confirmed facts, uncertainty, named owner and verified evidence."}`
          : undefined,
      },
      content,
    );
    if (status === "in_progress") break;
  }
  expect(state.missions["M-A02"].status).toBe(status);
  state = transition(state, { type: "TRAVEL", location: "hq" }, content);
  state.position = { x: 0, z: -19.6, yaw: 0 };
  state.settings.workbench = true;
  state.extensions.futureCompatibilityNote = {
    retain: "synthetic unknown extension",
    number: 42,
  };
  const prior = structuredClone(state) as unknown as Record<string, unknown>;
  prior.version = version;
  prior.contentVersion = "twaw-2026.10.03-v1";
  delete prior.tutorial;
  delete prior.guidanceMode;
  delete prior.assistanceHistory;
  if (version === 1) {
    delete prior.specialistCapacity;
    delete prior.extensions;
  }
  for (const progress of Object.values(prior.missions as GameState["missions"]))
    for (const attempt of progress.attempts) {
      delete attempt.assistance;
      delete attempt.assistanceVerified;
      delete attempt.unaided;
    }
  expect(Object.keys(prior).sort()).toEqual(
    previousKeys
      .filter(
        (key) =>
          version === 2 || !["specialistCapacity", "extensions"].includes(key),
      )
      .sort(),
  );
  return {
    envelope: {
      format: "taxwire-am-world-save",
      version: 1,
      exportedAt: "2026-10-03T12:00:00.000Z",
      state: prior,
    },
    expected: state,
  };
}
async function launch(
  suffix: string,
): Promise<{ context: BrowserContext; page: Page }> {
  await mkdir(evidence, { recursive: true });
  await mkdir(exports, { recursive: true });
  const context = await chromium.launchPersistentContext(
    resolve(`.local/browser-tests/compatibility-${suffix}-${Date.now()}`),
    {
      headless: true,
      ...(process.platform === "win32" ? { channel: "chrome" } : {}),
      viewport: { width: 1280, height: 720 },
      acceptDownloads: true,
      downloadsPath: exports,
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
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(base);
  await page.getByRole("button", { name: /Explore freely/ }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Use accessible 2D workbench", exact: true })
    .check();
  await page.getByRole("button", { name: "Close workbench" }).click();
  return { context, page };
}
async function saves(page: Page): Promise<void> {
  if (!(await page.getByRole("dialog").count()))
    await page.getByRole("button", { name: "Cases", exact: true }).click();
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Saves & export" })
    .click();
}
async function importWorld(
  page: Page,
  envelope: unknown,
  name: string,
): Promise<void> {
  await saves(page);
  await page
    .getByLabel("Import world checkpoint", { exact: true })
    .setInputFiles({
      name: `synthetic-${name}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(envelope)),
    });
  const button = page.getByRole("button", {
    name: "Back up and restore world",
    exact: true,
  });
  await expect(button).toBeVisible();
  const download = page.waitForEvent("download");
  await button.click();
  await (
    await download
  ).saveAs(resolve(exports, `synthetic-before-${name}.json`));
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function readWorld(page: Page, name: string): Promise<GameState> {
  await saves(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export world checkpoint", exact: true })
    .click();
  const path = resolve(exports, `synthetic-readback-${name}.json`);
  await (await pending).saveAs(path);
  return JSON.parse(await readFile(path, "utf8")).state as GameState;
}
async function saved(page: Page, learnerId: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          (id) =>
            new Promise<boolean>((resolveResult, reject) => {
              const opening = indexedDB.open("taxwire-am-world-local", 1);
              opening.onerror = () => reject(opening.error);
              opening.onsuccess = () => {
                const database = opening.result;
                const request = database
                  .transaction("saves", "readonly")
                  .objectStore("saves")
                  .get(id);
                request.onerror = () => {
                  database.close();
                  reject(request.error);
                };
                request.onsuccess = () => {
                  const row = request.result;
                  database.close();
                  resolveResult(!!row && JSON.parse(row.payload).version === 3);
                };
              };
            }),
          learnerId,
        ),
      { timeout: 20000 },
    )
    .toBe(true);
}
function assertRetained(actual: GameState, expected: GameState) {
  expect(actual.version).toBe(3);
  expect(actual.learner).toEqual(expected.learner);
  expect(actual.clockMinutes).toBe(expected.clockMinutes);
  expect(actual.activeMissionId).toBe(expected.activeMissionId);
  expect(actual.missions["M-A02"].status).toBe(
    expected.missions["M-A02"].status,
  );
  expect(actual.missions["M-A02"].stepIndex).toBe(
    expected.missions["M-A02"].stepIndex,
  );
  expect(actual.missions["M-A02"].bestScore).toBe(
    expected.missions["M-A02"].bestScore,
  );
  expect(
    actual.missions["M-A02"].attempts.map((attempt) => attempt.trace),
  ).toEqual(
    expected.missions["M-A02"].attempts.map((attempt) => attempt.trace),
  );
  expect(actual.competencies).toEqual(expected.competencies);
  expect(actual.tutorial.status).toBe("not_started");
  expect(actual.tutorial.legacyOptIn).toBe(true);
  expect(actual.missions["M-A02"].attempts[0].assistanceVerified).toBe(false);
}

test("imports a prior version 1 completed world through the UI, retains awards and offers opt-in guidance after reload", async () => {
  const fixture = previousWorld(1, "completed", "Completed V1");
  const { context, page } = await launch("v1");
  try {
    await importWorld(page, fixture.envelope, "v1-completed");
    assertRetained(await readWorld(page, "v1-completed"), fixture.expected);
    await saved(page, fixture.expected.learner.id);
    await page.reload();
    await expect(
      page.getByRole("button", { name: /Continue your day/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Start your guided first day/ }),
    ).not.toBeVisible();
    await page.getByRole("button", { name: /Continue your day/ }).click();
    assertRetained(await readWorld(page, "v1-reloaded"), fixture.expected);
    await page.screenshot({
      path: resolve(evidence, "legacy-completed-opt-in.png"),
    });
  } finally {
    await context.close();
  }
});
test("imports a prior version 2 in-progress world and preserves the exact current case step, trace and unknown extensions", async () => {
  const fixture = previousWorld(2, "in_progress", "In Progress V2");
  const { context, page } = await launch("v2");
  try {
    await importWorld(page, fixture.envelope, "v2-in-progress");
    let result = await readWorld(page, "v2-in-progress");
    assertRetained(result, fixture.expected);
    expect(result.extensions.futureCompatibilityNote).toEqual(
      fixture.expected.extensions.futureCompatibilityNote,
    );
    await saved(page, fixture.expected.learner.id);
    await page.reload();
    await page.getByRole("button", { name: /Continue your day/ }).click();
    await page.getByRole("button", { name: "Cases", exact: true }).click();
    await page.getByRole("button", { name: "Resume →", exact: true }).click();
    await expect(page.locator(".step-heading")).toContainText("ACTION 2 / 7");
    result = await readWorld(page, "v2-reloaded");
    assertRetained(result, fixture.expected);
    await page.screenshot({
      path: resolve(evidence, "legacy-in-progress-resumed.png"),
    });
  } finally {
    await context.close();
  }
});
test("relocates a prior save with invalid geometry safely while retaining progress, and rejects future save imports", async () => {
  const fixture = previousWorld(2, "in_progress", "Geometry V2");
  fixture.envelope.state.position = { x: 9999, z: -9999, yaw: 0 };
  (fixture.envelope.state.settings as GameState["settings"]).workbench = false;
  const { context, page } = await launch("geometry");
  try {
    await importWorld(page, fixture.envelope, "geometry");
    const actual = await readWorld(page, "geometry-safe");
    assertRetained(actual, fixture.expected);
    expect(isWalkable(actual.position)).toBe(true);
    expect(getLocationAt(actual.position.x, actual.position.z)?.id).toBe("hq");
    expect(actual.notifications.join(" ")).toContain("safe arrival");
    await page
      .getByLabel("Import world checkpoint", { exact: true })
      .setInputFiles({
        name: "synthetic-future.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            ...fixture.envelope,
            state: { ...fixture.envelope.state, version: 4 },
          }),
        ),
      });
    await expect(
      page.getByText(/newer saves are never silently downgraded/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Back up and restore world" }),
    ).not.toBeVisible();
    assertRetained(await readWorld(page, "future-rejected"), fixture.expected);
    await page.screenshot({
      path: resolve(evidence, "legacy-geometry-future-rejection.png"),
    });
  } finally {
    await context.close();
  }
});
test("switches between migrated completed and in-progress profiles without replacing either history", async () => {
  const completed = previousWorld(2, "completed", "Profile A");
  const inProgress = previousWorld(2, "in_progress", "Profile B");
  const { context, page } = await launch("profiles");
  try {
    await importWorld(page, completed.envelope, "profile-a");
    await saved(page, completed.expected.learner.id);
    await importWorld(page, inProgress.envelope, "profile-b");
    await saved(page, inProgress.expected.learner.id);
    await saves(page);
    await page
      .getByRole("button", {
        name: completed.expected.learner.displayName,
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: /Continue your day/ }).click();
    assertRetained(
      await readWorld(page, "profile-a-restored"),
      completed.expected,
    );
    await page
      .getByRole("button", {
        name: inProgress.expected.learner.displayName,
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: /Continue your day/ }).click();
    assertRetained(
      await readWorld(page, "profile-b-restored"),
      inProgress.expected,
    );
    await page.screenshot({
      path: resolve(evidence, "legacy-profiles-retained.png"),
    });
  } finally {
    await context.close();
  }
});

test("retains a protected custom active profile and its future tutorial bytes across autosave and repeated reloads", async () => {
  const fixture = previousWorld(2, "in_progress", "Protected Future Tutorial");
  const learnerId = fixture.expected.learner.id;
  expect(learnerId).not.toBe("learner-default");
  const { context, page } = await launch("future-active-profile");
  try {
    await importWorld(page, fixture.envelope, "future-active-profile");
    await saved(page, learnerId);
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("taxwire-am-active-profile")),
      )
      .toBe(learnerId);

    // Start with a real UI-imported save, then simulate a later application version.
    // A valid preceding checkpoint ensures this exercises the version guard,
    // rather than falling through to ordinary corruption recovery.
    const original = await page.evaluate(
      (id) =>
        new Promise<{
          envelope: string;
          payload: string;
          checkpointPayload: string;
        }>((resolveResult, reject) => {
          const opening = indexedDB.open("taxwire-am-world-local", 1);
          opening.onerror = () => reject(opening.error);
          opening.onsuccess = () => {
            const database = opening.result;
            const transaction = database.transaction(
              ["saves", "checkpoints"],
              "readwrite",
            );
            const saves = transaction.objectStore("saves");
            const reading = saves.get(id);
            let seeded: {
              envelope: string;
              payload: string;
              checkpointPayload: string;
            };
            reading.onsuccess = () => {
              const prior = reading.result as {
                id: string;
                payload: string;
                sequence?: number;
              };
              const state = JSON.parse(prior.payload) as GameState;
              const payload = JSON.stringify({
                ...state,
                tutorial: {
                  ...state.tutorial,
                  version: 2,
                  futureContinuation: "Synthetic future-version evidence",
                },
              });
              let hash = 2166136261;
              for (let index = 0; index < payload.length; index++) {
                hash ^= payload.charCodeAt(index);
                hash = Math.imul(hash, 16777619);
              }
              const next = {
                ...prior,
                payload,
                checksum: (hash >>> 0).toString(16),
                sequence: (prior.sequence ?? 0) + 1,
              };
              transaction.objectStore("checkpoints").put({
                ...prior,
                id: `synthetic-before-future:${id}`,
                kind: "checkpoint",
              });
              saves.put(next);
              localStorage.setItem("taxwire-am-active-profile", id);
              seeded = {
                envelope: JSON.stringify(next),
                payload,
                checkpointPayload: prior.payload,
              };
            };
            transaction.oncomplete = () => {
              database.close();
              resolveResult(seeded);
            };
            transaction.onerror = transaction.onabort = () => {
              database.close();
              reject(transaction.error);
            };
          };
        }),
      learnerId,
    );

    for (let reload = 0; reload < 2; reload++) {
      await page.reload();
      await expect(page.locator(".statusbar")).toContainText(
        "Original save retained: Save contains an unsupported guided first-day version; newer saves are never silently downgraded.",
      );
      // Allow the normal 600 ms autosave window to expire before readback.
      await page.waitForTimeout(1500);
      const retained = await page.evaluate(
        (id) =>
          new Promise<{
            activeProfile: string | null;
            envelope: string;
            backupPayload: string;
            checkpointPayload: string;
          }>((resolveResult, reject) => {
            const opening = indexedDB.open("taxwire-am-world-local", 1);
            opening.onerror = () => reject(opening.error);
            opening.onsuccess = () => {
              const database = opening.result;
              const transaction = database.transaction(
                ["saves", "backups", "checkpoints"],
                "readonly",
              );
              const save = transaction.objectStore("saves").get(id);
              const backup = transaction
                .objectStore("backups")
                .get(`unsupported-version:${id}`);
              const checkpoint = transaction
                .objectStore("checkpoints")
                .get(`synthetic-before-future:${id}`);
              transaction.oncomplete = () => {
                database.close();
                resolveResult({
                  activeProfile: localStorage.getItem(
                    "taxwire-am-active-profile",
                  ),
                  envelope: JSON.stringify(save.result),
                  backupPayload: backup.result?.payload,
                  checkpointPayload: checkpoint.result?.payload,
                });
              };
              transaction.onerror = transaction.onabort = () => {
                database.close();
                reject(transaction.error);
              };
            };
          }),
        learnerId,
      );
      expect(retained.activeProfile).toBe(learnerId);
      expect(retained.envelope).toBe(original.envelope);
      expect(retained.backupPayload).toBe(original.payload);
      expect(retained.checkpointPayload).toBe(original.checkpointPayload);
    }
    await page.screenshot({
      path: resolve(evidence, "future-active-profile-protected.png"),
    });
  } finally {
    await context.close();
  }
});
