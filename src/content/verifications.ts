import { contacts } from "./accounts";

/** Authored returned evidence, revealed only at the follow-up stage. All records are fictional. */
export interface VerificationRecord {
  missionId: string;
  records: { id: string; finding: string }[];
  supports: string;
  cannotConclude: string;
  residualWork: { ownerId: string; action: string; checkpoint: string };
  altersCaseFacts: boolean;
}
type ReturnedEvidence = [
  string,
  [string, string][],
  string,
  string,
  string,
  string,
  boolean?,
];
const rows: ReturnedEvidence[] = [
  [
    "M-T01",
    [
      [
        "FR-61",
        "Return acceptance identifies HarborWorks Software LLC and synthetic Period P1; recorded tax is 12,400 USD cents.",
      ],
      [
        "SIM-PAY-HW17",
        "Operations returned a simulated payment acceptance matching HarborWorks Software LLC, P1 and 12,400 cents. It is an acceptance record, distinct from the earlier scheduled instruction BI-9.",
      ],
      [
        "HW17-MATCH",
        "Entity, period and amount match the notice packet. No duplicate debit was authorized.",
      ],
    ],
    "The missing payment stage now has matching synthetic acceptance evidence. The bounded evidence-gathering follow-up can close.",
    "Payment acceptance does not prove the notice has been legally withdrawn, any penalty waived, or a real tax authority contacted.",
    "npc-tax",
    "Review whether a response to HW-17 remains required; retain the notice checkpoint and communicate the reviewed next step.",
    true,
  ],
  [
    "M-A01",
    [
      [
        "H-02-SCOPE",
        "The fictional scope covers HarborWorks Software LLC and direct subscriptions only. Marketplace support is excluded; the implementation acceptance sign-off remains blank.",
      ],
      [
        "H-02-EXCEPTION",
        "The sandbox credit-period mapping exception remains in the handoff; the payment-authority field is blank.",
      ],
      [
        "H-02-OWNERS",
        "Casey owns the mapping acceptance test; Maya supplies the proper customer approver.",
      ],
    ],
    "The relationship handoff has a traceable scope and exception/owner list. It is ready for bounded account ownership.",
    "Do not call the integration fully accepted, enable excluded scope or authorize payments from this record.",
    "npc-ops",
    "Verify the open credit mapping against source and draft period before operational acceptance.",
  ],
  [
    "M-A02",
    [
      [
        "CD-PAGE-01",
        "The public-style fictional snapshot says wholesale coming soon. It does not give a confirmed launch date.",
      ],
      [
        "CD-FEED-01",
        "The available order feed contains direct and MarketHub channel IDs; the packet supplies no wholesale pilot transaction.",
      ],
      [
        "CD-DISCOVERY-01",
        "Recorded outcome: current channels and the announcement are confirmed; launch date, pilot records, invoicing entity and customer type remain verification questions.",
      ],
    ],
    "The discovery brief correctly separates evidence from a hypothesis. The task to review available records is verified; the launch itself remains unconfirmed.",
    "Do not claim the portal is live, change scope, apply certificates automatically or invent a launch date.",
    "npc-cedarline-1",
    "Obtain the confirmed launch date and pilot transaction references; Lena checks any resulting channel mapping question.",
  ],
  [
    "M-T02",
    [
      [
        "CR-12",
        "Approved credit reverses base 10,000 and tax 800 USD cents in synthetic P2.",
      ],
      [
        "CD-TAX-BRIDGE",
        "Original tax 6,400 plus credit tax -800 equals net tax payable 5,600 USD cents; the credit is retained separately from any cash-refund record.",
      ],
    ],
    "The signed same-period bridge explains the 800-cent draft difference using the stated exercise assumptions.",
    "A reconciled worksheet is not customer approval, filing acceptance or payment evidence.",
    "npc-ops",
    "Route the corrected draft and bridge to the authorized reviewer before any simulated submission.",
  ],
  [
    "M-A03",
    [
      [
        "FG-STAKEHOLDERS",
        "Imani supplies accounting records; Gavin is finance sponsor/budget approver; Owen owns system changes.",
      ],
      [
        "FG-LEAVE-GAP",
        "The available records still do not confirm a practitioner record-access backup during Imani’s leave.",
      ],
      [
        "FG-APPROVAL-CORRECTION",
        "The renewal is recorded as approval pending; Imani’s informal support is not a signature.",
      ],
    ],
    "The stakeholder map and incorrect approval attribution are reconciled with the available role evidence.",
    "Do not treat an unconfirmed backup as appointed or an informal comment as authorized terms.",
    "npc-forgebridge-1",
    "Confirm an authorized leave backup and handoff; the AM owns Gavin’s decision meeting.",
  ],
  [
    "M-T03",
    [
      [
        "AF-LOCATION-04",
        "Atlasfield Services Inc. technician activity begins in synthetic Alpha on Day 4.",
      ],
      [
        "AF-HISTORY-GAPS",
        "Two months are absent from the provided sales extract, which also omits refunded-contract detail.",
      ],
      [
        "AF-REVIEW-QUESTION",
        "Separate physical-connection chronology from economic sales-basis/window questions.",
      ],
    ],
    "The fact packet identifies a dated activity and incomplete sales history; both are ready for a scoped review request.",
    "No no-nexus conclusion, registration date or collection-start conclusion follows from incomplete history or a training threshold.",
    "npc-tax",
    "Review Alpha-specific authority/effective dates while Malik supplies missing extracts.",
  ],
  [
    "M-A04",
    [
      [
        "HW-D4-CORRECTION",
        "The prior completion wording is retracted: FR-61 supports filing acceptance, while the applicable case packet still requires payment-status verification.",
      ],
      [
        "HW-O7-OWNER",
        "Casey owns the status check; the AM owns the next-session customer update.",
      ],
    ],
    "The communication record accurately corrects the earlier overstatement and preserves an actionable check-in.",
    "The correction message is not payment proof or notice resolution; do not substitute it for an acceptance record.",
    "npc-ops",
    "Verify the actual payment record and return it for the promised customer update.",
  ],
  [
    "M-T04",
    [
      [
        "L-44-SUPPLY",
        "Contract L-44 supplies standard hosted dashboards, stored reports and four analyst hours.",
      ],
      [
        "L-44-PRICE",
        "Invoice has a combined 150,000-cent charge; no approved separately stated component schedule is supplied.",
      ],
      [
        "L-44-REVIEW",
        "The packet retains separate component questions and the actual contract/invoice version.",
      ],
    ],
    "The supplied facts support a scoped bundle-classification research request and a hold on unreviewed production mapping.",
    "No actual taxability, exemption or global SaaS treatment is established by the label consulting.",
    "npc-tax",
    "Review the documented supply and relevant jurisdiction rules before Nico implements a mapping.",
  ],
  [
    "M-A05",
    [
      [
        "AF-DAY-READINESS",
        "Urgent packet requires 20 minutes of gathering before one 30-minute specialist slot; the notice checkpoint is 150 minutes away.",
      ],
      [
        "AF-PROMISE-MAP",
        "Routine review promise at minute 90 is separately tagged and must be renegotiated or delegated; a 15-minute contingency buffer is included in the proposed plan.",
      ],
    ],
    "The written plan distinguishes obligations, input readiness and finite capacity; it identifies the promise requiring explicit communication.",
    "A proposed plan is not proof an appointment was booked or a customer agreed to a change. Use actual Calendar and update actions for that.",
    "npc-mentor",
    "Check the actual calendar and customer acknowledgment, then retain any owned carryover.",
  ],
  [
    "M-T05",
    [
      [
        "HW-SEAT-ROSTER",
        "Confirmed exercise roster assigns 40 equal-price seats to A and 60 to B. Billing address B remains a different field.",
      ],
      [
        "HW-ALLOCATED-TAX",
        "Synthetic base 100,000 cents allocates 40,000/60,000. Assumed 5%/10% produces 2,000+6,000=8,000 cents with stated line rounding.",
      ],
    ],
    "The allocation worksheet reconciles to the approved synthetic roster and rate assumptions.",
    "This does not establish real jurisdictional rates, an actual sourcing conclusion or production configuration acceptance.",
    "npc-ops",
    "Test the approved training mapping and retain the roster/date and reviewer before enabling it.",
  ],
  [
    "M-A06",
    [
      [
        "O-71-REPRO",
        "The same source order ID appears twice, each with tax 3,200 cents. The duplicate effect is one extra 3,200-cent line.",
      ],
      [
        "CD-RISK-ORDER",
        "The draft/cutoff risk takes priority over the cosmetic invoice-label request; Lena’s reproducible example and Casey’s verification owner are retained.",
      ],
    ],
    "The defect and priority are documented with a stable source key and scoped correction test.",
    "A green transport job or a sent escalation does not prove correction acceptance. The cosmetic ticket is still owned.",
    "npc-ops",
    "Verify exactly one O-71 effect in the corrected draft and then complete the deferred label request.",
  ],
  [
    "M-T06",
    [
      [
        "CV-3",
        "The certificate identifies Forgebridge Manufacturing LLC and resale use, but its signature field is blank.",
      ],
      [
        "F-12-LINES",
        "Order separately identifies resale parts 50,000 cents and an internally used office printer 30,000 cents.",
      ],
    ],
    "The exception matrix documents incompleteness and the different stated uses; it supports holding blanket exemption mapping.",
    "No completed certificate, blanket exemption or refund approval is supplied by this record.",
    "npc-forgebridge-1",
    "Obtain corrected purchaser evidence; Rowan reviews the scoped claim before Owen changes mappings.",
  ],
  [
    "M-A07",
    [
      [
        "NR-22",
        "Source receipt identifies Northlight Equipment LLC, not Northlight Digital LLC.",
      ],
      [
        "N-8-APPENDED-CORRECTION",
        "The original claim remains in history; correction points to NR-22 and reopens the missing Digital payment-evidence question.",
      ],
    ],
    "The attribution correction is source-backed and does not erase the original account note.",
    "Equipment’s receipt does not establish Digital filing/payment or all-entity completion.",
    "npc-ops",
    "Obtain separate Digital evidence and record its entity/period without copying NR-22.",
  ],
  [
    "M-T07",
    [
      [
        "MC-2",
        "Fictional platform coverage applies only to listed transactions; direct sales are separate.",
      ],
      [
        "CD-CHANNEL-BRIDGE",
        "Direct collected tax 4,000 cents is the worksheet payable; covered marketplace tax 7,000 is tracked separately and fees 2,000 are not negative tax.",
      ],
    ],
    "The worksheet correctly separates direct liability, platform amounts and fees under the stated exercise policy.",
    "The fictional worksheet policy is not a real marketplace-facilitator conclusion for every jurisdiction or transaction.",
    "npc-tax",
    "Review any unmatched channel coverage question while Casey retains separate control totals.",
  ],
  [
    "M-A08",
    [
      [
        "ML-ADOPTION",
        "Three of five planned feeds are validated, or 60%; two still lack acceptance.",
      ],
      [
        "ML-ENGAGEMENT",
        "Support/trust feedback is positive, but the budget owner missed two review invitations and budget confirmation is absent.",
      ],
    ],
    "Mixed health is supported by separate relationship, adoption and commercial observations with explicit uncertainty.",
    "Positive sentiment and silence do not establish a renewal decision or completed compliance coverage.",
    "npc-meridian-0",
    "Confirm priorities and budget path; Felix and Samira supply the missing adoption-acceptance plan.",
  ],
  [
    "M-T08",
    [
      [
        "PR-8",
        "Exercise confirmation names Pinecrest Outdoor Inc.; reviewed collection starts Day 8.",
      ],
      [
        "PC-DATE-MAP",
        "First period Days 8–20, data cutoff Day 21 and due Day 25 are separate fields; customer submission approval remains required.",
      ],
    ],
    "The readiness timeline corrects the mistaken use of Day 25 as collection start and retains distinct dependencies.",
    "A planned correction is not proof of enabled production settings, actual registration or customer approval.",
    "npc-pinecrest-2",
    "Verify the approved sandbox/enablement test and retain Ivy’s authorization before any operational action.",
  ],
  [
    "M-A09",
    [
      [
        "N-SAMPLE-BASELINE",
        "Comparable 200-transaction samples contain 18 then 9 mapping defects; sample method is retained.",
      ],
      [
        "N-VALUE-LIMIT",
        "Claimed 2,000,000-cent savings lack a baseline/time-rate method. Digital payment evidence remains open.",
      ],
    ],
    "The executive brief can state measured defect improvement and request entity-review capacity while identifying material uncertainty.",
    "Do not state savings as verified or imply that all entities have payment evidence.",
    "npc-northlight-0",
    "Decide entity-review capacity; Casey verifies Digital evidence and the AM measures any future value estimate.",
  ],
  [
    "M-T09",
    [
      ["R-1", "Authoritative exercise source tax total is 21,600 USD cents."],
      [
        "R-71-DELTA",
        "Draft 24,800 contains one extra 3,200-cent effect from duplicate R-71. Corrected bridge is 21,600 and retains the original import event.",
      ],
    ],
    "The reconciled draft equals the stated source after one deduplicated effect; the correction is traceable.",
    "This worksheet does not show customer approval, a filed return or payment acceptance.",
    "npc-riverton-0",
    "Review the corrected draft before Casey performs any simulated submission.",
  ],
  [
    "M-A10",
    [
      [
        "FG-RENEWAL-PATH",
        "Renewal Day 44; champion support is recorded, but no Gavin budget approval, signed order or approved new-plant scope is supplied.",
      ],
      [
        "FG-PROCUREMENT",
        "Fictional procurement needs ten days after approved terms; Alex approves commercial changes.",
      ],
    ],
    "The readiness record supports an uncommitted forecast and specific budget/scope/procurement milestones.",
    "Do not call the renewal signed/committed or promise an unapproved discount.",
    "npc-commercial",
    "Review authorized options while the AM confirms the sponsor decision and procurement path.",
  ],
  [
    "M-T10",
    [
      [
        "N-73-IDENTITY",
        "Letter names Northlight Equipment LLC, Period P0 and an alleged 88,000-cent balance; acquisition closed after P0.",
      ],
      [
        "NH-HISTORY-GAP",
        "Original seller return/payment receipts remain absent; the acquisition summary is not a liability opinion.",
      ],
    ],
    "The chronology and response checkpoint can be reviewed without admitting or dismissing the balance.",
    "No debt, waiver, acquisition liability or remediation strategy is established by the missing-record packet.",
    "npc-tax",
    "Lead qualified tax/legal review of N-73 while the AM gathers original records and protects the checkpoint.",
  ],
  [
    "M-A11",
    [
      [
        "BS-SCOPE",
        "Current scope covers the US entity; new subsidiary name/establishment and EU pilot contracts remain unconfirmed.",
      ],
      [
        "BS-PRIORITY",
        "Launch readiness is the customer’s priority; payroll is outside this simulation’s indirect-tax scope.",
      ],
    ],
    "The discovery record supports staged need/scope review and an honest payroll boundary.",
    "No global coverage, price, launch date, tax treatment or payroll delivery is authorized.",
    "npc-commercial",
    "Review a supported scope option only after Rowan’s launch questions and the customer’s success criteria are ready.",
  ],
  [
    "M-T11",
    [
      [
        "ML-INPUT-APPROVAL",
        "Exercise expressly approves only 7,500 units of recoverable input tax; the additional 2,000 purchase-tax units remain unreviewed.",
      ],
      [
        "ML-NET-WORKSHEET",
        "Output 24,000 minus approved input 7,500 yields synthetic net 16,500 minor units; units/eligibility assumption are recorded.",
      ],
    ],
    "The arithmetic is correct under the stated training eligibility and excludes the unsupported amount.",
    "The arithmetic does not establish real eligibility, customer status, place of supply or an actual return.",
    "npc-tax",
    "Review unconfirmed input eligibility and the separate customer-status question.",
  ],
  [
    "M-A12",
    [
      [
        "CD-PILOT-SAMPLE",
        "Same sample and acceptance criteria detect all five seeded defects in both methods. Review time is 45 minutes manual and 30 minutes pilot.",
      ],
      [
        "CD-PILOT-CONTROLS",
        "Local report, human approval, audit log and rollback are retained; no external model permission or upload is supplied.",
      ],
    ],
    "The bounded sample demonstrates a 15-minute reduction with preserved detection criteria.",
    "Do not generalize to every batch, automatically approve imports or transfer records to an unapproved service.",
    "npc-ops",
    "Review a broader controlled trial with Lena and retain sample quality/rollback before scaling.",
  ],
  [
    "M-T12",
    [
      [
        "SD-SUPPLY",
        "Product is consumer digital access; no imported physical-goods consignment appears in the case.",
      ],
      [
        "SD-REGIME-QUESTIONS",
        "EU, UK and Canada need separate establishment/status/supply review; provincial Canadian questions remain open.",
      ],
    ],
    "The launch matrix rejects the proposed universal IOSS setting and lists separate review gates.",
    "No scheme eligibility, registration obligation or real market tax setting is approved by this educational matrix.",
    "npc-tax",
    "Review each jurisdiction’s specific facts; Alex handles support scope and the AM owns launch decisions.",
  ],
  [
    "X-T01",
    [
      ["PF-19", "Pinecrest filing acceptance is verified."],
      [
        "PP-19",
        "Payment response explicitly rejects the instruction for incorrect account reference and records no debit.",
      ],
      [
        "PC-RETRY-GATE",
        "A corrected instruction requires Ivy’s authorization, stable reference and positive acceptance evidence after any retry.",
      ],
    ],
    "The rejection cause and required recovery controls are verified independently of the accepted filing.",
    "Do not call payment accepted, retry blindly or waive deadline consequences from this record.",
    "npc-ops",
    "Obtain authorized correction and positive acceptance; Rowan reviews any checkpoint implication.",
  ],
  [
    "X-T02",
    [
      [
        "RI-20",
        "Inclusive original gross 12,000 cents at synthetic 20% gives base 10,000 and tax 2,000.",
      ],
      [
        "CR-20-PERIOD",
        "Full approved credit reverses original tax in P3; separate cash refund clears in P4 under the exercise assumptions.",
      ],
    ],
    "The invoice/credit/cash bridge explains inclusive tax and distinct periods.",
    "Do not substitute gross times rate or treat later bank clearance as the approved credit date.",
    "npc-riverton-0",
    "Review the period bridge if any assumption is disputed; retain all three source references.",
  ],
  [
    "X-T03",
    [
      ["AF-REPORT-A", "Gross measure 9,800,000 cents has only eleven months."],
      [
        "AF-REPORT-B",
        "Taxable measure 6,100,000 excludes resale; it is not the same denominator.",
      ],
      [
        "AF-PHYSICAL-M2",
        "Employee activity began Month 2; Month 7 remains missing.",
      ],
    ],
    "The historical matrix identifies incompatible measures and missing periods while preserving the separate physical connection.",
    "No below-threshold or no-nexus conclusion follows from either incomplete figure.",
    "npc-tax",
    "Review measure/window/effective-date authority while Malik obtains Month 7 and reconciles classes.",
  ],
  [
    "X-T04",
    [
      [
        "B-88",
        "Signed contract combines hardware, software rights and maintenance at 450,000 cents.",
      ],
      [
        "B-89",
        "Separate-charge appendix is proposed and unsigned; it is retained as a different version.",
      ],
    ],
    "The packet documents actual supply rights and the version difference for a scoped classification and launch review.",
    "Do not treat unsigned prices as final, guarantee an exemption or enable an unreviewed production mapping.",
    "npc-tax",
    "Review signed supply facts; Eden prepares only a reversible approved test and Alex reviews support scope.",
  ],
  [
    "X-T05",
    [
      ["A-51", "Record identifies physical attendance tickets."],
      ["A-52", "Record identifies virtual access."],
      [
        "A-53",
        "Record identifies sponsorship; billing headquarters is a separate field from venue/attendance evidence.",
      ],
    ],
    "Supply-specific location questions are ready for review; the copied software-allocation assumption is unsupported for all event lines.",
    "No place-of-supply or rate conclusion is established for these event supplies.",
    "npc-tax",
    "Review event/service-specific facts and authority while Anika verifies evidence capture.",
  ],
  [
    "X-T06",
    [
      ["RC-8", "Certificate supports the identified resale use."],
      [
        "R-90",
        "Order note describes employee gifts, with no onward sale; historic scope evidence for its mapping is incomplete.",
      ],
    ],
    "The dispute packet separates stated purchase use from established resale orders and supports a bounded review.",
    "No universal exemption or refund is authorized; disagreement does not justify deleting evidence.",
    "npc-tax",
    "Review scope and historical mapping; Zoe decides any financial response after reviewed advice.",
  ],
  [
    "X-T07",
    [
      [
        "CP-12",
        "Contract describes processing; Cedarline remains seller unless a separate agreement applies.",
      ],
      [
        "CD-INVOICE-SELLER",
        "Invoices list Cedarline, and no separate platform collection statement is provided.",
      ],
      [
        "MOR-X-LABEL",
        "Dashboard MOR-X is an operational label whose responsibility meaning remains unverified.",
      ],
    ],
    "Contract and invoice evidence justify holding the unsupported merchant-of-record exclusion.",
    "The label does not prove seller transfer, platform collection or global compliance.",
    "npc-tax",
    "Review any separate agreement and channel responsibility; Lena corrects labels only after review.",
  ],
  [
    "X-T08",
    [
      ["NE-8", "Equipment training record uses monthly periods."],
      [
        "ND-8",
        "Digital reviewed training schedule is quarterly with its own effective dates.",
      ],
      [
        "NH-CALENDAR-DELTA",
        "The copied account default conflicts with ND-8; entity-specific cutoff and approval fields are restored in the plan.",
      ],
    ],
    "The calendar comparison identifies the erroneous copy and the separate readiness checks.",
    "A restored plan is not submission authorization or proof that configuration has been tested.",
    "npc-northlight-2",
    "Retest entity scheduling; Rowan verifies dates and Rhea confirms each approver.",
  ],
  [
    "X-T09",
    [
      [
        "FC-91",
        "Approved same-period credit tax is -1,500 cents; it arrived after the review snapshot.",
      ],
      [
        "FG-DRAFT-V1-V2",
        "Preserve draft v1 31,000 and v2 29,500 with a -1,500 bridge. Status remains draft, not filed.",
      ],
    ],
    "The versioned draft correction reconciles the late approved credit and requires renewed review.",
    "Do not describe an amended filed return, erase v1 or treat an old approval as approval of v2.",
    "npc-forgebridge-0",
    "Approve v2 and its retained bridge before any simulated submission.",
  ],
  [
    "X-T10",
    [
      [
        "NH-40",
        "Former-owner recollection describes activity but gives no quantified source records.",
      ],
      [
        "NH-HISTORICAL-GAPS",
        "Two historical periods lack located return receipts; raw sales and registration history remain missing.",
      ],
    ],
    "The exposure inventory accurately labels recollection and documentary gaps for specialist-led investigation.",
    "No liability amount, disclosure eligibility, legal strategy or guaranteed penalty result is established.",
    "npc-tax",
    "Lead qualified review and identify needed legal expertise while the AM obtains original data.",
  ],
  [
    "X-T11",
    [
      [
        "ML-88-ENTITY-MISMATCH",
        "Invoice name differs from the uploaded status-document entity.",
      ],
      [
        "ML-STATUS-GAPS",
        "Company-like email and a selected business plan do not supply verified receiving establishment or actual service facts.",
      ],
    ],
    "The status evidence mismatch is documented and the proposed treatment remains on hold.",
    "No B2B/place-of-supply/reverse-charge determination follows from this record.",
    "npc-tax",
    "Review corrected matching entity/status/service evidence before an invoicing decision.",
  ],
  [
    "X-T12",
    [
      ["SD-11-COVERAGE", "Platform agreement covers one specified EU channel."],
      [
        "SD-DIRECT-CHANNELS",
        "UK/Canadian direct subscriptions are outside that listed coverage; Canadian provincial questions remain open.",
      ],
    ],
    "The separate jurisdiction/channel launch gates match the contract scope and digital-supply facts.",
    "A platform contract is not global compliance; no eligibility or registration decision is certified here.",
    "npc-tax",
    "Review each uncovered direct-channel fact packet and provincial question; Alex approves support scope.",
  ],
  [
    "X-A01",
    [
      ["B-S1", "Signed scope names Bayshore Robotics Inc. only."],
      [
        "B-HANDOFF-CONFLICT",
        "Informal all-notices wording conflicts with scope; the second-entity notice still needs a protected checkpoint.",
      ],
    ],
    "The expectation/scope mismatch is explicit and urgent triage ownership is retained while options are reviewed.",
    "No unlimited free coverage or unsupported refusal of all urgent help is justified.",
    "npc-commercial",
    "Review a bounded transitional support option; Rowan reviews the notice and the AM keeps the customer informed.",
  ],
  [
    "X-A02",
    [
      ["ST-4", "Dated stock-transfer log records goods in Gamma."],
      [
        "PC-EVENT-POSTER",
        "Poster names the Gamma pop-up; staffing remains unconfirmed.",
      ],
      [
        "PC-STALE-PAGE",
        "Online-only page is two campaign months old and does not establish current completeness.",
      ],
    ],
    "The business map is updated with dated operational evidence and remaining location questions.",
    "Do not conclude no physical connection from a stale page or decide a legal obligation from a poster alone.",
    "npc-tax",
    "Review dated entity/staff/inventory facts while Amal improves the evidence fields.",
  ],
  [
    "X-A03",
    [
      [
        "FG-TRANSITION-DATES",
        "Champion departure Day 39 precedes renewal Day 44; incoming sponsor has not received the value review.",
      ],
      [
        "FG-CONTINUITY-GAP",
        "Record-access backup and successor decision criteria remain unconfirmed.",
      ],
    ],
    "The transition plan identifies an authorized introduction, continuity gap and renewed forecast uncertainty.",
    "Do not claim the successor has approved budget or that private departure motives are relevant evidence.",
    "npc-commercial",
    "Review forecast/terms as the AM confirms the introduction, backup and new decision path.",
  ],
  [
    "X-A04",
    [
      [
        "N-V3-CLAIM",
        "120-hour savings estimate has no measured staff-time baseline or attribution.",
      ],
      [
        "N-VERIFIED-DEFECTS",
        "Comparable defect counts 18 to 9 remain the supported outcome, separate from time savings.",
      ],
    ],
    "The corrected executive explanation withdraws the unsupported number and preserves the measured result.",
    "No time saving, cost saving or future performance guarantee is verified.",
    "npc-ops",
    "Measure a controlled comparable staff-time sample; the AM supplies the corrected decision brief.",
  ],
  [
    "X-A05",
    [
      ["AF-PROMISE-120", "Atlasfield update remains due minute 120."],
      [
        "CD-REVIEW-110",
        "Cedarline review ends minute 110 and requires 20 minutes preparation.",
      ],
      [
        "SPECIALIST-100",
        "Slot at minute 100 requires a complete packet; double-booking the learner is not feasible.",
      ],
    ],
    "The conflict plan separates preparation, expert slot and interim customer update, with explicit delegation/rescheduling.",
    "A proposed plan does not prove booked attendance or customer agreement; those need actual recorded actions.",
    "npc-mentor",
    "Check the actual calendar/updates and retain a backup plus contingency buffer.",
  ],
  [
    "X-A06",
    [
      [
        "NH-NOTICE-PACKET-2",
        "Returned notice copy identifies Northlight Equipment LLC, Period P0 and Notice N-73; the previously omitted fields are now recorded.",
      ],
      [
        "NH-RECEIPT-REQUEST",
        "Original return/payment receipts are still missing and assigned to operations; the specialist question is historical notice identity/response, not a cosmetic label.",
      ],
    ],
    "The specialist request now has entity, period, notice ID, evidence gaps and a precise question for the single useful slot.",
    "The completed packet does not prove payment, debt, waiver or a resolved notice.",
    "npc-tax",
    "Review N-73 and the response checkpoint while Casey gathers receipts and the AM retains the customer update.",
    true,
  ],
  [
    "X-A07",
    [
      [
        "E1",
        "Original source tax is 18,000 cents; preserve its version/checksum reference.",
      ],
      [
        "E2",
        "Revised source tax is 17,700 after approved 300-cent correction to HW-300; different version/approval timestamp despite the same filename.",
      ],
      [
        "HW-300-DELTA",
        "Append-only bridge records -300 and requires renewed draft review.",
      ],
    ],
    "The source revision is explained without overwriting the original; the difference reconciles.",
    "Filename equality is not record identity or approval of a changed draft.",
    "npc-harborworks-0",
    "Review the revised draft with its source versions and correction rationale.",
  ],
  [
    "X-A08",
    [
      [
        "LL-USAGE-GAP",
        "One major feed has not submitted for three sessions; the customer uses a weekly manual workaround.",
      ],
      [
        "LL-HEALTH-CONTRADICTION",
        "Ticket count dropped 12 to 2 while the feed remains unvalidated; positive relationship comments remain a separate signal.",
      ],
    ],
    "The health explanation identifies possible abandoned adoption and operational burden rather than equating silence with value.",
    "No improved close outcome or recovered feed acceptance is established yet.",
    "npc-ops",
    "Verify the feed repair and the customer’s close outcome with Nico and Dev before changing health confidence.",
  ],
  [
    "X-A09",
    [
      [
        "AS-LAUNCH-DECISION",
        "Review lists three specific launch gaps: agreed channel scope, sufficiently detailed supply record, and relevant venue/attendance evidence. They remain unresolved.",
      ],
      [
        "AS-OPTIONS-RECORD",
        "Options are a staged verified channel, postponement, or an unapproved unresolved launch; no service guarantee has been approved.",
      ],
    ],
    "The executive brief gives the actual unresolved questions and a decision path, with an operational evidence appendix.",
    "No full launch approval, legal classification or guaranteed deadline is established.",
    "npc-aster-0",
    "Decide the staged/postponed option after Rowan’s review limits and Anika’s readiness evidence.",
    true,
  ],
  [
    "X-A10",
    [
      [
        "FG-COHORT-DEFINITION",
        "Opening recurring value 10,000,000 cents; same-cohort loss 1,000,000; expansion 1,500,000; new-logo revenue excluded.",
      ],
      [
        "FG-RETENTION-BRIDGE",
        "GRR=(10,000,000−1,000,000)/10,000,000=90%; NRR adds 1,500,000 expansion for 105%.",
      ],
    ],
    "Both metrics and their denominators are explained without hiding contraction.",
    "Aggregate NRR does not prove any individual renewal or all-account health.",
    "npc-commercial",
    "Review signed cohort changes and underlying account-level contraction/renewal evidence.",
  ],
  [
    "X-A11",
    [
      [
        "ML-STABILIZATION",
        "Two current feeds still fail acceptance; reliable close remains the stated customer priority.",
      ],
      [
        "ML-PILOT-GATES",
        "International establishment/status evidence is incomplete and no broad pricing or conclusion is approved.",
      ],
    ],
    "The stabilization-first recommendation and optional limited discovery fit the available customer priority.",
    "Do not claim broad launch readiness or conceal defects to improve a sales forecast.",
    "npc-ops",
    "Verify core feed acceptance; Alex reviews any later scoped offer after customer agreement.",
  ],
  [
    "X-A12",
    [
      [
        "CD-AI-CLAIM",
        "Demo says filing succeeded but no acceptance record supports it.",
      ],
      [
        "CD-ADAPTER-BOUNDARY",
        "No provider integration, budget or data-transfer permission is approved; optional AI remains disabled.",
      ],
      [
        "CD-COACHING-CONTROL",
        "Only supplied fictional facts, references and transparent rubrics may enter a reviewer-controlled coaching packet; no automated closure.",
      ],
    ],
    "The proposal is bounded or rejected on evidence, authority and data-permission grounds.",
    "A generated summary cannot create a source, approval, tax rule or completed offscreen work.",
    "npc-mentor",
    "Review the authored coaching packet and require human acceptance checks before any future approved adapter.",
  ],
  [
    "C01",
    [
      [
        "PORTFOLIO-HW",
        "HarborWorks filing is evidenced; payment status still requires a matching acceptance record in this capstone.",
      ],
      [
        "PORTFOLIO-CD",
        "Cedarline bridge is 6,400−800=5,600 cents under stated credit assumptions.",
      ],
      [
        "PORTFOLIO-FG",
        "Forgebridge backup remains unconfirmed; budget authority is separate from practitioner access.",
      ],
    ],
    "The independent day plan has three distinct workstreams, evidence requirements and owners rather than completing only the easy item.",
    "This packet does not supply missing payment acceptance, backup authorization or customer approvals.",
    "npc-ops",
    "Verify the operational inputs; the AM owns each customer checkpoint and Forgebridge backup confirmation.",
  ],
  [
    "C02",
    [
      [
        "COLLISION-NH",
        "Northlight notice identifies Equipment/P0 and requires qualified historical review.",
      ],
      [
        "COLLISION-CD",
        "Stable Cedarline source ID repeats one 3,200-cent tax effect.",
      ],
      [
        "COLLISION-PROMISE",
        "Executive meeting promised in 90 minutes competes with one specialist slot; an interim written brief is a recoverable option.",
      ],
    ],
    "The triage assigns the legal question to Rowan, data correction to Casey and meeting recovery to the AM.",
    "No notice liability, corrected-draft approval or customer reschedule is established without the respective evidence.",
    "npc-tax",
    "Review the urgent notice; Casey verifies the draft and the AM confirms the executive update/recovery.",
  ],
  [
    "C03",
    [
      [
        "FG-RENEWAL-TRANSITION",
        "Departure precedes renewal by five sessions; new CFO has not approved budget, and procurement lead time is ten days.",
      ],
      [
        "FG-VALUE-AND-SCOPE",
        "Documented certificate/defect outcomes are distinct from unmeasured savings; new-plant support is outside current scope.",
      ],
    ],
    "The plan connects transition, truthful value, uncertain forecast, scope options and procurement milestones.",
    "No committed renewal, new-plant coverage or unsupported savings is authorized.",
    "npc-commercial",
    "Approve only supported commercial options; the AM confirms successor criteria, backup and signatures.",
  ],
  [
    "C04",
    [
      [
        "NH-ENTITY-HISTORY",
        "Parent and acquired target remain distinct; target establishment/registration history is incomplete.",
      ],
      [
        "NH-CHANNEL-CONTRACT",
        "One EU platform channel is covered by contract; direct UK/Canadian supplies remain separate.",
      ],
      [
        "NH-SUPPLY-LAUNCH",
        "Digital access plus advisory work requires a supply fact review; IOSS-to-every-market shortcut and omitted provincial questions remain unsupported.",
      ],
    ],
    "The dependency map has separate entity/history, product, channel, jurisdiction and scope gates for a staged decision.",
    "No global configuration, acquisition liability, market eligibility or ready corporate onboarding is established.",
    "npc-tax",
    "Lead qualified reviews; Casey verifies separate feeds, Alex approves scope and the AM retains each launch decision.",
  ],
];

