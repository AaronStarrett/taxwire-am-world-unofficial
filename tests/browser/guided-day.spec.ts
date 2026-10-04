import { test, expect, chromium } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { content } from "../../src/content";
import { minuteOfDay } from "../../src/engine/time";

test.describe.configure({ mode: "serial" });
let context: BrowserContext, page: Page;
const evidence = resolve(".local/evidence/upgrade");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:4173/";
const errors: string[] = [];
const step = async (id: string) =>
  expect(page.locator("#world-shell")).toHaveAttribute(
    "data-tutorial-step",
    id,
  );
async function saveReload(expected: string) {
  await expect(page.locator(".statusbar")).toContainText(
    "Saved in this browser",
  );
  await page.reload();
  await page.getByRole("button", { name: /Continue your day/ }).click();
  await step(expected);
}
async function openCurrent() {
  await page
    .getByRole("button", { name: "Open this step →", exact: true })
    .click();
}
async function close() {
  if (await page.getByRole("dialog").count())
    await page.getByRole("button", { name: "Close workbench" }).click();
}
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
  context = await chromium.launchPersistentContext(
    resolve(".local/browser-tests/guided-" + Date.now()),
    {
      headless: true,
      ...(process.platform === "win32" ? { channel: "chrome" } : {}),
      viewport: { width: 1280, height: 720 },
      recordVideo:
        process.env.RECORD_GAMEPLAY === "1"
          ? {
              dir: resolve(".local/evidence/upgrade/recordings"),
              size: { width: 1280, height: 720 },
            }
          : undefined,
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
  page.setDefaultTimeout(process.env.CI ? 60000 : 20000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(base) && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
});
test.afterEach(async ({ browserName: _name }, info) => {
  if (info.status !== info.expectedStatus) {
    console.log(
      "Guided failure position:",
      await page.locator("#world-shell").getAttribute("data-position"),
      "step:",
      await page.locator("#world-shell").getAttribute("data-tutorial-step"),
    );
    await page.screenshot({ path: resolve(evidence, "guided-failure.png") });
    await writeFile(
      resolve(evidence, "guided-failure-dom.txt"),
      await page.locator("body").innerText(),
    );
  }
});
test.afterAll(async () => {
  await context?.close();
});

test("fresh learner completes real guided controls, preparation and a verified small work cycle", async () => {
  await page.goto(base);
  await expect(
    page.getByRole("button", { name: /Start your guided first day/ }),
  ).toBeEnabled();
  if (process.env.CI) {
    await page
      .getByRole("button", { name: "Settings", exact: true })
      .first()
      .click();
    await page.getByLabel("Quality", { exact: true }).selectOption("low");
    await page.getByRole("button", { name: "Close workbench" }).click();
  }
  await page.screenshot({ path: resolve(evidence, "welcome-after.png") });
  await page
    .getByRole("button", { name: /Start your guided first day/ })
    .click();
  await step("move");
  await expect(
    page.getByRole("region", { name: "Current objective" }),
  ).toContainText("Done when");
  await page.keyboard.down("a");
  await page.waitForTimeout(350);
  await page.keyboard.up("a");
  await step("move");
  await page.getByRole("button", { name: "Explain this", exact: true }).click();
  await page
    .getByRole("button", { name: "Give me a hint", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show me where", exact: true })
    .click();
  await step("camera");
  await page.screenshot({ path: resolve(evidence, "home-after.png") });
  await page.mouse.move(510, 350);
  await page.mouse.down();
  await page.mouse.move(710, 350, { steps: 15 });
  await page.mouse.up();
  await step("mentor");
  await saveReload("mentor");
  await page
    .getByRole("button", { name: "Show me where", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Taxwire training HQ/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Show me where", exact: true })
    .click();
  await expect(page.locator(".world-interact")).toContainText(/Morgan|mentor/i);
  await page.screenshot({ path: resolve(evidence, "mentor-after.png") });
  await page.keyboard.press("e");
  await step("desk");
  await expect(
    page.getByText(
      "Understand the request, find the evidence, decide the next step, coordinate the right people, and follow through.",
      { exact: true },
    ),
  ).toBeVisible();
  await close();
  await page
    .getByRole("button", { name: "Show me where", exact: true })
    .click();
  await expect(page.locator(".world-interact")).toContainText(
    /workstation|workbench|desk/i,
  );
  await page.screenshot({ path: resolve(evidence, "workstation-after.png") });
  await page.keyboard.press("e");
  await step("inbox");
  await page
    .getByRole("button", {
      name: "Treat the announcement as a completed launch",
      exact: true,
    })
    .click();
  await step("inbox");
  await expect(page.locator(".inline-status")).toContainText(
    /announcement does not confirm/i,
  );
  await page
    .getByRole("button", {
      name: "Confirm what changed and request the missing pilot facts",
      exact: true,
    })
    .click();
  await step("calendar");
  await openCurrent();
  await page
    .getByLabel("Contact", { exact: true })
    .selectOption("npc-cedarline-1");
  await page.getByLabel("Simulated day", { exact: true }).fill("1");
  await page.getByLabel("Start time", { exact: true }).selectOption("600");
  await page
    .getByRole("button", { name: "Schedule 30 minutes", exact: true })
    .click();
  await step("accounts");
  await saveReload("accounts");
  await openCurrent();
  const facts = page.locator(".fact-options input");
  await facts.nth(0).check();
  await facts.nth(1).check();
  await page
    .getByRole("button", {
      name: "Record the two relevant business facts",
      exact: true,
    })
    .click();
  await step("journal");
  await openCurrent();
  await page
    .getByLabel("Journal note", { exact: true })
    .fill(
      "Direct and MarketHub sales are confirmed. The wholesale headline is only an announcement. Theo supplies launch and pilot records; I own the check-in.",
    );
  await page
    .getByRole("button", { name: "Save reflection", exact: true })
    .click();
  await step("known-missing");
  await openCurrent();
  for (const id of ["channels", "announced-portal"])
    await page.getByLabel(`Classify ${id}`).selectOption("known");
  for (const id of ["launch-date", "pilot-records"])
    await page.getByLabel(`Classify ${id}`).selectOption("missing");
  await page
    .getByRole("button", {
      name: "Keep known facts and missing evidence separate",
      exact: true,
    })
    .click();
  await step("owner");
  await openCurrent();
  await page
    .getByRole("button", {
      name: "I own the check-in; the practitioner supplies pilot facts",
      exact: true,
    })
    .click();
  await step("update");
  await openCurrent();
  await page
    .getByLabel("First-day customer update", { exact: true })
    .fill(
      "Confirmed direct and MarketHub channels and a wholesale announcement. Launch timing and pilot records still need Theo's verification; Lena checks mappings. I own the next check-in before revising scope.",
    );
  await page
    .getByRole("checkbox", {
      name: "I checked confirmed facts, uncertainty, owner and next check-in.",
    })
    .check();
  await page
    .getByRole("button", {
      name: "Send the reviewed facts, remaining questions and named check-in",
      exact: true,
    })
    .click();
  await step("followup");
  await openCurrent();
  await page
    .getByRole("button", {
      name: "Create my owned pilot-status follow-up",
      exact: true,
    })
    .click();
  await step("later-response");
  await saveReload("later-response");
  await openCurrent();
  await page
    .getByRole("button", {
      name: "Check the later simulated customer response",
      exact: true,
    })
    .click();
  await step("verify");
  await openCurrent();
  await page
    .getByRole("button", {
      name: "Close the entire launch question because an email arrived",
      exact: true,
    })
    .click();
  await step("verify");
  await page
    .getByRole("button", {
      name: "Verify the check-in; keep the missing records explicitly owned",
      exact: true,
    })
    .click();
  await step("debrief");
  await openCurrent();
  await expect(page.locator(".first-day-tools")).toContainText(
    "without granting independent mastery",
  );
  await page.screenshot({
    path: resolve(evidence, "guided-debrief-after.png"),
  });
  await page
    .getByRole("button", {
      name: "Retain the lesson and continue to guided M-A02",
      exact: true,
    })
    .click();
  await step("completed");
  await page
    .getByRole("button", {
      name: "Apply discovery in the next guided case",
      exact: true,
    })
    .click();
  await expect(page.locator(".case-sidebar h2")).toHaveText(
    "Discover the new channel",
  );
  expect(errors).toEqual([]);
});

test("guidance survives skip, replay, closed panels and portable world transfer", async () => {
  await page
    .locator(".workbench-nav")
    .getByRole("button", { name: "Saves & export" })
    .click();
  const transfer = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export world checkpoint", exact: true })
    .click();
  const saved = resolve(".local/exports/guided-world.json");
  await (await transfer).saveAs(saved);
  const data = JSON.parse(await readFile(saved, "utf8"));
  expect(data.state?.tutorial?.status ?? data.payload?.tutorial?.status).toBe(
    "completed",
  );
  await page
    .locator(".workbench-nav")
    .getByRole("button", { name: "First-day guide", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Replay first-day guidance", exact: true })
    .click();
  await step("move");
  await close();
  await step("move");
  await page
    .getByRole("button", { name: "First-day guide", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Skip guidance for now", exact: true })
    .click();
  await step("skipped");
  await expect(page.locator(".statusbar")).toContainText(
    "Saved in this browser",
  );
  await page.reload();
  await page.getByRole("button", { name: /Continue your day/ }).click();
  await step("skipped");
  await close();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page
    .locator(".nav-bottom")
    .getByRole("button", { name: "Saves & export" })
    .click();
  await page
    .getByLabel("Import world checkpoint", { exact: true })
    .setInputFiles(saved);
  const backup = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Back up and restore world", exact: true })
    .click();
  await (
    await backup
  ).saveAs(resolve(".local/exports/guided-restore-backup.json"));
  await step("completed");
  expect(errors).toEqual([]);
});

test("actual guided learner progresses through core work, an advanced case and a portfolio capstone", async () => {
  test.setTimeout(480000);
  const sequence = [
    "M-A02",
    "M-A01",
    "M-A03",
    "M-T01",
    "M-A04",
    "M-A05",
    "M-T02",
    "M-T03",
    "M-A06",
    "M-A07",
    "X-A02",
    "C01",
  ];
  const progressEvidence: {
    missionId: string;
    mode: string;
    day: string;
    result: string;
  }[] = [];
  const closeDay = async () => {
    await page
      .locator(".workbench-nav")
      .getByRole("button", { name: "Calendar", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Close day deliberately", exact: true })
      .click();
    await page
      .locator(".workbench-nav")
      .getByRole("button", { name: "Cases", exact: true })
      .click();
    await page.getByRole("button", { name: "Resume →", exact: true }).click();
  };
  for (const missionId of sequence) {
    const mission = content.missions.find((m) => m.id === missionId)!;
    await close();
    await page.getByRole("button", { name: "Cases", exact: true }).click();
    const card = page.locator(`.mission-card[data-case-id="${missionId}"]`);
    const mode =
      missionId === "M-A02"
        ? "guided"
        : missionId === "M-A01"
          ? "assisted"
          : "independent";
    const startName =
      missionId === "M-A02"
        ? "Continue guided attempt →"
        : missionId === "M-A01"
          ? "Assisted practice"
          : "Independent attempt";
    await expect(
      card.getByRole("button", { name: startName, exact: true }),
    ).toBeEnabled();
    await card.getByRole("button", { name: startName, exact: true }).click();
    for (const current of mission.steps) {
      await expect(page.locator(".step-heading h2")).toHaveText(current.title);
      const npc = content.contacts.find(
        (contact) => contact.id === current.npcId,
      );
      const time = minuteOfDay(
        Number(await page.locator("#world-shell").getAttribute("data-clock")),
      );
      if (
        (npc && time + current.duration > npc.availability[1]) ||
        time + current.duration + 25 >= 1020
      )
        await closeDay();
      const waitForContact = async () => {
        if (!npc) return;
        for (
          let waiting = 0;
          minuteOfDay(
            Number(
              await page.locator("#world-shell").getAttribute("data-clock"),
            ),
          ) < npc.availability[0] && waiting < 8;
          waiting++
        ) {
          await page
            .locator(".workbench-nav")
            .getByRole("button", { name: "Calendar", exact: true })
            .click();
          await page
            .getByRole("button", {
              name: "Advance 30 business minutes",
              exact: true,
            })
            .click();
          await page
            .locator(".workbench-nav")
            .getByRole("button", { name: "Cases", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Resume →", exact: true })
            .click();
        }
      };
      await waitForContact();
      const best = [...current.choices]
        .filter((choice) => !choice.criticalFailure)
        .sort(
          (a, b) =>
            Object.values(b.scores).reduce((x, y) => x + y, 0) -
            Object.values(a.scores).reduce((x, y) => x + y, 0),
        )[0];
      const submit = async () => {
        if (current.expectedValue !== undefined)
          await page
            .getByRole("spinbutton", { name: "Calculated result" })
            .fill(String(current.expectedValue));
        if (current.draftPrompt) {
          await page
            .getByRole("textbox", { name: "Mission work product" })
            .fill(
              current.modelAnswer ||
                "Fictional test: source facts, uncertainty, named owner, checkpoint and acceptance evidence retained.",
            );
          await page
            .getByRole("checkbox", { name: /I compared my work/ })
            .check();
        }
        await page
          .getByRole("radio", { name: best.label, exact: true })
          .check();
        await page
          .getByRole("button", {
            name: "Commit action & continue →",
            exact: true,
          })
          .click();
      };
      await submit();
      // A capacity refusal is an actual domain result: deliberately plan tomorrow, then retry.
      await page.waitForTimeout(250);
      if (
        (await page.locator(".step-heading h2").count()) &&
        (await page.locator(".step-heading h2").innerText()) === current.title
      ) {
        const feedback = await page.locator(".inline-status").innerText();
        console.log(
          `${missionId} ${current.id} refused at ${await page.locator("#world-shell").getAttribute("data-clock")}: ${feedback}`,
        );
        expect(feedback).toMatch(/capacity|available|hours|day|queue/i);
        await closeDay();
        await waitForContact();
        await submit();
        console.log(
          `${missionId} ${current.id} retry at ${await page.locator("#world-shell").getAttribute("data-clock")}: ${await page.locator(".inline-status").innerText()}`,
        );
      }
    }
    await expect(
      page.getByRole("heading", { name: "Case actions complete", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "View evidence debrief →", exact: true })
      .click();
    await expect(
      page.getByText(new RegExp(`Attempt .*${mode}.*Passed`)).last(),
    ).toBeVisible();
    progressEvidence.push({
      missionId,
      mode,
      day: await page.locator(".clock").innerText(),
      result: "completed through displayed work tools",
    });
    if (mission.stage === "advanced" || mission.stage === "capstone")
      await page.screenshot({
        path: resolve(evidence, `${missionId}-browser-debrief.png`),
      });
  }
  // The final action must reach persistent storage before this campaign's browser closes.
  await expect(page.locator(".statusbar")).toHaveAttribute(
    "data-save-status",
    "saved",
  );
  await page.reload();
  await page.getByRole("button", { name: /Continue your day/ }).click();
  await step("completed");
  await close();
  await page.getByRole("button", { name: "Cases", exact: true }).click();
  for (const missionId of sequence) {
    await expect(
      page
        .locator(`.mission-card[data-case-id="${missionId}"]`)
        .getByRole("button", { name: "Replay →", exact: true }),
    ).toBeVisible();
  }
  await writeFile(
    resolve(evidence, "sequential-browser-campaign.json"),
    JSON.stringify(
      {
        source: "actual first-day profile, UI actions only",
        persistence:
          "current save acknowledged; all twelve completions survive reload",
        testChoices:
          "authored expected choices; functional test, not human skill assessment",
        cases: progressEvidence,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
