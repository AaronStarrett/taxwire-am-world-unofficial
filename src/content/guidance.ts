import type { ContentPack, Mission, Step } from "./types";
import { advancedMissionLessons } from "./advanced-guidance";

/** Authored teaching only. No provider, hidden case state or automated expert judgment. */
export const guidanceVersion = "twaw-guidance-2026.10.03-v2";
export type GuidanceMode = "guided" | "assisted" | "independent";
export const modeDefinitions: Record<
  GuidanceMode,
  {
    label: string;
    description: string;
    automaticTeaching: boolean;
    defaultHintLevel: number;
  }
> = {
  guided: {
    label: "Guided",
    description:
      "Learn the concept, see a demonstration, then carry out a small action. Objectives and evidence directions stay visible; specific hints are available. This is learning practice, not an unaided demonstration.",
    automaticTeaching: true,
    defaultHintLevel: 0,
  },
  assisted: {
    label: "Assisted",
    description:
      "You receive the goal and context. Choose your tools and ask for explanations or a hint when useful. Assistance is recorded with the attempt.",
    automaticTeaching: false,
    defaultHintLevel: 0,
  },
  independent: {
    label: "Independent",
    description:
      "Plan and make decisions with the normal work tools. Help remains available; using a hint or demonstration is recorded and does not silently become unaided mastery.",
    automaticTeaching: false,
    defaultHintLevel: 0,
  },
};
export const guidanceModes = modeDefinitions;
export const recommendedMissionOrder = [
  "M-A02",
  "M-A01",
  "M-A03",
  "M-T01",
  "M-A04",
  "M-A05",
  "M-T02",
  "M-T03",
  "M-A06",
  "M-T04",
  "M-A07",
  "M-T05",
  "M-T06",
  "M-T07",
  "M-A08",
  "M-A09",
  "M-T08",
  "M-T09",
  "M-A10",
  "M-A11",
  "M-T10",
  "M-T11",
  "M-T12",
  "M-A12",
];

export const firstDayCustomerBrief = {
  accountId: "acct-cedarline",
  requestDocumentId: "M-A02-packet",
  request:
    "Cedarline announced a wholesale portal. Help us confirm what is actually launching and who can verify it before anyone changes the account plan.",
  knownFacts: [
    {
      id: "channels",
      text: "Cedarline sells homeware through its direct store and the MarketHub marketplace.",
      why: "Ask which channel the proposed portal adds. Do not assume one set of channel records covers every sale.",
      evidenceId: "acct-cedarline",
    },
    {
      id: "announced-portal",
      text: "The fictional page says “wholesale coming soon”; a confirmed transaction launch date is not provided.",
      why: "An announcement is a reason to ask a question. It does not prove the portal is live.",
      evidenceId: "M-A02-packet",
    },
  ],
  missingFacts: [
    {
      id: "launch-date",
      text: "Is the portal live, and what is the confirmed launch date?",
    },
    {
      id: "pilot-records",
      text: "Which sample pilot transactions and channel records can verify what changed?",
    },
  ],
  clarifyingQuestion:
    "Is the wholesale portal live yet? Which entity will invoice pilot orders, and can you share a sample transaction record?",
  customerFactOwnerId: "npc-cedarline-1",
  mappingOwnerId: "npc-cedarline-2",
  ownerExplanation:
    "Theo Park can verify accounting and order facts. Lena Ortiz can explain channel mappings. You retain the customer check-in; neither contact automatically approves tax conclusions or commercial changes.",
  updatePattern:
    "I can confirm [recorded fact]. We still need [specific missing information]. [Named owner] will verify it, and I will check back at [agreed time]. We will review the response before changing the plan.",
  verificationExplanation:
    "A message records a promise. Resolution needs a returned response that answers the question, a record of what was verified, and an owner for anything still missing.",
  nextMissionId: "M-A02",
  nextAfterApplicationId: "M-A01",
};

