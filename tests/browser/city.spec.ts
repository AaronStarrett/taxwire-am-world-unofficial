import { chromium, expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { content } from "../../src/content";
import { activeStep, createState, transition } from "../../src/engine";
import { readRelationshipConversations } from "../../src/engine/conversations";
import { minuteOfDay, appointmentClock } from "../../src/engine/time";
import { getSceneColliders, isWalkable } from "../../src/world/collision";
import type { GameState } from "../../src/engine";
import { locations, getBuildingFloors } from "../../src/world/locations";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:4173/";
const evidence = resolve(".local/evidence/city");
let context: BrowserContext;
let page: Page;
let errors: string[];

// Every test has its own browser-local synthetic learner. No real learner save is read.
test.beforeEach(async ({ browserName: _browserName }, info) => {
  const mobileGuide = info.tags.includes("@mobile-guide");
  await mkdir(evidence, { recursive: true });
  context = await chromium.launchPersistentContext(
    resolve(
      `.local/browser-tests/city-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ),
    {
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : process.platform === "win32"
          ? { channel: "chrome" }
          : {}),
      viewport: mobileGuide
        ? { width: 390, height: 844 }
        : { width: 1280, height: 800 },
      acceptDownloads: true,
      downloadsPath: resolve(".local/exports/city"),
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
  page.setDefaultTimeout(process.env.CI ? 45000 : 20000);
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(base) && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(base);
  if (!mobileGuide)
    await page.getByRole("button", { name: /Explore freely/ }).click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page.getByLabel("Quality", { exact: true }).selectOption("low");
  await page.getByRole("button", { name: "Close workbench" }).click();
});

test.afterEach(async ({ browserName: _browserName }, info) => {
  try {
    if (page && !page.isClosed()) {
      if (info.status !== info.expectedStatus)
        await page.screenshot({
          path: resolve(
            evidence,
            `failure-${info.testId.replace(/\W/g, "-")}.png`,
          ),
        });
      expect(errors).toEqual([]);
    }
  } finally {
    await context?.close();
  }
});

async function save(): Promise<GameState> {
  await expect(page.locator(".statusbar")).toHaveAttribute(
    "data-save-status",
    "saved",
  );
  return page.evaluate(
    () =>
      new Promise<GameState>((resolveResult, reject) => {
        const request = indexedDB.open("taxwire-am-world-local", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("saves", "readonly");
          const read = tx
            .objectStore("saves")
            .get(
              localStorage.getItem("taxwire-am-active-profile") ||
                "learner-default",
            );
          tx.oncomplete = () => {
            db.close();
            if (!read.result?.payload)
              reject(new Error("Synthetic learner has no acknowledged save"));
            else resolveResult(JSON.parse(read.result.payload) as GameState);
          };
          tx.onerror = tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
  );
}

async function sceneScreenshot(name: string, floor: number) {
  const world = page.getByTestId("world");
  // DOM navigation can update before WebGL has a usable upper-floor camera.
  await expect(world).toHaveAttribute("data-scene-floor", String(floor));
  await expect(world).toHaveAttribute("data-scene-settled", "true", {
    timeout: process.env.CI ? 60000 : 30000,
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolveResult) =>
        requestAnimationFrame(() => resolveResult()),
      ),
  );
  await page.screenshot({ path: resolve(evidence, name) });
}

async function openPanel(name: string) {
  // The conversation is a focused side sheet, so its workbench navigation is hidden.
  if (
    await page
      .locator(".conversation-panel, .conversation-directory")
      .isVisible()
  )
    await closePanel();
  if (!(await page.getByRole("dialog").count()))
    await page.getByRole("button", { name: "Cases", exact: true }).click();
  await page
    .locator(".workbench-nav")
    .getByRole("button", { name, exact: true })
    .click();
}
async function closePanel() {
  if (await page.getByRole("dialog").count())
    await page.getByRole("button", { name: "Close workbench" }).click();
}
async function accessible() {
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page
    .getByRole("checkbox", { name: "Use accessible 2D workbench", exact: true })
    .check();
  await closePanel();
}
async function travel(locationId: string) {
  await closePanel();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  const location = locations.find((place) => place.id === locationId)!;
  await page
    .getByRole("button", {
      name: new RegExp(location.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    })
    .first()
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function person(npcId: string) {
  await openPanel("People");
  await page.getByRole("button", { name: /Browse all \d+ people/ }).click();
  const npc = content.contacts.find((contact) => contact.id === npcId)!;
  await page.getByLabel("Find a person", { exact: true }).fill(npc.name);
  await page
    .locator(".person-directory-card")
    .filter({ hasText: npc.name })
    .click();
  await expect(page.getByTestId("conversation-panel")).toHaveAttribute(
    "data-npc-id",
    npcId,
  );
  await expect(
    page
      .getByTestId("conversation-panel")
      .getByRole("heading", { name: npc.name, exact: true }),
  ).toBeVisible();
  const resume = page.getByRole("button", {
    name: "Resume this conversation",
    exact: true,
  });
  if (await resume.isVisible()) {
    const before = readRelationshipConversations(await save()).sessions[npcId];
    expect(before.paused).toBe(true);
    await resume.click();
    const after = readRelationshipConversations(await save()).sessions[npcId];
    expect(after.paused).toBe(false);
    expect(after.history).toEqual(before.history);
    expect(after.nodeId).toBe(before.nodeId);
  }
}
async function choose(choiceId: string) {
  await page
    .getByTestId("conversation-panel")
    .locator(`[data-choice-id="${choiceId}"]`)
    .click();
  await save();
}
async function restoreSynthetic(state: GameState, name: string) {
  await openPanel("Cases");
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Saves & export" })
    .click();
  await page
    .getByLabel("Import world checkpoint", { exact: true })
    .setInputFiles({
      name: `synthetic-city-${name}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "taxwire-am-world-save",
          version: 1,
          exportedAt: "2026-10-09T12:00:00.000Z",
          state,
        }),
      ),
    });
  const backup = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Back up and restore world", exact: true })
    .click();
  await (
    await backup
  ).saveAs(resolve(".local/exports/city", `before-${name}.json`));
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await save();
}

