import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { content } from "../src/content";
import {
  activeStep,
  createState,
  exportProgress,
  exportWorldSave,
  importWorldSave,
  loadState,
  minuteOfDay,
  saveState,
  scoreDimensions,
  transition,
  tutorialObjective,
  TUTORIAL_MISSION_ID,
  TUTORIAL_STEP_IDS,
} from "../src/engine";
import type {
  GameAction,
  GameState,
  GuidanceMode,
  TutorialStepId,
} from "../src/engine";

const facts = ["channels", "announced-portal", "launch-date", "pilot-records"];
function start(id: string): GameState {
  let state = createState({
    id: `synthetic-tutorial-${id}`,
    displayName: "Synthetic learner",
  });
  state.position = { x: -24, z: 22, yaw: 0 };
  state = transition(
    state,
    { type: "TUTORIAL_START", id: `start-${id}` },
    content,
  );
  return state;
}
function currentAction(state: GameState, suffix = "good"): GameAction {
  const id = `tutorial-${state.tutorial.run}-${state.tutorial.stepIndex}-${suffix}`;
  const stepId = tutorialObjective(state, content)!.id;
  const choices: Partial<Record<TutorialStepId, string>> = {
    inbox: "identify-request",
    accounts: "relevant-facts",
    "known-missing": "separate-facts",
    owner: "retain-owner",
    update: "bounded-update",
    followup: "create-followup",
    "later-response": "check-response",
    verify: "verify-response",
    debrief: "retain-lesson",
  };
  if (stepId === "move")
    return {
      type: "TUTORIAL_WORLD",
      id,
      event: {
        type: "target-reached",
        objectId: "first-day-marker",
        distance: 2,
        input: "keyboard",
      },
    };
  if (stepId === "camera")
    return {
      type: "TUTORIAL_WORLD",
      id,
      event: { type: "camera", angle: 0.25, input: "pointer" },
    };
  if (stepId === "mentor" || stepId === "desk")
    return {
      type: "TUTORIAL_WORLD",
      id,
      event: {
        type: "interacted",
        objectId: stepId === "mentor" ? "mentor" : "workbench",
        input: "keyboard",
      },
    };
  if (stepId === "calendar")
    return {
      type: "SCHEDULE",
      id,
      npcId: "npc-cedarline-1",
      day: state.day + 1,
      minute: 600,
      duration: 20,
    };
  if (stepId === "journal")
    return {
      type: "SAVE_NOTE",
      id,
      missionId: TUTORIAL_MISSION_ID,
      noteType: "first-day-brief",
      body: "The announcement is a question; channels are evidence. Ask for pilot records and a confirmed launch date.",
    };
  return {
    type: "TUTORIAL_ACT",
    id,
    stepId,
    choiceId: choices[stepId]!,
    selectedIds: stepId === "accounts" ? facts.slice(0, 2) : facts,
    owner: "learner",
    body: "We confirmed direct and MarketHub sales and the announcement. Theo will supply missing launch/pilot facts; I retain the check-in.",
  };
}
function advanceTo(
  state: GameState,
  target: TutorialStepId | "complete",
): GameState {
  if (state.tutorial.stepIndex === 0)
    state = transition(
      state,
      { type: "POSITION", x: -22, z: 22, yaw: 0 },
      content,
    );
  for (
    let guard = 0;
    state.tutorial.status === "active" &&
    tutorialObjective(state, content)?.id !== target &&
    guard < 20;
    guard++
  ) {
    const before = state.tutorial.stepIndex;
    state = transition(state, currentAction(state), content);
    expect(state.tutorial.stepIndex, state.notifications.at(-1)).toBe(
      before + 1,
    );
  }
  return state;
}
function finishCase(state: GameState): GameState {
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
      (npc &&
        (now + step.duration > npc.availability[1] ||
          (state.specialistCapacity[`${state.day}:${npc.id}`] ?? 0) >= 3)) ||
      now + step.duration + 25 >= 1020
    ) {
      state = transition(state, { type: "END_DAY" }, content);
      continue;
    }
    const selected = [...step.choices]
      .filter((item) => !item.criticalFailure)
      .sort((a, b) => scoreDimensions(b.scores) - scoreDimensions(a.scores))[0];
    state = transition(
      state,
      {
        type: "ACT",
        id: `complete-${state.activeMissionId}-${state.events.length}`,
        stepId: step.id,
        choiceId: selected.id,
        value: step.expectedValue,
        draft: step.draftPrompt
          ? `Synthetic self-review: ${step.modelAnswer ?? "Evidence, uncertainty, owner and verified outcome."}`
          : undefined,
      },
      content,
    );
  }
  expect(state.activeMissionId).toBeNull();
  return state;
}

