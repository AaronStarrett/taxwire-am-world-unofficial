import { validateRelationshipConversations } from "./conversations";
import { createState, SAVE_VERSION } from "./index";
import type { GameState } from "./types";
import {
  createTutorial,
  TUTORIAL_STEP_IDS,
  TUTORIAL_VERSION,
} from "./tutorial";

const DATABASE = "taxwire-am-world-local";
const MAX_CHECKPOINTS = 10;
interface Envelope {
  id: string;
  learnerId: string;
  displayName: string;
  savedAt: string;
  payload: string;
  checksum: string;
  eventCount: number;
  sequence?: number;
  kind?: string;
}
let saving: Promise<void> = Promise.resolve();
function checksum(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () =>
      reject(operation.error ?? new Error("IndexedDB request failed."));
  });
}
function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Local save transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Local save transaction aborted."));
  });
}
async function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    throw new Error(
      "IndexedDB is unavailable. Export a file before closing this browser; saves are browser-local.",
    );
  const operation = indexedDB.open(DATABASE, 1);
  operation.onupgradeneeded = () => {
    for (const name of ["saves", "checkpoints", "backups"])
      if (!operation.result.objectStoreNames.contains(name))
        operation.result.createObjectStore(name, { keyPath: "id" });
  };
  return request(operation);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function finiteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function strings(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
class UnsupportedSaveVersion extends Error {}
function assistance(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.missionId === "string" &&
    typeof value.stepId === "string" &&
    [
      "hint",
      "explain",
      "demonstration",
      "show-location",
      "stuck",
      "mode-change",
    ].includes(String(value.kind)) &&
    [1, 2, 3].includes(Number(value.level)) &&
    finiteInteger(value.clockMinutes)
  );
}
export function migrateState(data: unknown): {
  state: GameState;
  upgraded: boolean;
} {
  if (
    !isRecord(data) ||
    !finiteInteger(data.version) ||
    data.version < 1 ||
    data.version > SAVE_VERSION
  )
    throw new UnsupportedSaveVersion(
      "Save version is unsupported; newer saves are never silently downgraded.",
    );
  if (
    isRecord(data.tutorial) &&
    typeof data.tutorial.version === "number" &&
    data.tutorial.version > TUTORIAL_VERSION
  )
    throw new UnsupportedSaveVersion(
      "Save contains an unsupported guided first-day version; newer saves are never silently downgraded.",
    );
  if (
    !isRecord(data.learner) ||
    typeof data.learner.id !== "string" ||
    !data.learner.id ||
    typeof data.learner.displayName !== "string" ||
    !data.learner.displayName ||
    !finiteInteger(data.clockMinutes) ||
    !isRecord(data.missions)
  )
    throw new Error("Save is missing its profile, clock, or mission state.");
  const defaults = createState(
    { id: data.learner.id, displayName: data.learner.displayName },
    typeof data.seed === "number" ? data.seed : 1729,
  );
  const state = {
    ...defaults,
    ...structuredClone(data),
    learner: { ...defaults.learner },
    settings: {
      ...defaults.settings,
      ...(isRecord(data.settings) ? data.settings : {}),
    },
    avatar: {
      ...defaults.avatar,
      ...(isRecord(data.avatar) ? data.avatar : {}),
    },
    position: {
      ...defaults.position,
      ...(isRecord(data.position) ? data.position : {}),
    },
    version: SAVE_VERSION,
  } as GameState;
  if (data.version < 3) {
    state.tutorial = createTutorial(true);
    state.guidanceMode = ["guided", "assisted", "independent"].includes(
      String(data.guidanceMode),
    )
      ? (data.guidanceMode as GameState["guidanceMode"])
      : "guided";
    state.assistanceHistory = [];
    for (const progress of Object.values(state.missions))
      if (isRecord(progress) && Array.isArray(progress.attempts))
        for (const attempt of progress.attempts)
          if (isRecord(attempt)) {
            attempt.assistanceVerified = false;
            delete attempt.unaided;
          }
  }
  const tutorial = state.tutorial;
  if (!isRecord(data.tutorial) && data.version === SAVE_VERSION)
    throw new Error("Current save is missing its versioned guided first day.");
  if (
    !isRecord(tutorial) ||
    tutorial.version !== 1 ||
    !["not_started", "active", "completed", "skipped"].includes(
      String(tutorial.status),
    ) ||
    !finiteInteger(tutorial.stepIndex) ||
    tutorial.stepIndex > TUTORIAL_STEP_IDS.length ||
    !finiteInteger(tutorial.run) ||
    !strings(tutorial.completedStepIds) ||
    tutorial.completedStepIds.join("|") !==
      TUTORIAL_STEP_IDS.slice(0, tutorial.stepIndex).join("|") ||
    !Array.isArray(tutorial.history) ||
    tutorial.history.length > 100000 ||
    !["keyboard", "pointer", "touch", "menu"].includes(
      String(tutorial.inputMethod),
    ) ||
    !finiteInteger(tutorial.simulatedMinutes) ||
    typeof tutorial.legacyOptIn !== "boolean" ||
    !isRecord(tutorial.controlOrigin) ||
    ![
      tutorial.controlOrigin.x,
      tutorial.controlOrigin.z,
      tutorial.controlOrigin.yaw,
    ].every((value) => typeof value === "number" && Number.isFinite(value)) ||
    !isRecord(tutorial.scenario) ||
    typeof tutorial.scenario.accountId !== "string" ||
    typeof tutorial.scenario.owner !== "string" ||
    !strings(tutorial.scenario.knownIds) ||
    !strings(tutorial.scenario.missingIds) ||
    typeof tutorial.scenario.responseVerified !== "boolean"
  )
    throw new Error("Invalid versioned guided first-day state.");
  if (
    (tutorial.status === "completed") !==
      (tutorial.stepIndex === TUTORIAL_STEP_IDS.length) ||
    (tutorial.status === "not_started" && tutorial.stepIndex !== 0) ||
    (tutorial.status === "active" && tutorial.run < 1)
  )
    throw new Error("Invalid ordered guided first-day progress.");
  for (const row of tutorial.history)
    if (
      !isRecord(row) ||
      typeof row.id !== "string" ||
      !finiteInteger(row.run) ||
      !TUTORIAL_STEP_IDS.includes(row.stepId) ||
      typeof row.action !== "string" ||
      typeof row.accepted !== "boolean" ||
      !finiteInteger(row.clockMinutes) ||
      !strings(row.evidenceIds) ||
      typeof row.message !== "string" ||
      (row.classifications !== undefined &&
        (!isRecord(row.classifications) ||
          !Object.values(row.classifications).every(
            (value) => value === "known" || value === "missing",
          )))
    )
      throw new Error("Invalid guided action evidence.");
  if (
    !["guided", "assisted", "independent"].includes(state.guidanceMode) ||
    !Array.isArray(state.assistanceHistory) ||
    state.assistanceHistory.length > 100000 ||
    !state.assistanceHistory.every(assistance)
  )
    throw new Error("Invalid authored assistance history.");
  if (
    !["low", "medium", "high"].includes(state.settings.quality) ||
    !Number.isFinite(state.settings.textScale) ||
    !Number.isFinite(state.settings.cameraSensitivity) ||
    !Object.values(state.position).every(Number.isFinite) ||
    !Number.isInteger(state.rngState) ||
    !Number.isInteger(state.day) ||
    state.day < 1
  )
    throw new Error("Invalid simulation settings, position, or clock.");
  for (const field of [
    "events",
    "tasks",
    "appointments",
    "artifacts",
    "reviewQueue",
    "imports",
  ] as const)
    if (!Array.isArray(state[field]) || state[field].length > 100000)
      throw new Error(`Invalid ${field} in save.`);
  for (const field of [
    "visitedLocations",
    "processedActions",
    "notifications",
  ] as const)
    if (!strings(state[field])) throw new Error(`Invalid ${field} in save.`);
  for (const field of [
    "competencies",
    "npcMemory",
    "specialistCapacity",
    "accountHealth",
    "extensions",
  ] as const)
    if (!isRecord(state[field])) throw new Error(`Invalid ${field} in save.`);
  const navigation = state.extensions.cityNavigation;
  if (
    isRecord(navigation) &&
    typeof navigation.version === "number" &&
    navigation.version > 1
  )
    throw new UnsupportedSaveVersion(
      "Save contains a newer city-navigation version; it is never silently downgraded.",
    );
  if (
    state.extensions.relationshipConversations !== undefined &&
    !validateRelationshipConversations(
      state.extensions.relationshipConversations,
    )
  ) {
    const value = state.extensions.relationshipConversations;
    if (
      isRecord(value) &&
      typeof value.version === "number" &&
      value.version > 1
    )
      throw new UnsupportedSaveVersion(
        "Save contains a newer relationship-conversation version; it is never silently downgraded.",
      );
    throw new Error("Invalid versioned relationship-conversation history.");
  }
  if (
    typeof state.location !== "string" ||
    (state.activeMissionId !== null &&
      typeof state.activeMissionId !== "string")
  )
    throw new Error("Invalid active scene.");
  for (const progress of Object.values(state.missions)) {
    if (
      !isRecord(progress) ||
      ![
        "not_started",
        "in_progress",
        "completed",
        "needs_remediation",
      ].includes(String(progress.status)) ||
      !finiteInteger(progress.stepIndex) ||
      !Array.isArray(progress.attempts) ||
      !strings(progress.evidenceIds) ||
      !strings(progress.criticalFailures) ||
      typeof progress.bestScore !== "number" ||
      progress.bestScore < 0 ||
      progress.bestScore > 100
    )
      throw new Error("Invalid mission progress in save.");
    for (const attempt of progress.attempts) {
      if (
        !isRecord(attempt) ||
        !Array.isArray(attempt.trace) ||
        !strings(attempt.criticalFailures) ||
        !isRecord(attempt.dimensions) ||
        !finiteInteger(attempt.startedAt)
      )
        throw new Error("Invalid attempt history in save.");
      if (attempt.branchVersion !== undefined && attempt.branchVersion !== 1)
        throw new UnsupportedSaveVersion(
          "Save contains an unsupported case-branch version; history is never silently downgraded.",
        );
      if (
        attempt.branchVersion === 1 &&
        ((attempt.routeNodeId !== undefined &&
          typeof attempt.routeNodeId !== "string") ||
          (attempt.routeMarks !== undefined &&
            (!Array.isArray(attempt.routeMarks) ||
              !attempt.routeMarks.every((mark) =>
                ["mixed", "recovery"].includes(mark),
              ))) ||
          (attempt.outcome !== undefined &&
            !["good", "mixed", "poor", "recovery"].includes(attempt.outcome)) ||
          (attempt.relationshipStart !== undefined &&
            (!isRecord(attempt.relationshipStart) ||
              !Number.isFinite(attempt.relationshipStart.trust) ||
              !Number.isFinite(attempt.relationshipStart.risk))))
      )
        throw new Error("Invalid persisted case decision route.");
      if (
        attempt.branchVersion === 1 &&
        attempt.endedAt === undefined &&
        progress.status === "in_progress" &&
        !attempt.routeNodeId
      )
        throw new Error(
          "Active case decision route is missing its current node.",
        );
      if (attempt.debrief !== undefined) {
        const debrief = attempt.debrief;
        if (
          !isRecord(debrief) ||
          !["good", "mixed", "poor", "recovery"].includes(
            String(debrief.outcome),
          ) ||
          typeof debrief.title !== "string" ||
          typeof debrief.summary !== "string" ||
          !strings(debrief.decisions) ||
          !strings(debrief.nextSteps) ||
          !finiteInteger(debrief.completedStages) ||
          !finiteInteger(debrief.totalStages) ||
          !isRecord(debrief.relationship) ||
          ![
            debrief.relationship.trustChange,
            debrief.relationship.riskChange,
            debrief.relationship.trust,
            debrief.relationship.risk,
          ].every(
            (value) => typeof value === "number" && Number.isFinite(value),
          )
        )
          throw new Error("Invalid case-branch debrief.");
      }
      if (
        (attempt.assistance !== undefined &&
          (!Array.isArray(attempt.assistance) ||
            !attempt.assistance.every(assistance))) ||
        (attempt.unaided === true &&
          (attempt.assistance?.length ||
            attempt.assistanceVerified !== true ||
            attempt.mode !== "independent"))
      )
        throw new Error("Invalid attempt assistance evidence.");
    }
  }
  for (const task of state.tasks)
    if (
      !isRecord(task) ||
      typeof task.id !== "string" ||
      typeof task.owner !== "string" ||
      !task.owner.trim() ||
      !["open", "completed"].includes(String(task.status)) ||
      !strings(task.evidence) ||
      !finiteInteger(task.dueMinute)
    )
      throw new Error("Invalid owned task in save.");
  for (const artifact of state.artifacts)
    if (
      !isRecord(artifact) ||
      typeof artifact.id !== "string" ||
      typeof artifact.missionId !== "string" ||
      typeof artifact.body !== "string" ||
      typeof artifact.createdAt !== "string"
    )
      throw new Error("Invalid work product in save.");
  return { state, upgraded: data.version !== SAVE_VERSION };
}
function decode(envelope: Envelope): { state: GameState; upgraded: boolean } {
  if (
    !envelope ||
    typeof envelope.payload !== "string" ||
    envelope.payload.length > 20 * 1024 * 1024 ||
    checksum(envelope.payload) !== envelope.checksum
  )
    throw new Error(
      "Save checksum does not match; attempting checkpoint recovery.",
    );
  return migrateState(JSON.parse(envelope.payload));
}
function encode(state: GameState): Envelope {
  const payload = JSON.stringify(state);
  return {
    id: state.learner.id,
    learnerId: state.learner.id,
    displayName: state.learner.displayName,
    savedAt: new Date().toISOString(),
    payload,
    checksum: checksum(payload),
    eventCount: state.events.length,
  };
}
export function saveState(state: GameState): Promise<void> {
  const snapshot = structuredClone(state);
  const operation = saving
    .catch(() => undefined)
    .then(async () => {
      const validated = migrateState(snapshot).state;
      const database = await open();
      try {
        const transaction = database.transaction(
          ["saves", "checkpoints", "backups"],
          "readwrite",
        );
        const done = completed(transaction);
        const saves = transaction.objectStore("saves");
        const checkpoints = transaction.objectStore("checkpoints");
        const prior = (await request(saves.get(snapshot.learner.id))) as
          Envelope | undefined;
        const envelope = encode(validated);
        envelope.sequence = (prior?.sequence ?? 0) + 1;
        if (prior && prior.payload === envelope.payload) {
          await done;
          return;
        }
        // Keep the preceding valid state before replacing the current save; bounded history per profile.
        if (prior) {
          try {
            decode(prior);
            checkpoints.put({
              ...prior,
              id: `${snapshot.learner.id}:${envelope.sequence}:${checksum(prior.payload)}`,
              kind: "checkpoint",
            });
          } catch (error) {
            if (error instanceof UnsupportedSaveVersion) {
              transaction.abort();
              await done.catch(() => undefined);
              throw error;
            }
            transaction.objectStore("backups").put({
              ...prior,
              id: `corrupt:${snapshot.learner.id}`,
              kind: "corrupted-save",
            });
          }
        }
        saves.put(envelope);
        const existing = (await request(checkpoints.getAll())) as Envelope[];
        const ours = existing
          .filter((item) => item.learnerId === snapshot.learner.id)
          .sort(
            (a, b) =>
              (b.sequence ?? 0) - (a.sequence ?? 0) ||
              b.savedAt.localeCompare(a.savedAt),
          );
        for (const old of ours.slice(MAX_CHECKPOINTS))
          checkpoints.delete(old.id);
        await done;
      } finally {
        database.close();
      }
    });
  saving = operation;
  return operation;
}
async function readEnvelope(learnerId: string): Promise<Envelope | undefined> {
  await saving.catch(() => undefined);
  const database = await open();
  try {
    const transaction = database.transaction("saves", "readonly");
    const done = completed(transaction);
    const result = (await request(
      transaction.objectStore("saves").get(learnerId),
    )) as Envelope | undefined;
    await done;
    return result;
  } finally {
    database.close();
  }
}
async function backup(envelope: Envelope, kind: string): Promise<void> {
  const database = await open();
  try {
    const transaction = database.transaction("backups", "readwrite");
    const done = completed(transaction);
    transaction
      .objectStore("backups")
      .put({ ...envelope, id: `${kind}:${envelope.learnerId}`, kind });
    await done;
  } finally {
    database.close();
  }
}
export async function loadState(learnerId: string): Promise<GameState | null> {
  const envelope = await readEnvelope(learnerId);
  if (!envelope) return null;
  try {
    const result = decode(envelope);
    if (result.upgraded) {
      await backup(envelope, "before-upgrade");
      result.state.notifications = [
        ...result.state.notifications,
        "Local save upgraded; original saved as a browser-local backup.",
      ].slice(-8);
      await saveState(result.state);
    }
    return result.state;
  } catch (error) {
    if (error instanceof UnsupportedSaveVersion) {
      await backup(envelope, "unsupported-version");
      throw error;
    }
    await backup(envelope, "corrupt");
    const recovered = await recoverState(learnerId);
    if (recovered) {
      recovered.notifications = [
        ...recovered.notifications,
        "Current save was corrupted. Restored the last valid checkpoint; corrupt bytes retained locally.",
      ].slice(-8);
      await saveState(recovered);
    }
    return recovered;
  }
}
export async function listProfiles(): Promise<
  { id: string; displayName: string }[]