export interface FirstDayObjective {
  id: string;
  objective: string;
  locationId: string;
  panel?: string;
  interact: string;
  why: string;
  doneWhen: string;
  teach: string;
  hints: [string, string, string];
}
export const guidedFirstDay: FirstDayObjective[] = [
  {
    id: "move",
    objective: "Reach the nearby practice marker",
    locationId: "home",
    interact:
      "Move with WASD/arrows, click the floor, or use the navigation alternative.",
    why: "You can explore the workplace at your own pace; the business clock does not run while learning controls.",
    doneWhen:
      "You have actually moved to the marked spot, or used the accessible movement alternative.",
    teach:
      "You are playing the relationship owner for fictional business customers. Your job is to understand the request, find the evidence, decide the next step, coordinate the right people, and follow through.",
    hints: [
      "Look for the single nearby marker.",
      "Press W briefly; release it to stop. A click on the floor is another way to move.",
      "Use the accessible navigation action if movement is uncomfortable. It teaches the same next work step.",
    ],
  },
  {
    id: "camera",
    objective: "Adjust the view",
    locationId: "home",
    interact: "Drag to rotate the camera, or use the camera alternative.",
    why: "A comfortable view helps you find doors and useful objects; reading screens stay still.",
    doneWhen:
      "You have changed the camera direction or used its accessible alternative.",
    teach:
      "The camera follows your character. Small drags turn the view; you keep control rather than watching a long cinematic.",
    hints: [
      "Move the pointer onto the world before dragging.",
      "Drag a short distance left or right. Menus and text fields keep their normal input.",
      "Use the accessible camera control. You may also recover to a safe view if stuck.",
    ],
  },
  {
    id: "mentor",
    objective: "Meet Morgan Vale, your fictional mentor",
    locationId: "hq",
    interact:
      "Headquarters → E — Talk to your mentor, or open the mentor conversation.",
    why: "Morgan gives you one manageable customer request instead of asking you to choose among the whole campaign.",
    doneWhen:
      "You have interacted with the mentor and acknowledged the welcome.",
    teach:
      "Morgan: “Welcome. You do not need to know tax rules yet. Today we will verify a small business change, choose an owner, keep a promise and check the response. Ask for help whenever you need it.”",
    hints: [
      "Use Show me where or Map to highlight headquarters and the mentor.",
      "Approach until the interaction label is visible, then press E or choose Talk.",
      "Use the mentor interaction from the workbench alternative; it is the same authored welcome.",
    ],
  },
  {
    id: "desk",
    objective: "Open your workstation",
    locationId: "hq",
    interact:
      "Headquarters workstation → E — Open workspace, or choose Open workspace.",
    why: "The desk opens the actual tools used to research, plan, communicate and retain evidence.",
    doneWhen:
      "The workspace is open from the desk interaction or its menu alternative.",
    teach:
      "The world and the workbench use one simulation. Walking is optional; work decisions and saved progress are shared.",
    hints: [
      "Look for the workstation label near your headquarters desk.",
      "Walk up to the desk and press E when Open workstation appears.",
      "Use Open workspace. Closing it later will keep the objective and progress.",
    ],
  },
  {
    id: "inbox",
    objective: "Read Cedarline’s request",
    locationId: "hq",
    panel: "inbox",
    interact: "Workstation → Inbox → Cedarline first-day request",
    why: "Understand the request before offering an answer or promising a result.",
    doneWhen:
      "You have identified what Cedarline wants verified and acknowledged the request.",
    teach:
      "The request is to verify a proposed wholesale launch. You are gathering business facts, not deciding tax law or changing scope.",
    hints: [
      "Open the single first-day request in Inbox.",
      "Look for what changed and what the customer is asking you to confirm.",
      "Restate it: “We need to confirm the portal’s launch facts before updating the account plan.”",
    ],
  },
  {
    id: "calendar",
    objective: "Book a feasible first-day check-in",
    locationId: "hq",
    panel: "calendar",
    interact: "Calendar → book Theo Park within his visible availability",
    why: "A promise needs a time and preparation. A customer check-in is different from a legal deadline.",
    doneWhen:
      "An accepted simulated appointment with Theo Park is recorded in Calendar; reading the calendar alone does not complete this action.",
    teach:
      "A feasible appointment has a named contact, day, time and duration inside that person’s availability. Check for overlaps before booking. This is a simulated check-in, not a real invitation or statutory deadline; help and study do not use working capacity.",
    hints: [
      "Open Calendar and find the appointment form.",
      "Choose Theo Park, then check his availability, the appointment day, start time and duration.",
      "Choose a free slot fully inside Theo’s listed availability and book it. You retain the customer check-in even when Theo supplies a fact.",
    ],
  },
  {
    id: "accounts",
    objective: "Find two facts in Cedarline’s record",
    locationId: "hq",
    panel: "accounts",
    interact: "Accounts → Cedarline Commerce → business record",
    why: "Relevant facts make a discovery conversation useful and prevent assumptions.",
    doneWhen:
      "You have selected the direct/marketplace channel fact and the portal-announcement fact.",
    teach:
      "A confirmed fact is backed by a named record. A hypothesis is something to verify. Cedarline’s existing channels are recorded; “coming soon” does not provide a confirmed launch date.",
    hints: [
      "Read the products/channels and the introductory request record.",
      "Find the channel information and the portal announcement; neither requires personal research about people.",
      "The record supports direct + MarketHub channels. The request says wholesale coming soon, so ask when it actually launches.",
    ],
  },
  {
    id: "journal",
    objective: "Keep a short preparation note",
    locationId: "hq",
    panel: "journal",
    interact: "Journal → save your two facts and one question",
    why: "A note lets you and a colleague recover the fact pattern without relying on memory.",
    doneWhen: "A preparation note has actually been saved.",
    teach:
      "Use a compact structure: confirmed fact + evidence reference; missing information + question; next owner. A note is a work product, not proof of completion.",
    hints: [
      "Open Journal and write one or two sentences.",
      "Include where each fact came from and one thing still unknown.",
      "Example structure: “Direct + MarketHub are recorded. Portal date is unconfirmed. Ask Theo for the launch date and a sample order.”",
    ],
  },
  {
    id: "known-missing",
    objective: "Separate what is known from what is missing",
    locationId: "hq",
    panel: "accounts",
    interact: "First-day worksheet → classify facts and verification questions",
    why: "A useful question resolves an evidence gap instead of pretending an announcement proves an outcome.",
    doneWhen:
      "The known channel/announcement facts and missing launch-date/pilot-record questions are classified.",
    teach:
      "Know the current channels and the announcement. Still verify the launch date and pilot records. An entity or customer-type question may follow, but this exercise does not ask for a legal conclusion.",
    hints: [
      "Compare the statement on the page with the operational records.",
      "Does “coming soon” tell you a completed launch date or show a transaction?",
      "Put current channels and the announcement under Known. Put launch date and pilot transaction evidence under Missing.",
    ],
  },
  {
    id: "owner",
    objective: "Choose the person who can verify the next fact",
    locationId: "hq",
    panel: "tasks",
    interact: "Commitments → retain your check-in and request Theo’s facts",
    why: "The right owner has the relevant knowledge; asking someone to approve everything wastes time and exceeds authority.",
    doneWhen:
      "You retain ownership of the follow-up while naming Theo as the customer fact supplier and Lena as the mapping owner.",
    teach:
      "Theo knows accounting/order records. Lena knows technical channel mappings. A finance sponsor has a different decision role. Your responsibility is to keep the request moving and explain what remains open.",
    hints: [
      "Look at the contact’s role and what they know.",
      "This is a launch/order fact question, not a request for a tax approval or a discount.",
      "Ask Theo for the facts; involve Lena if a mapping question appears. Keep your own customer update commitment.",
    ],
  },
  {
    id: "update",
    objective: "Send a bounded first update",
    locationId: "hq",
    panel: "inbox",
    interact: "First-day update → select or draft the reviewed message",
    why: "The customer needs clarity about known facts, remaining questions and the next action.",
    doneWhen:
      "The update has actually been recorded with fact, uncertainty, owner and next check-in.",
    teach:
      "You can promise a check-in you own. You cannot promise that a portal is live, that every obligation is handled, or that someone completed work without evidence.",
    hints: [
      "Use the facts you recorded rather than a broad assurance.",
      "Include one missing question, the named fact owner and your next check-in.",
      "Try: “The existing channels are recorded. Theo will verify the launch date and pilot records; I will check back at our agreed time.”",
    ],
  },
  {
    id: "followup",
    objective: "Create the follow-up you promised",
    locationId: "hq",
    panel: "tasks",
    interact: "Commitments → create the first-day follow-up",
    why: "Sending a message is not a substitute for owning the work after it leaves your inbox.",
    doneWhen:
      "A task exists with a named owner, due time and expected verification evidence.",
    teach:
      "A follow-up says what must return and who checks it. “Ask Theo” is an action; “verify his response and update the account plan” describes the acceptance condition.",
    hints: [
      "Open Commitments and use the first-day follow-up action.",
      "Check the task’s owner, time and evidence requirement before creating it.",
      "Create a task to review Theo’s reply, retain its evidence and keep missing launch facts assigned. You retain the customer check-in even when Theo supplies facts.",
    ],
  },
  {
    id: "later-response",
    objective: "Review the later simulated reply",
    locationId: "hq",
    panel: "inbox",
    interact: "Inbox → first-day returned response",
    why: "A response becomes evidence only after you inspect what it actually supports.",
    doneWhen:
      "You have opened the returned response when it is available and identified its supported facts.",
    teach:
      "Only the current returned reply can establish new facts. The mentor does not invent offscreen outcomes. If a requested fact is still missing, keep it assigned instead of assuming resolution.",
    hints: [
      "Look for the returned reply rather than re-reading your sent update.",
      "Match the reply to your launch-date and pilot-record questions.",
      "List what the actual reply confirms and any remaining gap. Do not claim facts that are not in that reply.",
    ],
  },
  {
    id: "verify",
    objective: "Verify the reply and close the bounded task",
    locationId: "hq",
    panel: "tasks",
    interact: "Commitments → verify with the returned-response reference",
    why: "Evidence-backed closure protects the customer from a friendly but unfinished promise.",
    doneWhen:
      "The task is verified with the actual response record and any residual work remains owned.",
    teach:
      "Close only the task to review the available reply and document its limits. The launch date and pilot records are still missing: Theo keeps that follow-up, Lena checks any mapping question, and you retain the check-in. Reviewing evidence does not resolve the launch itself.",
    hints: [
      "Compare the returned response with the task’s acceptance condition.",
      "Retain its record reference; identify anything it did not answer.",
      "Verify only the part supported by the response. Name an owner and next time for a remaining question.",
    ],
  },
  {
    id: "debrief",
    objective: "Review the work cycle and choose the next guided application",
    locationId: "hq",
    panel: "reviews",
    interact: "Reviews → retain the first-day lesson → begin guided M-A02",
    why: "Explain the pattern before trying a fuller case: understand, gather evidence, choose an owner, communicate and verify.",
    doneWhen:
      "You have acknowledged the debrief and selected a next guided task or chosen free exploration.",
    teach:
      "You practiced discovery and accountable follow-through. This guided learning does not certify tax knowledge or count as unaided mastery. Next apply the pattern in M-A02, then learn implementation handoff in M-A01 before the notice lifecycle case.",
    hints: [
      "Review the saved note, update and verified follow-up.",
      "Say what changed between the announcement, your question and the returned evidence.",
      "Choose M-A02 in Guided mode. Help remains available; the next task introduces its concepts before decisions.",
    ],
  },
];

