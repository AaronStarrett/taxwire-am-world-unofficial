import Ajv from "ajv";
import type { ContentPack } from "../content/types";
import type {
  GameState,
  ImportPreview,
  MissionProgress,
  TrainingExport,
} from "./types";
import { trainingSchema } from "./trainingSchema";
import { migrateState } from "./persistence";

const validate = new Ajv({ allErrors: true, strict: true }).compile(
  trainingSchema,
);
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const LEVELS = [
  "not_started",
  "introduced",
  "practiced",
  "demonstrated",
] as const;
const unique = <T>(rows: T[]): T[] => [...new Set(rows)];
function hasUnsafeKeys(value: unknown, depth = 0): boolean {
  if (depth > 24) return true;
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      ["__proto__", "constructor", "prototype"].includes(key) ||
      hasUnsafeKeys(nested, depth + 1),
  );
}
function parse(data: unknown): { value?: unknown; error?: string } {
  try {
    const serialized = typeof data === "string" ? data : JSON.stringify(data);
    if (
      !serialized ||
      new TextEncoder().encode(serialized).byteLength > MAX_IMPORT_BYTES
    )
      return { error: "Import exceeds the 2 MiB limit." };
    const value: unknown = JSON.parse(serialized);
    return hasUnsafeKeys(value)
      ? { error: "Import contains unsafe keys or excessive nesting." }
      : { value };
  } catch {
    return { error: "This is not valid JSON." };
  }
}
export function validateTrainingExport(data: unknown): {
  valid: boolean;
  errors: string[];
  data?: TrainingExport;
} {
  const parsed = parse(data);
  if (parsed.error) return { valid: false, errors: [parsed.error] };
  if (!validate(parsed.value))
    return {
      valid: false,
      errors: (validate.errors ?? [])
        .slice(0, 20)
        .map(
          (error) =>
            `${error.instancePath || "/"} ${error.message ?? "invalid"}`,
        ),
    };
  const result = parsed.value as TrainingExport;
  const errors: string[] = [];
  for (const name of ["competencies", "missions", "artifacts"] as const) {
    const ids = result[name].map((item) => item.id);
    if (new Set(ids).size !== ids.length) errors.push(`Duplicate ${name} IDs.`);
    if (
      ids.some((id) => ["__proto__", "constructor", "prototype"].includes(id))
    )
      errors.push(`Unsafe ${name} identifier.`);
  }
  for (const timestamp of [
    result.exportedAt,
    ...result.artifacts.map((item) => item.createdAt),
    ...result.reviewQueue.map((item) => item.dueAt),
  ])
    if (!Number.isFinite(Date.parse(timestamp)))
      errors.push("Invalid UTC timestamp.");
  const remediated = Array.isArray(result.extensions.remediatedMissionIds)
    ? result.extensions.remediatedMissionIds
    : [];
  for (const mission of result.missions)
    if (
      mission.status === "completed" &&
      mission.criticalFailures.length &&
      !remediated.includes(mission.id)
    )
      errors.push(
        `Mission ${mission.id} claims completion with unresolved critical failures.`,
      );
  return {
    valid: errors.length === 0,
    errors,
    ...(errors.length ? {} : { data: result }),
  };
}
export function exportProgress(
  state: GameState,
  content: ContentPack,
  now = new Date(),
): TrainingExport {
  const missions: TrainingExport["missions"] = content.missions.map(
    (mission) => {
      const progress = state.missions[mission.id];
      return {
        id: mission.id,
        version: mission.version,
        status:
          progress?.status === "completed"
            ? "completed"
            : progress && progress.status !== "not_started"
              ? "in_progress"
              : "not_started",
        bestScore: progress?.bestScore ?? 0,
        criticalFailures:
          progress?.status === "completed"
            ? []
            : [
                ...(progress?.attempts.at(-1)?.criticalFailures ??
                  progress?.criticalFailures ??
                  []),
              ],
      };
    },
  );
  // Keep foreign mission families in portable history without inventing local scenes.
  for (const imported of state.imports)
    for (const mission of imported.missions)
      if (!missions.some((item) => item.id === mission.id))
        missions.push(structuredClone(mission));
  const remediatedMissionIds = Object.entries(state.missions)
    .filter(
      ([, progress]) =>
        progress.status === "completed" &&
        progress.criticalFailures.length > 0 &&
        progress.attempts.some(
          (attempt) => attempt.passed && !attempt.criticalFailures.length,
        ),
    )
    .map(([id]) => id);
  return {
    format: "taxwire-am-training",
    schemaVersion: 1,
    contentVersion: content.version,
    exportedAt: now.toISOString(),
    learner: { ...state.learner },
    competencies: unique([
      ...content.competencies.map((competency) => competency.id),
      ...Object.keys(state.competencies),
    ]).map((id) =>
      structuredClone(
        state.competencies[id] ?? {
          id,
          level: "not_started",
          bestScore: 0,
          attemptCount: 0,
          evidenceMissionIds: [],
        },
      ),
    ),
    missions,
    artifacts: structuredClone(state.artifacts),
    reviewQueue: structuredClone(state.reviewQueue),
    extensions: {
      ...structuredClone(state.extensions),
      sourceEdition: "3d-world",
      caseFingerprints: Object.fromEntries(
        content.missions.map((mission) => [mission.id, mission.fingerprint]),
      ),
      remediatedMissionIds,
      attemptHistory: Object.fromEntries(
        Object.entries(state.missions)
          .filter(([, progress]) => progress.attempts.length)
          .map(([id, progress]) => [id, structuredClone(progress.attempts)]),
      ),
      importProvenance: structuredClone(state.imports),
      assessmentNotice:
        "Imported history is self-reported. Game titles and scores are not professional credentials.",
    },
  };
}
export function previewImport(
  data: unknown,
  state: GameState,
  content: ContentPack,
): ImportPreview {
  const checked = validateTrainingExport(data);
  if (!checked.valid || !checked.data)
    return {
      valid: false,
      errors: checked.errors,
      summary: "Import rejected; current progress is unchanged.",
      warnings: [],
      matchedMissionIds: [],
      mismatchedMissionIds: [],
    };
  const value = checked.data;
  const fingerprints =
    value.extensions.caseFingerprints &&
    typeof value.extensions.caseFingerprints === "object" &&
    !Array.isArray(value.extensions.caseFingerprints)
      ? (value.extensions.caseFingerprints as Record<string, unknown>)
      : {};
  const matchedMissionIds: string[] = [];
  const mismatchedMissionIds: string[] = [];
  for (const imported of value.missions) {
    const local = content.missions.find(
      (mission) => mission.id === imported.id,
    );
    if (
      local &&
      fingerprints[imported.id] === local.fingerprint &&
      imported.version === local.version
    )
      matchedMissionIds.push(imported.id);
    else if (imported.status !== "not_started")
      mismatchedMissionIds.push(imported.id);
  }
  const warnings = [
    "This history is self-reported, not an independently verified credential. Portable history does not resume a 3D scene.",
    "Localhost, the hosted site, and other browsers/devices have separate saves. Transfer progress only through a file.",
  ];
  if (value.contentVersion !== content.version)
    warnings.push(
      `Content version ${value.contentVersion} differs from local ${content.version}.`,
    );
  if (value.learner.id !== state.learner.id)
    warnings.push(
      `File belongs to profile ${value.learner.displayName} (${value.learner.id}); this merges into ${state.learner.displayName}.`,
    );
  if (mismatchedMissionIds.length)
    warnings.push(
      `${mismatchedMissionIds.length} different or unknown cases retain imported history without a local pass.`,
    );
  return {
    valid: true,
    errors: [],
    summary: `${String(value.extensions.sourceEdition ?? "unknown edition")} · ${value.exportedAt} · ${value.contentVersion} · ${value.missions.filter((mission) => mission.status === "completed").length} completed entries; ${matchedMissionIds.length} matching case fingerprints. Existing newer progress is preserved.`,
    warnings,
    matchedMissionIds,
    mismatchedMissionIds,
  };
}
function stableHash(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
function mergeExtensions(
  existing: Record<string, unknown>,
  imported: Record<string, unknown>,
): Record<string, unknown> {
  const output = structuredClone(existing);
  for (const [key, value] of Object.entries(imported)) {
    if (
      key === "sourceEdition" ||
      key === "caseFingerprints" ||
      key === "importProvenance" ||
      key === "remediatedMissionIds"
    )
      continue;
    if (!(key in output)) output[key] = structuredClone(value);
    else if (
      output[key] &&
      value &&
      typeof output[key] === "object" &&
      typeof value === "object" &&
      !Array.isArray(output[key]) &&
      !Array.isArray(value)
    )
      output[key] = {
        ...structuredClone(value),
        ...(output[key] as Record<string, unknown>),
      };
  }
  return output;
}
export function mergeProgress(
  input: GameState,
  data: unknown,
  content: ContentPack,
): GameState {
  const preview = previewImport(data, input, content);
  if (!preview.valid) {
    const state = structuredClone(input);
    state.notifications = [
      ...state.notifications,
      preview.errors.join("; "),
    ].slice(-8);
    return state;
  }
  const value = validateTrainingExport(data).data!;
  const importId = `import-${stableHash(JSON.stringify(value))}`;
  if (input.imports.some((record) => record.id === importId)) return input;
  const state = structuredClone(input);
  state.extensions = mergeExtensions(state.extensions, value.extensions);
  const eligibleMissionIds = preview.matchedMissionIds.filter((id) =>
    value.missions.some(
      (mission) =>
        mission.id === id &&
        mission.status === "completed" &&
        mission.bestScore >= 70 &&
        mission.criticalFailures.length === 0,
    ),
  );
  for (const imported of value.missions.filter((item) =>
    preview.matchedMissionIds.includes(item.id),
  )) {
    const local = state.missions[imported.id];
    if (
      local?.status === "completed" ||
      local?.status === "in_progress" ||
      local?.status === "needs_remediation"
    ) {
      if (local)
        local.bestScore = Math.max(local.bestScore, imported.bestScore);
      continue;
    }
    if (!eligibleMissionIds.includes(imported.id)) continue;
    const progress: MissionProgress = {
      status: "completed",
      stepIndex: content.missions.find((mission) => mission.id === imported.id)!
        .steps.length,
      mode: "independent",
      attempts: [],
      bestScore: imported.bestScore,
      criticalFailures: [...imported.criticalFailures],
      evidenceIds: [],
      fingerprint: content.missions.find(
        (mission) => mission.id === imported.id,
      )!.fingerprint,
      imported: true,
    };
    state.missions[imported.id] = progress;
  }
  for (const imported of value.competencies) {
    // Unknown IDs remain portable too; no unknown curriculum is rendered as a local assessment.
    const local = state.competencies[imported.id] ?? {
      id: imported.id,
      level: "not_started" as const,
      bestScore: 0,
      attemptCount: 0,
      evidenceMissionIds: [],
    };
    const evidence = imported.evidenceMissionIds.filter((id) =>
      eligibleMissionIds.includes(id),
    );
    const eligibleLevel =
      imported.level === "demonstrated" && !evidence.length
        ? "practiced"
        : imported.level;
    local.level =
      LEVELS[
        Math.max(LEVELS.indexOf(local.level), LEVELS.indexOf(eligibleLevel))
      ];
    local.bestScore = Math.max(local.bestScore, imported.bestScore);
    local.attemptCount = Math.max(local.attemptCount, imported.attemptCount);
    local.evidenceMissionIds = unique([
      ...local.evidenceMissionIds,
      ...evidence,
    ]);
    state.competencies[imported.id] = local;
  }
  for (const artifact of value.artifacts)
    if (!state.artifacts.some((item) => item.id === artifact.id))
      state.artifacts.push(structuredClone(artifact));
  for (const review of value.reviewQueue)
    if (
      !state.reviewQueue.some(
        (item) =>
          item.competencyId === review.competencyId &&
          item.dueAt === review.dueAt &&
          item.reason === review.reason,
      )
    )
      state.reviewQueue.push(structuredClone(review));
  state.imports.push({
    id: importId,
    exportedAt: value.exportedAt,
    sourceEdition: String(value.extensions.sourceEdition ?? "unknown edition"),
    contentVersion: value.contentVersion,
    learner: { ...value.learner },
    missions: structuredClone(value.missions),
    extensions: structuredClone(value.extensions),
    matchedMissionIds: preview.matchedMissionIds,
    mismatchedMissionIds: preview.mismatchedMissionIds,
    status: "self_reported",
  });
  state.notifications = [
    ...state.notifications,
    `Imported self-reported progress. ${preview.mismatchedMissionIds.length} different cases preserved without a local pass.`,
  ].slice(-8);
  return state;
}
export function exportWorldSave(state: GameState): string {
  return JSON.stringify(
    {
      format: "taxwire-am-world-save",
      version: 1,
      exportedAt: new Date().toISOString(),
      state,
    },
    null,
    2,
  );
}
export function importWorldSave(data: unknown): {
  valid: boolean;
  errors: string[];
  state?: GameState;
} {
  const result = parse(data);
  if (result.error) return { valid: false, errors: [result.error] };
  const envelope = result.value as
    { format?: unknown; version?: unknown; state?: unknown } | undefined;
  if (
    !envelope ||
    envelope.format !== "taxwire-am-world-save" ||
    envelope.version !== 1
  )
    return {
      valid: false,
      errors: ["This is not a supported engine-specific world save."],
    };
  try {
    return {
      valid: true,
      errors: [],
      state: migrateState(envelope.state).state,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "Invalid world save."],
    };
  }
}
