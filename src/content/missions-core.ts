import { createCase, option, step, type CaseSeed } from "./mission-tools";

const cases: CaseSeed[] = [
  {
    id: "M-T01",
    competencyIds: ["T01", "A04", "A06", "A07"],
    account: "harborworks",
    title: "First morning: the missing payment receipt",
    briefing:
      "Your first owned account has an anxious practitioner and a fictional notice. Walk from the preparation desk to a customer meeting, investigate, work with a specialist, keep a promise and debrief. Trust may improve before the issue is resolved.",
    facts: [
      "HarborWorks Software LLC received Notice HW-17 for synthetic Period P1.",
      "Draft return tax is 12,400 USD cents; filing receipt FR-61 exists.",
      "A bank instruction screenshot exists, but no payment acceptance or debit confirmation is present.",
      "The notice response checkpoint is Day 2 14:00 in the fictional calendar.",
    ],
    packet:
      "Notice HW-17: alleged unpaid balance for P1. Ledger tax payable 12,400 cents. Filing receipt FR-61 says return accepted; it does not say payment accepted. Screenshot BI-9 says payment instruction scheduled, not settled. Practitioner Elias asks whether the notice can be ignored. The AM has no authority to authorize another debit or request a legal waiver.",
    question:
      "Elias can describe records and impact but cannot approve a bank debit. Open with purpose, ask what has already been checked, and summarize the uncertainty.",
    answer:
      "Ask Elias for entity, period, bank-status evidence and the authorized finance approver; reflect that filing is evidenced but payment remains unverified.",
    decision:
      "Keep the notice open; distinguish accepted filing FR-61 from unverified payment BI-9 and protect the response checkpoint.",
    alternative:
      "Reserve a notice review while operations first verifies the bank instruction status; send a same-session interim update.",
    failure:
      "Dismiss the notice because the return was accepted, or pay the amount again without checking status.",
    why: "A filing receipt and a payment acceptance establish different lifecycle stages. Double payment and ignored notices are both avoidable with proper evidence and authority.",
    request:
      "Ask Rowan to review the notice fact packet; Casey verifies payment status and Maya approves any proposed financial action. The AM owns the customer check-in.",
    output:
      "Notice lifecycle map, verified payment-status record and customer closure note",
    sources: ["sst", "training-policy"],
  },
  {
    id: "M-A01",
    competencyIds: ["A01", "T08"],
    account: "harborworks",
    title: "Accept the implementation handoff",
    briefing:
      "A new account transfer sounds complete, but the acceptance packet leaves two unresolved dependencies.",
    facts: [
      "The fictional scope names one legal entity and direct subscriptions only.",
      "A checklist says “integrated”; a sandbox mapping defect remains open.",
      "No signed payment authority appears in the handoff.",
    ],
    packet:
      "Handoff H-02: billing connector configured; one test credit mapped to the wrong period; marketplace add-on excluded. Customer sign-off field blank. Public Taxwire offering is separate marketing context, not this fictional scope.",
    question:
      "Ask Elias which outcomes the customer accepted and which exceptions still interrupt close.",
    answer:
      "Confirm the signed scope, open mapping defect, customer acceptance owner and missing payment authorization.",
    decision:
      "Accept relationship ownership while recording the unresolved defect and authorization as open dependencies.",
    alternative:
      "Hold operational acceptance until Casey and the customer jointly validate the test credit; keep a named interim owner.",
    failure:
      "Treat “integrated” as permission to file, pay and include excluded channels.",
    why: "A relationship handoff can proceed without pretending every implementation dependency is complete.",
    request:
      "Casey owns mapping correction; Maya supplies the authorized approver; the AM verifies the acceptance record before changing operational scope.",
    output: "Implementation handoff with exceptions and acceptance criteria",
    sources: ["taxwire-public", "taxwire-role", "training-policy"],
  },
  {
    id: "M-A02",
    competencyIds: ["A02", "T04"],
    account: "cedarline",
    title: "Discover the new channel",
    briefing:
      "A fictional launch page announces a wholesale portal. Establish what actually changed before proposing a scope change.",
    facts: [
      "Cedarline sells homeware direct and through MarketHub.",
      "The new portal page says “wholesale coming soon.”",
      "No confirmed transaction launch date appears.",
    ],
    packet:
      "Company page snapshot: wholesale portal announced. Order feed has only direct and MarketHub channel IDs. Meeting note: pilot could use dealer certificates. Pricing page alone does not show actual supplies or tax classification.",
    question:
      "Theo knows order operations. Ask an open question about the pilot’s customers, launch date and records.",
    answer:
      "Ask whether the portal is live, which entity invoices, who buys for resale and where the transactions appear.",
    decision:
      "Record the announcement as a hypothesis; request pilot transactions and the launch owner before revising scope.",
    alternative:
      "Prepare a conditional discovery plan and ask for a confirmed launch checkpoint.",
    failure:
      "Declare new obligations from the page headline or profile employees’ private personal lives.",
    why: "Business research informs discovery; only verified operating facts support a scoped action.",
    request:
      "Theo validates pilot facts; Lena identifies channel mappings; the AM documents the business model and remaining questions.",
    output: "Confirmed/hypothesis/question discovery brief",
    sources: ["taxwire-role", "training-policy"],
  },
  {
    id: "M-T02",
    competencyIds: ["T02", "A07"],
    account: "cedarline",
    title: "Reconcile a credit and tax payable",
    briefing:
      "The source ledger and draft payable disagree. Compute the signed bridge before chasing a cash payout.",
    facts: [
      "Synthetic exclusive sales base is 80,000 USD cents at an assumed 8% training rate.",
      "An approved credit reverses 10,000 base and 800 tax in the same period.",
      "Draft payable shows 6,400 cents because the credit was omitted.",
    ],
    packet:
      "Invoices C-100 to C-104: base 80,000; tax 6,400. Credit CR-12: base -10,000; tax -800; same synthetic period P2. Cash refund pending does not change the stated credit treatment in this exercise. Round each stated tax amount to nearest cent; all amounts already integral.",
    question:
      "Determine whether the credit is approved, belongs to P2, and reverses original tax.",
    answer:
      "Confirm CR-12 is approved, dated in P2 and reverses 800 cents of original tax; separate it from cash refund timing.",
    decision:
      "Bridge 6,400 original tax minus 800 credit tax to net payable of 5,600 cents.",
    alternative:
      "Hold the draft and ask Casey to trace CR-12 through the import before approval.",
    failure:
      "Use the gross cash payout or add the credit tax instead of subtracting it.",
    why: "Reconciliation follows signed transaction adjustments and their period, not payout intuition.",
    request:
      "Casey includes the approved credit, reruns control totals and sends the corrected draft to the authorized reviewer.",
    output: "Signed invoice-to-payable reconciliation bridge",
    sources: ["training-policy"],
    calculation: {
      label:
        "Enter net tax payable in USD cents. Original tax 6,400; approved same-period credit tax -800.",
      expected: 5600,
      worked:
        "6,400 + (-800) = 5,600 USD cents. The fictional rate is 8%; this is arithmetic, not a real jurisdiction rate.",
    },
  },
  {
    id: "M-A03",
    competencyIds: ["A03", "A10"],
    account: "forgebridge",
    title: "Find the approver and the backup",
    briefing:
      "Your helpful practitioner is going on leave just as a renewal and certificate review begin.",
    facts: [
      "Imani supplies records but cannot sign commercial terms.",
      "Gavin is the finance sponsor and budget approver.",
      "Owen controls system changes; a leave backup is unconfirmed.",
    ],
    packet:
      "Stakeholder note: Imani has agreed to supply certificate exception records but is absent next session. Draft renewal field says “customer approved” based only on Imani’s informal comment. Gavin requests a short decision brief; Owen needs reproducible mapping examples.",
    question:
      "Ask Imani to confirm the approval path and nominate a record-access backup.",
    answer:
      "Separate record supplier, budget approver and systems owner; ask who will cover certificate requests during leave.",
    decision:
      "Correct the approval record, schedule Gavin’s budget discussion and obtain an explicit practitioner backup.",
    alternative:
      "Send a written stakeholder map for confirmation before booking decisions.",
    failure:
      "Keep Imani as sole owner and interpret her helpfulness as contract authority.",
    why: "Friendliness does not establish authority or business continuity.",
    request:
      "Morgan reviews the stakeholder map; the AM confirms the backup and obtains the appropriate decision meeting.",
    output: "Stakeholder map with authority, preferences and leave backup",
    sources: ["training-policy", "taxwire-role"],
  },
  {
    id: "M-T03",
    competencyIds: ["T03", "A02"],
    account: "atlasfield",
    title: "Map a new physical connection",
    briefing:
      "Atlasfield has a field technician in a new state while sales totals remain incomplete.",
    facts: [
      "A technician began work in synthetic State Alpha on Day 4.",
      "Prior-period sales extract is missing two months.",
      "No jurisdiction-specific collection effective date has been reviewed.",
    ],
    packet:
      "Employee-location log: Atlasfield Services Inc., Alpha start Day 4. CRM sales summary excludes refunded contracts and the two missing months. Training threshold 10,000,000 cents is synthetic and cannot decide a real legal obligation. No registration or collection conclusion is provided.",
    question:
      "Ask Malik for dated physical activity and complete sales records rather than a single headline total.",
    answer:
      "Verify employee start date, activity, entity and missing periods; ask which sales classes the extract includes.",
    decision:
      "Build separate physical-connection and sales-history fact rows; seek Alpha-specific rule and effective-date review.",
    alternative:
      "First reconcile the missing two months while protecting the physical-presence question for Rowan.",
    failure:
      "Conclude no obligation because the incomplete sales total is below a synthetic threshold.",
    why: "Physical activity and economic measurement are distinct investigations; incomplete history cannot prove a negative.",
    request:
      "Rowan reviews dated Alpha facts and relevant authority; Malik obtains missing extracts and the AM owns the follow-up.",
    output: "Nexus fact matrix with evidence gaps and reviewed-date request",
    sources: ["sst", "training-policy"],
  },
  {
    id: "M-A04",
    competencyIds: ["A04", "T10"],
    account: "harborworks",
    title: "Correct yesterday’s overconfident update",
    briefing:
      "A draft message incorrectly said “payment complete.” The customer needs a correction and a recoverable plan.",
    facts: [
      "Yesterday’s message asserted completion without payment acceptance.",
      "Filing acceptance is verified; payment status remains under operations review.",
      "Maya asks whether a duplicate debit is needed.",
    ],
    packet:
      "Message draft D-4: “Everything is paid; ignore the notice.” Operations note O-7: bank status not yet verified. Practitioner reports anxiety before close. Do not invent an outcome or blame another team.",
    question:
      "Listen to the impact and explain the correction in plain language.",
    answer:
      "Acknowledge that the prior wording overstated evidence, separate filing from payment, and confirm the next update time.",
    decision:
      "Correct the written record and prevent a duplicate debit while Casey verifies status.",
    alternative:
      "Offer a short call followed by a written correction with the same bounded facts.",
    failure:
      "Hide the mistake, blame the practitioner, or repeat the unsupported assurance.",
    why: "Credible communication can restore trust while compliance remains unresolved.",
    request:
      "Casey verifies status; the AM sends a correction now and owns the promised next-session check-in.",
    output: "Correction message with fact, impact, owner and check-in",
    sources: ["training-policy"],
    prerequisiteIds: ["M-T01"],
  },
  {
    id: "M-T04",
    competencyIds: ["T04", "A02"],
    account: "lumenleaf",
    title: "A dashboard is not a full fact pattern",
    briefing:
      "Lumenleaf bundles automated reporting with analyst time. Investigate the actual supply before requesting classification.",
    facts: [
      "Contract L-44 includes hosted dashboards and analyst review.",
      "Invoice shows one combined charge of 150,000 USD cents.",
      "The marketing page calls everything “consulting.”",
    ],
    packet:
      "Product appendix: customer gets login rights to standard dashboards, stored data reports and four analyst hours. Invoice does not separately state components. Texas public taxable-services page is a research lead. No reviewed classification of this fictional bundle exists.",
    question:
      "Ask Dev what customers receive and whether rights and component charges are documented.",
    answer:
      "Confirm hosted functionality, analyst work, delivery, contract rights and any separately stated prices.",
    decision:
      "Prepare separate component facts and a jurisdiction-specific classification question; hold production mapping pending review.",
    alternative:
      "Request sample contracts and invoices before completing the classification proposal.",
    failure:
      "Make the whole bundle exempt because the page says consulting, or taxable everywhere because software is involved.",
    why: "Classification follows the supplied facts and relevant law, not a marketing label.",
    request:
      "Rowan reviews the component packet; Nico prepares a reversible sandbox mapping only after approval.",
    output: "Bundle fact sheet and classification-review request",
    sources: ["tx-services", "ny-software", "training-policy"],
  },
  {
    id: "M-A05",
    competencyIds: ["A05", "A06"],
    account: "atlasfield",
    title: "Plan a day with finite specialist time",
    briefing:
      "Three commitments compete for one morning. Protect the urgent deadline without silently dropping a promised customer call.",
    facts: [
      "A notice checkpoint is 150 simulated minutes away.",
      "A routine business review is promised in 90 minutes.",
      "Rowan has one 30-minute review slot; data gathering requires 20 minutes.",
    ],
    packet:
      "Day plan: notice evidence gap first; routine review can be moved only by notifying the customer. Fictional statutory-like checkpoint and customer promise are separately tagged. Study time does not advance deadlines. Mentor recommends a 15-minute contingency buffer.",
    question:
      "Ask Malik which evidence can arrive within the morning and which meeting outcomes are essential.",
    answer:
      "Confirm the evidence delivery owner, explain the collision, and obtain agreement to a rescheduled routine review.",
    decision:
      "Gather notice inputs now, reserve Rowan, send an interim update and renegotiate the routine appointment explicitly.",
    alternative:
      "Delegate the routine preparation to a named backup while retaining the customer check-in yourself.",
    failure:
      "Attend the easy review first and leave the urgent notice without ownership.",
    why: "Priority follows deadline, impact and dependencies; a changed promise needs a closed communication loop.",
    request:
      "Morgan reviews the feasible plan; the AM records owners, time zone, buffer and carryover.",
    output: "Feasible daily calendar with commitment renegotiation",
    sources: ["training-policy"],
  },
  {
    id: "M-T05",
    competencyIds: ["T05", "T02"],
    account: "harborworks",
    title: "Resolve conflicting user locations",
    briefing:
      "The billing address is one location, but verified user allocation spans two. Apply the exercise’s approved allocation instead of guessing.",
    facts: [
      "Synthetic subscription base is 100,000 USD cents.",
      "Approved training allocation assigns 40% to Location A and 60% to Location B.",
      "Assumed rates are A 5% and B 10%; round each location tax to nearest cent.",
    ],
    packet:
      "Seat roster: A=40 seats, B=60 seats; customer confirms equal seat pricing. Billing address is B. Approved exercise sourcing record specifies proportional allocation; these are fictional location rules and rates, not actual New York rates. Server hosting location is unrelated to this exercise allocation.",
    question:
      "Ask Elias to verify customer-use evidence and the equal-price assumption.",
    answer:
      "Confirm the dated seat roster and equal pricing; preserve billing address as a separate record.",
    decision:
      "Allocate 40,000 base to A and 60,000 to B, then total their tax: 2,000 + 6,000 cents.",
    alternative:
      "Pause configuration until the customer confirms any unequal pricing or use-date changes.",
    failure:
      "Apply B’s assumed rate to all sales solely from the billing address.",
    why: "Sourcing needs transaction-relevant evidence and an approved rule; one convenient address is not always enough.",
    request:
      "Rowan confirms the training allocation; Casey tests the mapping and retains the roster and calculation.",
    output: "Location evidence and allocated-tax worksheet",
    sources: ["ny-software", "training-policy"],
    calculation: {
      label:
        "Enter total tax in USD cents using A base 40,000 at 5% and B base 60,000 at 10%.",
      expected: 8000,
      worked:
        "round(40,000 × 0.05) + round(60,000 × 0.10) = 2,000 + 6,000 = 8,000 cents. Rates and allocation are synthetic.",
    },
  },
  {
    id: "M-A06",
    competencyIds: ["A06", "T09"],
    account: "cedarline",
    title: "Triage a defect before a review cutoff",
    briefing:
      "A duplicate row threatens a draft return while a low-priority invoice-label request also arrives.",
    facts: [
      "The import repeats source order O-71 twice.",
      "The affected draft period reaches its fictional cutoff next session.",
      "The cosmetic invoice-label request has no hard deadline.",
    ],
    packet:
      "Exception log: stable ID O-71 appears twice with tax 3,200 cents each. Casey has one available correction slot. Label request asks to rename “tax line” to “sales tax” without changing amounts.",
    question:
      "Ask Theo how the duplicate entered and what affected control totals show.",
    answer:
      "Confirm O-71, entity and period, identify the original source record, and ask Lena for a reproducible feed example.",
    decision:
      "Use the operations slot on deduplication and reconciliation; schedule the cosmetic request later with an owner.",
    alternative:
      "Temporarily hold draft approval while Lena supplies a reproduction and Casey reserves the fix.",
    failure:
      "Forward both tickets blindly to Rowan and mark them closed after sending.",
    why: "A reproducible data issue needs operations work; blanket escalation wastes scarce specialist capacity.",
    request:
      "Casey corrects using the stable source key; Lena retests the feed; the AM verifies totals and sends the update.",
    output: "Risk-ranked dependency plan and duplicate-defect record",
    sources: ["training-policy"],
  },
  {
    id: "M-T06",
    competencyIds: ["T06", "A07"],
    account: "forgebridge",
    title: "Check certificate scope against actual use",
    briefing:
      "One certificate is attached to purchases for both resale and internal use. Identify the mismatched scope.",
    facts: [
      "Dealer certificate names Forgebridge Manufacturing LLC.",
      "Order F-12 contains resold parts and an internal office printer.",
      "The uploaded scan lacks one required training validation field.",
    ],
    packet:
      "Certificate CV-3: purchaser matches legal entity; stated use resale; signature field is blank. Purchase breakdown: parts for onward sale 50,000 cents; printer retained in office 30,000 cents. The exercise does not provide a legal exemption conclusion; reviewer approval is required.",
    question:
      "Ask Imani to confirm purchase use and obtain a complete certificate rather than applying one image to every line.",
    answer:
      "Separate resale parts from the internally used printer and request the missing field from the authorized purchaser.",
    decision:
      "Flag incomplete evidence and scope mismatch; hold automatic exemption mapping until reviewed.",
    alternative:
      "Route the two line types separately for specialist review while the customer corrects the document.",
    failure: "Exempt every item because a certificate image is on file.",
    why: "Certificate existence, completeness and transaction scope are different checks.",
    request:
      "Rowan reviews the corrected claim; Imani supplies the complete document and Owen applies only the approved scoped mapping.",
    output: "Certificate line-scope validation and exception log",
    sources: ["sst", "training-policy"],
  },
  {
    id: "M-A07",
    competencyIds: ["A07", "T09"],
    account: "northlight",
    title: "Correct the record without erasing history",
    briefing:
      "A consolidated note assigned one entity’s receipt to another. Preserve the error and correction.",
    facts: [
      "Receipt NR-22 belongs to Northlight Equipment LLC.",
      "The account note attributed it to Northlight Digital LLC.",
      "Payment evidence for Digital remains missing.",
    ],
    packet:
      "Original note N-8: “all entities filed and paid.” Receipt NR-22 entity field: Northlight Equipment LLC. Correction request: append factual attribution and retain the original note, author, date and rationale. Consolidation totals do not prove each entity’s acceptance.",
    question:
      "Ask Jonah which entity identifiers the source receipt actually contains.",
    answer:
      "Read the receipt entity field and confirm separate records for Digital; distinguish hearsay from source evidence.",
    decision:
      "Append a dated correction, link NR-22 to Equipment and reopen Digital’s missing evidence item.",
    alternative:
      "Mark the original note disputed while the entity mapping is independently checked.",
    failure:
      "Delete the original note and copy the same receipt to both entities.",
    why: "An audit trail preserves original claims, source attribution and correction rationale.",
    request:
      "Casey verifies entity mapping; the AM records the correction and named owner for Digital’s evidence.",
    output: "Append-only entity receipt correction log",
    sources: ["training-policy"],
  },
  {
    id: "M-T07",
    competencyIds: ["T07", "T02"],
    account: "cedarline",
    title: "Reconcile marketplace and direct tax",
    briefing:
      "A settlement includes fees and marketplace-collected tax; direct-channel tax remains a separate exercise liability.",
    facts: [
      "Synthetic direct-channel collected tax is 4,000 USD cents.",
      "MarketHub statement separately lists tax collected by platform 7,000 cents and fees 2,000 cents.",
      "Fictional approved channel policy excludes platform-collected amounts from this direct-payable worksheet.",
    ],
    packet:
      "Channel contract MC-2 says MarketHub collects for listed transactions only, subject to reviewed scope. Direct ledger D-2 tax 4,000. Settlement tax line 7,000 is not seller revenue and fees are not negative tax. The worksheet asks only direct tax payable under its approved synthetic channel assumption.",
    question:
      "Ask Theo to identify seller-of-record and channel coverage evidence, including refunds.",
    answer:
      "Match direct orders and platform orders to their contract coverage and separate tax from marketplace fees.",
    decision:
      "Keep channels separate and report 4,000 cents direct tax payable for the stated worksheet.",
    alternative:
      "Hold return review until every marketplace order has a matched collection line and coverage check.",
    failure:
      "Subtract fees from tax or conclude the platform handles all direct-store sales.",
    why: "Marketplace collection evidence applies to defined transactions; fees and tax have different meanings.",
    request:
      "Casey reconciles channel control totals; Rowan reviews any unresolved jurisdictional responsibility question.",
    output: "Channel responsibility and settlement reconciliation",
    sources: ["sst", "training-policy"],
    calculation: {
      label:
        "Enter direct tax payable in USD cents under the approved exercise policy; direct=4,000, covered marketplace tax=7,000, fees=2,000.",
      expected: 4000,
      worked:
        "Direct payable = 4,000 cents. Covered marketplace tax is tracked separately, and fees do not alter this worksheet tax amount.",
    },
  },
  {
    id: "M-A08",
    competencyIds: ["A08", "A10"],
    account: "meridian",
    title: "A friendly account with hidden renewal risk",
    briefing:
      "The practitioner is enthusiastic, but adoption and sponsor engagement tell a mixed story.",
    facts: [
      "Samira reports helpful support and rising trust.",
      "Only 60% of planned invoice feeds are validated.",
      "The budget owner has missed two review invitations.",
    ],
    packet:
      "Health observations: support response improved; feed adoption 3/5 validated; two open international evidence questions; renewal Day 52; no budget confirmation. These observations are not a predictive psychological model.",
    question:
      "Ask Felix how incomplete feeds affect outcomes and who can confirm renewal priorities.",
    answer:
      "Recognize the positive support experience while asking for adoption acceptance and a sponsor decision meeting.",
    decision:
      "Assess health as mixed with explicit confidence; create feed and sponsor verification actions.",
    alternative:
      "Keep commercial status unconfirmed until budget and procurement evidence is available.",
    failure: "Mark green solely because the practitioner says they like you.",
    why: "Trust can improve while compliance and commercial risks remain open.",
    request:
      "The AM validates adoption outcomes with Felix and seeks Ada’s budget and priority confirmation.",
    output: "Evidence-based health explanation and risk plan",
    sources: ["training-policy", "taxwire-role"],
  },
  {
    id: "M-T08",
    competencyIds: ["T08", "A05"],
    account: "pinecrest",
    title: "Collection date versus first return",
    briefing:
      "A pop-up launch has an approved fictional collection date and a later first return. Align the operational calendar.",
    facts: [
      "Approved exercise collection starts Day 8 for Pinecrest Outdoor Inc.",
      "First training return covers Days 8–20 and is due Day 25.",
      "Source data cutoff is Day 21; customer approval is required before submission.",
    ],
    packet:
      "Registration confirmation PR-8 identifies entity and synthetic State Beta. Approved reviewer note specifies collection Day 8. Calendar incorrectly enables collection on Day 25. No real statutory dates or registration actions occur.",
    question:
      "Ask Ben to identify configuration, period cutoff and approval ownership.",
    answer:
      "Confirm Day 8 collection enablement, Days 8–20 period, Day 21 data cutoff and a separate approval milestone.",
    decision:
      "Correct the configuration plan to Day 8 and retain first-return and cutoff as separate fields.",
    alternative:
      "Run a sandbox timeline test before the approved configuration goes live.",
    failure: "Start collection on Day 25 because that is the return due date.",
    why: "Registration, collection, filing and data cutoffs represent distinct events and dependencies.",
    request:
      "Rowan validates reviewed dates; Amal tests enablement; Ivy confirms customer authorization and the AM monitors checkpoints.",
    output: "Registration and first-filing readiness timeline",
    sources: ["sst", "training-policy"],
  },
  {
    id: "M-A09",
    competencyIds: ["A09", "A08"],
    account: "northlight",
    title: "An executive review with credible value",
    briefing:
      "The CFO wants outcomes, not a ticket list. Present measured improvement and unresolved entity risk together.",
    facts: [
      "Unresolved mapping defects decreased from 18 to 9 using the same sample.",
      "Digital entity payment evidence remains open.",
      "A slide claims unmeasured savings of 2,000,000 cents.",
    ],
    packet:
      "Baseline sample 200 transactions, 18 mapping defects. Follow-up same 200-type sample, 9 defects; method retained. Savings claim has no time baseline, cost rate or attribution. Executive asks for a decision on dedicated entity review capacity.",
    question:
      "Ask Jonah to validate metric comparability and the operational impact of open entity evidence.",
    answer:
      "Confirm the sample method, explain the defect reduction, and identify the unresolved payment evidence without hiding it.",
    decision:
      "Present measured defect reduction and open risk; remove unsupported savings and ask for entity-review capacity.",
    alternative:
      "Label savings as an unvalidated hypothesis and propose a controlled measurement before using it commercially.",
    failure:
      "Claim guaranteed savings and omit the open entity issue to make the review positive.",
    why: "Credible value includes a baseline and method; executive brevity cannot conceal material uncertainty.",
    request:
      "The AM prepares Rhea’s decision brief; Casey supplies the entity review plan and evidence owner.",
    output: "Executive outcome/risk/decision review",
    sources: ["training-policy", "taxwire-role"],
  },
  {
    id: "M-T09",
    competencyIds: ["T09", "T02"],
    account: "riverton",
    title: "Trace a return through source control totals",
    briefing:
      "A clean job status hides a duplicate tax row. Reconcile the source, import and draft before approval.",
    facts: [
      "Authoritative source tax totals 21,600 USD cents.",
      "The draft contains one duplicated 3,200-cent tax line.",
      "Current draft total is 24,800 cents; no customer approval exists.",
    ],
    packet:
      "Source R-1 total 21,600. Import rows list R-71 twice at 3,200 tax each. Draft D-1 total 24,800. Correction should retain an append-only event and stable idempotency key. Filing and payment receipts do not exist yet.",
    question:
      "Ask Leon to identify the repeated source ID and the affected entity-period mapping.",
    answer:
      "Confirm R-71 is the same source transaction, not two legitimate invoices; preserve both import history and correction.",
    decision:
      "Remove the duplicate effect once and reconcile corrected draft total to 21,600 cents.",
    alternative:
      "Hold approval and replay the import in a sandbox using the stable source key.",
    failure: "Trust the green job status or file 24,800 before reconciling.",
    why: "Successful transport does not establish data correctness; approval requires a source-backed bridge.",
    request:
      "Casey corrects and retests control totals; Zoe reviews the corrected draft before any simulated filing.",
    output: "Source-to-return control bridge and approval packet",
    sources: ["training-policy"],
    calculation: {
      label:
        "Enter corrected draft tax in USD cents: draft 24,800 contains one extra 3,200 line.",
      expected: 21600,
      worked:
        "24,800 − 3,200 = 21,600 USD cents, matching the authoritative source total. Retain the correction event.",
    },
  },
  {
    id: "M-A10",
    competencyIds: ["A10", "A03"],
    account: "forgebridge",
    title: "Forecast a renewal without a signature",
    briefing:
      "The champion says “likely,” procurement says “not started,” and the CFO has not approved scope.",
    facts: [
      "Renewal is Day 44.",
      "Imani expects renewal but lacks signature authority.",
      "Procurement requires a fictional 10-day review after approved terms.",
    ],
    packet:
      "Renewal record claims committed. No signed order or budget decision exists. Existing scope excludes a new plant. Commercial changes require Alex approval; the AM may propose options but cannot promise a discount.",
    question:
      "Ask Imani which decision steps and evidence remain before signature.",
    answer:
      "Confirm Gavin’s budget decision, scope review and procurement timing; record the champion’s support as one signal only.",
    decision:
      "Downgrade certainty to an evidence-based range and create budget, scope and procurement milestones.",
    alternative:
      "Maintain an uncommitted forecast with dated assumptions until the approval meeting occurs.",
    failure:
      "Record committed revenue or offer an unauthorized discount because the champion sounds positive.",
    why: "A forecast records evidence and uncertainty; commercial authority and signature remain separate.",
    request:
      "Alex reviews authorized options; the AM confirms Gavin’s decision meeting and procurement lead time.",
    output: "Renewal readiness plan and honest forecast",
    sources: ["taxwire-role", "training-policy"],
  },
  {
    id: "M-T10",
    competencyIds: ["T10", "A06"],
    account: "northlight",
    title: "An ambiguous historical notice",
    briefing:
      "Two acquired entities have similar names; a letter may refer to a period before the acquisition. Identify rather than admit.",
    facts: [
      "Notice N-73 names Northlight Equipment LLC and Period P0.",
      "Acquisition closed after P0.",
      "Consolidated records do not include the underlying seller’s return or payment receipts.",
    ],
    packet:
      "Letter N-73 requests balance confirmation by fictional Day 3. Acquisition summary is not a legal liability analysis. Amount alleged 88,000 USD cents. No admission, payment, waiver or voluntary-disclosure strategy is authorized.",
    question:
      "Ask Jonah for entity identifiers, acquisition records and original period evidence.",
    answer:
      "Confirm the named entity and period, collect the acquisition chronology, and explain that liability and remediation need specialist review.",
    decision:
      "Protect the response checkpoint and prepare a historical fact packet without admitting or dismissing the balance.",
    alternative:
      "Ask Rowan to verify the letter’s identity and deadline while operations collects original records.",
    failure:
      "Promise the customer they cannot be liable or pay the amount as a routine correction.",
    why: "Historical exposure and acquisition responsibility require qualified review of the specific facts and legal documents.",
    request:
      "Rowan leads the notice position review with appropriate legal expertise; the AM owns record gathering and customer check-ins.",
    output: "Historical notice chronology and bounded remediation request",
    sources: ["sst", "training-policy"],
  },
  {
    id: "M-A11",
    competencyIds: ["A11", "T08"],
    account: "bayshore",
    title: "Qualify expansion without pressure",
    briefing:
      "A new entity may need indirect-tax support, but the customer first needs a reliable product-launch decision.",
    facts: [
      "Bayshore plans one new subsidiary and an EU pilot.",
      "Current scope covers the US entity only.",
      "Dara prioritizes launch readiness over a broader contract.",
    ],
    packet:
      "Business-change brief: new entity name unconfirmed; pilot contracts unsigned; legal establishment unknown. AM cannot guarantee coverage, pricing or a launch date. Customer also asks for payroll services, outside this game’s indirect-tax scope.",
    question:
      "Ask Noel which launch dependencies matter and which support is actually needed.",
    answer:
      "Confirm entity, supply and launch questions, acknowledge the immediate priority and explain the payroll scope boundary.",
    decision:
      "Offer a staged discovery and reviewed indirect-tax scope option; decline unsupported payroll promises.",
    alternative:
      "Defer expansion until the launch facts and customer decision criteria are clearer.",
    failure:
      "Push a broad contract now or promise all tax and payroll obligations are covered.",
    why: "Appropriate expansion connects a verified need to supported scope; declining a poor fit can preserve trust.",
    request:
      "Alex approves any scoped offer; Rowan reviews launch questions; the AM records customer success criteria and a no-pressure decision path.",
    output: "Scoped expansion discovery and fit decision",
    sources: ["taxwire-role", "training-policy"],
  },
  {
    id: "M-T11",
    competencyIds: ["T11", "T02"],
    account: "meridian",
    title: "VAT/GST arithmetic with explicit eligibility",
    briefing:
      "Separate a net-tax calculation from the eligibility investigation that would be required in a real case.",
    facts: [
      "Training output tax is 24,000 currency-minor units.",
      "The exercise expressly approves 7,500 units of qualifying recoverable input tax.",
      "Another 2,000 purchase-tax units are unreviewed and excluded from this exercise recovery.",
    ],
    packet:
      "Fictional tax worksheet uses one synthetic currency with two decimal minor units. Approved exercise reviewer establishes only the 7,500 qualifying input amount. Customer-status record for a separate international invoice is incomplete; it must not influence this arithmetic.",
    question:
      "Ask Felix to distinguish the approved recovery amount from an unsupported purchase-tax claim.",
    answer:
      "Confirm approval for 7,500 only, retain the invoice references and separate customer-status research from the arithmetic.",
    decision:
      "Compute 24,000 minus 7,500 = 16,500 minor units under the stated approved exercise assumptions.",
    alternative:
      "Hold the unreviewed 2,000 separately and ask a specialist for its eligibility facts.",
    failure:
      "Subtract all purchase tax automatically or assume an email domain proves business status.",
    why: "Correct net-tax arithmetic does not establish input eligibility or place-of-supply law.",
    request:
      "Rowan reviews unconfirmed eligibility and status questions; the AM keeps the verified calculation separate.",
    output: "VAT/GST net-tax worksheet and eligibility-question log",
    sources: ["uk-services", "ca-gst", "training-policy"],
    calculation: {
      label:
        "Enter synthetic net-tax minor units: output 24,000 less approved input 7,500. Exclude unreviewed 2,000.",
      expected: 16500,
      worked:
        "24,000 − 7,500 = 16,500 minor units. This assumes only the stated approved eligibility; it is not an actual tax return.",
    },
  },
  {
    id: "M-A12",
    competencyIds: ["A12", "T09"],
    account: "cedarline",
    title: "Pilot a reusable defect-prevention playbook",
    briefing:
      "Recurring duplicate imports invite automation. Design a reversible control with measured acceptance instead of replacing review.",
    facts: [
      "Current duplicate review takes 45 minutes per sampled batch.",
      "A pilot takes 30 minutes using the same sample and defect-detection criteria.",
      "An unapproved AI proposal would upload account extracts to an external model.",
    ],
    packet:
      "Pilot proposal: stable-key duplicate report, human approval, audit log, rollback and no external data transfer. Same five seeded defects detected by both methods. Claimed saving is 15 minutes per sampled batch; generalization still needs a wider trial. Optional AI is disabled.",
    question:
      "Ask Theo for the baseline method, failure examples and operational acceptance owner.",
    answer:
      "Confirm the same sample and acceptance criteria, retain human review and reject unapproved data transfer.",
    decision:
      "Approve only the bounded local pilot with rollback and reviewer acceptance; measure broader results before scaling.",
    alternative:
      "Keep the manual process while improving the defect reproduction and pilot design.",
    failure:
      "Enable external AI uploads or mark all imports approved because automation ran.",
    why: "Safe improvement changes a measured process without inventing authority, evidence or data permission.",
    request:
      "Casey owns pilot acceptance; Lena records reproduction and rollback; the AM documents measured benefit and limitations.",
    output: "Safe automation pilot and reusable duplicate-control playbook",
    sources: ["training-policy", "taxwire-role"],
  },
  {
    id: "M-T12",
    competencyIds: ["T12", "A11"],
    account: "solstice",
    title: "Three markets, three launch questions",
    briefing:
      "Solstice wants one global setting for UK, EU and Canada. Build separate fact and review gates.",
    facts: [
      "Solstice supplies consumer digital memberships, not imported physical goods.",
      "Supplier establishment and customer evidence are incomplete.",
      "The proposed launch spans EU, UK and Canada, including provincial questions.",
    ],
    packet:
      "Launch memo: “Enable IOSS for all subscriptions, UK and Canada included.” Product is digital access; no goods consignments exist. EU OSS, UK services guidance and CRA GST/HST index provide different research paths. No actual eligibility determination is supplied.",
    question:
      "Ask Ari to confirm supplies, supplier establishment and business-versus-consumer evidence.",
    answer:
      "Separate digital services from imported goods and collect establishment and customer facts for each jurisdiction.",
    decision:
      "Reject the universal setting and create EU, UK and Canadian review gates, including separate provincial questions.",
    alternative:
      "Stage launch by market after the necessary facts and reviewer approvals are available.",
    failure:
      "Apply EU import-goods rules to all UK and Canadian digital subscriptions.",
    why: "International regimes are distinct; an easy global label cannot replace jurisdiction-specific facts.",
    request:
      "Rowan reviews the three jurisdiction packets; Alex approves any changed support scope and the AM owns the launch dependency map.",
    output: "International regime comparison and staged launch gates",
    sources: ["eu-oss", "uk-services", "ca-gst", "training-policy"],
  },
];