interface MissionLesson {
  teach: string;
  question: string;
  considerations: string[];
  why: string;
}
const missionLessons: Record<string, MissionLesson> = {
  "M-A02": {
    teach:
      "Business research prepares a conversation. Separate observed channels and products from a possible change; ask the customer to verify the date, entity and records.",
    question: firstDayCustomerBrief.clarifyingQuestion,
    considerations: [
      "Does the announcement say the portal is live, or only coming soon?",
      "Who can verify launch/order facts, and who can explain technical mappings?",
      "What record would justify an account-plan change?",
    ],
    why: "A good discovery question prevents an assumed launch from becoming an unsupported commitment.",
  },
  "M-A01": {
    teach:
      "A handoff transfers relationship ownership. Scope means the agreed work included for the named entity; an exception is a known item that remains open. Acceptance needs evidence and an owner.",
    question:
      "Which outcomes did the customer accept, and which implementation exceptions remain open?",
    considerations: [
      "Does signed scope cover the requested entity and channel?",
      "Which open defect still needs verification?",
      "Who can approve an operational change?",
    ],
    why: "You can own the relationship without pretending every implementation dependency is complete.",
  },
  "M-A03": {
    teach:
      "A stakeholder is a person involved in the customer outcome. Record supplier, budget approver, systems owner and backup can be different people. Learn their role rather than assume authority from friendliness.",
    question:
      "Who approves this decision, and who covers the practitioner’s absence?",
    considerations: [
      "What does the contact know?",
      "What may they approve?",
      "Who covers the missing owner?",
    ],
    why: "An explicit decision path keeps commitments from failing during leave or a sponsor change.",
  },
  "M-T01": {
    teach:
      "Collection, filing and payment are separate stages in this fictional lifecycle. A filing receipt shows filing acceptance; a scheduled bank instruction is a different record. Your task is to investigate and coordinate within authority.",
    question:
      "What records show each lifecycle stage, and which stage still lacks evidence?",
    considerations: [
      "Which entity and period does the notice name?",
      "What does each receipt actually establish?",
      "Who approves any financial action?",
    ],
    why: "Separating stages prevents both ignored obligations and unauthorized duplicate payments.",
  },
  "M-A04": {
    teach:
      "A clear correction acknowledges what was overstated, states the supported facts, explains uncertainty and owns the next check-in. Candid recovery can improve trust while work remains unresolved.",
    question:
      "What wording needs correction, and what can we safely confirm now?",
    considerations: [
      "What was claimed without evidence?",
      "How does the error affect the customer?",
      "Who verifies the pending fact and when will you update?",
    ],
    why: "A trustworthy update is accurate and recoverable rather than merely reassuring.",
  },
  "M-A05": {
    teach:
      "Plan a finite day around deadlines, dependencies, preparation and buffers. A customer promise and an internal target are different from a legally reviewed deadline. Renegotiate a promise visibly when priorities change.",
    question:
      "Which action must happen first for the urgent review to be useful?",
    considerations: [
      "Which input is needed before the specialist slot?",
      "What can be delegated or rescheduled with agreement?",
      "Where is a contingency buffer?",
    ],
    why: "A feasible plan protects urgent work and keeps changed promises owned.",
  },
  "M-T02": {
    teach:
      "Reconciliation explains a difference between records. In this exercise, tax and credit adjustments have signs and a stated period. Money uses integer cents, and a cash refund is a separate event.",
    question: "Which approved adjustment belongs in this period’s tax bridge?",
    considerations: [
      "Is the amount base, tax or cash?",
      "Is the adjustment approved and in this period?",
      "Does the sign add or reverse the original amount?",
    ],
    why: "A signed bridge is more reliable than estimating tax from a cash payout.",
  },
  "M-T03": {
    teach:
      "A nexus investigation gathers dated business connections and complete sales measures. The exercise does not provide a legal conclusion; a synthetic threshold cannot replace jurisdiction-specific review.",
    question:
      "What dated physical facts and sales-history gaps must the specialist review?",
    considerations: [
      "Which entity, activity and start date are recorded?",
      "Which sales classes and periods does the extract include?",
      "What remains missing before an obligation decision?",
    ],
    why: "Incomplete history cannot justify a confident no-obligation statement.",
  },
  "M-A06": {
    teach:
      "Triage orders work by impact, urgency, uncertainty and reversibility. A dependency is an input needed before another action. Investigate reversible data defects; reserve specialists for the questions requiring their authority.",
    question:
      "Which defect threatens the cutoff, and who can reproduce and fix it?",
    considerations: [
      "Which request threatens an actual checkpoint?",
      "What can operations investigate independently?",
      "What precise question needs an expert?",
    ],
    why: "A bounded packet uses scarce capacity while retaining account ownership.",
  },
  "M-T04": {
    teach:
      "A product fact sheet explains what the customer receives, contract rights, delivery and component charges. A marketing label is a starting point; reviewed classification requires the actual supply and jurisdiction.",
    question: "What do the contract and invoice say the buyer receives?",
    considerations: [
      "Which components are supplied?",
      "Which price/version is actually agreed?",
      "What classification question remains for a reviewer?",
    ],
    why: "Documented supply facts prevent unsupported mappings from a product name.",
  },
  "M-A07": {
    teach:
      "Provenance means where a claim came from. A correction appends what changed and why while preserving the original record. A neat account note cannot substitute for an entity-specific source receipt.",
    question:
      "Which entity does this receipt identify, and how will the correction remain traceable?",
    considerations: [
      "Is this source evidence or a summary?",
      "Do the entity and period match?",
      "What original record and correction rationale must remain?",
    ],
    why: "A colleague must be able to reconstruct the decision and its evidence.",
  },
  "M-T05": {
    teach:
      "Sourcing investigates which location facts matter for a particular supply. Billing, shipping and actual use are different fields. This case gives an approved synthetic allocation and rates only for its arithmetic.",
    question: "What use-location record supports the stated allocation?",
    considerations: [
      "Which address describes payment and which describes use?",
      "Are the allocation and price assumptions verified?",
      "What rounding does the exercise specify?",
    ],
    why: "A convenient address does not replace transaction-relevant location evidence.",
  },
  "M-T06": {
    teach:
      "A certificate supports a specified claim; its existence, completeness and transaction scope are separate checks. The fictional case needs evidence review rather than a blanket exemption.",
    question:
      "Does this document match the purchaser, period and actual purchase use?",
    considerations: [
      "Which lines are for onward sale versus internal use?",
      "Is the required evidence complete?",
      "Who approves scoped treatment?",
    ],
    why: "Matching evidence to the transaction prevents automatic coverage beyond its scope.",
  },
  "M-T07": {
    teach:
      "A channel responsibility map separates contractual seller roles, collection records, platform fees and direct sales. A platform label is not proof of global responsibility. The worksheet uses an explicit fictional coverage assumption.",
    question:
      "Which transactions and tax amounts does the platform evidence actually cover?",
    considerations: [
      "What does the contract and seller invoice identify?",
      "Are fees being confused with tax?",
      "Which direct records still need their own reconciliation?",
    ],
    why: "Channel separation prevents both omitted responsibility and double counting.",
  },
  "M-A08": {
    teach:
      "Health is an evidence-based explanation of outcomes and risks, not a judgment of personality. Friendly feedback, adoption, open defects and budget engagement can tell different parts of the story.",
    question:
      "What evidence supports the positive signal, and what contradicts it?",
    considerations: [
      "What outcome was actually achieved?",
      "What is still unvalidated or unowned?",
      "How confident is the commercial signal?",
    ],
    why: "Trust can improve while operational and renewal risks remain open.",
  },
  "M-A09": {
    teach:
      "An operational review resolves evidence and execution issues. An executive review connects outcomes, risk, options and a decision. A value claim needs a comparable baseline and method.",
    question:
      "What decision does the sponsor need, and what measured outcome supports it?",
    considerations: [
      "Is the comparison like-for-like?",
      "Which uncertainty must stay visible?",
      "What specific decision and owner close the review?",
    ],
    why: "A short decision brief helps more than an unsupported savings claim or a ticket list.",
  },
  "M-T08": {
    teach:
      "Registration, collection start, period, cutoff, approval and filing due date are separate calendar fields. The case’s dates are fictional and already bounded by its training reviewer.",
    question: "Which reviewed date controls each operational dependency?",
    considerations: [
      "Which entity does the confirmation name?",
      "Are collection start and first return being mixed?",
      "Who approves and verifies enablement?",
    ],
    why: "Separate dates prevent an operational gap between launch and filing.",
  },
  "M-T09": {
    teach:
      "A control total is an independent amount used to check completeness. Trace records through import, correction and draft; transport success is different from correctness. Preserve original and corrected versions.",
    question: "Which stable source record explains the difference?",
    considerations: [
      "Is a repeated ID a duplicate or a distinct transaction?",
      "Does the corrected total match the source?",
      "What approval and acceptance evidence is still required?",
    ],
    why: "A source-backed bridge supports review before any simulated submission.",
  },
  "M-A10": {
    teach:
      "A renewal is a customer decision about recurring scope. A forecast records evidence and uncertainty; a champion’s support is not budget approval or signature. Commercial offers need authorized review.",
    question:
      "Which budget, scope and procurement steps remain before signature?",
    considerations: [
      "Who has decision authority?",
      "What lead time does procurement require?",
      "What is observed, assumed or approved in the forecast?",
    ],
    why: "An honest forecast helps the team act on risk without manufacturing certainty.",
  },
  "M-A11": {
    teach:
      "Expansion starts with a verified need and an appropriate scope. Offer staged options and success criteria; declining an unsuitable or badly timed request can protect trust.",
    question:
      "What outcome does the customer need before any expanded support is appropriate?",
    considerations: [
      "Is the need inside the supported scope?",
      "What immediate priority could an offer displace?",
      "What approval and success evidence are required?",
    ],
    why: "Customer fit and timing matter more than forcing a larger contract.",
  },
  "M-T10": {
    teach:
      "A notice packet identifies entity, period, issue, amount, response checkpoint and source records. Historical or legal questions need qualified review; the AM gathers facts and keeps the response owned.",
    question:
      "What does the letter identify, and which original records are missing?",
    considerations: [
      "Is the named entity/period matched?",
      "What checkpoint must be protected?",
      "Which conclusion or financial action exceeds your authority?",
    ],
    why: "A bounded factual packet protects urgency without making unsupported admissions or guarantees.",
  },
  "M-T11": {
    teach:
      "The exercise separates arithmetic from eligibility. Output and approved recoverable input amounts are stated assumptions; an unreviewed purchase amount or customer status is a separate specialist question.",
    question: "Which recovery amount is expressly approved for this worksheet?",
    considerations: [
      "Is eligibility stated or merely assumed?",
      "Are currency and unit explicit?",
      "Which customer/service facts remain unverified?",
    ],
    why: "Correct arithmetic does not itself establish a real tax-law entitlement.",
  },
  "M-T12": {
    teach:
      "Compare markets by supplier, supply, customer, channel and establishment facts. The case does not provide one global tax setting; EU, UK and Canadian review paths are separate.",
    question:
      "Which facts and review gates are needed for each proposed market?",
    considerations: [
      "Are these goods or services?",
      "Which jurisdiction and channel does evidence cover?",
      "Which establishment/status or provincial questions remain?",
    ],
    why: "A staged, evidenced launch is safer than copying a regime label between countries.",
  },
  "M-A12": {
    teach:
      "An improvement pilot compares the same method and acceptance criteria before and after a bounded change. Keep human review, provenance, rollback and data permission. Optional AI remains disabled.",
    question:
      "What baseline, acceptance test and rollback make this improvement verifiable?",
    considerations: [
      "Is the comparison measured rather than guessed?",
      "Who reviews results and retains authority?",
      "Would any proposal send data to an unapproved service?",
    ],
    why: "A useful automation saves effort without inventing approvals or evidence.",
  },
};