// UI test coverage follows below. Graph topology and all floor collision geometry are
// also exercised headlessly; these tests establish the actual rendered controls.
test("travels through every building and representative upper floors, preserving floor and pose across reload", async () => {
  test.setTimeout(process.env.CI ? 300000 : 180000);
  await expect(page.locator("canvas")).toBeVisible();
  const plaza = createState(
    { id: "synthetic-city-plaza", displayName: "Synthetic City Learner" },
    20261009,
  );
  plaza.settings.quality = "low";
  plaza.position = { x: 0, z: 5, yaw: 0 };
  await restoreSynthetic(plaza, "plaza");
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-building",
    "street",
  );
  await sceneScreenshot("street-skyline.png", 0);
  for (const location of locations) {
    await travel(location.id);
    const clock = (await save()).clockMinutes;
    await expect(page.getByTestId("world")).toHaveAttribute(
      "data-current-building",
      location.id,
    );
    await page.getByTestId("world-elevator").click();
    const top = getBuildingFloors(location.id).at(-1)!;
    await expect(page.getByTestId("floor-directory")).toBeVisible();
    await page.getByTestId(`floor-${top.index}`).click();
    await expect(page.getByTestId("world")).toHaveAttribute(
      "data-current-floor",
      String(top.index),
    );
    await expect(page.getByTestId("floor-directory")).not.toBeVisible();
    await sceneScreenshot(`upper-${location.id}.png`, top.index);
    // Same floor entry is a no-op: opening/dismissing a directory never teleports.
    const position = await page
      .locator("#world-shell")
      .getAttribute("data-position");
    await page.getByTestId("world-elevator").click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("floor-directory")).not.toBeVisible();
    expect(
      await page.locator("#world-shell").getAttribute("data-position"),
    ).toBe(position);
    expect((await save()).clockMinutes).toBe(clock);
  }
  await travel("hq");
  for (const index of [1, 4, 10, 12]) {
    await page.getByTestId("world-elevator").click();
    await page.getByTestId(`floor-${index}`).click();
    await expect(page.getByTestId("world")).toHaveAttribute(
      "data-current-floor",
      String(index),
    );
    await sceneScreenshot(
      `hq-layout-${getBuildingFloors("hq")[index].theme}.png`,
      index,
    );
  }
  await page.getByTestId("world-elevator").click();
  await page.getByTestId("floor-8").click();
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-floor",
    "8",
  );
  const before = await save();
  const position = await page
    .locator("#world-shell")
    .getAttribute("data-position");
  await page.reload();
  await page
    .getByRole("button", { name: /Explore freely|Continue your day/ })
    .first()
    .click();
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-floor",
    "8",
  );
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-building",
    "hq",
  );
  await expect(page.locator("#world-shell")).toHaveAttribute(
    "data-position",
    position!,
  );
  expect((await save()).missions).toEqual(before.missions);
  await page.keyboard.down("w");
  await expect
    .poll(() => page.locator("#world-shell").getAttribute("data-position"))
    .not.toBe(position);
  let previous = "",
    stable = 0;
  await expect
    .poll(
      async () => {
        await page.evaluate(
          () =>
            new Promise<void>((resolveResult) => {
              let frames = 8;
              const observe = () => {
                if (--frames === 0) resolveResult();
                else requestAnimationFrame(observe);
              };
              requestAnimationFrame(observe);
            }),
        );
        const current = (await page
          .locator("#world-shell")
          .getAttribute("data-position"))!;
        stable = current === previous ? stable + 1 : 0;
        previous = current;
        return stable >= 2;
      },
      { timeout: process.env.CI ? 90000 : 60000, intervals: [250] },
    )
    .toBe(true);
  await page.keyboard.up("w");
  const [x, z] = previous.split(",").map(Number);
  expect(isWalkable({ x, z }, getSceneColliders("hq", 8))).toBe(true);
  expect(Math.abs(x)).toBeLessThan(6);
  expect(Math.abs(z + 23)).toBeLessThan(5);
  await page.keyboard.press("r");
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-floor",
    "8",
  );
  await sceneScreenshot("hq-floor-save-reload.png", 8);
  await travel("hq");
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-floor",
    "0",
  );
  await page.keyboard.down("s");
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-building",
    "street",
    { timeout: process.env.CI ? 60000 : 30000 },
  );
  await page.keyboard.up("s");
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-floor",
    "0",
  );
  await sceneScreenshot("hq-return-ground-door-exit.png", 0);
});