describe("ordered first-day practice through actual engine actions", () => {
  it("requires meaningful known-versus-missing labels and retains those labels through reload", async () => {
    let state = advanceTo(start("classification"), "known-missing");
    const classifications = {
      channels: "known",
      "announced-portal": "known",
      "launch-date": "missing",
      "pilot-records": "missing",
    } as const;
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "wrong-labels",
        stepId: "known-missing",
        choiceId: "separate-facts",
        classifications: { ...classifications, "launch-date": "known" },
      },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("known-missing");
    expect(
      state.tutorial.history.at(-1)?.classifications?.["launch-date"],
    ).toBe("known");
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "correct-labels",
        stepId: "known-missing",
        choiceId: "separate-facts",
        classifications,
      },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("owner");
    expect(state.tutorial.history.at(-1)?.classifications).toEqual(
      classifications,
    );
    await saveState(state);
    expect(
      (await loadState(state.learner.id))?.tutorial.history.at(-1)
        ?.classifications,
    ).toEqual(classifications);
  });
  it("requires arrival at the visible marker and measured camera input; wrong turns and panels do not advance", () => {
    let state = start("controls");
    state = transition(
      state,
      { type: "POSITION", x: -28, z: 22, yaw: 0 },
      content,
    );
    state = transition(
      state,
      {
        type: "TUTORIAL_WORLD",
        id: "wrong-turn",
        event: { type: "moved", distance: 4, input: "keyboard" },
      },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("move");
    state = transition(
      state,
      { type: "SETTINGS", patch: { workbench: true } },
      content,
    );
    expect(state.tutorial.stepIndex).toBe(0);
    state = transition(
      state,
      { type: "POSITION", x: -22, z: 22, yaw: 0 },
      content,
    );
    state = transition(state, currentAction(state), content);
    state = transition(
      state,
      {
        type: "TUTORIAL_WORLD",
        id: "fake-camera",
        event: { type: "camera", input: "pointer" },
      },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("camera");
    state = transition(state, currentAction(state), content);
    expect(tutorialObjective(state, content)?.id).toBe("mentor");
    expect(state.clockMinutes).toBe(0);
  });
  it("records truthful explicit 2D alternatives only after real map navigation and enabling the reading layout", async () => {
    let state = start("menu");
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "no-nav",
        stepId: "move",
        choiceId: "use-map-navigation",
      },
      content,
    );
    expect(state.tutorial.stepIndex).toBe(0);
    state = transition(
      state,
      { type: "POSITION", x: -30, z: 22, yaw: 0 },
      content,
    );
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "wrong-nav",
        stepId: "move",
        choiceId: "use-map-navigation",
      },
      content,
    );
    expect(state.tutorial.stepIndex).toBe(0);
    await saveState(state);
    state = (await loadState(state.learner.id))!;
    expect(state.tutorial.controlOrigin).toEqual({ x: -24, z: 22, yaw: 0 });
    state = transition(
      state,
      { type: "POSITION", x: -22, z: 22, yaw: 0 },
      content,
    );
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "real-nav",
        stepId: "move",
        choiceId: "use-map-navigation",
      },
      content,
    );
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "no-layout",
        stepId: "camera",
        choiceId: "use-workbench-view",
      },
      content,
    );
    expect(state.tutorial.stepIndex).toBe(1);
    state = transition(
      state,
      { type: "SETTINGS", patch: { workbench: true } },
      content,
    );
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "real-layout",
        stepId: "camera",
        choiceId: "use-workbench-view",
      },
      content,
    );
    expect(
      state.tutorial.history
        .filter((row) => row.accepted)
        .map((row) => row.action),
    ).toEqual(["menu:navigation", "menu:reading-layout"]);
    expect(state.tutorial.inputMethod).toBe("menu");
    expect(state.clockMinutes).toBe(0);
  });
  it("requires accepted real calendar and journal work, relevant facts and appropriate named ownership", () => {
    let state = advanceTo(start("tools"), "calendar");
    state = transition(
      state,
      {
        type: "SCHEDULE",
        id: "bad-calendar",
        npcId: "npc-cedarline-1",
        day: 1,
        minute: 540,
        duration: 20,
      },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("calendar");
    state = transition(state, currentAction(state), content);
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "one-fact",
        stepId: "accounts",
        choiceId: "relevant-facts",
        selectedIds: ["channels"],
      },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("accounts");
    state = transition(state, currentAction(state), content);
    state = transition(
      state,
      {
        type: "SAVE_NOTE",
        id: "too-short",
        missionId: TUTORIAL_MISSION_ID,
        noteType: "first-day-brief",
        body: "hello",
      },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("journal");
    state = advanceTo(state, "owner");
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "unowned",
        stepId: "owner",
        choiceId: "retain-owner",
        owner: "forwarding queue",
      },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("owner");
    expect(state.appointments).toHaveLength(1);
    expect(state.tutorial.scenario.knownIds).toEqual(facts.slice(0, 2));
    expect(state.tutorial.scenario.missingIds).toEqual(facts.slice(2));
  });
  it("retains the written update, verifies a later response and closes only the fulfilled check-in with residual ownership", () => {
    let state = advanceTo(start("cycle"), "verify");
    const scenario = state.tutorial.scenario;
    expect(
      state.tasks.find((task) => task.id === scenario.followupTaskId)?.status,
    ).toBe("open");
    expect(
      state.artifacts.find((item) => item.id === scenario.responseId)?.body,
    ).toContain("no transaction launch date");
    state = transition(
      state,
      {
        type: "TUTORIAL_ACT",
        id: "close-whole-issue",
        stepId: "verify",
        choiceId: "close-all",
      },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("verify");
    state = advanceTo(state, "complete");
    const task = state.tasks.find(
      (item) => item.id === scenario.followupTaskId,
    )!;
    expect(task.status).toBe("completed");
    expect(task.evidence).toEqual([
      scenario.updateArtifactId,
      scenario.responseId,
    ]);
    expect(
      state.tasks.filter(
        (item) =>
          item.missionId === TUTORIAL_MISSION_ID && item.status === "open",
      ),
    ).toEqual([
      expect.objectContaining({
        owner: content.contacts.find(
          (person) => person.id === "npc-cedarline-1",
        )!.name,
      }),
    ]);
    expect(state.tutorial.completedStepIds).toEqual(TUTORIAL_STEP_IDS);
    expect(state.tutorial.status).toBe("completed");
    expect(state.clockMinutes).toBe(0);
    expect(state.tutorial.simulatedMinutes).toBe(30);
    expect(state.missions).toEqual({});
    expect(
      Object.values(state.competencies).every(
        (item) => item.level === "not_started",
      ),
    ).toBe(true);
    expect(
      exportProgress(state, content).missions.filter(
        (item) => item.status === "completed",
      ),
    ).toEqual([]);
  });
  it("resumes after exploration, reload and world transfer; skipping and replaying never reset a real case", async () => {
    let state = transition(
      start("resume"),
      { type: "START_MISSION", missionId: "M-A02", mode: "guided" },
      content,
    );
    const retained = structuredClone(state.missions);
    state = advanceTo(state, "accounts");
    state = transition(
      state,
      { type: "TRAVEL", location: "research" },
      content,
    );
    state = transition(state, { type: "TUTORIAL_SKIP", id: "skip" }, content);
    expect(state.missions).toEqual(retained);
    await saveState(state);
    state = (await loadState(state.learner.id))!;
    const imported = importWorldSave(exportWorldSave(state));
    expect(imported.valid).toBe(true);
    state = imported.state!;
    state = transition(
      state,
      { type: "TUTORIAL_START", id: "resume" },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("accounts");
    expect(state.location).toBe("research");
    state = transition(
      state,
      { type: "TUTORIAL_START", id: "replay", replay: true },
      content,
    );
    expect(tutorialObjective(state, content)?.id).toBe("move");
    expect(state.missions).toEqual(retained);
    expect(state.activeMissionId).toBe("M-A02");
    expect(state.tutorial.history.length).toBeGreaterThan(0);
  });
});

