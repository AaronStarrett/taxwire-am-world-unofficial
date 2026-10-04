import Ajv from "ajv";
import schema from "./content.schema.json";
import type { ContentPack } from "./types";

const checkSchema = new Ajv({ allErrors: true, strict: false }).compile(schema);
const locations = new Set([
  "home",
  "hq",
  "research",
  "operations",
  "harborworks",
  "cedarline",
  "cafe",
  "academy",
]);

/** Structural authoring schema followed by cross-reference and reachability checks. */
export function validateContent(pack: ContentPack): string[] {
  const errors: string[] = [];
  if (!checkSchema(pack))
    return (checkSchema.errors ?? []).map(
      (e) => `${e.instancePath || "/"} ${e.message ?? "invalid content"}`,
    );
  const duplicate = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`Duplicate ${label} id: ${id}`);
      seen.add(id);
    }
    return seen;
  };
  const competencies = duplicate(
    "competency",
    pack.competencies.map((x) => x.id),
  );
  const accounts = duplicate(
    "account",
    pack.accounts.map((x) => x.id),
  );
  const contacts = duplicate(
    "contact",
    pack.contacts.map((x) => x.id),
  );
  const sources = duplicate(
    "source",
    pack.sources.map((x) => x.id),
  );
  const documents = duplicate(
    "document",
    pack.documents.map((x) => x.id),
  );
  const missions = duplicate(
    "mission",
    pack.missions.map((x) => x.id),
  );
  duplicate(
    "fingerprint",
    pack.missions.map((x) => x.fingerprint),
  );
  duplicate(
    "global step",
    pack.missions.flatMap((m) => m.steps.map((s) => s.id)),
  );
  const refs = (label: string, ids: string[], known: Set<string>) => {
    for (const id of ids)
      if (!known.has(id)) errors.push(`${label}: missing reference ${id}`);
  };
  for (const prefix of ["T", "A"])
    for (let n = 1; n <= 12; n++) {
      const id = `${prefix}${String(n).padStart(2, "0")}`;
      if (!competencies.has(id))
        errors.push(`Missing permanent competency ${id}`);
      if (!missions.has(`M-${id}`)) errors.push(`Missing core mission M-${id}`);
    }
  for (const id of [
    "acct-harborworks",
    "acct-cedarline",
    "acct-forgebridge",
    "acct-atlasfield",
    "acct-meridian",
    "acct-northlight",
  ])
    if (!accounts.has(id)) errors.push(`Missing compatible account ${id}`);
  for (const id of ["C01", "C02", "C03", "C04"])
    if (!missions.has(id)) errors.push(`Missing capstone ${id}`);
  if (pack.missions.filter((m) => m.stage === "advanced").length < 24)
    errors.push("At least 24 advanced missions required");
  for (const a of pack.accounts) {
    refs(`Account ${a.id} contacts`, a.contacts, contacts);
    if (a.contacts.length < 3)
      errors.push(`Account ${a.id} needs three stakeholders`);
    for (const id of a.contacts) {
      const c = pack.contacts.find((n) => n.id === id);
      if (c && c.accountId !== a.id)
        errors.push(`Account ${a.id} contact ${id} belongs to ${c.accountId}`);
    }
  }
  for (const c of pack.contacts) {
    if (c.accountId !== "internal")
      refs(`Contact ${c.id} account`, [c.accountId], accounts);
    if (!locations.has(c.location))
      errors.push(`Contact ${c.id}: unknown location ${c.location}`);
    if (c.availability[0] >= c.availability[1])
      errors.push(`Contact ${c.id}: invalid availability window`);
  }
  for (const c of pack.competencies) {
    refs(`Competency ${c.id} sources`, c.sourceIds, sources);
    if (!pack.missions.some((m) => m.competencyIds.includes(c.id)))
      errors.push(`Orphan competency ${c.id}`);
  }
  for (const d of pack.documents) {
    refs(`Document ${d.id} account`, [d.accountId], accounts);
    refs(`Document ${d.id} sources`, d.sourceIds, sources);
    if (
      !pack.missions.some((m) =>
        m.steps.some((s) => s.documentIds.includes(d.id)),
      )
    )
      errors.push(`Orphan document ${d.id}`);
    if (d.kind === "Fictional verification") {
      for (const field of [
        "Supported conclusion:",
        "Cannot conclude:",
        "Owned residual work:",
        "Checkpoint:",
      ])
        if (!d.body.includes(field))
          errors.push(`Document ${d.id}: returned evidence missing ${field}`);
      const owner = d.body.match(
        /Owned residual work:[^\n]*\((?:[^\n]*;\s*)?(npc-[\w-]+)\)/,
      )?.[1];
      if (!owner || !contacts.has(owner))
        errors.push(
          `Document ${d.id}: returned evidence needs a valid named residual owner`,
        );
      const findings = d.body
        .split("Supported conclusion:")[0]
        .split("\n")
        .filter((line) => /^[A-Z][A-Z0-9-]+: .{30,}/.test(line));
      if (findings.length < 2)
        errors.push(
          `Document ${d.id}: returned evidence needs two identified findings`,
        );
    }
  }
  for (const m of pack.missions) {
    refs(`Mission ${m.id} account`, [m.accountId], accounts);
    refs(`Mission ${m.id} competencies`, m.competencyIds, competencies);
    refs(`Mission ${m.id} prerequisites`, m.prerequisiteIds, missions);
    const previousSteps = new Set<string>();
    for (const s of m.steps) {
      if (!locations.has(s.location))
        errors.push(`Step ${s.id}: unknown location ${s.location}`);
      refs(`Step ${s.id} documents`, s.documentIds, documents);
      refs(`Step ${s.id} sources`, s.sourceIds, sources);
      if (s.npcId) refs(`Step ${s.id} NPC`, [s.npcId], contacts);
      refs(
        `Step ${s.id} evidence must precede action`,
        s.requiresEvidence ?? [],
        previousSteps,
      );
      duplicate(
        `choice in ${s.id}`,
        s.choices.map((c) => c.id),
      );
      if (
        !s.choices.some(
          (c) =>
            !c.criticalFailure && Object.values(c.scores).every((v) => v >= 60),
        )
      )
        errors.push(`Step ${s.id}: orphan passing branch`);
      if (
        s.kind === "calculation" &&
        (s.expectedValue === undefined ||
          !s.workedExample ||
          !s.calculationLabel)
      )
        errors.push(`Step ${s.id}: missing calculation answer or assumptions`);
      if (s.kind === "communicate" && (!s.draftPrompt || !s.modelAnswer))
        errors.push(`Step ${s.id}: missing draft rubric/model comparison`);
      previousSteps.add(s.id);
    }
  }
  const byId = new Map(pack.missions.map((m) => [m.id, m]));
  const visited = new Set<string>(),
    stack = new Set<string>();
  const visit = (id: string) => {
    if (stack.has(id)) {
      errors.push(`Prerequisite cycle at ${id}`);
      return;
    }
    if (visited.has(id)) return;
    stack.add(id);
    for (const pre of byId.get(id)?.prerequisiteIds ?? []) visit(pre);
    stack.delete(id);
    visited.add(id);
  };
  for (const id of missions) visit(id);
  duplicate(
    "bootcamp session",
    pack.bootcamp.map((s) => String(s.session)),
  );
  for (const session of pack.bootcamp)
    refs(`Bootcamp session ${session.session}`, session.missionIds, missions);
  return errors;
}
