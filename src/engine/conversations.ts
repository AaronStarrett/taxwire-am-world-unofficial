import type { Account, Contact, ContentPack } from "../content/types";
import type { GameState } from "./types";
import {
  appointmentClock,
  minuteOfDay,
  overlaps,
  simulationTimestamp,
  WORKDAY_MINUTES,
} from "./time";

/** Authored, fictional relationship practice. No remote model, real meeting or approval. */
export type ConversationTopic =
  "discovery" | "coffee" | "repair" | "scope" | "handoff";
export type ConversationOutcome = "good" | "mixed" | "poor" | "recovery";
export type ConversationAction =
  | {
      type: "START_CONVERSATION";
      id: string;
      npcId: string;
      topic?: ConversationTopic;
    }
  | {
      type: "TALK";
      id: string;
      npcId: string;
      nodeId: string;
      choiceId: string;
    }
  | { type: "CLOSE_CONVERSATION"; npcId: string };
export interface ConversationChoice {
  id: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}
export interface ConversationNode {
  id: string;
  title: string;
  text: string;
  choices: ConversationChoice[];
  location?: string;
}
export interface ConversationHistory {
  nodeId: string;
  choiceId: string;
  label: string;
  clockMinutes: number;
}
export interface ConversationDebrief {
  id: string;
  npcId: string;
  topic: ConversationTopic;
  outcome: ConversationOutcome;
  summary: string;
  whatWorked: string[];
  whatToImprove: string[];
  nextStep: string;
  trustDelta: number;
  accountTrustDelta: number;
  riskDelta: number;
  replay: boolean;
  route: string[];
  completedAt: number;
}
export interface ConversationSession {
  id: string;
  npcId: string;
  topic: ConversationTopic;
  status: "active" | "completed";
  nodeId: string;
  startedAt: number;
  paused: boolean;
  history: ConversationHistory[];
  flags: string[];
  appointment?: {
    id: string;
    day: number;
    minute: number;
    duration: number;
    location: "cafe";
  };
  debrief?: ConversationDebrief;
}
export interface RelationshipConversations {
  version: 1;
  sessions: Record<string, ConversationSession>;
  history: ConversationDebrief[];
  awarded: string[];
}
export interface ConversationView {
  contact: Contact;
  account?: Account;
  session?: ConversationSession;
  node?: ConversationNode;
  debrief?: ConversationDebrief;
  relationship: {
    trust: number;
    interactions: number;
    commitments: string[];
    accountTrust: number;
    accountRisk: number;
  };
  available: boolean;
  availabilityMessage: string;
  topics: ConversationTopic[];
}
export interface ConversationResult {
  accepted: boolean;
  minutes: number;
  message: string;
}
const TOPICS: ConversationTopic[] = [
  "discovery",
  "coffee",
  "repair",
  "scope",
  "handoff",
];
const OUTCOMES: ConversationOutcome[] = ["good", "mixed", "poor", "recovery"];
const blank = (): RelationshipConversations => ({
  version: 1,
  sessions: {},
  history: [],
  awarded: [],
});
const bounded = (n: number) => Math.max(0, Math.min(100, n));
const unique = (values: string[]) => [...new Set(values)];
const clockLabel = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown, max = 10000): value is string =>
  typeof value === "string" && value.length <= max;
const number = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const time = (value: unknown): value is number =>
  number(value) && Number.isInteger(value) && value >= 0;
const strings = (value: unknown, max = 500): value is string[] =>
  Array.isArray(value) && value.length <= max && value.every((v) => string(v));
const topic = (value: unknown): value is ConversationTopic =>
  typeof value === "string" && TOPICS.includes(value as ConversationTopic);
function validDebrief(value: unknown): value is ConversationDebrief {
  if (!record(value)) return false;
  return (
    string(value.id, 200) &&
    string(value.npcId, 200) &&
    topic(value.topic) &&
    OUTCOMES.includes(value.outcome as ConversationOutcome) &&
    string(value.summary) &&
    strings(value.whatWorked) &&
    strings(value.whatToImprove) &&
    string(value.nextStep) &&
    [value.trustDelta, value.accountTrustDelta, value.riskDelta].every(
      (v) => number(v) && Math.abs(v) <= 100,
    ) &&
    typeof value.replay === "boolean" &&
    strings(value.route, 100) &&
    time(value.completedAt)
  );
}
export function validateRelationshipConversations(
  value: unknown,
): value is RelationshipConversations {
  if (
    !record(value) ||
    value.version !== 1 ||
    !record(value.sessions) ||
    Object.keys(value.sessions).length > 200 ||
    !Array.isArray(value.history) ||
    value.history.length > 200 ||
    !value.history.every(validDebrief) ||
    !strings(value.awarded, 1000)
  )
    return false;
  return Object.entries(value.sessions).every(([key, s]) => {
    if (
      !record(s) ||
      !string(s.id, 200) ||
      s.npcId !== key ||
      !string(s.npcId, 200) ||
      !topic(s.topic) ||
      !["active", "completed"].includes(s.status as string) ||
      !string(s.nodeId, 100) ||
      !NODE_IDS.includes(s.nodeId) ||
      !time(s.startedAt) ||
      typeof s.paused !== "boolean" ||
      !strings(s.flags, 100) ||
      !Array.isArray(s.history) ||
      s.history.length > 100 ||
      !s.history.every(
        (h) =>
          record(h) &&
          string(h.nodeId, 100) &&
          NODE_IDS.includes(h.nodeId) &&
          string(h.choiceId, 100) &&
          string(h.label) &&
          time(h.clockMinutes),
      )
    )
      return false;
    if (
      s.debrief !== undefined &&
      (!validDebrief(s.debrief) ||
        s.debrief.npcId !== key ||
        s.debrief.topic !== s.topic)
    )
      return false;
    if (s.status === "completed" && !s.debrief) return false;
    if (s.appointment !== undefined) {
      const a = s.appointment;
      if (
        !record(a) ||
        !string(a.id, 200) ||
        !time(a.day) ||
        a.day < 1 ||
        !time(a.minute) ||
        a.minute < 540 ||
        a.minute > 995 ||
        a.duration !== 25 ||
        a.location !== "cafe"
      )
        return false;
    }
    return true;
  });
}
export function readRelationshipConversations(
  state: Pick<GameState, "extensions">,
): RelationshipConversations {
  const value = state.extensions.relationshipConversations;
  return validateRelationshipConversations(value) ? value : blank();
}

type Role =
  | "sponsor"
  | "practitioner"
  | "systems"
  | "mentor"
  | "tax"
  | "operations"
  | "commercial";
