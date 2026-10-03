import { describe, expect, it } from "vitest";
import { content } from "../src/content";
import {
  activeStep,
  createState,
  exportProgress,
  minuteOfDay,
  missionAvailable,
  scoreDimensions,
  transition,
  validateTrainingExport,
} from "../src/engine";

describe("authored campaign integration through the shared engine", () => {
  it("makes all 24 core, 24 advanced, and 4 capstone cases reachable and evidence-backed", () => {
    let state = createState(
      { id: "synthetic-campaign", displayName: "Synthetic Campaign Test" },
      20261003,
    );
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
  });
});