// Use only public save import/export UI for synthetic fixture setup. New production
// state is always reached with the rendered controls, never an internal dispatch hook.

test("mobile floor directory stays usable without horizontal overflow or background movement", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await travel("hq");
  await page.getByTestId("world-elevator").click();
  await expect(page.getByTestId("floor-directory")).toBeVisible();
  const position = await page
    .locator("#world-shell")
    .getAttribute("data-position");
  await page.keyboard.down("w");
  await page.waitForTimeout(250);
  await page.keyboard.up("w");
  await expect(page.locator("#world-shell")).toHaveAttribute(
    "data-position",
    position!,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByTestId("floor-17").click();
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-floor",
    "17",
  );
  await sceneScreenshot("mobile-summit-lounge.png", 17);
  await page.getByTestId("world-elevator").click();
  await page.getByTestId("floor-0").click();
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-current-floor",
    "0",
  );
});

async function startTopic(label: string) {
  await page
    .getByTestId("conversation-panel")
    .getByRole("button", { name: new RegExp(label) })
    .click();
  await save();
}
async function withinAvailability(npcId: string) {
  const npc = content.contacts.find((contact) => contact.id === npcId)!;
  let now = minuteOfDay((await save()).clockMinutes);
  if (now + 20 > npc.availability[1]) {
    await openPanel("Calendar");
    await page
      .getByRole("button", { name: "Close day deliberately", exact: true })
      .click();
    now = minuteOfDay((await save()).clockMinutes);
  }
  while (now < npc.availability[0]) {
    await openPanel("Calendar");
    await page
      .getByRole("button", { name: "Advance 30 business minutes", exact: true })
      .click();
    now = minuteOfDay((await save()).clockMinutes);
  }
}

