import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  createState,
  deleteState,
  listCheckpoints,
  listProfiles,
  loadState,
  migrateState,
  saveState,
} from "../src/engine";
import type { GameState } from "../src/engine";
import { content } from "../src/content";
import { activeStep, transition } from "../src/engine";

function profile(id: string): GameState {
  return createState({
    id: `synthetic-${id}`,
    displayName: "Synthetic Profile",
  });
}
function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error);
  });
}
async function rewriteStored(
  id: string,
  mutate: (envelope: { payload: string; checksum: string; id: string }) => void,
): Promise<void> {
  const database = await request(indexedDB.open("taxwire-am-world-local", 1));
  try {
    const transaction = database.transaction("saves", "readwrite");
    const completed = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    const store = transaction.objectStore("saves");
    const envelope = await request(store.get(id));
    mutate(envelope);
    store.put(envelope);
    await completed;
  } finally {
    database.close();
  }
}
function hash(text: string): string {
  let value = 2166136261;
  for (const character of text) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(16);
}

describe("browser-local versioned persistence", () => {
  it("autosaves and reloads a mission and world transition without loss", async () => {
    const state = profile("reload");
    state.location = "research";
    state.visitedLocations.push("research");
    state.position = { x: 4, z: 2, yaw: 1 };
    state.activeMissionId = "M-T01";
    state.missions["M-T01"] = {
      status: "in_progress",
      stepIndex: 1,
      mode: "guided",
      attempts: [],
      bestScore: 0,
      criticalFailures: [],
      evidenceIds: ["prior-step"],
    };
    await saveState(state);
    expect(await loadState(state.learner.id)).toEqual(state);
  });
  it("resumes a real authored in-progress case after a world transition and reload", async () => {
    const mission = content.missions.find((item) => item.id === "M-T01")!;
    let state = transition(
      profile("real-resume"),
      { type: "START_MISSION", missionId: mission.id },
      content,
    );
    const first = activeStep(state, content)!;
    const best = [...first.choices].sort(
      (a, b) => b.scores.execution - a.scores.execution,
    )[0];
    state = transition(
      state,
      {
        type: "ACT",
        id: "real-resume-action",
        stepId: first.id,
        choiceId: best.id,
        ...(first.expectedValue !== undefined
          ? { value: first.expectedValue }
          : {}),
      },
      content,
    );
    state = transition(
      state,
      { type: "TRAVEL", location: "research" },
      content,
    );
    await saveState(state);
    const reloaded = await loadState(state.learner.id);
    expect(reloaded?.location).toBe("research");
    expect(activeStep(reloaded!, content)?.id).toBe(mission.steps[1].id);
    expect(reloaded?.missions[mission.id].attempts[0].trace).toHaveLength(1);
  });
  it("keeps multiple learner profiles separate", async () => {
    const first = profile("one");
    const second = profile("two");
    second.clockMinutes = 30;
    await saveState(first);
    await saveState(second);
    const profiles = await listProfiles();
    expect(profiles).toContainEqual({
      id: first.learner.id,
      displayName: first.learner.displayName,
    });
    expect(profiles).toContainEqual({
      id: second.learner.id,
      displayName: second.learner.displayName,
    });
    expect((await loadState(first.learner.id))?.clockMinutes).toBe(0);
    expect((await loadState(second.learner.id))?.clockMinutes).toBe(30);
  });
  it("serializes simultaneous autosaves in action order", async () => {
    const first = profile("ordered");
    const second = structuredClone(first);
    second.clockMinutes = 20;
    const third = structuredClone(second);
    third.clockMinutes = 40;
    await Promise.all([saveState(first), saveState(second), saveState(third)]);
    expect((await loadState(first.learner.id))?.clockMinutes).toBe(40);
  });
  it("retains a bounded checkpoint history", async () => {
    const state = profile("bounded");
    for (let index = 0; index < 14; index += 1) {
      state.clockMinutes = index;
      await saveState(state);
    }
    const checkpoints = await listCheckpoints(state.learner.id);
    expect(checkpoints.length).toBeLessThanOrEqual(10);
    expect(checkpoints.length).toBeGreaterThan(0);
  });
  it("recovers a corrupted save from the last valid checkpoint", async () => {
    const first = profile("corrupt");
    await saveState(first);
    const next = structuredClone(first);
    next.clockMinutes = 30;
    await saveState(next);
    await saveState({ ...next, clockMinutes: 60 });
    await rewriteStored(first.learner.id, (envelope) => {
      envelope.payload = "{broken";
    });
    const recovered = await loadState(first.learner.id);
    expect(recovered?.clockMinutes).toBe(30);
    expect(recovered?.notifications.at(-1)).toContain("corrupted");
  });
  it("returns null honestly when corruption has no recoverable checkpoint", async () => {
    const state = profile("no-recovery");
    await saveState(state);
    await rewriteStored(state.learner.id, (envelope) => {
      envelope.payload = "broken";
    });
    expect(await loadState(state.learner.id)).toBeNull();
  });
  it("migrates a previous version and saves a backup before upgrading", async () => {
    const state = profile("migration");
    await saveState(state);
    await rewriteStored(state.learner.id, (envelope) => {
      const old = JSON.parse(envelope.payload);
      old.version = 1;
      delete old.specialistCapacity;
      delete old.extensions;
      envelope.payload = JSON.stringify(old);
      envelope.checksum = hash(envelope.payload);
    });
    const migrated = await loadState(state.learner.id);
    expect(migrated?.version).toBe(3);
    expect(migrated?.specialistCapacity).toEqual({});
    expect(migrated?.notifications.at(-1)).toContain("original saved");
    const database = await request(indexedDB.open("taxwire-am-world-local", 1));
    const transaction = database.transaction("backups", "readonly");
    const original = await request(
      transaction
        .objectStore("backups")
        .get(`before-upgrade:${state.learner.id}`),
    );
    database.close();
    expect(JSON.parse(original.payload).version).toBe(1);
  });
  it("rejects unsupported future save versions instead of downgrading", () => {
    expect(() => migrateState({ ...profile("future"), version: 4 })).toThrow(
      "never silently downgraded",
    );
  });
  it("rejects malformed current saves", () => {
    expect(() =>
      migrateState({ ...profile("bad-clock"), clockMinutes: -1 }),
    ).toThrow();
    expect(() =>
      migrateState({
        ...profile("bad-tasks"),
        tasks: [
          { id: "task", owner: "", dueMinute: 5, status: "open", evidence: [] },
        ],
      }),
    ).toThrow("owned task");
  });
  it("deletes only the explicitly chosen profile and its checkpoints", async () => {
    const first = profile("delete");
    const second = profile("keep");
    await saveState(first);
    await saveState({ ...first, clockMinutes: 10 });
    await saveState(second);
    await deleteState(first.learner.id);
    expect(await loadState(first.learner.id)).toBeNull();
    expect(await listCheckpoints(first.learner.id)).toEqual([]);
    expect(await loadState(second.learner.id)).not.toBeNull();
  });
});
