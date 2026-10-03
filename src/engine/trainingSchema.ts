const id = { type: "string", minLength: 1, maxLength: 200 };
const text = { type: "string", maxLength: 16000 };
const utc = {
  type: "string",
  maxLength: 40,
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?Z$",
};
const score = { type: "number", minimum: 0, maximum: 100 };
const stringList = {
  type: "array",
  maxItems: 1000,
  uniqueItems: true,
  items: id,
};
export const trainingSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://example.invalid/taxwire-am-training/schema-v1",
  title: "Taxwire AM portable training history (self-reported)",
  type: "object",
  additionalProperties: false,
  required: [
    "format",
    "schemaVersion",
    "contentVersion",
    "exportedAt",
    "learner",
    "competencies",
    "missions",
    "artifacts",
    "reviewQueue",
    "extensions",
  ],
  properties: {
    format: { const: "taxwire-am-training" },
    schemaVersion: { const: 1 },
    contentVersion: id,
    exportedAt: utc,
    learner: {
      type: "object",
      additionalProperties: false,
      required: ["id", "displayName"],
      properties: {
        id,
        displayName: { type: "string", minLength: 1, maxLength: 100 },
      },
    },
    competencies: {
      type: "array",
      maxItems: 1000,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "level",
          "bestScore",
          "attemptCount",
          "evidenceMissionIds",
        ],
        properties: {
          id,
          level: {
            enum: ["not_started", "introduced", "practiced", "demonstrated"],
          },
          bestScore: score,
          attemptCount: { type: "integer", minimum: 0, maximum: 100000 },
          evidenceMissionIds: stringList,
        },
      },
    },
    missions: {
      type: "array",
      maxItems: 1000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "version", "status", "bestScore", "criticalFailures"],
        properties: {
          id,
          version: { type: "integer", minimum: 1, maximum: 100000 },
          status: { enum: ["not_started", "in_progress", "completed"] },
          bestScore: score,
          criticalFailures: stringList,
        },
      },
    },
    artifacts: {
      type: "array",
      maxItems: 2000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "missionId", "createdAt", "body"],
        properties: { id, type: id, missionId: id, createdAt: utc, body: text },
      },
    },
    reviewQueue: {
      type: "array",
      maxItems: 1000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["competencyId", "dueAt", "reason"],
        properties: { competencyId: id, dueAt: utc, reason: text },
      },
    },
    extensions: { type: "object", maxProperties: 200 },
  },
} as const;