interface RoleScript {
  question: string;
  evidence: string;
  ownership: string;
  uncertainty: string;
  coffee: string;
}
const ROLE_SCRIPTS: Record<Role, RoleScript> = {
  sponsor: {
    question:
      "Which decision needs a short brief, and what would count as a credible business outcome?",
    evidence:
      "a one-page decision brief with cost ranges, evidence dates and the decision owner",
    ownership:
      "The sponsor chooses between scoped business options; the specialist reviews tax positions separately.",
    uncertainty:
      "A budget preference does not establish the tax treatment or authorize an unscoped offer.",
    coffee:
      "I prefer a written brief first. A relaxed conversation is useful once we have an agreed purpose, but it is not a decision meeting.",
  },
  practitioner: {
    question:
      "Which entity and period are hardest to reconcile, and which record would let us test the gap?",
    evidence:
      "a numbered request naming the entity, period, source total and secure record identifier",
    ownership:
      "The practitioner reconciles records; retain a separate authorized approver for commercial terms and payments.",
    uncertainty:
      "An extract can show a difference; it cannot establish that every source record is complete.",
    coffee:
      "A short coffee is welcome if we keep records off the table and send any numbered evidence request through the work channel.",
  },
  systems: {
    question:
      "What changed, what should have happened, and can we reproduce the difference without touching production?",
    evidence:
      "a reproducible test example, expected output, affected release and rollback owner",
    ownership:
      "The systems owner can test an approved change. Acceptance and any tax conclusion need their own owners.",
    uncertainty:
      "A successful test is not production approval and does not determine tax law.",
    coffee:
      "I can talk through how we work after we agree a concrete test. Coffee cannot become an undocumented change request.",
  },
  mentor: {
    question:
      "What is your proposed plan, and which assumption would you most like me to challenge?",
    evidence:
      "a proposed plan with one specific uncertainty and the communication rubric",
    ownership:
      "Coaching can improve your plan; the learner still owns checking the facts and routing approvals.",
    uncertainty:
      "My coaching is not a legal opinion or permission to make a commercial promise.",
    coffee:
      "A quiet café reflection works. Bring one moment you found difficult; we can discuss the approach without exposing customer records.",
  },
  tax: {
    question:
      "Which entity, period and precise question need review, and what evidence is still unconfirmed?",
    evidence:
      "the entity, period, document references, researched facts and a precise bounded question",
    ownership:
      "The specialist reviews a complete fictional fact pattern; the AM owns customer updates and missing evidence.",
    uncertainty:
      "No hallway or café answer replaces documented source review or establishes a real tax conclusion.",
    coffee:
      "I reserve review capacity carefully. I can consider a professional check-in after a complete brief; confidential case facts stay in the research workspace.",
  },
  operations: {
    question:
      "Which period, control total and deadline are affected, and how can we reproduce the defect?",
    evidence:
      "the affected period, before-and-after control totals, defect reproduction and deadline",
    ownership:
      "Operations can reserve fictional capacity and test a correction; customer approval and final verification remain explicit.",
    uncertainty:
      "A queue reservation is not a filing receipt, payment receipt or customer approval.",
    coffee:
      "A brief break can work if urgent queue commitments have owners. Let us keep production records in the operations workspace.",
  },
  commercial: {
    question:
      "What need are we solving, which options have evidence, and who can make the customer's decision?",
    evidence:
      "a need statement, scoped options, tradeoffs, decision path and confidence range",
    ownership:
      "The commercial lead approves game proposals; the customer must accept and tax obligations remain separate.",
    uncertainty:
      "A relationship conversation is not an approved price, signed renewal or guarantee of savings.",
    coffee:
      "A short relationship check-in is fine with a clear purpose. Any offer or pricing commitment still comes back through the approval process.",
  },
};
function roleOf(contact: Contact): Role {
  if (contact.id === "npc-mentor") return "mentor";
  if (contact.id === "npc-tax") return "tax";
  if (contact.id === "npc-ops") return "operations";
  if (contact.id === "npc-commercial") return "commercial";
  if (contact.role.includes("Finance")) return "sponsor";
  if (contact.role.includes("Accounting")) return "practitioner";
  return "systems";
}
/** Account incidents are different fact patterns, not claims about real companies. */
const ACCOUNT_SCENES: Record<
  string,
  { signal: string; tension: string; next: string }