test("all forty authored people support contact-specific conversation and an owned good outcome", async () => {
  test.setTimeout(process.env.CI ? 300000 : 180000);
  await accessible();
  expect(content.contacts).toHaveLength(40);
  for (const npc of content.contacts) {
    await withinAvailability(npc.id);
    await person(npc.id);
    await startTopic("Get to know their business");
    const panel = page.getByTestId("conversation-panel");
    await expect(panel).toHaveAttribute("data-node-id", "discovery_open");
    await expect(panel.locator(".conversation-scene")).toContainText(npc.name);
    await expect(panel.locator(".conversation-scene")).toContainText(npc.role);
    const origin = (await save()).clockMinutes;
    for (const choice of ["ask_goal", "targeted", "name_gap", "owned_followup"])
      await choose(choice);
    await expect(
      panel.getByRole("region", { name: "Conversation debrief" }),
    ).toContainText("good outcome");
    const stored = await save();
    const session = readRelationshipConversations(stored).sessions[npc.id];
    expect(session.status).toBe("completed");
    expect(session.history.map((entry) => entry.choiceId)).toEqual([
      "ask_goal",
      "targeted",
      "name_gap",
      "owned_followup",
    ]);
    expect(session.debrief).toMatchObject({
      outcome: "good",
      trustDelta: 4,
      replay: false,
    });
    expect(stored.clockMinutes).toBe(origin + 12);
    expect(stored.tasks).toContainEqual(
      expect.objectContaining({
        id: `relationship-followup:${npc.id}:discovery`,
        status: "open",
        owner: stored.learner.displayName,
      }),
    );
  }
  const stored = await save();
  expect(
    Object.keys(readRelationshipConversations(stored).sessions).sort(),
  ).toEqual(content.contacts.map((npc) => npc.id).sort());
  await page.screenshot({
    path: resolve(evidence, "all-people-good-conversation.png"),
  });
});

test("different replies produce poor, mixed and recovery debriefs while interrupted stages and history survive reload", async () => {
  await accessible();
  await person("npc-mentor");
  await startTopic("Get to know their business");
  await choose("assume");
  await expect(page.getByTestId("conversation-panel")).toHaveAttribute(
    "data-node-id",
    "discovery_assumption",
  );
  const interrupted = await save();
  const sessionBefore =
    readRelationshipConversations(interrupted).sessions["npc-mentor"];
  await closePanel();
  await page.reload();
  await page
    .getByRole("button", { name: /Explore freely|Continue your day/ })
    .first()
    .click();
  await person("npc-mentor");
  await expect(page.getByTestId("conversation-panel")).toHaveAttribute(
    "data-node-id",
    "discovery_assumption",
  );
  expect(
    readRelationshipConversations(await save()).sessions["npc-mentor"].history,
  ).toEqual(sessionBefore.history);
  expect((await save()).clockMinutes).toBe(interrupted.clockMinutes);
  for (const choice of ["reset", "specific", "commit"]) await choose(choice);
  await expect(
    page.getByRole("region", { name: "Conversation debrief" }),
  ).toContainText("recovery outcome");
  expect(
    readRelationshipConversations(await save()).sessions["npc-mentor"].debrief,
  ).toMatchObject({ outcome: "recovery", trustDelta: 2 });
  await page.screenshot({
    path: resolve(evidence, "conversation-recovery.png"),
  });
  await startTopic("Discuss scope and boundaries");
  for (const choice of ["promise", "insist", "leave"]) await choose(choice);
  await expect(
    page.getByRole("region", { name: "Conversation debrief" }),
  ).toContainText("poor outcome");
  expect(
    readRelationshipConversations(await save()).sessions["npc-mentor"].debrief,
  ).toMatchObject({ outcome: "poor", trustDelta: -6 });
  await page.screenshot({ path: resolve(evidence, "conversation-poor.png") });
  await startTopic("Coordinate a warm handoff");
  for (const choice of ["partial", "owned_gap", "verify"]) await choose(choice);
  await expect(
    page.getByRole("region", { name: "Conversation debrief" }),
  ).toContainText("mixed outcome");
  expect(
    readRelationshipConversations(await save()).sessions["npc-mentor"].debrief,
  ).toMatchObject({ outcome: "mixed", trustDelta: 0 });
  await page.screenshot({ path: resolve(evidence, "conversation-mixed.png") });
  const firstHistory = readRelationshipConversations(await save()).history;
  expect(firstHistory.map((entry) => entry.outcome)).toEqual([
    "recovery",
    "poor",
    "mixed",
  ]);
  // A second good route on a previously awarded topic is recorded practice, not reward farming.
  const trust = (await save()).npcMemory["npc-mentor"].trust;
  await startTopic("Get to know their business");
  for (const choice of ["ask_goal", "targeted", "name_gap", "owned_followup"])
    await choose(choice);
  expect(
    readRelationshipConversations(await save()).sessions["npc-mentor"].debrief,
  ).toMatchObject({ outcome: "good", trustDelta: 0, replay: true });
  expect((await save()).npcMemory["npc-mentor"].trust).toBe(trust);
  await page.screenshot({
    path: resolve(evidence, "conversation-practice-replay.png"),
  });
});