export const verificationRecords: Record<string, VerificationRecord> =
  Object.fromEntries(
    rows.map((r) => [
      r[0],
      {
        missionId: r[0],
        records: r[1].map(([id, finding]) => ({ id, finding })),
        supports: r[2],
        cannotConclude: r[3],
        residualWork: {
          ownerId: r[4],
          action: r[5],
          checkpoint:
            "Next agreed business session; retain any earlier case response deadline.",
        },
        altersCaseFacts: r[6] ?? false,
      },
    ]),
  );
export function getVerificationRecord(
  missionId: string,
): VerificationRecord | undefined {
  return verificationRecords[missionId];
}
export function renderVerificationRecord(missionId: string): string {
  const record = getVerificationRecord(missionId);
  if (!record)
    throw new Error(`Missing authored returned evidence for ${missionId}`);
  const owner = contacts.find(
    (contact) => contact.id === record.residualWork.ownerId,
  );
  if (!owner)
    throw new Error(
      `Missing returned-evidence owner ${record.residualWork.ownerId}`,
    );
  return `Fictional returned evidence — ${missionId}\n\n${record.records.map((r) => `${r.id}: ${r.finding}`).join("\n\n")}\n\nSupported conclusion: ${record.supports}\n\nCannot conclude: ${record.cannotConclude}\n\nOwned residual work: ${owner.name} (${owner.role}; ${owner.id}) — ${record.residualWork.action}\nCheckpoint: ${record.residualWork.checkpoint}\n\nAll records, reviews and outcomes here are authored simulated evidence. No external filing, payment, notice response or employer approval has occurred. Real legal conclusions require case-specific authority and qualified professional review.`;
}
