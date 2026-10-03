import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../src/content/types";
import {
  createState,
  exportProgress,
  exportWorldSave,
  importWorldSave,
  mergeProgress,
  previewImport,
  transition,
  validateTrainingExport,
} from "../src/engine";
import { trainingSchema } from "../src/engine/trainingSchema";
import type { TrainingExport } from "../src/engine";

const content: ContentPack = {
  version: "interop-fixture-v1",
  missions: [
    {
      id: "M-T01",
      version: 1,
      title: "Synthetic lifecycle",
      competencyIds: ["T01"],
      accountId: "acct-harborworks",
      stage: "core",
      prerequisiteIds: [],
      briefing: "Synthetic briefing",
      facts: ["Fictional facts"],
      dueMinutes: 300,
      fingerprint: "world-case-one-v1",
      consequence: "Bounded outcome",
      output: "Lifecycle map",
      steps: [
        {
          id: "step-one",
          kind: "research",
          title: "Inspect evidence",
          instruction: "Use fictional records",
          duration: 20,
          location: "home",
          documentIds: [],
          sourceIds: [],
          choices: [
            {
              id: "verify",
              label: "Verify",
              feedback: "Evidence recorded",
              scores: {
                tax: 90,
                execution: 90,
                communication: 90,
                judgment: 90,
                organization: 90,
              },
            },
          ],
        },
      ],
    },
  ],
  competencies: [
    {
      id: "T01",
      title: "Lifecycle",
      explanation: "Bounded lifecycle",
      example: "Synthetic",
      glossary: {},
      misconception: "Email is not proof",
      guidedPractice: "Guided evidence",
      independentPractice: "Independent evidence",
      rubric: ["Evidence"],
      sourceIds: [],
      workProduct: "Lifecycle map",
    },
  ],
  accounts: [],
  contacts: [],
  sources: [],
  documents: [],
  bootcamp: [],
  policies: [],
};
function completed() {
  const state = transition(
    createState({
      id: "synthetic-world",
      displayName: "Synthetic World Learner",
    }),
    { type: "START_MISSION", missionId: "M-T01", mode: "independent" },
    content,
  );
  return transition(
    state,
    {
      type: "ACT",
      stepId: "step-one",
      choiceId: "verify",
      id: "synthetic-action",
    },
    content,
  );
}
function portable(): TrainingExport {
  return exportProgress(
    completed(),
    content,
    new Date("2026-10-03T12:00:00.000Z"),
  );
}
function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`../public/compatibility/${name}`, import.meta.url),
      "utf8",
    ),
  );
}

