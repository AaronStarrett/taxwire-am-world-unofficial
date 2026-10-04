import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { content } from "../src/content";
import {
  activeStep,
  createState,
  exportProgress,
  importWorldSave,
  loadState,
  mergeProgress,
  migrateState,
  previewImport,
  saveState,
  transition,
  validateTrainingExport,
} from "../src/engine";
import type { GameState } from "../src/engine";

function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error);
  });
}
function hash(text: string): string {
  let result = 2166136261;
  for (const character of text) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16);
}
async function stored(
  store: "saves" | "backups",
  id: string,
): Promise<{ payload: string; checksum: string }> {
  const database = await request(indexedDB.open("taxwire-am-world-local", 1));
  try {
    return await request(
      database.transaction(store, "readonly").objectStore(store).get(id),
    );
  } finally {
    database.close();
  }
}
async function replace(id: string, payload: string): Promise<void> {
  const database = await request(indexedDB.open("taxwire-am-world-local", 1));
  try {
    const transaction = database.transaction("saves", "readwrite");
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    const store = transaction.objectStore("saves");
    const envelope = await request(store.get(id));
    store.put({ ...envelope, payload, checksum: hash(payload) });
    await done;
  } finally {
    database.close();
  }
}
function oldSave(state: GameState, version: 1 | 2): Record<string, unknown> {
  const old = structuredClone(state) as unknown as Record<string, unknown>;
  old.version = version;
  delete old.tutorial;
  delete old.guidanceMode;
  delete old.assistanceHistory;
  if (version === 1) delete old.specialistCapacity;
  const missions = old.missions as GameState["missions"];
  for (const progress of Object.values(missions))
    for (const attempt of progress.attempts) {
      delete attempt.assistance;
      delete attempt.assistanceVerified;
      delete attempt.unaided;
    }
  return old;
}
function inProgress(id: string): GameState {
  let state = transition(
    createState({ id, displayName: "Synthetic migration" }),
    { type: "START_MISSION", missionId: "M-A02", mode: "independent" },
    content,
  );
  const step = activeStep(state, content)!;
  state = transition(
    state,
    { type: "ACT", id: `${id}-first`, stepId: step.id, choiceId: "brief" },
    content,
  );
  expect(state.missions["M-A02"].stepIndex).toBe(1);
  state = transition(state, { type: "TRAVEL", location: "research" }, content);
  state.extensions.futureVendorField = { nested: ["retain", 42] };
  return state;
}

