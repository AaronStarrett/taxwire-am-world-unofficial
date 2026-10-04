/** Teaching questions derived only from each opening packet, never its later response or grade key. */
export interface ContextLesson {
  teach: string;
  question: string;
  considerations: string[];
  why: string;
}
type LessonSeed = [string, string, string, string[], string];
const lessons: LessonSeed[] = [
  [
    "X-T01",
    "A rejected instruction is an execution exception. Preserve the failure record, distinguish it from accepted filing, and require authorized correction plus actual acceptance before closure.",
    "Which execution stage failed, and what would verify a controlled recovery?",
    [
      "Does the record say rejected, scheduled or accepted?",
      "Could a later attempt already exist?",
      "Who authorizes correction, and who retains the checkpoint?",
    ],
    "Repeated submission can create a second problem while a filing receipt still leaves payment unresolved.",
  ],
  [
    "X-T02",
    "An inclusive price contains both base and tax. Recover the base using the stated synthetic rate, then separate the credit period from the cash-refund date. This is approved exercise arithmetic.",
    "What amount does the worksheet ask for, and which record determines its period?",
    [
      "Is the invoice amount inclusive gross or exclusive base?",
      "Does the approved credit reverse the whole invoice?",
      "Which event belongs to the later cash record?",
    ],
    "Using gross as a tax base or treating bank timing as a period rule breaks the bridge.",
  ],
  [
    "X-T03",
    "A sales comparison needs a defined basis and complete window. Gross, taxable and resale measures differ. Missing history and a dated employee connection are separate review questions.",
    "Which report definitions and missing periods prevent a reliable comparison?",
    [
      "Do the reports include the same sales classes and months?",
      "What does the employee-location record actually date?",
      "Which authority and effective date still need review?",
    ],
    "Selecting a convenient smaller number does not repair inconsistent or incomplete evidence.",
  ],
  [
    "X-T04",
    "A signed contract and a proposed appendix have different authority. Document the actual hardware, software rights and maintenance before classification review; preparation can remain reversible while approval is pending.",
    "Which supply and price facts are agreed, and which are merely proposed?",
    [
      "Which contract version has approval?",
      "Which deliveries, rights and support promises are supplied?",
      "What can be tested without enabling an unreviewed mapping?",
    ],
    "A near launch date does not turn an unsigned pricing split into an approved fact.",
  ],
  [
    "X-T05",
    "Location evidence is meaningful only for its stated supply. Event venue, attendance, virtual access and billing headquarters describe different facts; a software allocation rule cannot simply be copied to every ticket.",
    "Which supply does each order describe, and what location field is relevant to the review?",
    [
      "Is the order attendance, virtual access or sponsorship?",
      "What does each address or access log measure?",
      "Which supply-specific exception needs qualified review?",
    ],
    "A useful investigation preserves distinctions instead of choosing the most convenient address.",
  ],
  [
    "X-T06",
    "A certificate dispute involves purchase use, document scope and relationship recovery. Listen neutrally, separate established resale evidence from the disputed giveaway order, and keep financial decisions with the approver.",
    "Which original record and stated purchase use need a scoped review?",
    [
      "Does the new order match the supported resale use?",
      "What evidence supported the historic mapping?",
      "Who can approve a refund after review?",
    ],
    "Respectful disagreement can preserve trust without promising unsupported treatment.",
  ],
  [
    "X-T07",
    "An operational channel label is not a contract. Compare the named seller, service agreement, invoice and actual collection record before assigning responsibility or excluding transactions.",
    "What evidence establishes the seller and the provider’s actual contracted role?",
    [
      "Is there a separate service agreement?",
      "Who is named on the invoice?",
      "What is still unverified in the collection record?",
    ],
    "A dashboard abbreviation cannot carry a conclusion the source contract does not establish.",
  ],
  [
    "X-T08",
    "An account may contain several legal entities. Each reviewed schedule, effective date, approval and bank authority needs its own evidence; a consolidated default is only a convenience.",
    "Which entity-specific record was replaced by the shared calendar default?",
    [
      "Are the reviewed period schedules the same?",
      "Which dates and approvals belong to each entity?",
      "What dry-run evidence would validate a correction?",
    ],
    "Copying parent settings can conceal a distinct acquired-entity dependency.",
  ],
  [
    "X-T09",
    "A locked draft is still a draft. Preserve the original snapshot, approval and late correction event; describe the change according to the actual submission stage and obtain renewed review.",
    "Was anything filed, and what approved correction belongs in the version bridge?",
    [
      "What does the actual acceptance status show?",
      "Is the credit approved for this exercise period?",
      "Who reviews the revised version?",
    ],
    "A versioned correction explains the difference without inventing a filed amendment.",
  ],
  [
    "X-T10",
    "An undocumented recollection is a lead, not a liability calculation. Historical work needs transaction and registration evidence, period boundaries and qualified advice; keep current operations separately owned.",
    "Which history is original evidence, which is recollection, and what remains missing?",
    [
      "Are raw sales and registration dates available?",
      "Which periods lack located receipts?",
      "Which options require tax or legal review rather than an AM promise?",
    ],
    "A reassuring guaranteed penalty outcome would hide the actual uncertainty.",
  ],
  [
    "X-T11",
    "An email domain or online plan is not sufficient status evidence. Match the invoice entity, customer-status record, receiving establishment and actual service before requesting cross-border treatment review.",
    "Which identity or establishment facts are inconsistent or absent?",
    [
      "Does the uploaded evidence identify the invoiced entity?",
      "What service is received by which establishment?",
      "Which invoicing decision remains provisional?",
    ],
    "A mismatch should produce a precise evidence request rather than an assumed treatment.",
  ],
  [
    "X-T12",
    "International readiness has both channel and jurisdiction gates. A defined platform contract can cover a listed channel while direct supplies still need their own establishment, customer and regime facts.",
    "What does the contract cover, and which direct-channel questions remain separate?",
    [
      "Is the supply digital access or imported goods?",
      "Which territories and transactions are listed?",
      "What Canadian provincial questions remain unreviewed?",
    ],
    "Contract coverage in one channel does not establish global readiness.",
  ],
  [
    "X-A01",
    "When expectations exceed signed scope, own the urgent request while clarifying the boundary. A bounded transitional option needs the appropriate approver and a retained notice checkpoint.",
    "What did the signed scope include, and what urgent item still needs an owner?",
    [
      "Which entity does the scope name?",
      "Where did the wider expectation originate?",
      "Who can approve additional support?",
    ],
    "Scope recovery combines truthful boundaries with accountable triage.",
  ],
  [
    "X-A02",
    "Research confidence depends on date and operational corroboration. A dated transfer log and an event poster can reveal a change, while staff activity and the precise entity may still require confirmation.",
    "Which current operating evidence contradicts the old online-only page?",
    [
      "How old is each source?",
      "What do inventory movement and the poster actually establish?",
      "Who can verify staffing and dates?",
    ],
    "A stale marketing page cannot establish that the current business has no physical activity.",
  ],
  [
    "X-A03",
    "Champion transition is a continuity and decision-path problem. Arrange an authorized introduction, clarify record access and backup, and revisit criteria and forecast with the incoming sponsor.",
    "What customer continuity and approval work must occur before the departure?",
    [
      "How do departure and renewal dates overlap?",
      "Has the incoming sponsor received the value review?",
      "Is record-access backup confirmed?",
    ],
    "A warm outgoing relationship cannot substitute for the successor’s decision evidence.",
  ],
  [
    "X-A04",
    "Value recovery begins by correcting unsupported attribution. A comparable measured outcome can remain useful while a time or savings estimate needs a separate baseline, method and decision.",
    "What can be substantiated now, and what measurement is needed for the challenged claim?",
    [
      "Was staff time actually measured?",
      "Are the defect samples comparable?",
      "What does the CFO need to decide?",
    ],
    "Withdrawing an unsupported number preserves the supported result and a credible next step.",
  ],
  [
    "X-A05",
    "Cross-account planning includes preparation and travel or remote options, not just meeting start times. Protect a checkpoint with feasible sequencing, delegation and a communicated interim update.",
    "Which input must be ready for the scarce slot, and which promise needs recovery?",
    [
      "Do preparation and appointments overlap?",
      "Can a colleague do bounded work in parallel?",
      "Where is the buffer and customer acknowledgment?",
    ],
    "A calendar conflict remains unresolved until the actual commitments are changed or supported.",
  ],
  [
    "X-A06",
    "Scarce expert time should receive a specialist-ready question. First collect notice identity, period, source references and the specific decision; independently gather reversible operations inputs.",
    "Which missing notice fields make the review request unusable?",
    [
      "Does the packet identify entity, period and notice ID?",
      "Which receipt work can operations do separately?",
      "What exact expert question threatens the checkpoint?",
    ],
    "A complete bounded packet makes a single useful review slot possible.",
  ],
  [
    "X-A07",
    "A filename is not record identity. Preserve source versions and approval timestamps, explain the difference in an append-only bridge, and obtain renewed approval for a changed draft.",
    "What identifies each source version and explains the delta?",
    [
      "Which original version remains preserved?",
      "What approved correction caused the change?",
      "Which revised draft needs review?",
    ],
    "Traceable corrections let a colleague reconstruct the result without overwriting history.",
  ],
  [
    "X-A08",
    "Fewer tickets can mean recovery or disengagement. Compare usage, validation, workaround burden and customer close outcomes before interpreting the health signal.",
    "What behavior explains the quieter queue, and what outcome evidence is missing?",
    [
      "Has the major feed actually submitted?",
      "Is the customer doing manual work instead?",
      "What acceptance record would demonstrate recovery?",
    ],
    "Silence should trigger verification when adoption evidence contradicts the positive story.",
  ],
  [
    "X-A09",
    "An executive review makes a decision understandable: material gaps, credible options, owner and consequence. Keep the detailed operational record in a traceable appendix rather than burying the decision.",
    "Which launch decision does the sponsor need, and what evidence is still missing?",
    [
      "What is actually approved?",
      "Which channels can be staged or postponed?",
      "Who owns each unresolved input and the final decision?",
    ],
    "A concise options brief helps a sponsor act while preserving uncertainty and authority.",
  ],
  [
    "X-A10",
    "Retention metrics need a defined starting cohort. GRR removes loss from the opening value; NRR also includes that cohort’s expansion. New-logo revenue is separate, and expansion does not erase underlying contraction.",
    "Which numerator and denominator belong to the stated retention measure?",
    [
      "Are all changes from the same opening cohort?",
      "Where is contraction shown separately?",
      "Do the underlying account decisions have evidence?",
    ],
    "A transparent bridge explains the metric without turning an aggregate into a renewal guarantee.",
  ],
  [
    "X-A11",
    "A useful account plan can recommend stabilization before growth. Match the offer to the customer’s actual priority, retain known acceptance defects, and require evidence and approval for any later pilot.",
    "What work best serves the stated close-reliability priority now?",
    [
      "Which current feeds lack acceptance?",
      "Which international establishment/status facts are missing?",
      "Who approves a limited discovery or offer?",
    ],
    "Appropriate expansion preserves trust when declining or staging a broader request is justified.",
  ],
  [
    "X-A12",
    "Generated wording cannot create completed work or evidence. A coaching proposal must stay within supplied fictional facts, explicit permissions, transparent rubrics and human acceptance; optional AI remains disabled.",
    "What evidence and permission would be required before this proposal could be considered?",
    [
      "Does the claimed completion have an acceptance record?",
      "Has any provider or data transfer been authorized?",
      "Who reviews the bounded output and verifies accuracy?",
    ],
    "An attractive automation demo must not become fabricated execution or unauthorized disclosure.",
  ],
  [
    "C01",
    "Portfolio ownership separates each customer’s request, evidence, deadline and owner. Build a feasible sequence across lifecycle evidence, a signed financial bridge and stakeholder continuity.",
    "How will you protect all three obligations rather than finish only the easy item?",
    [
      "Which missing evidence needs operations?",
      "Which worksheet assumptions are explicit?",
      "Who verifies the practitioner backup and each customer check-in?",
    ],
    "Independent judgment includes owned carryover and honest incomplete work.",
  ],
  [
    "C02",
    "A deadline collision needs triage and recovery. Reserve scarce expertise for the historical notice question, assign the reversible data correction to operations, and retain the executive promise.",
    "Which specialist, operations and communication work can proceed in parallel?",
    [
      "Which obligation has the reviewed hard checkpoint?",
      "Is the data problem reproducible with a stable key?",
      "What interim brief or reschedule needs customer agreement?",
    ],
    "A recoverable plan makes competing duties explicit rather than abandoning one silently.",
  ],
  [
    "C03",
    "Renewal strategy connects authority transition, evidenced value, procurement lead time and scope. Record uncertainty honestly and keep any new-plant support separate from the current agreement.",
    "What decisions, introductions and evidence must be ready before procurement and renewal?",
    [
      "Which successor criteria and budget approval are missing?",
      "Which outcomes are measured rather than claimed?",
      "Who approves the new scope option and continuity backup?",
    ],
    "An outgoing champion’s enthusiasm does not resolve a new CFO’s decision or expanded scope.",
  ],
  [
    "C04",
    "Complex launch readiness is a dependency map: separate entity history, actual supply, contract/channel responsibility and jurisdiction-specific review. Use reversible preparation and explicitly staged decisions.",
    "Which entity, product, channel and geography gates prevent a global launch conclusion?",
    [
      "What acquired-entity history is incomplete?",
      "Do contracts and invoices identify the same seller?",
      "Which direct channels and provincial questions lack review?",
    ],
    "Account consolidation and one platform contract cannot substitute for separate evidence and qualified decisions.",
  ],
];
export const advancedMissionLessons: Record<string, ContextLesson> =
  Object.fromEntries(
    lessons.map(([id, teach, question, considerations, why]) => [
      id,
      { teach, question, considerations, why },
    ]),
  );