const stepConcepts: Record<
  Step["kind"],
  {
    objective: string;
    panel: string;
    interact: string;
    teach: string;
    doneWhen: string;
    considerations: string[];
    demonstration: string;
  }
> = {
  research: {
    objective: "Prepare a business and evidence brief",
    panel: "research",
    interact: "Open the current case packet and customer record",
    teach:
      "Separate confirmed records, hypotheses and verification questions before responding.",
    doneWhen:
      "You have recorded the relevant facts, their source references and a question to verify.",
    considerations: [
      "Which record supports the observation?",
      "What is still only an assumption?",
    ],
    demonstration:
      "Make a three-line brief: confirmed fact + source; missing information + question; person who can verify it.",
  },
  meeting: {
    objective: "Ask a useful clarifying question",
    panel: "people",
    interact: "Meet the named contact or use the remote conversation",
    teach:
      "State purpose, ask an open question, listen, and summarize. Use the contact’s stated knowledge and authority.",
    doneWhen:
      "You have asked or selected a fact-based question and summarized the response within the contact’s role.",
    considerations: [
      "Can this contact know the fact?",
      "Can this contact authorize the decision?",
    ],
    demonstration:
      "Open with: “I want to understand what changed before we update the plan. What can you verify, and which record should we review?”",
  },
  calculation: {
    objective: "Reconcile the stated exercise amounts",
    panel: "reconciliation",
    interact: "Use the current worksheet and its stated units",
    teach:
      "Identify base, tax, signed adjustments, period, units and rounding before calculating. Synthetic assumptions apply only to this exercise.",
    doneWhen:
      "Your calculation uses the stated units and assumptions and the bridge explains its source amounts.",
    considerations: [
      "Are you using base, gross, tax or a percentage?",
      "Which adjustment sign and rounding are stated?",
    ],
    demonstration:
      "In a separate toy ledger, original tax is 900 cents and approved credit tax is -100 cents: 900 + (-100) = 800 cents. Show the signs and record references.",
  },
  investigate: {
    objective: "Find the evidence gap and a bounded next action",
    panel: "research",
    interact: "Compare the current documents and issue facts",
    teach:
      "Explain what each document supports. Choose a reversible investigation where possible and reserve approvals for the authorized role.",
    doneWhen:
      "You have identified the material evidence gap and chosen an action within your authority.",
    considerations: [
      "What does the record prove, and what does it not prove?",
      "Which uncertainty changes the next action?",
    ],
    demonstration:
      "Write “record says …; still missing …; next verification …; owner …”. Do not write “resolved” just because a request was sent.",
  },
  coordinate: {
    objective: "Assign the appropriate owner and dependency",
    panel: "tasks",
    interact: "Coordinate with the named specialist, commercial lead or mentor",
    teach:
      "Bring the entity, period, source references, precise question and checkpoint. Keep ownership of the customer update while another person supplies expertise.",
    doneWhen:
      "A scoped request has an authorized owner, expected evidence and a follow-up checkpoint.",
    considerations: [
      "Is the packet ready for this person?",
      "Which independent preparation can you do first?",
    ],
    demonstration:
      "A request format: “For [entity/period], records [IDs] show [fact]. Please review [one question] by [checkpoint]. I retain the customer update.”",
  },
  communicate: {
    objective: "Record a clear and bounded customer update",
    panel: "inbox",
    interact: "Draft/select the update and perform its transparent self-review",
    teach:
      "Use confirmed fact, impact, uncertainty, named owner and next check-in. Your draft is compared with a visible rubric; no expert text model is grading it.",
    doneWhen:
      "The update is recorded with its fact, remaining question, owner and next time.",
    considerations: [
      "What can you safely confirm or promise?",
      "Does the customer know the next owner and checkpoint?",
    ],
    demonstration:
      "“We verified [recorded fact]. [Question] remains open. [Owner] will review [evidence]; I will update you at [agreed time].”",
  },
  followup: {
    objective: "Verify the promised response",
    panel: "tasks",
    interact: "Inspect the current returned record and verify the commitment",
    teach:
      "Compare the returned evidence with the original request. Do not assume a friendly reply, an instruction or a sent email establishes acceptance.",
    doneWhen:
      "The relevant response is inspected and retained; supported work is verified and residual questions stay owned.",
    considerations: [
      "Does the response answer the actual question?",
      "What acceptance condition still needs evidence?",
    ],
    demonstration:
      "Retain the response reference, record the part it verifies, and create a named next checkpoint for any gap. Do not invent a missing outcome.",
  },
  review: {
    objective: "Close the bounded case and explain the learning",
    panel: "reviews",
    interact: "Review the attempt, evidence, update and residual work",
    teach:
      "Explain what changed, why it mattered, what remains uncertain and which case would test the concept differently. Preserve the original attempt.",
    doneWhen:
      "The evidence trail and customer update are retained and every residual obligation has an owner and next time.",
    considerations: [
      "What is verified rather than merely discussed?",
      "What needs a different-case retry or specialist review?",
    ],
    demonstration:
      "Debrief in four sentences: situation; evidence/action; verified result; remaining owner/next learning task.",
  },
};
const termsByKind: Record<Step["kind"], [string, string][]> = {
  research: [
    ["confirmed fact", "A statement supported by a named available record."],
    ["hypothesis", "A possible explanation that still needs verification."],
    [
      "discovery",
      "A conversation that clarifies the business and its priorities.",
    ],
  ],
  meeting: [
    ["agenda", "The agreed purpose and order of a conversation."],
    ["authority", "Permission to make a particular decision."],
    [
      "clarifying question",
      "A question that resolves a specific missing or ambiguous fact.",
    ],
  ],
  calculation: [
    ["minor unit", "The smallest recorded currency unit, such as a cent."],
    [
      "reconciliation",
      "A bridge explaining differences between source amounts.",
    ],
    [
      "rounding",
      "The stated rule for turning a calculation into recorded units.",
    ],
  ],
  investigate: [
    ["evidence", "A record that supports a specific claim."],
    ["scope", "The transactions or work included in an agreement or review."],
    ["uncertainty", "A known limit in the facts or conclusion."],
  ],
  coordinate: [
    ["dependency", "An input or decision needed before another action."],
    ["owner", "The named person accountable for an action."],
    ["checkpoint", "The agreed time to review progress or evidence."],
  ],
  communicate: [
    ["commitment", "An owned deliverable with an agreed time."],
    [
      "bounded update",
      "A message that clearly limits claims to supported facts.",
    ],
    ["self-review", "Checking your own draft against the visible rubric."],
  ],
  followup: [
    [
      "acceptance evidence",
      "A record supporting the stated completion condition.",
    ],
    ["residual work", "A specific remaining question or action with an owner."],
    ["verification", "Comparing a response with the promised outcome."],
  ],
  review: [
    ["debrief", "An explanation of the evidence, actions and learning."],
    [
      "independent attempt",
      "An application with assistance accurately recorded.",
    ],
    [
      "audit trail",
      "The retained history of original records, actions and corrections.",
    ],
  ],
};