> = {
  "acct-harborworks": {
    signal: "an analytics tier appeared in the fictional product list",
    tension:
      "separating workflow seats, the add-on and implementation before promising a predictable close",
    next: "Confirm the analytics launch date and compare a sample invoice with the billing ledger.",
  },
  "acct-cedarline": {
    signal:
      "direct-store returns and MarketHub settlements arrive through different feeds",
    tension: "keeping marketplace and direct-channel responsibilities visible",
    next: "Request matched order, refund and settlement identifiers for one entity and period.",
  },
  "acct-forgebridge": {
    signal:
      "machine components, resold supplies and maintenance use different supporting records",
    tension:
      "checking certificate coverage without assuming every wholesale sale is exempt",
    next: "Match a certificate to the correct buyer, entity, period and transaction sample.",
  },
  "acct-atlasfield": {
    signal:
      "distributed teams can change work locations while contracts stay unchanged",
    tension:
      "distinguishing confirmed employee-location changes from assumptions about contract scope",
    next: "Confirm a dated employee-location change with the responsible owner before specialist review.",
  },
  "acct-meridian": {
    signal:
      "digital courses, live instruction and team subscriptions serve different customer groups",
    tension:
      "separating customer status, supply and establishment facts before an international launch",
    next: "Collect one sample supply and dated customer-status evidence for the proposed market.",
  },
  "acct-northlight": {
    signal: "three entities use separate ERPs during acquisition planning",
    tension:
      "avoiding a group-level answer that hides the entity actually making a supply",
    next: "Name the legal entity and source ERP for each sample record in the acquisition review.",
  },
  "acct-lumenleaf": {
    signal:
      "hosted dashboards and analyst reports can appear together on a contract",
    tension:
      "clarifying what the customer receives before changing a bundled price or classification",
    next: "Compare the contract deliverables and invoice lines, then identify the approval owner.",
  },
  "acct-pinecrest": {
    signal: "online, pop-up and marketplace channels move stock differently",
    tension:
      "confirming event locations and inventory movement without treating a plan as an actual event",
    next: "Verify one dated pop-up location and stock-movement record with the operations owner.",
  },
  "acct-riverton": {
    signal:
      "parts, freight and warranty replacements have different dealer records",
    tension:
      "retaining return and dealer-documentation evidence while reconciling adjustments",
    next: "Tie one warranty replacement to its original transaction and dealer record.",
  },
  "acct-solstice": {
    signal:
      "consumer memberships and business licenses use different customer evidence",
    tension:
      "keeping launch gates and invoice evidence explicit across proposed markets",
    next: "Check a sample invoice and dated customer-status record before proposing a launch gate.",
  },
  "acct-bayshore": {
    signal:
      "robotic units, control software and support can be sold through resellers",
    tension:
      "governing bundle changes without promising the EU pilot is approved",
    next: "Separate equipment, software and service obligations in one pilot contract for review.",
  },
  "acct-aster": {
    signal:
      "in-person tickets, virtual access and sponsorship can relate to one event",
    tension:
      "separating attendance location from billing address and assigning responsibility",
    next: "Confirm the event format, actual attendance location and owner of the supporting record.",
  },
};
function context(state: GameState, content: ContentPack, contact: Contact) {
  const account = content.accounts.find((a) => a.id === contact.accountId);
  const memory = state.npcMemory[contact.id] ?? {
    trust: 50,
    interactions: 0,
    commitments: [],
  };
  const health = state.accountHealth[contact.accountId] ?? {
    trust: 50,
    risk: 30,
    evidence: [],
  };
  const script = ROLE_SCRIPTS[roleOf(contact)];
  const scene = ACCOUNT_SCENES[contact.accountId] ?? {
    signal: contact.goals.toLowerCase(),
    tension:
      "keeping coaching, specialist review, operations and commercial approval distinct",
    next: `Prepare ${script.evidence} and retain a named follow-up owner.`,
  };
  const open = state.tasks.filter(
    (t) => memory.commitments.includes(t.id) && t.status === "open",
  );
  const overdue = open.filter((t) => t.dueMinute < state.clockMinutes);
  return { account, memory, health, script, scene, open, overdue };
}
function priorHistory(
  state: GameState,
  content: ContentPack,
  contact: Contact,
): string {
  const prior = readRelationshipConversations(state)
    .history.filter((item) => item.npcId === contact.id)
    .at(-1);
  const attempts = content.missions
    .filter(
      (mission) =>
        mission.accountId === contact.accountId ||
        (contact.accountId === "internal" &&
          mission.steps.some((step) => step.npcId === contact.id)),
    )
    .flatMap((mission) =>
      (state.missions[mission.id]?.attempts ?? []).map((attempt) => ({
        mission,
        attempt,
        at:
          attempt.endedAt ??
          attempt.trace.at(-1)?.clockMinutes ??
          attempt.startedAt,
      })),
    )
    .sort((a, b) => b.at - a.at);
  const recent = attempts[0];
  return [
    prior
      ? `Our last recorded ${prior.topic} conversation had a ${prior.outcome} outcome: ${prior.summary}`
      : "",
    recent
      ? `Most recent related case: ${recent.mission.title}. ${recent.attempt.endedAt === undefined ? "The attempt is still open." : recent.attempt.passed ? "The recorded attempt passed." : "The recorded attempt needs review."}${recent.attempt.trace.at(-1)?.feedback ? ` Last recorded feedback: ${recent.attempt.trace.at(-1)!.feedback}` : " No case decision has been recorded yet."}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
function availability(state: GameState, contact: Contact): boolean {
  const minute = minuteOfDay(state.clockMinutes);
  return (
    minute >= contact.availability[0] && minute + 3 <= contact.availability[1]
  );
}
function coffeeResponse(
  state: GameState,
  content: ContentPack,
  contact: Contact,
): { accepted: boolean; reason: string } {
  const c = context(state, content, contact);
  if (c.overdue.length)
    return {
      accepted: false,
      reason: `Before coffee, please address our overdue commitment: ${c.overdue[0].title}. A friendly invitation does not replace follow-through.`,
    };
  if (c.memory.trust < 40)
    return {
      accepted: false,
      reason:
        "I would rather repair the work commitment first. Please respect that boundary; we can continue through the usual professional channel.",
    };
  const role = roleOf(contact);
  if (
    (role === "sponsor" && c.memory.interactions === 0) ||
    (role === "systems" && c.memory.trust < 54) ||
    (role === "tax" && c.memory.trust < 58)
  )
    return { accepted: false, reason: c.script.coffee };
  return {
    accepted: true,
    reason: `${c.script.coffee} Let us agree a 25-minute slot at the café, with no obligation to discuss private records or make approvals.`,
  };
}
function nextCoffeeSlot(
  state: GameState,
  contact: Contact,
): { day: number; minute: number } | undefined {
  for (let day = state.day; day <= state.day + 7; day += 1) {
    const first = Math.max(
      contact.availability[0],
      day === state.day ? minuteOfDay(state.clockMinutes) + 15 : 540,
    );
    for (
      let minute = Math.ceil(first / 5) * 5;
      minute + 25 <= Math.min(contact.availability[1], 1019);
      minute += 5
    ) {
      if (
        !state.appointments.some(
          (a) =>
            a.day === day &&
            a.status === "scheduled" &&
            overlaps(minute, 25, a.minute, a.duration),
        )
      )
        return { day, minute };
    }
  }
  return undefined;
}
function arrivalBlock(
  state: GameState,
  session: ConversationSession,
): string | undefined {
  const a = session.appointment;
  if (!a) return "Agree a café appointment first.";
  const actual = state.appointments.find((item) => item.id === a.id);
  if (
    !actual ||
    actual.status === "missed" ||
    state.clockMinutes > appointmentClock(a.day, a.minute) + a.duration - 11
  )
    return "The agreed arrival window has passed. Acknowledge it and arrange a new time or a written follow-up.";
  if (state.location !== "cafe")
    return "Travel to the café first. The accessible travel control uses the same location and clock.";
  if (state.clockMinutes < appointmentClock(a.day, a.minute))
    return `The appointment starts Day ${a.day} at ${clockLabel(a.minute)}. Wait or do other work until then.`;
  return undefined;
}
const NODE_IDS = [
  "discovery_open",
  "discovery_goals",
  "discovery_evidence",
  "discovery_commit",
  "discovery_assumption",
  "discovery_triage",
  "discovery_missing",
  "scope_open",
  "scope_options",
  "scope_authority",
  "scope_commit",
  "scope_pushback",
  "scope_bounded",
  "handoff_open",
  "handoff_packet",
  "handoff_owner",
  "handoff_receipt",
  "handoff_queue",
  "handoff_gap",
  "handoff_rebuild",
  "repair_open",
  "repair_name",
  "repair_evidence",
  "repair_commit",
  "repair_boundary",
  "repair_reset",
  "repair_followup",
  "repair_verify",
  "coffee_open",
  "coffee_response",
  "coffee_alternative",
  "coffee_wait",
  "coffee_arrived",
  "coffee_listen",
  "coffee_commit",
  "coffee_boundary",
  "coffee_pressure",
  "coffee_repair",
  "coffee_cancel",
  "poor_close",
  "done",
];
function buildNode(
  state: GameState,
  content: ContentPack,
  contact: Contact,
  session: ConversationSession,
): ConversationNode | undefined {
  const c = context(state, content, contact);
  const n = (
    title: string,
    text: string,
    choices: [string, string][],
    location?: string,
  ): ConversationNode => ({
    id: session.nodeId,
    title,
    text,
    choices: choices.map(([id, label]) => ({ id, label })),
    ...(location ? { location } : {}),
  });
  if (
    ["coffee_arrived", "coffee_listen", "coffee_commit"].includes(
      session.nodeId,
    ) &&
    session.appointment &&
    state.clockMinutes + 3 >
      appointmentClock(session.appointment.day, session.appointment.minute) +
        session.appointment.duration
  )
    return n(
      "The agreed café time has ended",
      `${contact.name}: We need to end at the agreed time. Keep the remaining work in my preferred channel: ${contact.preference} The meeting does not approve or complete the underlying work.`,
      [
        [
          "time_followup",
          "Respect the end time and retain a bounded written follow-up.",
        ],
        [
          "time_abandon",
          "Treat the unfinished meeting as completed approval and drop the follow-up.",
        ],
      ],
    );
  const who = `${contact.name}, ${contact.role}${c.account ? ` at ${c.account.name}` : ""}`;
  const interactionHistory = c.memory.interactions
    ? `We have ${c.memory.interactions} recorded conversation or case interaction${c.memory.interactions === 1 ? "" : "s"}; ${c.open.length} owned commitment${c.open.length === 1 ? " remains" : "s remain"} open.`
    : "This is our first recorded work conversation.";
  const history =
    `${interactionHistory} ${priorHistory(state, content, contact)}`.trim();
  switch (session.nodeId) {
    case "discovery_open":
      return n(
        "Start with this person's work",
        `${who}: My goal is to ${contact.goals.replace(/\.$/, "").replace(/^./, (s) => s.toLowerCase())}. ${history} In this fictional situation, ${c.scene.signal}.`,
        [
          ["ask_goal", c.script.question],
          [
            "assume",
            `Tell ${contact.name.split(" ")[0]} you already know what ${c.account?.name ?? "the team"} needs.`,
          ],
          [
            "triage",
            "Ask for the most time-sensitive consequence and one missing fact.",
          ],
        ],
      );
    case "discovery_goals":
      return n(
        "Find the evidence owner",
        `${contact.name}: Thank you for asking. The tension is ${c.scene.tension}. I can speak to ${contact.knows.join(", ").toLowerCase()}. What will you ask me for?`,
        [
          ["targeted", `Request ${c.script.evidence}.`],
          [
            "everything",
            "Request every available record before defining the question.",
          ],
          [
            "outside_authority",
            "Ask this person to approve the tax answer and commercial terms now.",
          ],
        ],
      );
    case "discovery_evidence":
      return n(
        "Separate knowledge from proof",
        `${contact.name}: I can help with that bounded request. My preferred approach is: ${contact.preference} ${c.script.uncertainty}`,
        [
          [
            "name_gap",
            "Record what this source can establish, the missing fact and the next owner.",
          ],
          [
            "assume_complete",
            "Treat the contact's confidence as evidence that all records are complete.",
          ],
        ],
      );
    case "discovery_commit":
      return n(
        "Make a bounded commitment",
        `${contact.name}: ${c.scene.next} Who owns the next step, and what will tell us it actually happened?`,
        [
          [
            "owned_followup",
            "Own the evidence request and a dated update; keep verification open until a response is checked.",
          ],
          [
            "vague_followup",
            "Say that someone on the team will take care of it.",
          ],
          [
            "guarantee",
            "Guarantee the whole issue is fixed before checking the evidence.",
          ],
        ],
      );
    case "discovery_assumption":
      return n(
        "The assumption changes the conversation",
        `${contact.name}: You skipped what I know and what I can authorize. ${contact.authority} I need you to distinguish a hypothesis from a commitment.`,
        [
          [
            "reset",
            "Name the assumption, withdraw it and ask a specific question.",
          ],
          [
            "defend",
            "Say the relationship should be enough to skip that distinction.",
          ],
        ],
      );
    case "discovery_triage":
      return n(
        "Keep urgency specific",
        `${contact.name}: ${c.scene.tension} is the concern. Urgency does not supply the missing source record. I can discuss ${contact.knows[0].toLowerCase()}.`,
        [
          [
            "bounded",
            "Acknowledge the consequence; agree an interim update while requesting one source record.",
          ],
          [
            "shortcut",
            "Promise a resolution today to make the conversation feel reassuring.",
          ],
        ],
      );
    case "discovery_missing":
      return n(
        "A useful partial answer",
        `${contact.name}: We have narrowed the issue, but ${c.script.uncertainty.toLowerCase()} ${c.scene.next}`,
        [
          [
            "retain",
            "Retain the missing evidence as owned work and explain the uncertainty in the update.",
          ],
          ["close", "Close the issue because the contact replied."],
        ],
      );
    case "scope_open":
      return n(
        "Understand the decision",
        `${who}: ${c.script.question} Our scope must support this goal: ${contact.goals} ${history}`,
        [
          [
            "options",
            "Compare a bounded option, a phased option and the evidence each still needs.",
          ],
          [
            "promise",
            "Offer an unapproved discount and guaranteed tax outcome to win agreement.",
          ],
          [
            "small_first",
            "Propose a small reversible investigation before discussing any expansion.",
          ],
        ],
      );
    case "scope_options":
      return n(
        "Discuss a real tradeoff",
        `${contact.name}: ${c.scene.tension} makes a blanket promise risky. Please bring ${c.script.evidence}. Which tradeoff should we make visible?`,
        [
          [
            "tradeoffs",
            "Show scope, timing, effort and confidence separately; ask who chooses.",
          ],
          [
            "hide_cost",
            "Hide the implementation effort so the preferred option looks easier.",
          ],
        ],
      );
    case "scope_authority":
      return n(
        "Route the approval",
        `${contact.name}: ${contact.authority} ${c.script.ownership}`,
        [
          [
            "route",
            "Name the distinct evidence, customer, specialist and commercial decision owners.",
          ],
          [
            "borrow_authority",
            "Treat this conversation as approval from all decision owners.",
          ],
        ],
      );
    case "scope_commit":
      return n(
        "Record the decision boundary",
        `${contact.name}: We can take a scoped proposal forward. ${c.script.uncertainty} What does your update promise?`,
        [
          [
            "proposal",
            "Promise a documented proposal and approval check, with no invented acceptance.",
          ],
          [
            "signed",
            "Record the proposal as a signed renewal and completed work.",
          ],
        ],
      );
    case "scope_pushback":
      return n(
        "An unsupported promise is challenged",
        `${contact.name}: That promise exceeds the evidence and my authority. ${contact.authority} I need a correction before we continue.`,
        [
          [
            "withdraw",
            "Withdraw the unsupported promise and replace it with options for review.",
          ],
          ["insist", "Insist that a verbal yes is sufficient approval."],
        ],
      );
    case "scope_bounded":
      return n(
        "Investigate before expanding",
        `${contact.name}: A reversible investigation can address ${c.scene.tension}. It must still have an owner and an acceptance check.`,
        [
          [
            "test",
            `Agree to prepare ${c.script.evidence}, then review what the result supports.`,
          ],
          ["expand", "Start all proposed work now and seek approval later."],
        ],
      );
    case "handoff_open":
      return n(
        "Keep ownership through the handoff",
        `${who}: ${contact.preference} What are you bringing me about this situation: ${c.scene.signal}?`,
        [
          [
            "packet",
            `Prepare ${c.script.evidence}, with the impact and the exact question.`,
          ],
          [
            "dump",
            "Forward a long unfiltered thread and mark the issue as owned by the recipient.",
          ],
          [
            "partial",
            "Identify the missing item and ask if a bounded review can begin.",
          ],
        ],
      );
    case "handoff_packet":
      return n(
        "Check what the recipient can do",
        `${contact.name}: I know ${contact.knows.join(", ").toLowerCase()}. ${contact.authority} How should we divide the work?`,
        [
          [
            "owners",
            "Ask for a bounded review; retain customer communication and missing records as AM work.",
          ],
          [
            "all_work",
            "Transfer every decision, approval and customer update to this person.",
          ],
        ],
      );
    case "handoff_owner":
      return n(
        "Agree an acknowledgment",
        `${contact.name}: ${c.script.ownership} A request sent is not a request accepted. What will you check next?`,
        [
          [
            "ack",
            "Confirm acceptance, expected response time and the owner of an interim customer update.",
          ],
          [
            "assume",
            "Assume receipt proves acceptance and stop watching the issue.",
          ],
        ],
      );
    case "handoff_receipt":
      return n(
        "Verify the handoff without inventing closure",
        `${contact.name}: The conversation established a next step, not final evidence. ${c.scene.next}`,
        [
          [
            "verify",
            "Record the agreed owner and verification check; keep the issue open.",
          ],
          [
            "close",
            "Mark the underlying filing, payment or technical issue as complete.",
          ],
        ],
      );
    case "handoff_queue":
      return n(
        "The handoff is returned",
        `${contact.name}: I cannot act on an unbounded thread. My preferred input is ${contact.preference.toLowerCase()} Your customer is still waiting on you.`,
        [
          [
            "rebuild",
            "Own the failed handoff and rebuild a short, answerable request.",
          ],
          [
            "abandon",
            "Leave the request in the queue and tell the customer it is handled.",
          ],
        ],
      );
    case "handoff_gap":
      return n(
        "Name the incomplete evidence",
        `${contact.name}: We can discuss capacity, but we cannot approve a conclusion without the missing record. ${c.script.uncertainty}`,
        [
          [
            "owned_gap",
            "Assign the missing record to yourself and set an interim update.",
          ],
          [
            "hide_gap",
            "Remove the uncertainty from the packet to avoid a delay.",
          ],
        ],
      );
    case "handoff_rebuild":
      return n(
        "Restore the next step",
        `${contact.name}: Please send ${c.script.evidence}. Show the missing item and acknowledge the earlier handoff was not accepted.`,
        [
          [
            "repair_packet",
            "Record a corrected packet, retain ownership and check receipt explicitly.",
          ],
          ["repeat", "Resend the same thread with an urgent label."],
        ],
      );
    case "repair_open":
      return n(
        "Choose how to rebuild trust",
        `${who}: ${history} ${c.overdue.length ? `Our overdue work includes ${c.overdue[0].title}.` : "An honest repair starts by naming the gap rather than assuming the relationship is fine."} My priority remains: ${contact.goals}`,
        [
          [
            "name",
            "Name the missed expectation, its impact and what you can verify now.",
          ],
          [
            "excuse",
            "Explain that another team caused the problem and ask to move on.",
          ],
          [
            "gesture",
            "Offer coffee instead of addressing the work commitment.",
          ],
          ...(c.open.some((t) => t.id.startsWith("relationship-followup:"))
            ? [
                [
                  "check_followup",
                  "Review the authored reply to an open work follow-up and verify what it establishes.",
                ] as [string, string],
              ]
            : []),
        ],
      );
    case "repair_name":
      return n(
        "Acknowledge impact before reassurance",
        `${contact.name}: I need a reliable next step. ${c.scene.tension} is still unresolved. What evidence supports your correction?`,
        [
          [
            "facts",
            `Distinguish confirmed facts from assumptions and prepare ${c.script.evidence}.`,
          ],
          [
            "confidence",
            "Say you are completely confident without providing a checkable record.",
          ],
        ],
      );
    case "repair_evidence":
      return n(
        "Keep the repair proportional",
        `${contact.name}: ${c.script.uncertainty} ${contact.authority} What will change about your follow-through?`,
        [
          [
            "specific",
            "Agree an owner, a feasible next update and a verification check; preserve any remaining uncertainty.",
          ],
          [
            "instant",
            "Say all the earlier problems are resolved because you apologized.",
          ],
        ],
      );
    case "repair_commit":
      return n(
        "Rebuild trust through an owned next step",
        `${contact.name}: A correction helps, but future evidence is still outstanding. ${c.scene.next}`,
        [
          [
            "commit",
            "Record the repair and a dated follow-up; do not close outstanding work yet.",
          ],
          [
            "no_record",
            "Leave without recording a commitment because the conversation went well.",
          ],
        ],
      );
    case "repair_boundary":
      return n(
        "A boundary is stated",
        `${contact.name}: A gesture or another team's name does not address the impact. I prefer: ${contact.preference} Can we return to the work?`,
        [
          [
            "accept",
            "Respect the boundary and identify one concrete correction you own.",
          ],
          ["dismiss", "Dismiss the concern and ask them to be more flexible."],
        ],
      );
    case "repair_reset":
      return n(
        "A smaller recovery is possible",
        `${contact.name}: Let us at least agree the next owner and evidence request. Confidence will depend on what actually follows.`,
        [
          [
            "bounded",
            `Own ${c.script.evidence} and a realistic update, with the issue still open.`,
          ],
          [
            "forget",
            "Ask to forget the earlier commitment without a next step.",
          ],
        ],
      );
    case "repair_followup": {
      const taskId = session.flags
        .find((f) => f.startsWith("verify-task:"))
        ?.slice(12);
      const task = state.tasks.find((t) => t.id === taskId);
      return n(
        "Read the fictional returned acknowledgment",
        `${contact.name}: Authored simulation response to ${task?.title ?? "the bounded work request"}: I received the request and accept a review of the named question within my role. My next input will follow this format: ${contact.preference} This acknowledges a request only. No final source verification, tax conclusion, filing, payment or commercial approval is included.`,
        [
          [
            "classify",
            "Identify receipt and accepted review as established; keep final evidence and approvals outstanding.",
          ],
          [
            "overclaim",
            "Treat acknowledgment as proof the whole customer issue is resolved.",
          ],
        ],
      );
    }
    case "repair_verify":
      return n(
        "Verify only the bounded commitment",
        `${contact.name}: You checked what my response does and does not establish. You may complete the task to request and verify acknowledgment. The substantive account work still needs its own evidence and owner.`,
        [
          [
            "verify_receipt",
            "Save the response evidence and complete only the request-and-acknowledgment task.",
          ],
          [
            "retain_gap",
            "Keep the task open and agree a further clarification instead.",
          ],
        ],
      );
    case "coffee_open":
      return n(
        "Invite without pressure",
        `${who}: ${c.script.coffee} ${history} Keep this professional and optional; a coffee invitation never grants approval authority.`,
        [
          [
            "invite",
            `Offer ${contact.name.split(" ")[0]} a short optional café check-in about how to work together.`,
          ],
          [
            "work_alternative",
            "Offer a scheduled workplace check-in or written exchange instead.",
          ],
          [
            "pressure",
            "Say accepting coffee is expected if they value the account relationship.",
          ],
        ],
      );
    case "coffee_response": {
      const accepted = session.flags.includes("coffee-accepted");
      return n(
        accepted
          ? "The invitation is accepted"
          : "Respect a declined invitation",
        `${contact.name}: ${session.flags.find((f) => f.startsWith("coffee-reason:"))?.slice(14) ?? c.script.coffee}`,
        accepted
          ? [
              [
                "schedule",
                "Agree the next available 25-minute café slot and keep the agenda professional.",
              ],
              [
                "alternative",
                "Offer the normal work channel if that would be more useful.",
              ],
            ]
          : [
              [
                "respect",
                "Accept the answer without pressure and use their preferred work channel.",
              ],
              [
                "push",
                "Ask repeatedly and imply that declining harms the relationship.",
              ],
            ],
      );
    }
    case "coffee_alternative":
      return n(
        "Choose a useful professional alternative",
        `${contact.name}: Thank you for respecting my time. ${contact.preference} We can work on ${c.scene.tension} without coffee.`,
        [
          [
            "use_preference",
            `Prepare ${c.script.evidence} for a workplace follow-up.`,
          ],
          [
            "resent",
            "Withhold the work follow-up because the invitation was declined.",
          ],
        ],
      );
    case "coffee_wait": {
      const a = session.appointment;
      const node = n(
        "Follow through at the café",
        `${contact.name}: We agreed Day ${a?.day ?? "?"} at ${a ? clockLabel(a.minute) : "?"} for 25 minutes at the café. Travel there with at least 11 minutes left for the check-in. An invitation alone is not attendance. We can renegotiate if plans change.`,
        [
          [
            "arrive",
            "Arrive at the café and confirm the agreed time and professional agenda.",
          ],
          [
            "reschedule",
            "Acknowledge the change and request one replacement appointment.",
          ],
          ["cancel", "Cancel courteously and retain a written work follow-up."],
        ],
        "cafe",
      );
      const blocked = arrivalBlock(state, session);
      if (blocked)
        Object.assign(node.choices[0], {
          disabled: true,
          disabledReason: blocked,
        });
      if (session.flags.includes("rescheduled"))
        Object.assign(node.choices[1], {
          disabled: true,
          disabledReason:
            "The appointment has already been rescheduled. Use a written follow-up rather than repeatedly booking time.",
        });
      return node;
    }
    case "coffee_arrived":
      return n(
        "Make the café visit appropriate",
        `${contact.name}: Thanks for following through. This is a public setting. We can talk about our working preferences and goals, without account records, personal pressure or approval decisions.`,
        [
          [
            "work_style",
            `Ask what makes collaboration easier in their role as ${contact.role.toLowerCase()}.`,
          ],
          [
            "private_records",
            "Open detailed customer records at the café table and request an immediate decision.",
          ],
          [
            "sell",
            "Use the informal setting to push a price or scope commitment.",
          ],
        ],
        "cafe",
      );
    case "coffee_listen":
      return n(
        "Listen without converting rapport into authority",
        `${contact.name}: ${contact.preference} My goal is: ${contact.goals} A useful next step would address ${c.scene.tension}.`,
        [
          [
            "reflect",
            "Reflect their work preference and ask permission to send a bounded work follow-up.",
          ],
          [
            "approval",
            "Say the friendly conversation means they have approved your proposal.",
          ],
        ],
        "cafe",
      );
    case "coffee_commit":
      return n(
        "End the meeting and follow through",
        `${contact.name}: The café check-in helped us understand how to work together. ${c.script.uncertainty} ${c.scene.next}`,
        [
          [
            "followup",
            "Thank them, end on time and record the agreed work follow-up through the appropriate channel.",
          ],
          [
            "no_followup",
            "Treat the pleasant meeting as sufficient and leave the next step unowned.",
          ],
        ],
        "cafe",
      );
    case "coffee_boundary":
      return n(
        "Keep sensitive work in its proper setting",
        `${contact.name}: I will not review records or approve terms here. ${contact.authority} Please put the material away and use the proper workspace.`,
        [
          [
            "respect",
            "Respect the boundary, withdraw the request and return to work preferences.",
          ],
          [
            "insist",
            "Insist that private records and approvals are fine because the café is quiet.",
          ],
        ],
      );
    case "coffee_pressure":
      return n(
        "The invitation is declined",
        `${contact.name}: I am declining. A professional relationship must not depend on accepting a social invitation. We can use the usual work channel.`,
        [
          [
            "apologize",
            "Acknowledge the pressure, accept the decline and propose a bounded work next step.",
          ],
          ["double_down", "Keep pressuring them after the explicit decline."],
        ],
      );
    case "coffee_repair":
      return n(
        "Repair the boundary crossing",
        `${contact.name}: Respect the decision from here. ${contact.preference} What will you do next?`,
        [
          [
            "professional",
            "Use the preferred work channel and acknowledge that trust must be rebuilt.",
          ],
          ["ignore", "Stop the needed work follow-up because they said no."],
        ],
      );
    case "coffee_cancel":
      return n(
        "Retain work after plans change",
        `${contact.name}: Thank you for making the change explicit. ${c.scene.next} Who owns that work now?`,
        [
          ["written", `Record a written follow-up using ${c.script.evidence}.`],
          ["drop", "Cancel the underlying work as well as the café visit."],
        ],
      );
    case "poor_close":
      return n(
        "The conversation has a consequence",
        `${contact.name}: I cannot rely on that approach. ${c.script.uncertainty} The unresolved work and my boundary need to stay visible.`,
        [
          [
            "own",
            "Acknowledge the poor outcome and retain an owned repair task.",
          ],
          [
            "leave",
            "Leave without correcting the unsupported promise or pressure.",
          ],
        ],
      );
    default:
      return undefined;
  }
}