export const coreMissions = cases.map((c) =>
  createCase({
    ...c,
    ...(c.id === "M-A12"
      ? { failureCritical: "Disclosure through an unapproved external service" }
      : {}),
  }),
);
const slice = coreMissions.find((m) => m.id === "M-T01")!;
slice.steps.splice(
  3,
  0,
  step(
    "M-T01-s3a",
    "research",
    "Read authority and separate game policy",
    "Read the remote-seller source summary and fictional approval policy. Sources are public research leads; no qualified legal review has been performed. Compare collection, filing and payment responsibilities.",
    [
      option(
        "boundary",
        "Record the research lead, case period, missing payment evidence and professional-review boundary.",
        "You preserve the source scope and avoid turning an illustrative exercise into current-law advice.",
        96,
      ),
      option(
        "state",
        "Keep the notice fact packet and ask Rowan for the relevant state authority.",
        "A bounded authority question is defensible and respects the professional-review limit.",
        89,
      ),
      option(
        "universal",
        "Treat a single FAQ as a universal legal answer for every jurisdiction.",
        "The FAQ directs you to state-specific requirements. No universal threshold or liability conclusion follows.",
        20,
      ),
    ],
    {
      location: "research",
      duration: 15,
      sourceIds: ["sst", "training-policy"],
      requiresEvidence: ["M-T01-s3"],
    },
  ),
);