export interface StepGuidance {
  objective: string;
  locationId: string;
  panel: string;
  interact: string;
  why: string;
  doneWhen: string;
  teach: string;
  terms: { term: string; definition: string }[];
  considerations: string[];
  hints: [string, string, string];
  demonstration: string;
  evidenceIds: string[];
  sourceIds: string[];
  nextConcept: string;
  automaticTeaching: boolean;
}
function lessonFor(mission: Mission): MissionLesson {
  const direct =
    missionLessons[mission.id] ?? advancedMissionLessons[mission.id];
  if (direct) return direct;
  const first = mission.competencyIds[0],
    core = missionLessons[`M-${first}`];
  return (
    core ?? {
      teach:
        "Use the visible case facts and relevant lesson to build a supported next action.",
      question:
        "Which fact, owner and verification will move the request forward?",
      considerations: [
        "What is confirmed?",
        "What remains missing?",
        "Who owns verification?",
      ],
      why: "Supported action and follow-through connect learning with the customer outcome.",
    }
  );
}
export function getStepGuidance(
  pack: ContentPack,
  missionId: string,
  stepId: string,
  mode: GuidanceMode = "guided",
  visibleDocumentIds?: string[],
): StepGuidance | undefined {
  const mission = pack.missions.find((m) => m.id === missionId),
    s = mission?.steps.find((item) => item.id === stepId);
  if (!mission || !s) return undefined;
  const lesson = lessonFor(mission),
    concept = stepConcepts[s.kind],
    visible = new Set(visibleDocumentIds ?? s.documentIds);
  const evidenceIds = s.documentIds.filter((id) => visible.has(id));
  const titles = evidenceIds
    .map((id) => pack.documents.find((d) => d.id === id)?.title)
    .filter((t): t is string => Boolean(t));
  const contact = s.npcId
    ? pack.contacts.find((c) => c.id === s.npcId)
    : undefined;
  const point = contact
    ? `Use ${contact.name}'s role, knowledge and authority record. If unavailable, prepare the packet, use a remote appointment or review the next available time.`
    : titles.length
      ? `Open ${titles.join("; ")}. Keep its reference beside the claim it supports.`
      : "Use the current step instructions and the available customer record; do not assume an unseen response.";
  const core =
    mission.id === "M-A02"
      ? `${lesson.teach} The announcement says coming soon; the launch date still needs verification.`
      : lesson.teach;
  let demonstration = concept.demonstration;
  if (mission.id === "M-A02" && s.kind === "meeting")
    demonstration = firstDayCustomerBrief.clarifyingQuestion;
  if (mission.id === "M-T05" && s.kind === "calculation")
    demonstration =
      "Different toy example: allocate 3,000 cents as A=1,000 and B=2,000; synthetic rates A=5%, B=10% yield 50+200=250 cents. Use your actual worksheet’s assumptions, not these toy numbers.";
  if (mission.id === "X-T02" && s.kind === "calculation")
    demonstration =
      "Different toy example: inclusive gross 11,000 cents at synthetic 10% gives base 11,000/1.10=10,000 and tax 1,000. Inclusive gross is not the exclusive tax base.";
  if (mission.id === "X-A10" && s.kind === "calculation")
    demonstration =
      "Different toy cohort: opening value 100, loss 10 and same-cohort expansion 5 gives (100−10+5)/100×100=95%. Define the denominator and exclude new-logo revenue.";
  const next = mission.steps[mission.steps.indexOf(s) + 1];
  return {
    objective: concept.objective,
    locationId: s.location,
    panel: concept.panel,
    interact: contact
      ? `${concept.interact}: ${contact.name}`
      : concept.interact,
    why: lesson.why,
    doneWhen: concept.doneWhen,
    teach: `${concept.teach} ${core}`,
    terms: termsByKind[s.kind].map(([term, definition]) => ({
      term,
      definition,
    })),
    considerations: [
      ...concept.considerations,
      lesson.question,
      ...lesson.considerations,
    ],
    hints: [
      `${concept.objective}. ${lesson.why}`,
      point,
      `${demonstration} This is authored practice based on available evidence, not a live AI or a hidden completed outcome.`,
    ],
    demonstration,
    evidenceIds,
    sourceIds: s.sourceIds,
    nextConcept: next
      ? `Next you will ${stepConcepts[next.kind].objective.toLowerCase()}. ${stepConcepts[next.kind].teach}`
      : "Next compare the attempt with its rubric and try a different case or the next guided task.",
    automaticTeaching: modeDefinitions[mode].automaticTeaching,
  };
}