test("coffee invitation becomes a timed café visit with attendance, conversation and retained follow-through", async () => {
  await travel("hq");
  await person("npc-mentor");
  await sceneScreenshot("mentor-conversation-framing.png", 0);
  await startTopic("Invite them for coffee");
  await choose("invite");
  await expect(page.locator(".conversation-scene h3")).toHaveText(
    "The invitation is accepted",
  );
  await choose("schedule");
  await expect(page.getByTestId("conversation-panel")).toHaveAttribute(
    "data-node-id",
    "coffee_wait",
  );
  const scheduled = await save();
  const appointment =
    readRelationshipConversations(scheduled).sessions["npc-mentor"]
      .appointment!;
  expect(
    scheduled.appointments.find((item) => item.id === appointment.id)?.status,
  ).toBe("scheduled");
  await expect(page.locator('[data-choice-id="arrive"]')).toBeDisabled();
  await page.reload();
  await page
    .getByRole("button", { name: /Explore freely|Continue your day/ })
    .first()
    .click();
  await person("npc-mentor");
  expect(
    readRelationshipConversations(await save()).sessions["npc-mentor"]
      .appointment,
  ).toEqual(appointment);
  await page
    .getByRole("button", { name: "Visit Common Ground café →", exact: true })
    .click();
  await person("npc-mentor");
  const beforeWait = await save();
  if (
    beforeWait.clockMinutes <
    appointmentClock(appointment.day, appointment.minute)
  ) {
    await expect(page.locator('[data-choice-id="arrive"]')).toBeDisabled();
    await page
      .getByRole("button", { name: /^Wait \d+ business minutes$/ })
      .click();
  }
  await expect(page.locator('[data-choice-id="arrive"]')).toBeEnabled();
  await choose("arrive");
  expect((await save()).location).toBe("cafe");
  expect(
    (await save()).appointments.find((item) => item.id === appointment.id)
      ?.status,
  ).toBe("attended");
  await sceneScreenshot("coffee-arrived-at-cafe.png", 0);
  for (const choice of ["work_style", "reflect", "followup"])
    await choose(choice);
  await expect(
    page.getByRole("region", { name: "Conversation debrief" }),
  ).toContainText("good outcome");
  const completed = await save();
  const session =
    readRelationshipConversations(completed).sessions["npc-mentor"];
  expect(session.flags).toContain("cafe-attended");
  expect(session.debrief?.route).toContain("coffee_wait/arrive");
  expect(completed.tasks).toContainEqual(
    expect.objectContaining({
      id: "relationship-followup:npc-mentor:coffee",
      status: "open",
    }),
  );
  expect(completed.clockMinutes).toBeLessThanOrEqual(
    appointmentClock(appointment.day, appointment.minute) +
      appointment.duration,
  );
  await sceneScreenshot("coffee-good-followthrough.png", 0);
});

test("missed coffee cannot become attendance and mobile conversation retains a courteous written follow-up", async () => {
  await accessible();
  await person("npc-mentor");
  await startTopic("Invite them for coffee");
  for (const choice of ["invite", "schedule"]) await choose(choice);
  const appointment = readRelationshipConversations(await save()).sessions[
    "npc-mentor"
  ].appointment!;
  await openPanel("Calendar");
  for (let n = 0; n < 2; n++)
    await page
      .getByRole("button", { name: "Advance 30 business minutes", exact: true })
      .click();
  await save();
  await person("npc-mentor");
  await expect(page.locator('[data-choice-id="arrive"]')).toBeDisabled();
  expect(
    (await save()).appointments.find((item) => item.id === appointment.id)
      ?.status,
  ).toBe("missed");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await choose("cancel");
  await choose("written");
  await expect(
    page.getByRole("region", { name: "Conversation debrief" }),
  ).toContainText("mixed outcome");
  const stored = await save();
  expect(
    readRelationshipConversations(stored).sessions["npc-mentor"].flags,
  ).not.toContain("cafe-attended");
  expect(stored.tasks).toContainEqual(
    expect.objectContaining({
      id: "relationship-followup:npc-mentor:coffee",
      status: "open",
    }),
  );
  await page.screenshot({
    path: resolve(evidence, "mobile-missed-coffee-followup.png"),
  });
});