describe("versioned portable progress contract", () => {
  it("publishes the exact JSON Schema used by the runtime validator", () => {
    expect(fixture("training.schema.json")).toEqual(trainingSchema);
  });
  it("validates both synthetic shared-contract fixtures immediately", () => {
    for (const name of [
      "synthetic-empty-export.json",
      "synthetic-academy-export.json",
    ])
      expect(validateTrainingExport(fixture(name))).toMatchObject({
        valid: true,
        errors: [],
      });
  });
  it("exports the required exact contract and valid UTC timestamps", () => {
    const data = portable();
    expect(data).toMatchObject({
      format: "taxwire-am-training",
      schemaVersion: 1,
      contentVersion: content.version,
      exportedAt: "2026-10-03T12:00:00.000Z",
    });
    expect(data.extensions.sourceEdition).toBe("3d-world");
    expect(validateTrainingExport(data).valid).toBe(true);
  });
  it("moves a completed save by file export and import without automatic synchronization", () => {
    const data = JSON.stringify(portable());
    const target = createState({
      id: "synthetic-hosted",
      displayName: "Synthetic Hosted Profile",
    });
    const preview = previewImport(data, target, content);
    expect(preview.valid).toBe(true);
    expect(preview.summary).toContain("matching case fingerprints");
    expect(preview.warnings.join(" ")).toContain("separate saves");
    const transferred = mergeProgress(target, data, content);
    expect(transferred.missions["M-T01"].status).toBe("completed");
    expect(transferred.artifacts).toHaveLength(1);
    expect(transferred.location).toBe("home");
    expect(transferred.clockMinutes).toBe(0);
    expect(transferred.learner.id).toBe("synthetic-hosted");
    expect(transferred.imports[0].status).toBe("self_reported");
  });
  it("preserves history but never locally passes a different case fingerprint", () => {
    const data = fixture("synthetic-academy-export.json");
    const preview = previewImport(data, createState(), content);
    expect(preview.mismatchedMissionIds).toEqual(["M-T01"]);
    const imported = mergeProgress(createState(), data, content);
    expect(imported.missions["M-T01"]).toBeUndefined();
    expect(imported.competencies.T01.level).toBe("practiced");
    expect(imported.imports[0].missions[0].status).toBe("completed");
    expect(imported.extensions.futureField).toEqual({
      retainThis: "unknown extension fields must survive transfer",
    });
  });
  it("does not claim genuine Academy cross-app verification from a synthetic fixture", () => {
    const preview = previewImport(
      fixture("synthetic-academy-export.json"),
      createState(),
      content,
    );
    expect(preview.summary).toContain("synthetic-academy-fixture");
    expect(preview.warnings.join(" ")).toContain("self-reported");
  });
  it("does not promote a low-score imported completion to a local passing result", () => {
    const data = portable();
    data.missions[0].bestScore = 40;
    const imported = mergeProgress(createState(), data, content);
    expect(imported.missions["M-T01"]).toBeUndefined();
    expect(imported.competencies.T01.level).toBe("practiced");
    expect(imported.imports[0].missions[0].status).toBe("completed");
  });
  it("imports idempotently and preserves newer local progress", () => {
    const local = completed();
    const weaker = portable();
    weaker.missions[0].bestScore = 40;
    weaker.missions[0].status = "in_progress";
    weaker.competencies[0].level = "introduced";
    weaker.competencies[0].bestScore = 40;
    weaker.competencies[0].attemptCount = 0;
    const imported = mergeProgress(local, weaker, content);
    expect(imported.missions["M-T01"].status).toBe("completed");
    expect(imported.missions["M-T01"].bestScore).toBe(90);
    expect(imported.competencies.T01.level).toBe("demonstrated");
    expect(mergeProgress(imported, weaker, content)).toBe(imported);
  });
  it("retains unknown IDs and extension fields in subsequent portable exports", () => {
    const data = portable();
    data.missions.push({
      id: "M-FUTURE",
      version: 3,
      status: "completed",
      bestScore: 88,
      criticalFailures: [],
    });
    data.competencies.push({
      id: "FUTURE01",
      level: "introduced",
      bestScore: 20,
      attemptCount: 1,
      evidenceMissionIds: [],
    });
    data.extensions.futureField = { unknown: ["retain", "this"] };
    const imported = mergeProgress(createState(), data, content);
    const reexported = exportProgress(imported, content);
    expect(reexported.missions.some((item) => item.id === "M-FUTURE")).toBe(
      true,
    );
    expect(reexported.competencies.some((item) => item.id === "FUTURE01")).toBe(
      true,
    );
    expect(reexported.extensions.futureField).toEqual({
      unknown: ["retain", "this"],
    });
  });
  it("rejects unknown schema versions, invalid status fields, duplicated IDs, and nonnumeric scores", () => {
    const data = portable();
    expect(validateTrainingExport({ ...data, schemaVersion: 2 }).valid).toBe(
      false,
    );
    expect(
      validateTrainingExport({
        ...data,
        missions: [{ ...data.missions[0], status: "passed" }],
      }).valid,
    ).toBe(false);
    expect(
      validateTrainingExport({
        ...data,
        missions: [data.missions[0], data.missions[0]],
      }).valid,
    ).toBe(false);
    expect(
      validateTrainingExport({
        ...data,
        missions: [{ ...data.missions[0], bestScore: "100" }],
      }).valid,
    ).toBe(false);
  });
  it("rejects unsafe object keys, invalid JSON, and excessively large data", () => {
    expect(validateTrainingExport("{bad json").valid).toBe(false);
    const unsafe = JSON.stringify(portable()).replace(
      '"extensions":{',
      '"extensions":{"__proto__":{"polluted":true},',
    );
    expect(validateTrainingExport(unsafe).valid).toBe(false);
    expect(validateTrainingExport(" ".repeat(2 * 1024 * 1024 + 1)).valid).toBe(
      false,
    );
  });
  it("rejects dangerous dictionary identifiers even when supplied as string values", () => {
    const data = portable();
    data.competencies[0].id = "__proto__";
    expect(validateTrainingExport(data).valid).toBe(false);
  });
  it("rejects a completed result containing unremediated critical failures", () => {
    const data = portable();
    data.missions[0].criticalFailures = ["Fabricated evidence"];
    expect(validateTrainingExport(data).valid).toBe(false);
    data.extensions.remediatedMissionIds = ["M-T01"];
    expect(validateTrainingExport(data).valid).toBe(true);
  });
  it("leaves the current state unchanged on rejected progress imports", () => {
    const state = completed();
    const imported = mergeProgress(state, "{broken", content);
    expect(imported.missions).toEqual(state.missions);
    expect(imported.notifications.at(-1)).toContain("valid JSON");
  });
  it("separates world saves from portable history and validates both formats", () => {
    const state = completed();
    state.position = { x: 8, z: 4, yaw: 2 };
    const world = importWorldSave(exportWorldSave(state));
    expect(world.valid).toBe(true);
    expect(world.state?.position).toEqual(state.position);
    expect(importWorldSave(portable()).valid).toBe(false);
    expect(
      validateTrainingExport(JSON.parse(exportWorldSave(state))).valid,
    ).toBe(false);
    expect(
      importWorldSave(
        JSON.stringify({
          format: "taxwire-am-world-save",
          version: 1,
          state: { version: 99 },
        }),
      ).valid,
    ).toBe(false);
  });
});