export interface BootcampGuidance {
  session: number;
  mode: GuidanceMode;
  goal: string;
  teachFirst: string;
  demonstration: string;
  practice: string;
  doneWhen: string;
  next: string;
}
const bootcampGuidance: BootcampGuidance[] = [
  {
    session: 1,
    mode: "guided",
    goal: "Understand a request, ask a useful question and keep a verified follow-up.",
    teachFirst:
      "Begin with the first-day Cedarline discovery practice, then M-A02 and M-A01. Explain fact versus hypothesis, owner versus approver, and message versus verified resolution before introducing the notice lifecycle.",
    demonstration: firstDayCustomerBrief.clarifyingQuestion,
    practice:
      "Prepare two sourced facts and a missing question; select an appropriate owner, record an update, create a follow-up and inspect its returned evidence.",
    doneWhen:
      "Your guided work products show the request, evidence, owner, update and verified follow-through. Guided history stays learning practice.",
    next: "Next identify stakeholder authority and plan a finite day; learn units and signs before financial arithmetic.",
  },
  {
    session: 2,
    mode: "guided",
    goal: "Use a stakeholder map and a feasible plan to prepare the next work.",
    teachFirst:
      "Introduce record supplier, budget approver, systems owner and backup. Explain preparation, dependency and buffer. Teach cents, base, tax, credit sign and period before M-T02.",
    demonstration:
      "A practitioner can supply records while a sponsor approves budget. In a different toy ledger, tax 900 plus credit -100 gives net 800 cents.",
    practice:
      "Build a backup/approval map and a short day plan, then reconcile the stated case amounts and investigate dated business connections.",
    doneWhen:
      "The plan names owners and preparation time; the worksheet has units and signed adjustments; unreviewed legal questions remain bounded.",
    next: "Next choose investigation tools with fewer automatic directions; optional hints remain available.",
  },
  {
    session: 3,
    mode: "assisted",
    goal: "Prepare the product, location and evidence packet before requesting a decision.",
    teachFirst:
      "Review supply facts versus marketing labels, relevant address/use evidence, risk triage and append-only correction trails.",
    demonstration:
      "A short packet reads: entity/period, source IDs, confirmed supply/location facts, one missing question, proposed owner and checkpoint.",
    practice:
      "Choose your research and coordination tools; use hints when the packet is not yet ready. Preserve the original and corrected record.",
    doneWhen:
      "Another colleague can identify the fact pattern, review question and correction history from your work.",
    next: "Next assess certificate/channel evidence and account health rather than rely on a label or sentiment.",
  },
  {
    session: 4,
    mode: "assisted",
    goal: "Check scope and explain account outcomes with mixed evidence.",
    teachFirst:
      "Introduce certificate completeness versus transaction scope, direct/platform channel coverage, health confidence and comparable value baselines.",
    demonstration:
      "Friendly feedback can be true while an adoption gap remains open. State both observations and the next verification instead of forcing one green score.",
    practice:
      "Use current records to test scope and channel coverage; present a measured outcome, remaining risk and decision request.",
    doneWhen:
      "Your explanation preserves contradictions, source references and review boundaries without unsupported savings.",
    next: "Next build separate operational dates and an evidence-based commercial plan.",
  },
  {
    session: 5,
    mode: "assisted",
    goal: "Coordinate operational readiness with honest renewal and scope decisions.",
    teachFirst:
      "Separate collection start, period, cutoff, approval and acceptance; distinguish champion support from budget/signature evidence and appropriate expansion fit.",
    demonstration:
      "“The draft reconciles; approval is pending. The sponsor decides scope. The practitioner supplies records. I own the next customer check-in.”",
    practice:
      "Prepare the date/owner map, verify control totals and choose a renewal or expansion plan supported by the customer’s actual priority.",
    doneWhen:
      "The plan is feasible, approvals are explicit and uncertainty remains visible; no unauthorized commercial promise is recorded.",
    next: "Next handle specialist-led historical and international questions with the same evidence discipline.",
  },
  {
    session: 6,
    mode: "independent",
    goal: "Apply evidence discipline across notices, international facts and operational improvement.",
    teachFirst:
      "Optional recap: notice entity/period/checkpoint, customer status and establishment, jurisdiction-specific research, pilot baseline, reviewer and rollback. Sources remain professional-review pending.",
    demonstration:
      "A bounded launch gate lists the unresolved facts, each qualified reviewer, the reversible preparation and the decision needed before release.",
    practice:
      "Use normal tools to select priorities and owners. Optional help remains available and is recorded; do not create authoritative legal conclusions from unreviewed sources.",
    doneWhen:
      "Structured actions and retained work products support the result; assistance and unresolved professional-review needs are inspectable.",
    next: "Next demonstrate the work across several customers and constrained specialist capacity.",
  },
  {
    session: 7,
    mode: "independent",
    goal: "Own a portfolio day and recover from competing obligations.",
    teachFirst:
      "Brief optional recap: hard checkpoint versus customer promise, ready fact packets, delegated reversible work, interim updates and evidence-backed closing review.",
    demonstration:
      "A portfolio plan separates the urgent specialist question, the operations correction and the customer update, with one owner and checkpoint for each.",
    practice:
      "Complete C01 and the prerequisite advanced cases before C02. Explain how you protected the customer outcomes when priorities conflicted.",
    doneWhen:
      "Actual progression unlocks the portfolio case; each obligation has evidence or an owned carryover. A helped attempt remains accurately labeled.",
    next: "Use the review queue for a different-case retry; continue toward sponsor-transition and international-acquisition capstones.",
  },
];
export function getBootcampGuidance(
  session: number,
): BootcampGuidance | undefined {
  return bootcampGuidance.find((item) => item.session === session);
}