export function conversationView(
  state: GameState,
  content: ContentPack,
  npcId: string,
): ConversationView | undefined {
  const contact = content.contacts.find((item) => item.id === npcId);
  if (!contact) return undefined;
  const store = readRelationshipConversations(state);
  const session = store.sessions[npcId];
  const c = context(state, content, contact);
  const available = availability(state, contact);
  return {
    contact,
    account: c.account,
    session,
    node:
      session?.status === "active"
        ? buildNode(state, content, contact, session)
        : undefined,
    debrief: session?.debrief,
    relationship: {
      trust: c.memory.trust,
      interactions: c.memory.interactions,
      commitments: [...c.memory.commitments],
      accountTrust: c.health.trust,
      accountRisk: c.health.risk,
    },
    available,
    availabilityMessage: available
      ? `${contact.name} is available for this fictional work conversation.`
      : `${contact.name} is available ${clockLabel(contact.availability[0])}–${clockLabel(contact.availability[1])}. Wait, do other work or return during that window.`,
    topics: [...TOPICS],
  };
}

/** Physical rendezvous follows the same saved appointment as the workbench. */
export function cafeMeetingContactId(state: GameState): string | undefined {
  if (state.location !== "cafe") return undefined;
  return Object.values(readRelationshipConversations(state).sessions).find(
    (session) => {
      const a = session.appointment;
      if (session.status !== "active" || !a) return false;
      const actual = state.appointments.find((item) => item.id === a.id);
      const start = appointmentClock(a.day, a.minute);
      return (
        !!actual &&
        actual.status !== "missed" &&
        state.clockMinutes >= start &&
        state.clockMinutes < start + a.duration
      );
    },
  )?.npcId;
}