describe("version 3 preservation and compatibility", () => {
  it("does not promote an explicitly assisted imported attempt even if its source competency claims demonstrated", () => {
    const prior = inProgress("synthetic-explicit-assisted-import");
    const progress = prior.missions["M-A02"];
    progress.status = "completed";
    progress.bestScore = 90;
    const attempt = progress.attempts[0];
    attempt.passed = true;
    attempt.score = 90;
    attempt.unaided = false;
    attempt.assistance = [
      {
        id: "source-hint",
        missionId: "M-A02",
        stepId: attempt.trace[0].stepId,
        kind: "hint",
        level: 3,
        clockMinutes: 0,
        attemptId: attempt.id,
      },
    ];
    prior.competencies.A02.level = "demonstrated";
    prior.competencies.A02.evidenceMissionIds = ["M-A02"];
    const data = exportProgress(prior, content);
    const imported = mergeProgress(createState(), data, content);
    expect(imported.competencies.A02.level).toBe("practiced");
    expect(imported.missions["M-A02"].mode).toBe("assisted");
    expect(imported.imports[0].extensions.attemptHistory).toEqual(
      data.extensions.attemptHistory,
    );
  });
  it.each([1, 2] as const)(
    "backs up and reads back a version %i in-progress save before opt-in migration",
    async (version) => {
      const prior = inProgress(`synthetic-upgrade-${version}`);
      const old = oldSave(prior, version);
      await saveState(prior);
      const payload = JSON.stringify(old);
      await replace(prior.learner.id, payload);
      const upgraded = (await loadState(prior.learner.id))!;
      expect(upgraded.version).toBe(3);
      expect(upgraded.activeMissionId).toBe(prior.activeMissionId);
      expect(upgraded.location).toBe(prior.location);
      expect(upgraded.clockMinutes).toBe(prior.clockMinutes);
      expect(upgraded.missions["M-A02"].stepIndex).toBe(1);
      expect(upgraded.missions["M-A02"].attempts[0].trace).toEqual(
        prior.missions["M-A02"].attempts[0].trace,
      );
      expect(upgraded.missions["M-A02"].attempts[0].assistanceVerified).toBe(
        false,
      );
      expect(upgraded.missions["M-A02"].attempts[0].unaided).toBeUndefined();
      expect(upgraded.tutorial.status).toBe("not_started");
      expect(upgraded.tutorial.legacyOptIn).toBe(true);
      expect(upgraded.extensions.futureVendorField).toEqual(
        prior.extensions.futureVendorField,
      );
      expect(
        (await stored("backups", `before-upgrade:${prior.learner.id}`)).payload,
      ).toBe(payload);
      expect(
        JSON.parse((await stored("saves", prior.learner.id)).payload).version,
      ).toBe(3);
      expect(await loadState(prior.learner.id)).toEqual(upgraded);
    },
  );
  it("preserves existing awarded history without inventing verified assistance tracking", () => {
    const prior = inProgress("synthetic-awarded");
    prior.competencies.A02.level = "demonstrated";
    prior.competencies.A02.evidenceMissionIds = ["M-A02"];
    prior.campaignStage = "Independent Account Owner";
    prior.missions["M-A02"].status = "completed";
    prior.missions["M-A02"].attempts[0].passed = true;
    prior.missions["M-A02"].attempts[0].endedAt = prior.clockMinutes;
    prior.activeMissionId = null;
    const result = migrateState(oldSave(prior, 2));
    expect(result.state.competencies).toEqual(prior.competencies);
    expect(result.state.campaignStage).toBe(prior.campaignStage);
    expect(result.state.missions["M-A02"].status).toBe("completed");
    expect(result.state.missions["M-A02"].attempts[0].assistanceVerified).toBe(
      false,
    );
    expect(result.state.tutorial.legacyOptIn).toBe(true);
  });
  it("rejects future versions without checkpoint downgrade or autosave overwrite", async () => {
    const prior = createState({
      id: "synthetic-future-protected",
      displayName: "Synthetic future",
    });
    await saveState(prior);
    await saveState({ ...prior, clockMinutes: 20 });
    const payload = JSON.stringify({ ...prior, version: 4, clockMinutes: 100 });
    await replace(prior.learner.id, payload);
    await expect(loadState(prior.learner.id)).rejects.toThrow(
      "never silently downgraded",
    );
    await expect(saveState(prior)).rejects.toThrow("never silently downgraded");
    expect((await stored("saves", prior.learner.id)).payload).toBe(payload);
    expect(
      (await stored("backups", `unsupported-version:${prior.learner.id}`))
        .payload,
    ).toBe(payload);
  });
  it("protects future tutorial save bytes from checkpoint downgrade and autosave overwrite", async () => {
    const prior = createState({
      id: "synthetic-future-tutorial-protected",
      displayName: "Synthetic future tutorial",
    });
    await saveState(prior);
    await saveState({ ...prior, clockMinutes: 20 });
    const payload = JSON.stringify({
      ...prior,
      clockMinutes: 100,
      tutorial: {
        ...prior.tutorial,
        version: 2,
        futureContinuation: { retainExactly: "synthetic newer tutorial work" },
      },
    });
    await replace(prior.learner.id, payload);
    await expect(loadState(prior.learner.id)).rejects.toThrow(
      "unsupported guided first-day version",
    );
    await expect(saveState(prior)).rejects.toThrow(
      "unsupported guided first-day version",
    );
    expect((await stored("saves", prior.learner.id)).payload).toBe(payload);
    expect(
      (await stored("backups", `unsupported-version:${prior.learner.id}`))
        .payload,
    ).toBe(payload);
    const imported = importWorldSave({
      format: "taxwire-am-world-save",
      version: 1,
      state: JSON.parse(payload),
    });
    expect(imported.valid).toBe(false);
    expect(imported.errors.join(" ")).toContain(
      "unsupported guided first-day version",
    );
  });
  it("rejects damaged current tutorial state rather than silently resetting a returning learner", () => {
    const state = createState();
    expect(() => migrateState({ ...state, tutorial: undefined })).toThrow(
      "missing its versioned",
    );
    expect(() =>
      migrateState({ ...state, tutorial: { ...state.tutorial, version: 2 } }),
    ).toThrow("guided first-day");
    expect(() =>
      migrateState({
        ...state,
        tutorial: { ...state.tutorial, status: "completed", stepIndex: 0 },
      }),
    ).toThrow("ordered");
    expect(
      importWorldSave({
        format: "taxwire-am-world-save",
        version: 1,
        state: { ...state, version: 4 },
      }).valid,
    ).toBe(false);
  });
  it("retains changed-case history and starts a revised attempt only on explicit case start", () => {
    const prior = inProgress("synthetic-revision");
    const revised = structuredClone(content);
    const mission = revised.missions.find((item) => item.id === "M-A02")!;
    mission.version += 1;
    mission.fingerprint += ":response-v2";
    let state = transition(
      prior,
      { type: "POSITION", x: 4, z: 3, yaw: 1 },
      revised,
    );
    expect(state.missions[mission.id]).toEqual(prior.missions[mission.id]);
    expect(state.extensions.revisedCaseHistory).toContain(mission.id);
    const step = activeStep(state, revised)!;
    state = transition(
      state,
      {
        type: "ACT",
        id: "stale-assessment",
        stepId: step.id,
        choiceId: step.choices[0].id,
      },
      revised,
    );
    expect(state.missions[mission.id].stepIndex).toBe(1);
    expect(state.notifications.at(-1)).toContain("explicitly start");
    const exported = exportProgress(state, revised);
    expect(
      exported.missions.find((item) => item.id === mission.id)?.version,
    ).toBe(prior.missions[mission.id].attempts[0].version);
    expect(
      previewImport(exported, createState(), revised).mismatchedMissionIds,
    ).toContain(mission.id);
    state = transition(
      state,
      { type: "START_MISSION", missionId: mission.id, mode: "guided" },
      revised,
    );
    expect(state.missions[mission.id].attempts).toHaveLength(2);
    expect(state.missions[mission.id].attempts[0].trace).toEqual(
      prior.missions[mission.id].attempts[0].trace,
    );
    expect(state.missions[mission.id].attempts[1].fingerprint).toBe(
      mission.fingerprint,
    );
    expect(state.missions[mission.id].stepIndex).toBe(0);
    expect(state.extensions.futureVendorField).toEqual(
      prior.extensions.futureVendorField,
    );
  });
  it("preserves the old portable contract and caps untracked or assisted imported mastery to practice", () => {
    const prior = inProgress("synthetic-import-assistance");
    prior.missions["M-A02"].status = "completed";
    prior.missions["M-A02"].bestScore = 90;
    prior.competencies.A02.level = "demonstrated";
    prior.competencies.A02.bestScore = 90;
    prior.competencies.A02.evidenceMissionIds = ["M-A02"];
    const data = exportProgress(prior, content);
    delete data.extensions.assistanceTrackingVersion;
    delete data.extensions.attemptHistory;
    data.extensions.futureVendorField = { keep: "portable unknown data" };
    expect(validateTrainingExport(data).valid).toBe(true);
    const imported = mergeProgress(createState(), data, content);
    expect(imported.missions["M-A02"].status).toBe("completed");
    expect(imported.missions["M-A02"].mode).toBe("assisted");
    expect(imported.competencies.A02.level).toBe("practiced");
    expect(imported.imports[0].missions).toEqual(data.missions);
    expect(
      exportProgress(imported, content).extensions.futureVendorField,
    ).toEqual(data.extensions.futureVendorField);
  });
});