export const workToolGuidance = {
  inbox: {
    purpose: "Understand the request and record the customer update.",
    action:
      "Identify what is being asked, what you can confirm and what still needs verification.",
    doneWhen: "A request or update is retained with the next owned action.",
  },
  calendar: {
    purpose:
      "Make commitments feasible with preparation, availability and buffers.",
    action:
      "Review the next promise, required inputs and owner before booking another action.",
    doneWhen:
      "Your appointment and follow-up times can fit without an unowned conflict.",
  },
  accounts: {
    purpose: "Learn the business before making a scope or tax-review request.",
    action:
      "Record products, channels, entity and a relevant change; label confidence.",
    doneWhen:
      "A colleague can distinguish known facts from hypotheses and questions.",
  },
  people: {
    purpose: "Find the person with the right knowledge and decision authority.",
    action:
      "Check what the contact knows, can approve and prefers; identify a backup.",
    doneWhen:
      "The fact supplier, approver, technical owner and customer check-in are named.",
  },
  research: {
    purpose: "Match claims to actual source records and period.",
    action:
      "Read the current packet; retain references and identify one material gap.",
    doneWhen: "The next question is precise and does not assume unseen facts.",
  },
  journal: {
    purpose: "Preserve decisions, evidence and corrections.",
    action:
      "Save a fact/question/owner note with record IDs instead of only a general impression.",
    doneWhen:
      "The decision can be reconstructed without erasing the original record.",
  },
  tasks: {
    purpose: "Own a promise through response verification.",
    action:
      "Create a named follow-up, inspect the returned evidence and verify acceptance.",
    doneWhen: "Supported work is verified and residual work remains owned.",
  },
  issues: {
    purpose:
      "Keep unresolved customer risks visible until evidence supports closure.",
    action:
      "Distinguish an update from a resolved issue; check source, approval and acceptance stages.",
    doneWhen:
      "The bounded issue is verified or has an explicit residual owner and checkpoint.",
  },
  plans: {
    purpose: "Turn customer priorities into a feasible forward plan.",
    action: "Write an outcome, evidence, owner, dependency and review date.",
    doneWhen:
      "The customer need and each next action are clear and authorized.",
  },
  reviews: {
    purpose: "Explain outcomes, uncertainty and learning with evidence.",
    action:
      "Use a comparable baseline and a concrete decision request; inspect attempt assistance.",
    doneWhen:
      "Value claims are supported and the next review or retry is explicit.",
  },
  renewals: {
    purpose: "Prepare an honest customer decision and forecast.",
    action:
      "Verify budget authority, scope, value evidence and procurement timing before confidence or offers.",
    doneWhen:
      "Confidence has supporting records, missing milestones are owned and offers are approved.",
  },
};
