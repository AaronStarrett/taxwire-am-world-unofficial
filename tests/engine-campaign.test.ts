import { describe, expect, it } from "vitest";
import { content } from "../src/content";
import type { GameAction } from "../src/engine";
import {
  activeStep,
  createState,
  exportProgress,
  minuteOfDay,
  missionAvailable,
  scoreDimensions,
  transition,
  TUTORIAL_MISSION_ID,
  tutorialObjective,
  validateTrainingExport,
} from "../src/engine";

describe("authored campaign integration through the shared engine", () => {
  it("completes the first day then reaches all 24 core, 24 advanced, and 4 capstone cases with evidence", () => {
    let state = createState(
      { id: "synthetic-campaign", displayName: "Synthetic Campaign Test" },
      20261003,
    );
    state = transition(
      state,
      { type: "TUTORIAL_START", id: "campaign-first-day" },
      content,
    );
    state = transition(
      state,
      { type: "POSITION", x: -22, z: 22, yaw: 0 },
      content,
    );
    const firstDayActions: GameAction[] = [
      {
        type: "TUTORIAL_WORLD",
        id: "campaign-move",
        event: {
          type: "target-reached",
          objectId: "first-day-marker",
          distance: 30,
          input: "keyboard",
        },
      },
      {
        type: "TUTORIAL_WORLD",
        id: "campaign-camera",
        event: { type: "camera", angle: 0.3, input: "pointer" },
      },
      {
        type: "TUTORIAL_WORLD",
        id: "campaign-mentor",
        event: { type: "interacted", objectId: "mentor", input: "keyboard" },
      },
      {
        type: "TUTORIAL_WORLD",
        id: "campaign-desk",
        event: { type: "interacted", objectId: "workbench", input: "keyboard" },
      },
      {
        type: "TUTORIAL_ACT",
        id: "campaign-inbox",
        stepId: "inbox",
        choiceId: "identify-request",
      },
      {
        type: "SCHEDULE",
        id: "campaign-calendar",
        npcId: "npc-cedarline-1",
        day: 2,
        minute: 600,
        duration: 20,
      },
      {
        type: "TUTORIAL_ACT",
        id: "campaign-accounts",
        stepId: "accounts",
        choiceId: "relevant-facts",
        selectedIds: ["channels", "announced-portal"],
      },
      {
        type: "SAVE_NOTE",
        id: "campaign-journal",
        missionId: TUTORIAL_MISSION_ID,
        noteType: "first-day-brief",
        body: "Read the channels and announcement; ask Theo for launch timing and pilot records before making scope claims.",
      },
      {
        type: "TUTORIAL_ACT",
        id: "campaign-facts",
        stepId: "known-missing",
        choiceId: "separate-facts",
        selectedIds: [
          "channels",
          "announced-portal",
          "launch-date",
          "pilot-records",
        ],
      },
      {
        type: "TUTORIAL_ACT",
        id: "campaign-owner",
        stepId: "owner",
        choiceId: "retain-owner",
        owner: "learner",
      },
      {
        type: "TUTORIAL_ACT",
        id: "campaign-update",
        stepId: "update",
        choiceId: "bounded-update",
        body: "The existing channels and announcement are confirmed. Theo supplies missing pilot facts; I retain the check-in and scope remains unverified.",
      },
      {
        type: "TUTORIAL_ACT",
        id: "campaign-followup",
        stepId: "followup",
        choiceId: "create-followup",
      },
      {
        type: "TUTORIAL_ACT",
        id: "campaign-response",
        stepId: "later-response",
        choiceId: "check-response",
      },
      {
        type: "TUTORIAL_ACT",
        id: "campaign-verify",
        stepId: "verify",
        choiceId: "verify-response",
      },
      {
        type: "TUTORIAL_ACT",
        id: "campaign-debrief",
        stepId: "debrief",
        choiceId: "retain-lesson",
      },
    ];
    for (const action of firstDayActions) {
      const before = state.tutorial.stepIndex;
      state = transition(state, action, content);
      expect(
        state.tutorial.stepIndex,
        `${tutorialObjective(state, content)?.id}: ${state.notifications.at(-1)}`,
      ).toBe(before + 1);
    }
    expect(state.tutorial.status).toBe("completed");
    expect(state.clockMinutes).toBe(0);
    expect(state.missions).toEqual({});
    const pending = [...content.missions];
    expect(pending).toHaveLength(52);
    let actionNumber = 0;
    while (pending.length) {
      const nextIndex = pending.findIndex((mission) =>
        missionAvailable(state, mission),
      );
      expect(
        nextIndex,
        `Prerequisite deadlock: ${pending.map((mission) => mission.id).join(", ")}`,
      ).toBeGreaterThanOrEqual(0);
      const mission = pending.splice(nextIndex, 1)[0];
      state = transition(
        state,
        { type: "START_MISSION", missionId: mission.id, mode: "independent" },
        content,
      );
      let guard = 0;
      while (state.activeMissionId === mission.id && guard++ < 100) {
        const step = activeStep(state, content);
        expect(
          step,
          `${mission.id} must have an active authored step`,
        ).toBeDefined();
        if (!step) break;
        const npc = content.contacts.find(
          (contact) => contact.id === step.npcId,
        );
        if (npc) {
          const now = minuteOfDay(state.clockMinutes);
          if (now < npc.availability[0]) {
            state = transition(
              state,
              {
                type: "WAIT",
                minutes: Math.min(240, npc.availability[0] - now),
              },
              content,
            );
            continue;
          }
          if (
            now + step.duration > npc.availability[1] ||
            (state.specialistCapacity[`${state.day}:${npc.id}`] ?? 0) >= 3
          ) {
            state = transition(state, { type: "END_DAY" }, content);
            continue;
          }
        }
        // Reserve the maximum bounded specialist queue and day-close minute.
        if (
          minuteOfDay(state.clockMinutes) +
            step.duration +
            (step.kind === "coordinate" ? 25 : 0) >=
          1020
        ) {
          state = transition(state, { type: "END_DAY" }, content);
          continue;
        }
        const choice = [...step.choices]
          .filter((item) => !item.criticalFailure)
          .sort(
            (a, b) => scoreDimensions(b.scores) - scoreDimensions(a.scores),
          )[0];
        expect(
          choice,
          `${mission.id}/${step.id} needs a defensible authored choice`,
        ).toBeDefined();
        const before = state.missions[mission.id].stepIndex;
        state = transition(
          state,
          {
            type: "ACT",
            id: `synthetic-campaign-${++actionNumber}`,
            stepId: step.id,
            choiceId: choice.id,
            ...(step.expectedValue !== undefined
              ? { value: step.expectedValue }
              : {}),
            ...(step.draftPrompt
              ? {
                  draft: `Synthetic self-reviewed work product: ${step.modelAnswer ?? "Facts, uncertainty, accountable owner, next date, and verified evidence."}`,
                }
              : {}),
          },
          content,
        );
        expect(
          state.missions[mission.id].stepIndex,
          `${mission.id}/${step.id}: ${state.notifications.at(-1)}`,
        ).toBeGreaterThan(before);
      }
      expect(
        guard,
        `${mission.id} exhausted the progression guard`,
      ).toBeLessThan(100);
      const progress = state.missions[mission.id];
      expect(
        progress.status,
        `${mission.id}: ${state.notifications.at(-1)}`,
      ).toBe("completed");
      expect(progress.attempts.at(-1)?.passed).toBe(true);
      expect(progress.attempts.at(-1)?.criticalFailures).toEqual([]);
      expect(progress.evidenceIds).toEqual(
        expect.arrayContaining(mission.steps.map((step) => step.id)),
      );
      expect(
        state.tasks.filter(
          (task) => task.missionId === mission.id && task.status === "open",
        ),
      ).toEqual([]);
      for (const task of state.tasks.filter(
        (item) => item.missionId === mission.id,
      )) {
        expect(task.owner.trim()).not.toBe("");
        expect(task.evidence.length).toBeGreaterThan(0);
      }
    }
    expect(
      Object.values(state.competencies).filter(
        (item) => item.level === "demonstrated",
      ),
    ).toHaveLength(24);
    expect(state.campaignStage).toBe("Strategic Account Leader");
    expect(new Set(state.artifacts.map((item) => item.id)).size).toBe(
      state.artifacts.length,
    );
    expect(validateTrainingExport(exportProgress(state, content)).valid).toBe(
      true,
    );
  }, 120_000);
});