test("a mission challenge takes a real fork, persists it, and distinguishes poor closure from evidence-backed recovery", async () => {
  test.setTimeout(process.env.CI ? 240000 : 180000);
  const mission = content.missions.find((item) => item.id === "M-A02")!;
  const fixture = (suffix: string) => {
    const state = createState(
      {
        id: `synthetic-city-branch-${suffix}`,
        displayName: "Synthetic Branch Learner",
      },
      20261009,
    );
    state.clockMinutes = 90;
    state.settings.workbench = true;
    state.settings.quality = "low";
    return transition(
      state,
      { type: "START_MISSION", missionId: mission.id, mode: "independent" },
      content,
    );
  };
  const resume = async () => {
    await openPanel("Cases");
    await page
      .locator(`.mission-card[data-case-id="${mission.id}"]`)
      .getByRole("button", { name: "Resume →", exact: true })
      .click();
  };
  const reply = async (choiceId: string) => {
    const current = activeStep(await save(), content)!;
    const choice = current.choices.find((item) => item.id === choiceId)!;
    expect(choice).toBeDefined();
    if (current.expectedValue !== undefined)
      await page
        .getByRole("spinbutton", { name: "Calculated result" })
        .fill(String(current.expectedValue));
    if (current.draftPrompt) {
      await page
        .getByRole("textbox", { name: "Mission work product" })
        .fill(
          current.modelAnswer ||
            "Confirmed records, visible uncertainty, named owner and checkable evidence. I own the next update.",
        );
      await page.getByRole("checkbox", { name: /I compared my work/ }).check();
    }
    await page.getByRole("radio", { name: choice.label, exact: true }).check();
    await page
      .getByRole("button", { name: "Commit action & continue →", exact: true })
      .click();
    await save();
  };
  await restoreSynthetic(fixture("poor"), "poor-branch");
  await resume();
  await reply("assume");
  await expect(page.locator(".step-heading h2")).toHaveText(
    "Repair the conversation: Prepare the business and evidence brief",
  );
  const forked = await save();
  const branch = forked.missions[mission.id].attempts.at(-1)!;
  expect(branch.routeNodeId).toBe("M-A02-s1-branch-assume");
  expect(branch.trace.map((entry) => entry.choiceId)).toEqual(["assume"]);
  await page.reload();
  await page.getByRole("button", { name: /Continue your day/ }).click();
  await expect(page.locator(".step-heading h2")).toHaveText(
    "Repair the conversation: Prepare the business and evidence brief",
  );
  expect((await save()).missions[mission.id].attempts.at(-1)?.routeNodeId).toBe(
    branch.routeNodeId,
  );
  await reply("dismiss");
  const poor = (await save()).missions[mission.id].attempts.at(-1)!;
  expect(poor.outcome).toBe("poor");
  expect(poor.passed).toBe(false);
  expect(poor.trace.map((entry) => entry.choiceId)).toEqual([
    "assume",
    "dismiss",
  ]);
  await expect(page.locator(".branch-outcome")).toContainText(
    "Confidence needs repair",
  );
  await page.screenshot({ path: resolve(evidence, "mission-poor-branch.png") });

  await restoreSynthetic(fixture("recovery"), "recovery-branch");
  await resume();
  await reply("assume");
  await reply("repair");
  await expect(page.locator(".step-heading h2")).toHaveText(
    mission.steps[0].title,
  );
  const repaired = (await save()).missions[mission.id].attempts.at(-1)!;
  expect(repaired.routeMarks).toContain("recovery");
  expect(repaired.trace.map((entry) => entry.choiceId)).toEqual([
    "assume",
    "repair",
  ]);
  for (let guard = 0; guard < mission.steps.length + 2; guard++) {
    const state = await save();
    const current = activeStep(state, content);
    if (!current) break;
    if (current.npcId) {
      await withinAvailability(current.npcId);
      await resume();
    }
    const best = [...current.choices]
      .filter((choice) => !choice.criticalFailure)
      .sort(
        (a, b) =>
          Object.values(b.scores).reduce((sum, value) => sum + value, 0) -
          Object.values(a.scores).reduce((sum, value) => sum + value, 0),
      )[0];
    await reply(best.id);
  }
  const recovery = (await save()).missions[mission.id].attempts.at(-1)!;
  expect(recovery.outcome).toBe("recovery");
  expect(recovery.passed).toBe(true);
  expect(recovery.trace.slice(0, 3).map((entry) => entry.choiceId)).toEqual([
    "assume",
    "repair",
    "brief",
  ]);
  await expect(page.locator(".branch-outcome")).toContainText(
    "A repaired working relationship",
  );
  await expect(page.locator(".branch-outcome")).toContainText(
    "original mistake",
  );
  await page.screenshot({
    path: resolve(evidence, "mission-recovery-branch.png"),
  });
});