function nextStep(
  contact: Contact,
  content: ContentPack,
  state: GameState,
): string {
  const c = context(state, content, contact);
  return `${c.scene.next} Owner: ${state.learner.displayName}. Check the response before closing the work.`;
}
function finish(
  state: GameState,
  content: ContentPack,
  store: RelationshipConversations,
  session: ConversationSession,
  contact: Contact,
  outcome: ConversationOutcome,
  clockMinutes: number,
): void {
  const awardKey = `${contact.id}:${session.topic}`;
  const replay = store.awarded.includes(awardKey);
  const c = context(state, content, contact);
  const changes = {
    good: [4, 2, -2],
    mixed: [0, 0, 1],
    poor: [-6, -3, 4],
    recovery: [2, 1, -1],
  }[outcome];
  const memory = (state.npcMemory[contact.id] ??= {
    trust: 50,
    interactions: 0,
    commitments: [],
  });
  const account = c.account
    ? (state.accountHealth[contact.accountId] ??= {
        trust: 50,
        risk: 30,
        evidence: [],
      })
    : undefined;
  const oldTrust = memory.trust;
  const oldAccountTrust = account?.trust ?? 50;
  const oldRisk = account?.risk ?? 30;
  if (!replay) {
    memory.trust = bounded(memory.trust + changes[0]);
    memory.interactions += 1;
    if (account) {
      account.trust = bounded(account.trust + changes[1]);
      account.risk = bounded(account.risk + changes[2]);
    }
    store.awarded.push(awardKey);
  }
  const taskId = `relationship-followup:${contact.id}:${session.topic}`;
  const followup = nextStep(contact, content, state);
  if (
    !replay &&
    !session.flags.includes("verified-followup") &&
    !state.tasks.some((task) => task.id === taskId)
  ) {
    state.tasks.push({
      id: taskId,
      title: `${outcome === "poor" ? "Correct the bounded request and verify" : "Send a bounded work request and verify"} acknowledgment from ${contact.name}. Substantive evidence remains separate.`,
      owner: state.learner.displayName,
      missionId: `relationship:${contact.id}`,
      dueMinute: clockMinutes + 120,
      status: "open",
      evidence: [],
    });
    memory.commitments = unique([...memory.commitments, taskId]);
  }
  const summary = {
    good: `You respected ${contact.name}'s knowledge, authority and preferred channel, and retained an evidence-based next step.`,
    mixed: `The exchange with ${contact.name} made some progress, but incomplete evidence or follow-through still limits the outcome.`,
    poor: `Unsupported promises, missing ownership or ignored boundaries reduced ${contact.name}'s confidence. The underlying issue remains open.`,
    recovery: `You acknowledged the problem with ${contact.name} and replaced it with an owned, bounded next step. A repair conversation is the start of recovery, not proof the work is complete.`,
  }[outcome];
  const debrief: ConversationDebrief = {
    id: session.id,
    npcId: contact.id,
    topic: session.topic,
    outcome,
    summary,
    whatWorked:
      outcome === "poor"
        ? [
            "The unresolved issue remains visible for repair rather than silently becoming completed work.",
          ]
        : [
            c.script.ownership,
            `The contact's working preference was kept explicit: ${contact.preference}`,
            ...(session.flags.includes("cafe-attended")
              ? [
                  "You arrived for the scheduled café meeting and used an appropriate professional agenda.",
                ]
              : []),
          ],
    whatToImprove:
      outcome === "good"
        ? [
            "Verify the promised response and record its limits; a conversation alone cannot close an issue.",
          ]
        : [
            c.script.uncertainty,
            ...(session.flags.includes("boundary")
              ? [
                  "An invitation is optional. Accept a decline and keep private records and approval decisions out of a public café.",
                ]
              : []),
            "Use a named owner, a feasible update time and a checkable completion condition.",
          ],
    nextStep: followup,
    trustDelta: memory.trust - oldTrust,
    accountTrustDelta: (account?.trust ?? 50) - oldAccountTrust,
    riskDelta: (account?.risk ?? 30) - oldRisk,
    replay,
    route: session.history.map((h) => `${h.nodeId}/${h.choiceId}`),
    completedAt: clockMinutes,
  };
  session.status = "completed";
  session.nodeId = "done";
  session.paused = false;
  session.debrief = debrief;
  store.history = [...store.history, debrief].slice(-200);
  const artifactId = `conversation:${session.id}`;
  state.artifacts.push({
    id: artifactId,
    type: "relationship-conversation",
    missionId: `relationship:${contact.id}`,
    createdAt: simulationTimestamp(clockMinutes),
    body: [
      "Fictional relationship conversation; no external message, meeting or approval occurred.",
      summary,
      `Route: ${debrief.route.join(" → ")}`,
      `Next step: ${followup}`,
      replay
        ? "Practice replay: trust, risk and commitment rewards were not repeated."
        : `Simulation consequences: NPC trust ${debrief.trustDelta}, account trust ${debrief.accountTrustDelta}, risk ${debrief.riskDelta}.`,
    ].join("\n"),
  });
  if (account && !replay)
    account.evidence = unique([...account.evidence, artifactId]);
}
/** Call after deliberate clock changes. One missed commitment consequence per contact's coffee topic. */
export function reconcileConversationAppointments(
  state: GameState,
  content: ContentPack,
): void {
  if (
    state.extensions.relationshipConversations !== undefined &&
    !validateRelationshipConversations(
      state.extensions.relationshipConversations,
    )
  )
    return;
  const current = readRelationshipConversations(state);
  let changed = false;
  const store = structuredClone(current);
  for (const session of Object.values(store.sessions)) {
    const appointment = session.appointment;
    if (
      !appointment ||
      session.status !== "active" ||
      session.flags.includes("cafe-attended") ||
      session.flags.includes("coffee-cancelled") ||
      session.nodeId === "coffee_cancel" ||
      session.flags.includes("missed-coffee")
    )
      continue;
    const actual = state.appointments.find((a) => a.id === appointment.id);
    if (
      state.clockMinutes <=
      appointmentClock(appointment.day, appointment.minute) +
        appointment.duration
    )
      continue;
    const contact = content.contacts.find((c) => c.id === session.npcId);
    if (!contact) continue;
    session.flags = unique([...session.flags, "missed-coffee"]);
    if (actual?.status === "scheduled") actual.status = "missed";
    changed = true;
    const key = `${contact.id}:coffee:no-show`;
    if (
      store.awarded.includes(key) ||
      store.awarded.includes(`${contact.id}:coffee`)
    )
      continue;
    store.awarded.push(key);
    const memory = (state.npcMemory[contact.id] ??= {
      trust: 50,
      interactions: 0,
      commitments: [],
    });
    memory.trust = bounded(memory.trust - 3);
    if (content.accounts.some((a) => a.id === contact.accountId)) {
      const health = (state.accountHealth[contact.accountId] ??= {
        trust: 50,
        risk: 30,
        evidence: [],
      });
      health.trust = bounded(health.trust - 1);
      health.risk = bounded(health.risk + 2);
    }
    state.events.push({
      id: `relationship-missed:${session.id}`,
      type: "relationship-missed",
      title: "Missed a café commitment",
      message: `${contact.name} waited for the agreed café check-in. NPC trust -3; customer-account trust -1 and risk +2 where applicable. Acknowledge the missed commitment and renegotiate the work follow-up. Fictional simulation only.`,
      clockMinutes: state.clockMinutes,
      day: state.day,
      details: { npcId: contact.id, appointmentId: appointment.id },
    });
  }
  if (changed) state.extensions.relationshipConversations = store;
}
function cancelAppointment(
  state: GameState,
  session: ConversationSession,
): void {
  if (!session.appointment) return;
  state.appointments = state.appointments.filter(
    (a) => a.id !== session.appointment?.id || a.status !== "scheduled",
  );
}
function validActionId(action: ConversationAction): boolean {
  return (
    action.type === "CLOSE_CONVERSATION" ||
    (typeof action.id === "string" &&
      action.id.length > 0 &&
      action.id.length <= 180)
  );
}
/** Mutates the caller's cloned state only on accepted actions; caller spends returned minutes once. */
export function applyConversationAction(
  state: GameState,
  action: ConversationAction,
  content: ContentPack,
): ConversationResult {
  const reject = (message: string): ConversationResult => ({
    accepted: false,
    minutes: 0,
    message,
  });
  const contact = content.contacts.find((item) => item.id === action.npcId);
  if (!contact || !validActionId(action))
    return reject("Choose a known contact and a valid stable action ID.");
  if (
    action.type !== "CLOSE_CONVERSATION" &&
    state.processedActions.includes(action.id)
  )
    return reject("That conversation action was already recorded.");
  if (
    state.extensions.relationshipConversations !== undefined &&
    !validateRelationshipConversations(
      state.extensions.relationshipConversations,
    )
  )
    return reject(
      "This relationship history uses an invalid or unsupported version. It was preserved; restore a compatible save before continuing.",
    );
  const current = readRelationshipConversations(state);
  const existing = current.sessions[contact.id];
  if (action.type === "CLOSE_CONVERSATION") {
    if (!existing || existing.status !== "active" || existing.paused)
      return reject("No active conversation needs to be paused.");
    const store = structuredClone(current);
    store.sessions[contact.id].paused = true;
    state.extensions.relationshipConversations = store;
    return {
      accepted: true,
      minutes: 0,
      message:
        "Conversation paused. The exact stage and any appointment are saved for your return.",
    };
  }
  if (action.type === "START_CONVERSATION") {
    if (existing?.status === "active") {
      if (!existing.paused)
        return reject(
          `Continue the saved ${existing.topic} conversation before starting another topic.`,
        );
      const store = structuredClone(current);
      store.sessions[contact.id].paused = false;
      state.extensions.relationshipConversations = store;
      return {
        accepted: true,
        minutes: 0,
        message: `Resumed your ${existing.topic} conversation with ${contact.name}.`,
      };
    }
    if (action.topic !== undefined && !topic(action.topic))
      return reject("Choose an authored conversation topic.");
    if (!availability(state, contact))
      return reject(
        `${contact.name} is available ${clockLabel(contact.availability[0])}–${clockLabel(contact.availability[1])}; return during that window.`,
      );
    if (1 >= WORKDAY_MINUTES - (state.clockMinutes % WORKDAY_MINUTES))
      return reject("Close the workday before starting a conversation.");
    const selectedTopic = action.topic ?? "discovery";
    const store = structuredClone(current);
    store.sessions[contact.id] = {
      id: action.id,
      npcId: contact.id,
      topic: selectedTopic,
      status: "active",
      nodeId: `${selectedTopic}_open`,
      startedAt: state.clockMinutes,
      paused: false,
      history: [],
      flags: [],
    };
    state.extensions.relationshipConversations = store;
    return {
      accepted: true,
      minutes: 1,
      message: `Started a fictional ${selectedTopic} conversation with ${contact.name}.`,
    };
  }
  if (
    !existing ||
    existing.status !== "active" ||
    existing.paused ||
    existing.nodeId !== action.nodeId
  )
    return reject(
      "That choice is stale or the conversation is paused. Resume the saved stage first.",
    );
  const node = buildNode(state, content, contact, existing);
  const choice = node?.choices.find((item) => item.id === action.choiceId);
  if (!node || !choice)
    return reject("Choose one of the authored replies for this stage.");
  if (choice.disabled)
    return reject(choice.disabledReason ?? "That reply is not available yet.");
  const minutes = action.choiceId === "arrive" ? 2 : 3;
  if (minutes >= WORKDAY_MINUTES - (state.clockMinutes % WORKDAY_MINUTES))
    return reject("Close the workday before continuing this conversation.");
  // Scheduling and a courteous cancellation are asynchronous; substantive work respects availability.
  const timedClose = ["time_followup", "time_abandon"].includes(choice.id);
  const asyncNode =
    ["coffee_wait", "coffee_cancel"].includes(existing.nodeId) || timedClose;
  if (!asyncNode && !availability(state, contact))
    return reject(
      `${contact.name} is outside their availability. Your exact conversation stage is saved.`,
    );
  if (
    !timedClose &&
    ["coffee_arrived", "coffee_listen", "coffee_commit"].includes(
      existing.nodeId,
    )
  ) {
    if (state.location !== "cafe")
      return reject(
        "Return to the café to finish this in-person check-in, or pause the conversation.",
      );
    const a = existing.appointment;
    if (
      !a ||
      state.clockMinutes + minutes >
        appointmentClock(a.day, a.minute) + a.duration
    )
      return reject(
        "The café appointment has ended. Resume the work through a new professional conversation after closing this stage.",
      );
  }
  let slot: { day: number; minute: number } | undefined;
  if (
    (existing.nodeId === "coffee_response" && action.choiceId === "schedule") ||
    (existing.nodeId === "coffee_wait" && action.choiceId === "reschedule")
  ) {
    slot = nextCoffeeSlot(state, contact);
    if (!slot)
      return reject(
        "No conflict-free café slot fits the next eight workdays. Choose the work-channel alternative.",
      );
  }
  // Everything below this point is a fully validated transaction.
  reconcileConversationAppointments(state, content);
  const store = structuredClone(readRelationshipConversations(state));
  const session = store.sessions[contact.id];
  session.history.push({
    nodeId: session.nodeId,
    choiceId: choice.id,
    label: choice.label,
    clockMinutes: state.clockMinutes,
  });
  const flag = (value: string) => {
    session.flags = unique([...session.flags, value]);
  };
  const go = (id: string) => {
    session.nodeId = id;
  };
  let outcome: ConversationOutcome | undefined = timedClose
    ? choice.id === "time_followup"
      ? "mixed"
      : "poor"
    : undefined;
  const good = (): ConversationOutcome =>
    session.flags.includes("repair") || session.flags.includes("missed-coffee")
      ? "recovery"
      : session.flags.includes("partial")
        ? "mixed"
        : "good";
  const poor = () => {
    flag("boundary");
    go("poor_close");
  };
  switch (`${existing.nodeId}/${choice.id}`) {
    case "discovery_open/ask_goal":
      go("discovery_goals");
      break;
    case "discovery_open/assume":
      go("discovery_assumption");
      break;
    case "discovery_open/triage":
      flag("partial");
      go("discovery_triage");
      break;
    case "discovery_goals/targeted":
      go("discovery_evidence");
      break;
    case "discovery_goals/everything":
      flag("partial");
      go("discovery_missing");
      break;
    case "discovery_goals/outside_authority":
      go("discovery_assumption");
      break;
    case "discovery_evidence/name_gap":
      go("discovery_commit");
      break;
    case "discovery_evidence/assume_complete":
      go("discovery_assumption");
      break;
    case "discovery_commit/owned_followup":
      outcome = good();
      break;
    case "discovery_commit/vague_followup":
      outcome = "mixed";
      break;
    case "discovery_commit/guarantee":
      poor();
      break;
    case "discovery_assumption/reset":
      flag("repair");
      go("repair_evidence");
      break;
    case "discovery_assumption/defend":
      poor();
      break;
    case "discovery_triage/bounded":
      go("discovery_missing");
      break;
    case "discovery_triage/shortcut":
      go("discovery_assumption");
      break;
    case "discovery_missing/retain":
      outcome = "mixed";
      break;
    case "discovery_missing/close":
      poor();
      break;
    case "scope_open/options":
      go("scope_options");
      break;
    case "scope_open/promise":
      flag("boundary");
      go("scope_pushback");
      break;
    case "scope_open/small_first":
      flag("partial");
      go("scope_bounded");
      break;
    case "scope_options/tradeoffs":
      go("scope_authority");
      break;
    case "scope_options/hide_cost":
      go("scope_pushback");
      break;
    case "scope_authority/route":
      go("scope_commit");
      break;
    case "scope_authority/borrow_authority":
      go("scope_pushback");
      break;
    case "scope_commit/proposal":
      outcome = good();
      break;
    case "scope_commit/signed":
      poor();
      break;
    case "scope_pushback/withdraw":
      flag("repair");
      go("scope_authority");
      break;
    case "scope_pushback/insist":
      poor();
      break;
    case "scope_bounded/test":
      go("scope_commit");
      break;
    case "scope_bounded/expand":
      go("scope_pushback");
      break;
    case "handoff_open/packet":
      go("handoff_packet");
      break;
    case "handoff_open/dump":
      go("handoff_queue");
      break;
    case "handoff_open/partial":
      flag("partial");
      go("handoff_gap");
      break;
    case "handoff_packet/owners":
      go("handoff_owner");
      break;
    case "handoff_packet/all_work":
      go("handoff_queue");
      break;
    case "handoff_owner/ack":
      go("handoff_receipt");
      break;
    case "handoff_owner/assume":
      go("handoff_queue");
      break;
    case "handoff_receipt/verify":
      outcome = good();
      break;
    case "handoff_receipt/close":
      poor();
      break;
    case "handoff_queue/rebuild":
      flag("repair");
      go("handoff_rebuild");
      break;
    case "handoff_queue/abandon":
      poor();
      break;
    case "handoff_gap/owned_gap":
      go("handoff_receipt");
      break;
    case "handoff_gap/hide_gap":
      poor();
      break;
    case "handoff_rebuild/repair_packet":
      outcome = "recovery";
      break;
    case "handoff_rebuild/repeat":
      poor();
      break;
    case "repair_open/check_followup": {
      const memory = state.npcMemory[contact.id];
      const task = state.tasks.find(
        (t) =>
          t.status === "open" &&
          t.id.startsWith("relationship-followup:") &&
          memory?.commitments.includes(t.id),
      );
      if (task) flag(`verify-task:${task.id}`);
      flag("repair");
      go("repair_followup");
      break;
    }
    case "repair_followup/classify":
      go("repair_verify");
      break;
    case "repair_followup/overclaim":
      poor();
      break;
    case "repair_verify/retain_gap":
      go("repair_commit");
      break;
    case "repair_verify/verify_receipt": {
      const taskId = session.flags
        .find((f) => f.startsWith("verify-task:"))
        ?.slice(12);
      const task = state.tasks.find(
        (t) => t.id === taskId && t.status === "open",
      );
      if (task) {
        const artifactId = `relationship-response:${session.id}`;
        state.artifacts.push({
          id: artifactId,
          type: "relationship-response",
          missionId: `relationship:${contact.id}`,
          createdAt: simulationTimestamp(state.clockMinutes + minutes),
          body: `Authored fictional response from ${contact.name}: the bounded request was received and review accepted within this authority: ${contact.authority} Working channel: ${contact.preference} Verified: request receipt and accepted review only. Final source evidence, tax conclusions, filing/payment completion and commercial approvals are not established. Task ${task.id}.`,
        });
        task.status = "completed";
        task.completedAt = state.clockMinutes + minutes;
        task.evidence = unique([...task.evidence, artifactId]);
        flag("verified-followup");
      }
      outcome = "recovery";
      break;
    }
    case "repair_open/name":
      flag("repair");
      go("repair_name");
      break;
    case "repair_open/excuse":
      flag("partial");
      go("repair_boundary");
      break;
    case "repair_open/gesture":
      flag("boundary");
      go("repair_boundary");
      break;
    case "repair_name/facts":
      go("repair_evidence");
      break;
    case "repair_name/confidence":
      go("repair_boundary");
      break;
    case "repair_evidence/specific":
      go("repair_commit");
      break;
    case "repair_evidence/instant":
      poor();
      break;
    case "repair_commit/commit":
      outcome = "recovery";
      break;
    case "repair_commit/no_record":
      outcome = "mixed";
      break;
    case "repair_boundary/accept":
      go("repair_reset");
      break;
    case "repair_boundary/dismiss":
      poor();
      break;
    case "repair_reset/bounded":
      outcome = "mixed";
      break;
    case "repair_reset/forget":
      poor();
      break;
    case "coffee_open/invite": {
      const response = coffeeResponse(state, content, contact);
      flag(response.accepted ? "coffee-accepted" : "coffee-declined");
      flag(`coffee-reason:${response.reason}`);
      go("coffee_response");
      break;
    }
    case "coffee_open/work_alternative":
      go("coffee_alternative");
      break;
    case "coffee_open/pressure":
      flag("boundary");
      go("coffee_pressure");
      break;
    case "coffee_response/schedule":
    case "coffee_wait/reschedule": {
      if (session.appointment) {
        cancelAppointment(state, session);
        flag("rescheduled");
      }
      const a = {
        id: `coffee:${action.id}`,
        npcId: contact.id,
        day: slot!.day,
        minute: slot!.minute,
        duration: 25,
        status: "scheduled" as const,
      };
      state.appointments.push(a);
      session.appointment = {
        id: a.id,
        day: a.day,
        minute: a.minute,
        duration: 25,
        location: "cafe",
      };
      go("coffee_wait");
      break;
    }
    case "coffee_response/alternative":
    case "coffee_response/respect":
      go("coffee_alternative");
      break;
    case "coffee_response/push":
      flag("boundary");
      go("coffee_pressure");
      break;
    case "coffee_alternative/use_preference":
      flag("partial");
      go("discovery_commit");
      break;
    case "coffee_alternative/resent":
      poor();
      break;
    case "coffee_wait/arrive": {
      const a = state.appointments.find(
        (item) => item.id === session.appointment?.id,
      );
      if (a) a.status = "attended";
      flag("cafe-attended");
      go("coffee_arrived");
      break;
    }
    case "coffee_wait/cancel":
      cancelAppointment(state, session);
      flag("coffee-cancelled");
      flag("partial");
      go("coffee_cancel");
      break;
    case "coffee_arrived/work_style":
      go("coffee_listen");
      break;
    case "coffee_arrived/private_records":
    case "coffee_arrived/sell":
      flag("boundary");
      go("coffee_boundary");
      break;
    case "coffee_listen/reflect":
      go("coffee_commit");
      break;
    case "coffee_listen/approval":
      flag("boundary");
      go("coffee_boundary");
      break;
    case "coffee_commit/followup":
      outcome = good();
      break;
    case "coffee_commit/no_followup":
      outcome = "mixed";
      break;
    case "coffee_boundary/respect":
      flag("repair");
      go("coffee_repair");
      break;
    case "coffee_boundary/insist":
      poor();
      break;
    case "coffee_pressure/apologize":
      flag("repair");
      go("coffee_repair");
      break;
    case "coffee_pressure/double_down":
      poor();
      break;
    case "coffee_repair/professional":
      outcome = "recovery";
      break;
    case "coffee_repair/ignore":
      poor();
      break;
    case "coffee_cancel/written":
      outcome = "mixed";
      break;
    case "coffee_cancel/drop":
      poor();
      break;
    case "poor_close/own":
    case "poor_close/leave":
      outcome = "poor";
      break;
  }
  if (!outcome && session.history.length >= 80) {
    flag("boundary");
    go("poor_close");
  }
  if (outcome)
    finish(
      state,
      content,
      store,
      session,
      contact,
      outcome,
      state.clockMinutes + minutes,
    );
  state.extensions.relationshipConversations = store;
  return {
    accepted: true,
    minutes,
    message: outcome
      ? `${contact.name}: ${outcome} conversation outcome. ${session.debrief?.replay ? "Practice replay; trust and risk rewards were not repeated." : "The debrief and owned next step are saved."}`
      : `${contact.name}: ${buildNode(state, content, contact, session)?.title ?? "Conversation continued"}.`,
  };
}
