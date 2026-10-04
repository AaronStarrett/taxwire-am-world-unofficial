import type { Choice, Dimension, Document, Mission, Step } from "./types";
import {
  getVerificationRecord,
  renderVerificationRecord,
} from "./verifications";

export const documents: Document[] = [];
const dimensions: Dimension[] = [
  "tax",
  "execution",
  "communication",
  "judgment",
  "organization",
];
export function score(value: number): Record<Dimension, number> {
  return Object.fromEntries(dimensions.map((d) => [d, value])) as Record<
    Dimension,
    number
  >;
}
export function option(
  id: string,
  label: string,
  feedback: string,
  value = 92,
  extra: Partial<Choice> = {},
): Choice {
  return { id, label, feedback, scores: score(value), ...extra };
}
export function doc(
  id: string,
  title: string,
  accountId: string,
  body: string,
  sourceIds: string[] = ["training-policy"],
  kind = "Fictional case evidence",
): string {
  documents.push({ id, title, accountId, kind, body, sourceIds });
  return id;
}
export function step(
  id: string,
  kind: Step["kind"],
  title: string,
  instruction: string,
  choices: Choice[],
  extra: Partial<Step> = {},
): Step {
  const shift =
    [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % choices.length;
  return {
    id,
    kind,
    title,
    instruction,
    duration: 15,
    location: "hq",
    documentIds: [],
    sourceIds: ["training-policy"],
    choices: [...choices.slice(shift), ...choices.slice(0, shift)],
    ...extra,
  };
}
export interface CaseSeed {
  id: string;
  competencyIds: string[];
  account: string;
  title: string;
  briefing: string;
  facts: string[];
  packet: string;
  question: string;
  answer: string;
  decision: string;
  alternative: string;
  failure: string;
  why: string;
  request: string;
  output: string;
  sources: string[];
  prerequisiteIds?: string[];
  calculation?: { label: string; expected: number; worked: string };
  kind?: Step["kind"];
  stage?: Mission["stage"];
  failureCritical?: string;
}
export function createCase(c: CaseSeed): Mission {
  const aid = `acct-${c.account}`,
    location =
      c.account === "harborworks"
        ? "harborworks"
        : c.account === "cedarline"
          ? "cedarline"
          : "hq";
  const taxCase = c.sources.some((s) =>
    [
      "sst",
      "ny-software",
      "tx-services",
      "eu-oss",
      "uk-services",
      "ca-gst",
    ].includes(s),
  );
  const coordinator = taxCase
    ? "npc-tax"
    : c.competencyIds.some((id) => ["A10", "A11"].includes(id))
      ? "npc-commercial"
      : c.competencyIds.some((id) => ["A03", "A04", "A05", "A09"].includes(id))
        ? "npc-mentor"
        : "npc-ops";
  const coordinatorLocation =
    coordinator === "npc-tax"
      ? "research"
      : coordinator === "npc-commercial"
        ? "hq"
        : coordinator === "npc-mentor"
          ? "academy"
          : "operations";
  const evidence = doc(
    `${c.id}-packet`,
    `${c.title}: evidence packet`,
    aid,
    `${c.packet}\n\nCase facts:\n${c.facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nAll records, amounts, jurisdictions named Alpha/Beta, dates and approvals in this packet are synthetic. No real filing, payment or email occurs.`,
    c.sources,
  );
  const follow = doc(
    `${c.id}-verification`,
    `${c.title}: verification record`,
    aid,
    renderVerificationRecord(c.id),
    c.sources,
    "Fictional verification",
  );
  const sid = (n: number) => `${c.id}-s${n}`;
  const comm = `${c.title} — update: We verified ${c.facts[0].replace(/\.$/, "")}. ${c.why} The next action is ${c.request.replace(/\.$/, "")}. I own the customer update; the named reviewer owns any specialist conclusion. I will check back by the agreed next business session and record acceptance before closing. This is a fictional training update, not a legal determination.`;
  const steps: Step[] = [
    step(
      sid(1),
      "research",
      "Prepare the business and evidence brief",
      `Read the packet and lesson ${c.competencyIds.join(", ")}. Mark confirmed facts, questions and assumptions before acting. Study time is paused.`,
      [
        option(
          "brief",
          `Record the entity, period, ${c.facts[0].replace(/\.$/, "").toLowerCase()}, and the unresolved question.`,
          `Good preparation preserves provenance and makes the next conversation specific.`,
          94,
        ),
        option(
          "question",
          "Draft a short verification question and retain the packet references.",
          "A focused question is defensible. Complete the business map as new facts arrive.",
          84,
        ),
        option(
          "assume",
          "Treat the headline as complete evidence and decide immediately.",
          "A headline does not settle scope, facts or authority. Reopen the evidence packet.",
          28,
          { riskDelta: 5 },
        ),
      ],
      {
        location: "home",
        duration: 20,
        documentIds: [evidence],
        sourceIds: c.sources,
      },
    ),
    step(
      sid(2),
      "meeting",
      "Discover the missing fact",
      c.question,
      [
        option(
          "clarify",
          c.answer,
          "This question and summary stay within the practitioner’s knowledge. Tax or commercial authority remains separate.",
          95,
          { trustDelta: 3 },
        ),
        option(
          "listen",
          "Invite the contact to explain the operational impact, then confirm the packet facts.",
          "Listening gives a defensible starting point; follow with the precise missing-fact question.",
          83,
          { trustDelta: 2 },
        ),
        option(
          "pressure",
          "Ask the practitioner to approve every tax conclusion and commercial term.",
          "The contact can explain records but lacks that authority. Repair the decision path.",
          25,
          { trustDelta: -4 },
        ),
      ],
      {
        npcId: `npc-${c.account}-1`,
        location,
        duration: 20,
        documentIds: [evidence],
        requiresEvidence: [sid(1)],
      },
    ),
    step(
      sid(3),
      c.calculation ? "calculation" : (c.kind ?? "investigate"),
      c.calculation
        ? "Reconcile the exercise in integer minor units"
        : "Analyze the records and choose a bounded action",
      c.calculation?.label ?? `Use the facts in the packet. ${c.decision}`,
      [
        option("evidence", c.decision, c.why, 96, { riskDelta: -3 }),
        option(
          "bounded",
          c.alternative,
          "This is a defensible provisional route if its limits, ownership and next verification are documented.",
          85,
        ),
        option(
          "shortcut",
          c.failure,
          `This misses the case’s material distinction. ${c.why}`,
          c.failureCritical ? 0 : 20,
          {
            riskDelta: 7,
            ...(c.failureCritical
              ? { criticalFailure: c.failureCritical }
              : {}),
          },
        ),
      ],
      {
        location: "operations",
        duration: 25,
        documentIds: [evidence],
        sourceIds: c.sources,
        requiresEvidence: [sid(1), sid(2)],
        ...(c.calculation
          ? {
              expectedValue: c.calculation.expected,
              tolerance: 0,
              calculationLabel: c.calculation.label,
              workedExample: c.calculation.worked,
            }
          : {}),
      },
    ),
    step(
      sid(4),
      "coordinate",
      "Reserve the right owner and dependency",
      c.request,
      [
        option(
          "owned",
          c.request,
          "The request includes a bounded question, evidence, authority and an owned follow-up. It uses expert capacity proportionately.",
          94,
          {
            createsTask: `Verify ${c.output.toLowerCase()} with the named owner before case closure.`,
          },
        ),
        option(
          "reserve",
          "Reserve the next suitable specialist slot and send a scoped interim update.",
          "A planned slot is acceptable while the response deadline is protected and the customer knows what remains open.",
          86,
          {
            createsTask: `Obtain reviewer acceptance for ${c.output.toLowerCase()}.`,
          },
        ),
        option(
          "promise",
          "Promise approval, a refund or a legal resolution without authority.",
          "You cannot create financial or tax authorization. Correct the promise and seek a reviewed plan.",
          0,
          {
            criticalFailure: "Unauthorized financial or tax commitment",
            trustDelta: -8,
          },
        ),
      ],
      {
        npcId: coordinator,
        location: coordinatorLocation,
        duration: 15,
        documentIds: [evidence],
        requiresEvidence: [sid(3)],
      },
    ),
    step(
      sid(5),
      "communicate",
      "Send a clear customer update",
      `Draft an update containing verified fact, business impact, uncertainty, named owner and next check-in. Transparent self-review: mark those five elements yourself and compare with the model; authored choices grade structured actions, not the quality of your free text.`,
      [
        option(
          "update",
          "Send the reviewed facts, remaining question, owner and check-in.",
          "This closes the communication loop while preserving uncertainty. It does not itself close the operational issue.",
          95,
          { trustDelta: 4 },
        ),
        option(
          "call",
          "Offer a short call plus a written action summary with the same facts.",
          "A call is defensible if its outcome is documented and the agreed next check-in remains visible.",
          89,
          { trustDelta: 3 },
        ),
        option(
          "done",
          "Tell the customer everything is complete while acceptance is still pending.",
          "Completion evidence cannot be fabricated; retract the claim and complete remediation.",
          0,
          {
            criticalFailure: "Fabricated completion evidence",
            trustDelta: -10,
          },
        ),
      ],
      {
        duration: 10,
        draftPrompt: `Draft ${c.output}. Self-review five checks: verified facts; impact; uncertainty; authorized owner; next time. No automatic expert text evaluator is used.`,
        modelAnswer: comm,
        requiresEvidence: [sid(4)],
      },
    ),
    step(
      sid(6),
      "followup",
      "Verify the promised follow-up",
      `Inspect the later-stage verification record. ${c.why} Preserve any residual owner; an update alone is insufficient.`,
      [
        option(
          "verify",
          `Compare the returned record with the original packet and retain ${c.output.toLowerCase()}.`,
          "You verified the response rather than assuming a sent request succeeded. Residual questions stay explicitly owned.",
          96,
          { riskDelta: -4 },
        ),
        option(
          "clarify",
          "Request one precise clarification, record a next time and retain the existing evidence.",
          "A bounded clarification is acceptable; uncertainty must stay visible and assigned.",
          84,
        ),
        option(
          "discard",
          "Remove contradictory records and mark the task complete.",
          "Removing inconvenient evidence breaks the audit trail. Preserve records and explain corrections.",
          0,
          { criticalFailure: "Fabricated completion evidence" },
        ),
      ],
      {
        location: "operations",
        duration: 20,
        documentIds: [follow],
        sourceIds: c.sources,
        requiresEvidence: [sid(3), sid(5)],
      },
    ),
    step(
      sid(7),
      "review",
      "Close the day with evidence and debrief",
      `Compare your work with lesson rubrics ${c.competencyIds.join(", ")}. Separate verified resolution from specialist-owned residual questions. Preserve the original attempt and choose a different case for retry.`,
      [
        option(
          "close",
          `Retain the evidence trail, customer update and ${c.output.toLowerCase()}; schedule the preventive review.`,
          "This is evidence-backed closure of the bounded training case. Any actual tax conclusion still requires qualified professional review.",
          96,
          { trustDelta: 2 },
        ),
        option(
          "carry",
          "Close the verified operational stage and name the residual reviewer and next checkpoint.",
          "A partial closure is honest when unresolved obligations remain visible with an owner and due time.",
          88,
        ),
        option(
          "abandon",
          "Leave urgent residual work unassigned because the customer sounded satisfied.",
          "Trust and compliance are separate. An urgent obligation needs ownership before closure.",
          0,
          { criticalFailure: "Knowingly abandoned urgent obligation" },
        ),
      ],
      {
        location: "academy",
        duration: 10,
        documentIds: [follow],
        requiresEvidence: [sid(1), sid(3), sid(5), sid(6)],
      },
    ),
  ];
  return {
    id: c.id,
    version: getVerificationRecord(c.id)?.altersCaseFacts ? 2 : 1,
    title: c.title,
    competencyIds: c.competencyIds,
    accountId: aid,
    stage: c.stage ?? "core",
    prerequisiteIds: c.prerequisiteIds ?? [],
    briefing: c.briefing,
    facts: c.facts,
    dueMinutes: c.stage === "capstone" ? 960 : 360,
    fingerprint: `twaw-v1:${c.id}:${c.account}:${c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${getVerificationRecord(c.id)?.altersCaseFacts ? ":response-v2" : ""}`,
    steps,
    consequence: c.why,
    output: c.output,
  };
}