test(
  "phone first-day overlay stays collapsible and leaves touch movement usable in portrait and landscape",
  { tag: "@mobile-guide" },
  async () => {
    test.setTimeout(process.env.CI ? 240000 : 150000);
    await page
      .getByRole("button", { name: /Start your guided first day/ })
      .click();
    await expect(page.locator("#world-shell")).toHaveAttribute(
      "data-tutorial-step",
      "move",
    );
    const objective = page.locator(".objective-panel:not(.compact)");
    const toggle = objective.locator(
      '[data-testid="objective-toggle"]:visible',
    );
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const collapsedBox = await objective.boundingBox();
    const toggleBox = await toggle.boundingBox();
    expect(collapsedBox!.height).toBeLessThanOrEqual(112);
    expect(toggleBox!.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
    await expect(objective.locator("dl")).not.toBeVisible();
    const initial = await save();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toBeFocused();
    await expect(objective.locator("dl")).toBeVisible();
    await expect(objective).toContainText("Done when");
    const expanded = await save();
    expect(expanded.tutorial).toEqual(initial.tutorial);
    expect(expanded.missions).toEqual(initial.missions);
    expect(expanded.assistanceHistory).toEqual(initial.assistanceHistory);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    const position = await page
      .locator("#world-shell")
      .getAttribute("data-position");
    const forward = page.getByRole("button", {
      name: "Walk forward",
      exact: true,
    });
    await expect(forward).toBeVisible();
    const pad = await forward.boundingBox();
    await page.mouse.move(pad!.x + pad!.width / 2, pad!.y + pad!.height / 2);
    await page.mouse.down();
    try {
      await expect
        .poll(
          () => page.locator("#world-shell").getAttribute("data-position"),
          { timeout: process.env.CI ? 60000 : 30000 },
        )
        .not.toBe(position);
    } finally {
      await page.mouse.up();
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await sceneScreenshot("phone-guidance-collapsed-portrait.png", 0);
    const progressed = await save();
    expect(progressed.tutorial.status).toBe("active");
    expect(progressed.clockMinutes).toBe(initial.clockMinutes);
    await openPanel("Journal");
    await closePanel();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect((await save()).tutorial).toEqual(progressed.tutorial);
    await page.reload();
    await page.getByRole("button", { name: /Continue your day/ }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect((await save()).tutorial).toEqual(progressed.tutorial);
    expect((await save()).missions).toEqual(progressed.missions);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const landscape = await objective.boundingBox();
    expect(landscape!.x).toBeGreaterThanOrEqual(0);
    expect(landscape!.y).toBeGreaterThanOrEqual(0);
    expect(landscape!.x + landscape!.width).toBeLessThanOrEqual(844);
    expect(landscape!.y + landscape!.height).toBeLessThanOrEqual(390);
    expect(landscape!.height).toBeLessThanOrEqual(112);
    await expect(forward).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await sceneScreenshot("phone-guidance-collapsed-landscape.png", 0);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toBeFocused();
    await expect(objective.locator("dl")).toBeVisible();
    const expandedLandscape = await objective.boundingBox();
    expect(
      expandedLandscape!.y + expandedLandscape!.height,
    ).toBeLessThanOrEqual(390);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await sceneScreenshot("phone-guidance-expanded-landscape.png", 0);
    await toggle.click();
    await page.reload();
    await page.getByRole("button", { name: /Continue your day/ }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect((await save()).tutorial).toEqual(progressed.tutorial);
  },
);