describe("assistance and transparent mastery evidence", () => {
  it.each(["guided", "assisted"] as GuidanceMode[])(
    "keeps a passing %s case as practiced learning",
    (mode) => {
      const initial = transition(
        createState(),
        { type: "START_MISSION", missionId: "M-A02", mode },
        content,
      );
      const state = finishCase(initial);
      expect(state.missions["M-A02"].attempts[0].passed).toBe(true);
      expect(state.missions["M-A02"].attempts[0].mode).toBe(mode);
      expect(state.competencies.A02.level).toBe("practiced");
    },
  );
  it("records help in an independent attempt and prevents a later mode switch from erasing assistance", async () => {
    let state = transition(
      createState({
        id: "synthetic-assisted-reload",
        displayName: "Synthetic learner",
      }),
      { type: "START_MISSION", missionId: "M-A02", mode: "independent" },
      content,
    );
    const help: GameAction = {
      type: "ASSISTANCE",
      id: "hint-one",
      missionId: "M-A02",
      stepId: activeStep(state, content)!.id,
      kind: "hint",
      level: 2,
    };
    state = transition(state, help, content);
    const once = state;
    expect(transition(state, help, content)).toBe(once);
    expect(state.clockMinutes).toBe(0);
    state = transition(
      state,
      { type: "SET_GUIDANCE", mode: "guided" },
      content,
    );
    state = transition(
      state,
      { type: "SET_GUIDANCE", mode: "independent" },
      content,
    );
    await saveState(state);
    state = finishCase((await loadState(state.learner.id))!);
    const attempt = state.missions["M-A02"].attempts[0];
    expect(attempt.assistance).toHaveLength(2);
    expect(attempt.unaided).toBe(false);
    expect(attempt.passed).toBe(true);
    expect(state.competencies.A02.level).toBe("practiced");
    expect(exportProgress(state, content).extensions.assistanceHistory).toEqual(
      state.assistanceHistory,
    );
  });
  it("counts a truly independent attempt as demonstrated and keeps tutorial hints out of unrelated case history", () => {
    let state = start("hint");
    state = transition(
      state,
      {
        type: "ASSISTANCE",
        id: "tutorial-hint",
        missionId: TUTORIAL_MISSION_ID,
        stepId: "move",
        kind: "stuck",
        level: 3,
      },
      content,
    );
    state = transition(
      state,
      { type: "TUTORIAL_SKIP", id: "practice-paused" },
      content,
    );
    state = transition(
      state,
      { type: "START_MISSION", missionId: "M-A02", mode: "independent" },
      content,
    );
    state = finishCase(state);
    expect(state.missions["M-A02"].attempts[0].assistance).toEqual([]);
    expect(state.missions["M-A02"].attempts[0].unaided).toBe(true);
    expect(state.competencies.A02.level).toBe("demonstrated");
  });
});