> {
  const database = await open();
  try {
    const transaction = database.transaction("saves", "readonly");
    const done = completed(transaction);
    const saves = (await request(
      transaction.objectStore("saves").getAll(),
    )) as Envelope[];
    await done;
    return saves.map((item) => ({
      id: item.learnerId,
      displayName: item.displayName,
    }));
  } finally {
    database.close();
  }
}
export async function listCheckpoints(
  learnerId: string,
): Promise<{ id: string; savedAt: string; eventCount: number }[]> {
  const database = await open();
  try {
    const transaction = database.transaction("checkpoints", "readonly");
    const done = completed(transaction);
    const rows = (await request(
      transaction.objectStore("checkpoints").getAll(),
    )) as Envelope[];
    await done;
    return rows
      .filter((item) => item.learnerId === learnerId)
      .sort(
        (a, b) =>
          (b.sequence ?? 0) - (a.sequence ?? 0) ||
          b.savedAt.localeCompare(a.savedAt),
      )
      .map((item) => ({
        id: item.id,
        savedAt: item.savedAt,
        eventCount: item.eventCount,
      }));
  } finally {
    database.close();
  }
}
export async function restoreCheckpoint(
  checkpointId: string,
): Promise<GameState | null> {
  const database = await open();
  try {
    const transaction = database.transaction("checkpoints", "readonly");
    const done = completed(transaction);
    const row = (await request(
      transaction.objectStore("checkpoints").get(checkpointId),
    )) as Envelope | undefined;
    await done;
    if (!row) return null;
    return decode(row).state;
  } catch {
    return null;
  } finally {
    database.close();
  }
}
export async function recoverState(
  learnerId: string,
): Promise<GameState | null> {
  for (const checkpoint of await listCheckpoints(learnerId)) {
    const state = await restoreCheckpoint(checkpoint.id);
    if (state) return state;
  }
  return null;
}
/** The UI must obtain explicit reset confirmation before calling this function. */
export async function deleteState(learnerId: string): Promise<void> {
  await saving.catch(() => undefined);
  const database = await open();
  try {
    const transaction = database.transaction(
      ["saves", "checkpoints", "backups"],
      "readwrite",
    );
    const done = completed(transaction);
    transaction.objectStore("saves").delete(learnerId);
    for (const name of ["checkpoints", "backups"]) {
      const store = transaction.objectStore(name);
      const rows = (await request(store.getAll())) as Envelope[];
      for (const row of rows)
        if (row.learnerId === learnerId) store.delete(row.id);
    }
    await done;
  } finally {
    database.close();
  }
}
