import { createCase, type CaseSeed } from "./mission-tools";

const advanced: CaseSeed[] = [
  {
    id: "X-T01",
    competencyIds: ["T01", "T09", "A06"],
    account: "pinecrest",
    title: "Filing accepted, payment rejected",
    briefing:
      "A later lifecycle case differs from the first notice: payment rejection is now explicit, not merely missing evidence.",
    facts: [
      "Filing acceptance PF-19 is verified.",
      "Payment response PP-19 explicitly says rejected: incorrect account reference.",
      "A fictional response checkpoint is next business session.",
    ],
    packet:
      "PF-19: accepted return, entity Pinecrest Outdoor Inc. PP-19: rejected instruction, no debit. Reprocessing needs corrected authorization and a stable reference. Do not retry blindly, invent a settlement or change a bank record independently.",
    question:
      "Ask Ben to confirm the rejection code and approver path before discussing retry.",
    answer:
      "Verify no accepted debit, confirm the rejected instruction ID and ask Ivy for authorized correction.",
    decision:
      "Separate the accepted filing from rejected payment; coordinate a reviewed corrected instruction and retain acceptance evidence.",
    alternative:
      "Protect the checkpoint with an interim update while operations independently verifies there was no later acceptance.",
    failure:
      "Close because filing succeeded or repeatedly submit the same instruction without authorization.",
    why: "A rejected payment requires controlled correction, appropriate authority and positive acceptance; accepted filing remains a separate fact.",
    request:
      "Casey verifies rejection, Ivy authorizes correction and Rowan reviews deadline implications; the AM retains the closure checkpoint.",
    output: "Rejected-payment recovery and acceptance packet",
    sources: ["training-policy", "sst"],
    prerequisiteIds: ["M-T01", "M-T09"],
  },
  {
    id: "X-T02",
    competencyIds: ["T02", "T09"],
    account: "riverton",
    title: "Inclusive invoice and delayed cash refund",
    briefing:
      "A credit reverses an inclusive invoice, but the bank refund arrives later. Keep accounting events separate.",
    facts: [
      "Synthetic inclusive original price is 12,000 USD cents at an assumed 20% rate.",
      "A full approved credit reverses the original base and tax in Period P3.",
      "Cash refund clears in P4 under a separate record.",
    ],
    packet:
      "Invoice RI-20 gross 12,000 cents. Rate assumption 20%, round nearest cent. Base= gross/1.20, tax=gross-base. Credit CR-20 reverses tax in P3 under the exercise approved period policy. The worksheet asks original tax reversed, not cash gross.",
    question:
      "Ask Leon to match the credit to the invoice and identify its approved period.",
    answer:
      "Confirm full credit, original tax calculation and the separate later refund event.",
    decision:
      "Calculate original tax 2,000 cents and record its P3 reversal separately from the P4 cash refund.",
    alternative:
      "Retain both dates in the reconciliation bridge and ask the reviewer to resolve any unapproved period question.",
    failure:
      "Treat 20% of inclusive gross as tax or move the credit simply to the bank-clearance period.",
    why: "Inclusive tax is gross minus gross divided by one plus the rate; credit and cash timing are separate under the stated exercise.",
    request:
      "Casey validates the period bridge and Zoe approves the corrected draft; retain invoice, credit and cash references.",
    output: "Inclusive credit and cross-period cash bridge",
    sources: ["training-policy"],
    prerequisiteIds: ["M-T02"],
    calculation: {
      label:
        "Enter original tax reversed in USD cents: inclusive gross 12,000 at synthetic 20%.",
      expected: 2000,
      worked:
        "Base=12,000/1.20=10,000; tax=12,000−10,000=2,000 cents. Do not use gross×20%.",
    },
  },
  {
    id: "X-T03",
    competencyIds: ["T03", "A07"],
    account: "atlasfield",
    title: "Incomplete nexus history and inconsistent sales bases",
    briefing:
      "Three reports use different sales definitions and one month is missing. Construct a defensible investigation rather than a false threshold answer.",
    facts: [
      "Report A gross sales is 9,800,000 USD cents.",
      "Report B taxable sales is 6,100,000 cents; resale sales are omitted.",
      "Month 7 is missing and an employee’s start date predates both extracts.",
    ],
    packet:
      "Synthetic Alpha comparison threshold 10,000,000 cents is not real law. Report A includes only 11 months; B excludes resale. Employee-location record start Month 2. No reviewed law states which basis, window or collection date applies.",
    question: "Ask Malik to reconcile report definitions and missing history.",
    answer:
      "Confirm denominator, included channels and months, identify the physical start date and request Month 7.",
    decision:
      "Document each basis and the missing period; refuse a no-nexus conclusion until physical and economic facts are reviewed.",
    alternative:
      "Prioritize the dated employee facts while operations completes the sales bridge.",
    failure:
      "Choose the smaller report to remain below the fictional threshold.",
    why: "Incomplete or inconsistent measures cannot support a negative conclusion; a physical connection remains a separate question.",
    request:
      "Rowan reviews measurement definitions and effective dates; Malik owns missing history and the AM documents confidence.",
    output: "Historical nexus chronology and sales-definition bridge",
    sources: ["sst", "training-policy"],
    prerequisiteIds: ["M-T03"],
  },
  {
    id: "X-T04",
    competencyIds: ["T04", "A11"],
    account: "bayshore",
    title: "A hardware-software-service bundle launches tomorrow",
    briefing:
      "Launch urgency collides with incomplete contract detail. Use reversible preparation and a classification gate.",
    facts: [
      "One invoice price covers robotics hardware, software rights and maintenance.",
      "A draft appendix would split charges but is unsigned.",
      "The customer wants launch certainty before specialist review.",
    ],
    packet:
      "Contract B-88: one 450,000-cent charge, delivery hardware to end-user, control software license and annual support. Appendix B-89 has proposed component pricing; not approved. No legal classification or rate is provided.",
    question:
      "Ask Noel which rights, deliveries and component charges are actually agreed.",
    answer:
      "Confirm contract version, software rights, physical delivery and support promises; flag the unsigned appendix.",
    decision:
      "Create component facts and a review gate; test mappings in a sandbox without declaring production tax treatment.",
    alternative:
      "Offer a staged launch discussion with clearly stated unresolved classification and scope dependencies.",
    failure:
      "Assume proposed separate prices are final or guarantee the bundle is exempt to meet the launch date.",
    why: "Urgency does not make an unsigned proposal an authoritative fact or grant the AM tax approval.",
    request:
      "Rowan reviews the signed supply facts; Eden tests approved mappings and Alex reviews any added launch support scope.",
    output: "Bundle version comparison and reversible launch gate",
    sources: ["ny-software", "tx-services", "training-policy"],
    prerequisiteIds: ["M-T04", "M-A11"],
  },
  {
    id: "X-T05",
    competencyIds: ["T05", "A07"],
    account: "aster",
    title: "Virtual attendance conflicts with billing location",
    briefing:
      "Event access records and finance addresses disagree. Gather relevant supply and attendance facts without copying a software rule.",
    facts: [
      "Aster sells in-person tickets and virtual access separately.",
      "Billing headquarters differs from the event venue and attendee locations.",
      "A spreadsheet applies one software user-allocation rule to all tickets.",
    ],
    packet:
      "Orders A-51 physical attendance; A-52 virtual access; A-53 sponsorship. Location evidence fields have different meanings. UK services guidance is a research starting point; event exceptions require case-specific review. No actual sourcing conclusion is supplied.",
    question:
      "Ask Remy to distinguish ticket types, venue, attendance and customer evidence.",
    answer:
      "Separate in-person, virtual and sponsorship supplies; record the relevant location evidence for each.",
    decision:
      "Discard the copied universal sourcing assumption and prepare supply-specific questions for a specialist.",
    alternative:
      "Hold only the affected ticket mappings while verified unrelated lines remain traceable.",
    failure:
      "Use the billing headquarters or software user allocation for every event supply.",
    why: "Sourcing depends on the precise supply and its rules; a different industry’s example cannot settle event treatment.",
    request:
      "Rowan reviews event and service-specific authority; Anika checks evidence capture and the AM owns the scoped customer update.",
    output: "Event supply and location evidence matrix",
    sources: ["uk-services", "training-policy"],
    prerequisiteIds: ["M-T05", "M-T11"],
  },
  {
    id: "X-T06",
    competencyIds: ["T06", "A04"],
    account: "riverton",
    title: "A dealer disputes certificate scope",
    briefing:
      "A dealer insists its certificate covers employee giveaways. Handle disagreement respectfully while retaining evidence.",
    facts: [
      "A dealer certificate supports identified resale transactions.",
      "A new order is for internal promotional giveaways.",
      "The dealer asks for a refund before specialist review.",
    ],
    packet:
      "Certificate RC-8 names the purchaser and resale use. Order R-90 note says “employee gifts, no onward sale.” A historic invoice used an exemption mapping without sufficient scope evidence. No refund or tax position is authorized.",
    question:
      "Listen to the dealer’s concern and ask Leon for the purchase-use and original evidence.",
    answer:
      "Acknowledge the concern, explain the scope question in neutral language and request corrected purchase-use facts.",
    decision:
      "Separate the disputed giveaway order from established resale orders and seek a scoped specialist review.",
    alternative:
      "Hold the refund decision and provide a dated evidence request without accusing the customer.",
    failure:
      "Apply the certificate universally or promise an immediate refund to end the disagreement.",
    why: "Constructive disagreement preserves the relationship while evidence and authority determine the next step.",
    request:
      "Rowan reviews certificate scope and historic treatment; Zoe approves any financial response and the AM maintains the check-in.",
    output: "Certificate dispute explanation and scoped review packet",
    sources: ["sst", "training-policy"],
    prerequisiteIds: ["M-T06", "M-A04"],
  },
  {
    id: "X-T07",
    competencyIds: ["T07", "T09"],
    account: "cedarline",
    title: "Platform labels disagree with seller contracts",
    briefing:
      "A channel is labeled merchant of record in a dashboard, but the contract describes only payment processing.",
    facts: [
      "Dashboard channel “MOR-X” handles payment authorization.",
      "The contract names Cedarline as seller and describes processing only.",
      "Invoices list Cedarline, while no platform tax-collection statement exists.",
    ],
    packet:
      "Contract CP-12 excerpt: provider processes customer payments; seller obligations remain with Cedarline unless a separate service agreement applies. No separate agreement found. Feed label “MOR-X” is an operational label, not verified legal responsibility.",
    question:
      "Ask Theo to identify contractual seller, invoices and actual collection records.",
    answer:
      "Compare the contract and invoices with the channel label and ask whether a separate agreement exists.",
    decision:
      "Mark merchant-of-record responsibility unverified and investigate contract coverage before excluding transactions.",
    alternative:
      "Include the channel in a held exception worksheet until reviewer-confirmed responsibility is documented.",
    failure: "Exclude every transaction solely because the dashboard says MOR.",
    why: "A product label cannot establish contractual seller or jurisdictional collection responsibility.",
    request:
      "Rowan reviews contractual facts; Lena corrects misleading labels after approval and the AM records responsibility evidence.",
    output: "Contract-versus-channel responsibility correction",
    sources: ["sst", "training-policy"],
    prerequisiteIds: ["M-T07"],
  },
  {
    id: "X-T08",
    competencyIds: ["T08", "A05"],
    account: "northlight",
    title: "The acquired entity has a different filing calendar",
    briefing:
      "A consolidated calendar copied the parent’s dates onto a newly acquired entity.",
    facts: [
      "Equipment entity uses synthetic monthly periods.",
      "Digital entity’s reviewed training schedule is quarterly.",
      "The shared calendar copied monthly cutoff and collection start to both.",
    ],
    packet:
      "Entity registration records NE-8 and ND-8 have distinct period schedules and effective dates. An account-level default silently overwrote ND-8. Authority and bank approvals remain entity-specific; consolidation is a reporting convenience.",
    question:
      "Ask Jonah to verify each entity’s reviewed calendar and approval owner.",
    answer:
      "Compare entity registration records, collection dates, reporting periods and authorizations independently.",
    decision:
      "Restore entity-specific dates and hold automated submissions until both calendars and owners are verified.",
    alternative:
      "Run a calendar comparison and supervised dry run before changing production-like exercise settings.",
    failure:
      "Treat the parent’s dates and approvals as automatically valid for all acquired entities.",
    why: "Multiple legal entities can share an account while maintaining distinct obligations and authorizations.",
    request:
      "Rowan verifies dates; Talia retests entity scheduling; Rhea confirms approvers and the AM retains the calendar correction trail.",
    output: "Multi-entity registration and calendar correction",
    sources: ["sst", "training-policy"],
    prerequisiteIds: ["M-T08", "M-A07"],
  },
  {
    id: "X-T09",
    competencyIds: ["T09", "T02"],
    account: "forgebridge",
    title: "A posted credit arrives after the cutoff",
    briefing:
      "An approved correction arrives after a draft snapshot. Preserve versions and obtain a reviewed amendment decision.",
    facts: [
      "Draft v1 has tax 31,000 USD cents.",
      "Approved credit tax -1,500 cents arrived after the snapshot.",
      "No filing acceptance exists; filing status is still draft.",
    ],
    packet:
      "Draft version v1 locked for review, not submitted. Credit FC-91 approved same exercise period. Corrected v2 tax=29,500 cents. Preserve v1 and correction event; do not describe this as an amended filed return because nothing was filed.",
    question:
      "Ask Imani to establish credit date, review cutoff and actual submission status.",
    answer:
      "Confirm the record is a draft, verify credit approval and retain the snapshot timeline.",
    decision:
      "Produce draft v2 of 29,500 cents with a 1,500-cent bridge and resubmit for customer approval.",
    alternative:
      "Hold review and request specialist direction if the credit’s period or eligibility is disputed.",
    failure:
      "Overwrite v1 silently or claim a filed amendment was completed without a filing.",
    why: "Correction terminology and evidence depend on the actual stage; preserving versions makes the change auditable.",
    request:
      "Casey prepares v2 and its bridge; Gavin approves the revised draft before any simulated submission.",
    output: "Versioned late-credit correction and approval renewal",
    sources: ["training-policy"],
    prerequisiteIds: ["M-T09", "M-T02"],
    calculation: {
      label:
        "Enter corrected draft v2 tax in USD cents: v1 31,000; approved credit -1,500.",
      expected: 29500,
      worked:
        "31,000 + (−1,500) = 29,500 USD cents. Keep v1 and v2; approval is renewed.",
    },
  },
  {
    id: "X-T10",
    competencyIds: ["T10", "A06", "A07"],
    account: "northlight",
    title: "Historical exposure without an outcome guarantee",
    briefing:
      "A former owner admits missing two periods but lacks transaction data. Do not promise a legal remediation strategy.",
    facts: [
      "Two historical periods have no located return receipts.",
      "The former owner remembers activity but cannot quantify it.",
      "The customer asks whether a voluntary disclosure guarantees no penalties.",
    ],
    packet:
      "Exposure memo NH-40: undocumented recollection, missing raw sales and registration history. No reviewed liability, eligibility, legal strategy or penalty outcome exists. Preserve records; qualified tax and legal review may be required.",
    question:
      "Ask Jonah to distinguish recollection from original records and collect dated evidence.",
    answer:
      "Record what is known, request sales and registration history, and explain that specialist advice determines remediation options.",
    decision:
      "Create a bounded historical investigation with period and evidence gaps; avoid guaranteed penalty or eligibility claims.",
    alternative:
      "Protect current operations while reserving a specialist-led historical review and a customer checkpoint.",
    failure:
      "Guarantee a waiver or recommend a legal disclosure strategy without reviewed facts.",
    why: "Historical exposure needs specific evidence and professional advice; uncertainty must remain visible.",
    request:
      "Rowan leads qualified review and identifies any legal involvement; the AM owns data gathering, timeline and customer updates.",
    output: "Historical exposure inventory and specialist-led options request",
    sources: ["sst", "training-policy"],
    prerequisiteIds: ["M-T10"],
  },
  {
    id: "X-T11",
    competencyIds: ["T11", "A02"],
    account: "meridian",
    title: "A business customer without enough status evidence",
    briefing:
      "One buyer uses a business email but has not supplied status or establishment evidence.",
    facts: [
      "Buyer email has a company-looking domain.",
      "Invoice name differs from the business-status document.",
      "The service and customer establishment are not yet verified.",
    ],
    packet:
      "Subscription ML-88: business plan selected online. Uploaded registration reference belongs to another entity. This does not establish a reverse charge or place of supply. UK services guidance requires precise facts and consideration of exceptions.",
    question:
      "Ask Felix for invoice entity, status evidence, receiving establishment and actual service.",
    answer:
      "Identify the mismatch neutrally and request corrected entity and customer-status evidence.",
    decision:
      "Hold the proposed B2B treatment and prepare a precise status/place-of-supply question rather than infer from email.",
    alternative:
      "Maintain an explicitly provisional review state while the customer supplies verifiable records.",
    failure:
      "Apply a reverse-charge label from the email domain or use another entity’s registration evidence.",
    why: "Customer status and establishment are evidence questions; account tier and email appearance do not prove them.",
    request:
      "Rowan reviews status and service facts; the AM gathers matching evidence and records any pending invoicing decision.",
    output: "Cross-border customer-status evidence review",
    sources: ["uk-services", "training-policy"],
    prerequisiteIds: ["M-T11"],
  },
  {
    id: "X-T12",
    competencyIds: ["T12", "T07", "A11"],
    account: "solstice",
    title: "International digital launch and platform responsibility",
    briefing:
      "A distribution platform offers collection assistance in one territory while the customer launches elsewhere too.",
    facts: [
      "Platform contract lists one defined EU channel.",
      "UK and Canadian direct subscriptions sit outside that contract.",
      "Canada launch includes customers in provinces with additional questions.",
    ],
    packet:
      "Contract SD-11 covers listed EU platform transactions only. Product is digital membership, not imported goods. Direct billing persists in UK and Canada. Supplier establishment and Canadian regime details require review. No universal “platform handles tax” conclusion exists.",
    question:
      "Ask Ari to map platform coverage, direct channels and customer geography.",
    answer:
      "Separate contractual channel coverage from direct supplies and collect regime-specific facts.",
    decision:
      "Build separate EU, UK and Canadian workstreams plus provincial review questions; stage uncovered channels until reviewed.",
    alternative:
      "Limit the pilot to verified scope while qualifying each additional launch path.",
    failure:
      "Treat platform collection as global compliance or use IOSS for all digital memberships.",
    why: "Platform contract scope and international regimes both require precise facts; one does not erase the other.",
    request:
      "Rowan reviews jurisdiction and channel questions; Alex scopes support and Jules verifies evidence capture before launch.",
    output: "International channel coverage and staged-release matrix",
    sources: ["eu-oss", "uk-services", "ca-gst", "training-policy"],
    prerequisiteIds: ["M-T12", "M-T07"],
  },
  {
    id: "X-A01",
    competencyIds: ["A01", "A07"],
    account: "bayshore",
    title: "The scope dispute after onboarding",
    briefing:
      "The customer expected notice handling for a second entity, but signed fictional scope lists one.",
    facts: [
      "Signed scope B-S1 names Bayshore Robotics Inc. only.",
      "An informal handoff note says “all notices handled.”",
      "The second entity has a near-term notice checkpoint.",
    ],
    packet:
      "Contract scope and handoff note conflict. A service boundary does not justify abandoning an urgent issue. No automatic inclusion or free-service promise is authorized. AM should protect ownership while commercial and specialist reviewers determine options.",
    question:
      "Ask Noel how the expectation arose and obtain the exact entity and notice facts.",
    answer:
      "Acknowledge the expectation, compare the scope record without blame and identify the urgent checkpoint.",
    decision:
      "Retain urgent triage ownership while clarifying scope and seeking an authorized support option.",
    alternative:
      "Arrange a bounded transitional review with explicit approval and a written scope decision.",
    failure:
      "Promise unlimited out-of-scope work or refuse all help and leave the notice unowned.",
    why: "An honest service boundary can coexist with responsible triage and an approved path forward.",
    request:
      "Alex resolves commercial options, Rowan handles notice expertise and the AM owns the customer explanation.",
    output: "Scope reconciliation and urgent transitional ownership plan",
    sources: ["taxwire-public", "training-policy"],
    prerequisiteIds: ["M-A01", "M-A06"],
  },
  {
    id: "X-A02",
    competencyIds: ["A02", "T03"],
    account: "pinecrest",
    title: "A pop-up, an inventory move and an old website",
    briefing:
      "The website omits a new pop-up store, while warehouse logs show stock in another location.",
    facts: [
      "Website lists online-only operations.",
      "Inventory log records goods stored in Location Gamma.",
      "Pop-up event starts next session and employee staffing is unconfirmed.",
    ],
    packet:
      "Public-style fictional page is two campaign months old. Stock transfer ST-4 dated yesterday; event poster names Gamma venue. Finance extract contains no location field. These records are discovery leads rather than legal conclusions.",
    question:
      "Ask Ben to validate event dates, staff, inventory ownership and invoicing entity.",
    answer:
      "Update the business map from verified operational facts and note the stale page confidence.",
    decision:
      "Treat website completeness as unverified; gather dated physical facts and prepare a nexus-review question.",
    alternative:
      "Interview the event operations owner first and reconcile it with inventory and finance records.",
    failure:
      "Conclude there is no physical connection because the website says online-only.",
    why: "Public research can be stale; customer operations and dated source records must validate material changes.",
    request:
      "Rowan reviews the location facts; Amal adds evidence fields and the AM records the revised business map.",
    output: "Business-change discovery and dated location map",
    sources: ["sst", "training-policy"],
    prerequisiteIds: ["M-A02", "M-T03"],
  },
  {
    id: "X-A03",
    competencyIds: ["A03", "A10"],
    account: "forgebridge",
    title: "The champion leaves before the CFO decides",
    briefing:
      "The champion departs in five sessions, and a new CFO asks for evidence before renewal.",
    facts: [
      "Imani’s departure is Day 39; renewal is Day 44.",
      "Incoming finance sponsor has not seen the value review.",
      "Practitioner access backup remains unconfirmed.",
    ],
    packet:
      "Transition note: preserve respectful relationships; do not seek private departure motives. Outstanding needs: records access, decision-path confirmation, executive evidence and procurement timing. Departing champion cannot guarantee the successor’s decision.",
    question:
      "Ask Imani for an authorized handoff, priorities and record-access backup.",
    answer:
      "Confirm a customer-approved introduction, successor decision criteria and operational continuity.",
    decision:
      "Create a transition map and evidence briefing; revise renewal confidence until the new authority engages.",
    alternative:
      "Use a joint transition meeting with a concise written action log and backup confirmation.",
    failure:
      "Rely solely on the departing champion’s promise or profile the new CFO’s private life.",
    why: "Stakeholder transitions change authority and evidence needs; relationship history transfers through clear records, not assumption.",
    request:
      "The AM arranges the authorized introduction; Alex reviews forecast implications and Morgan checks the transition plan.",
    output: "Sponsor transition and renewal decision-path plan",
    sources: ["training-policy", "taxwire-role"],
    prerequisiteIds: ["M-A03", "M-A10"],
  },
  {
    id: "X-A04",
    competencyIds: ["A04", "A09"],
    account: "northlight",
    title: "The CFO disputes your savings estimate",
    briefing:
      "An executive challenges an unsupported value claim. Respond with evidence, correction and a measurement plan.",
    facts: [
      "Prior review claimed 120 hours saved without a baseline.",
      "Measured defect counts are available; measured staff time is not.",
      "The CFO asks for a defensible business case.",
    ],
    packet:
      "Slide N-V3 contains guessed savings. Defect trend is 18 to 9 in comparable samples, retained separately. No attribution model exists. Correcting the claim does not require dismissing the customer’s operational pain.",
    question:
      "Ask Jonah what measurement is available and listen to the CFO’s decision need.",
    answer:
      "Acknowledge the unsupported estimate, retain the verified defect outcome and ask which decision the CFO needs to make.",
    decision:
      "Withdraw the quantified saving, explain the verified outcome and propose a controlled time baseline.",
    alternative:
      "Present a clearly labeled range of hypotheses for planning while excluding it from verified value claims.",
    failure:
      "Defend the number with invented records or dismiss the CFO as difficult.",
    why: "A technically relevant trend becomes credible only when its limits are communicated honestly.",
    request:
      "Morgan reviews the correction; Casey measures a comparable sample and the AM owns the corrected executive brief.",
    output: "Evidence-corrected executive value explanation",
    sources: ["training-policy"],
    prerequisiteIds: ["M-A04", "M-A09"],
  },
  {
    id: "X-A05",
    competencyIds: ["A05", "A06"],
    account: "atlasfield",
    title: "Portfolio priorities across time zones",
    briefing:
      "Two promises and a specialist review collide across fictional customer time zones.",
    facts: [
      "Atlasfield expects a written update at simulated minute 120.",
      "Cedarline’s data review ends at minute 110 and needs 20 minutes of preparation.",
      "A notice specialist slot begins at minute 100 and cannot be used without a complete packet.",
    ],
    packet:
      "Calendar stores game minutes plus displayed zone labels. Customer promises are not statutory deadlines. Travel is optional via remote meetings; a finite 480-minute workday includes buffers. Study and real time away do not advance the clock.",
    question:
      "Ask Malik whether an interim update satisfies the immediate need while the specialist review proceeds.",
    answer:
      "Agree the interim content and check-in, verify packet readiness and explicitly move or delegate the routine review.",
    decision:
      "Prepare the urgent packet first, reserve the specialist and send Atlasfield an interim update before minute 120.",
    alternative:
      "Delegate Cedarline preparation to an authorized backup and keep both customer communications owned.",
    failure:
      "Double-book every action and let a promise lapse without informing the customer.",
    why: "A credible plan respects duration, time-zone labels, readiness dependencies and communication ownership.",
    request:
      "Morgan checks feasibility; the AM records rescheduled appointments, backup owners and a contingency buffer.",
    output: "Portfolio calendar conflict resolution and handoff",
    sources: ["training-policy"],
    prerequisiteIds: ["M-A05", "M-A06"],
  },
  {
    id: "X-A06",
    competencyIds: ["A06", "T10"],
    account: "northlight",
    title: "An overloaded expert asks for better facts",
    briefing:
      "Rowan rejects a vague escalation packet while two urgent customer questions remain.",
    facts: [
      "The request omitted entity, period and notice identifier.",
      "Only one specialist slot remains today.",
      "Operations can gather missing receipts independently in 20 minutes.",
    ],
    packet:
      "Rejected request: “Please fix tax urgently.” Specialist asks for notice copy, response deadline, source IDs and one precise question. A nonurgent rate-label ticket also sits in the queue. Do not repeatedly forward unchanged messages.",
    question:
      "Ask Jonah for the notice identifier, period and exact business impact.",
    answer:
      "Collect the missing packet fields and separate the urgent notice question from the nonurgent label ticket.",
    decision:
      "Improve the fact pattern, use operations for receipt verification and reserve the single specialist slot for the legal question.",
    alternative:
      "Send a scoped preliminary request with a named missing-input owner and protected response checkpoint.",
    failure:
      "Forward the same vague message repeatedly or claim the expert has resolved the issue.",
    why: "Expert capacity is scarce; a scoped request allows expertise where needed while the AM continues bounded independent work.",
    request:
      "Casey gathers receipts, Rowan reviews the completed notice question and the AM maintains the customer update.",
    output: "Specialist-ready packet and scarce-capacity triage",
    sources: ["sst", "training-policy"],
    prerequisiteIds: ["M-A06", "M-T10"],
  },
  {
    id: "X-A07",
    competencyIds: ["A07", "T09"],
    account: "harborworks",
    title: "A corrected source must not overwrite the original",
    briefing:
      "A customer uploads a revised invoice extract with the same filename. Preserve versions and trace the correction.",
    facts: [
      "Original extract E1 tax total is 18,000 USD cents.",
      "Revised extract E2 tax total is 17,700 cents after one approved 300-cent correction.",
      "Filename is identical but source checksum and approval timestamps differ.",
    ],
    packet:
      "E1 and E2 require distinct record IDs. Delta record identifies invoice HW-300 and credit approval. A screenshot of filename equality is not identity evidence. Preserve original, revised, delta, author and review record.",
    question:
      "Ask Elias for the correction reason and approval reference rather than accepting an unexplained replacement.",
    answer:
      "Verify HW-300 delta and create distinct source-version references with approval provenance.",
    decision:
      "Retain E1 and E2, reconcile the -300-cent bridge and renew draft approval.",
    alternative:
      "Mark E2 pending until the correction rationale and reviewer are confirmed.",
    failure:
      "Overwrite E1 silently or delete contradictory records to simplify the folder.",
    why: "Correction history is part of the evidence; filename reuse cannot replace provenance.",
    request:
      "Casey verifies source versions and control totals; Maya reviews the changed draft and the AM records the correction chain.",
    output: "Source-version provenance and correction bridge",
    sources: ["training-policy"],
    prerequisiteIds: ["M-A07", "M-T09"],
  },
  {
    id: "X-A08",
    competencyIds: ["A08", "A12"],
    account: "lumenleaf",
    title: "Low ticket volume hides low adoption",
    briefing:
      "Few support tickets look positive, but the customer stopped using a feed. Diagnose evidence before scoring health.",
    facts: [
      "Ticket count fell from 12 to 2.",
      "One major feed stopped submitting and remains unvalidated.",
      "The practitioner exported a manual workaround every week.",
    ],
    packet:
      "Health dashboard initially marks green from silence. Usage log: missing feed batches for three sessions. Manual spreadsheet now supports close, adding burden not measured by ticket count. Positive relationship comments remain real but incomplete signals.",
    question:
      "Ask Dev whether the quieter queue reflects success or abandonment of the process.",
    answer:
      "Discover the manual workaround, its impact and acceptance gaps without assuming customer motives.",
    decision:
      "Reassess health using adoption, outcomes and workaround burden; agree a recoverable feed plan.",
    alternative:
      "Keep confidence low while gathering close-quality and usage evidence with the practitioner.",
    failure:
      "Celebrate fewer tickets as proven value and ignore the stopped feed.",
    why: "Silence can reflect low adoption; health needs multiple observable signals and explicit confidence.",
    request:
      "Casey reviews feed reliability; Nico reproduces the failure and the AM verifies customer outcome after correction.",
    output: "Adoption-versus-silence health investigation",
    sources: ["training-policy"],
    prerequisiteIds: ["M-A08", "M-A12"],
  },
  {
    id: "X-A09",
    competencyIds: ["A09", "A04"],
    account: "aster",
    title: "Operational detail overwhelms an executive decision",
    briefing:
      "A review deck contains 40 ticket rows but does not state the decision needed for the next event.",
    facts: [
      "The customer must decide whether to postpone one unreviewed launch channel.",
      "Three material evidence gaps remain.",
      "A ticket list obscures owner, impact and options.",
    ],
    packet:
      "Decision options: stage a verified channel, postpone all launch, or launch unresolved scope without authority. No service guarantee is approved. Executive expects concise options; practitioners need the detailed evidence appendix.",
    question:
      "Ask Remy which decision, impact and dependencies the executive must understand.",
    answer:
      "Confirm launch options and material gaps, then select a concise executive summary with a traceable operational appendix.",
    decision:
      "Present verified outcome, three material risks, options and a specific decision request with owners and dates.",
    alternative:
      "Run a short decision meeting first and circulate the detailed evidence appendix afterward.",
    failure:
      "Hide unresolved launch questions inside a long positive activity list.",
    why: "Audience-appropriate detail makes a decision actionable without suppressing material uncertainty.",
    request:
      "The AM prepares Luca’s decision brief; Rowan supplies review limits and Anika owns evidence readiness.",
    output: "Executive launch-decision review with evidence appendix",
    sources: ["training-policy"],
    prerequisiteIds: ["M-A09", "M-A04"],
  },
  {
    id: "X-A10",
    competencyIds: ["A10", "T02"],
    account: "forgebridge",
    title: "Net retention differs from gross retention",
    briefing:
      "A portfolio metric uses expansion to hide contraction. Compute both under explicit cohort definitions.",
    facts: [
      "Synthetic opening cohort annual recurring value is 10,000,000 USD cents.",
      "Churn and contraction total 1,000,000 cents; same-cohort expansion is 1,500,000 cents.",
      "New-logo revenue is excluded from both retention measures.",
    ],
    packet:
      "Training definition: GRR=(opening−churn−contraction)/opening. NRR=(opening−churn−contraction+same-cohort expansion)/opening. Thus GRR=90%; NRR=105%. Forecast remains uncommitted without customer approval, even if aggregate NRR exceeds 100%.",
    question:
      "Ask Imani to confirm cohort membership and distinguish expansion from new-logo revenue.",
    answer:
      "Verify opening cohort, signed changes and exclusions; show both gross and net retention transparently.",
    decision:
      "Report GRR 90% and NRR 105%, and investigate underlying contraction rather than hide it.",
    alternative:
      "Keep the metric provisional until cohort membership and signed revenue changes reconcile.",
    failure:
      "Include new-logo sales or claim every account is healthy because NRR exceeds 100%.",
    why: "Metric definitions and denominators determine meaning; aggregate expansion does not prove an individual renewal.",
    request:
      "Alex reviews commercial evidence; the AM retains the cohort bridge and account-level renewal risks.",
    output: "Retention cohort bridge and honest renewal interpretation",
    sources: ["training-policy"],
    prerequisiteIds: ["M-A10", "M-T02"],
    calculation: {
      label:
        "Enter NRR as an integer percentage: opening 10,000,000; loss 1,000,000; same-cohort expansion 1,500,000.",
      expected: 105,
      worked:
        "(10,000,000−1,000,000+1,500,000)/10,000,000 × 100 = 105%. GRR separately equals 90%.",
    },
  },
  {
    id: "X-A11",
    competencyIds: ["A11", "A06"],
    account: "meridian",
    title: "Decline expansion while stabilizing operations",
    briefing:
      "A promising international opportunity appears while the core account still has unresolved feed failures.",
    facts: [
      "Two existing feeds fail acceptance tests.",
      "The customer needs a reliable close before expansion.",
      "An international pilot has incomplete establishment and status evidence.",
    ],
    packet:
      "Commercial proposal asks for all-market launch this week. Customer priority is current close reliability. No pricing or international conclusion is approved. No-change, stabilization and staged discovery are valid options.",
    question:
      "Ask Felix to rank operational stability and growth needs without a pressure pitch.",
    answer:
      "Confirm the close priority, acknowledge expansion interest and ask what evidence and outcome would justify a later pilot.",
    decision:
      "Recommend stabilization first and defer the broad expansion; keep a scoped discovery checkpoint with permission.",
    alternative:
      "Offer only a small reversible discovery phase if it does not displace urgent feed work.",
    failure:
      "Push broad expansion or conceal current defects to improve a sales forecast.",
    why: "Declining an ill-timed expansion can protect trust and better align support to the customer’s actual priority.",
    request:
      "Casey owns feed acceptance; Alex reviews any later scoped offer and the AM records the customer’s preferred sequence.",
    output: "Expansion deferral and stabilization-first plan",
    sources: ["training-policy", "taxwire-role"],
    prerequisiteIds: ["M-A11", "M-A08"],
  },
  {
    id: "X-A12",
    competencyIds: ["A12", "A07"],
    account: "cedarline",
    title: "An AI shortcut invents completion evidence",
    briefing:
      "An optional coaching proposal would summarize cases and auto-close them. Design safe boundaries while keeping AI disabled.",
    facts: [
      "A proposed assistant can see only selected case facts.",
      "A demo summary says a filing succeeded without an acceptance record.",
      "No provider integration, budget or external data permission is approved.",
    ],
    packet:
      "Proposal claims “AI handles all closure.” Required boundaries: no fabricated sources, approvals, offscreen work or tax rules; no keys or data in frontend; structured facts and reviewer controls; authored fallback remains fully playable. The public game has no live model dependency.",
    question:
      "Ask Theo to identify which structured evidence the proposed output can actually reference.",
    answer:
      "Compare the claim with visible acceptance records and recognize the missing proof; reject invented completion.",
    decision:
      "Keep AI disabled; define a reviewer-controlled coaching packet using fictional facts and transparent rubrics only.",
    alternative:
      "Prototype a local authored summary template with explicit missing-evidence fields and no automated closure.",
    failure: "Enable external uploads or accept an AI summary as filing proof.",
    why: "A model can assist communication only within verified facts and approved boundaries; it cannot create completion evidence or authority.",
    request:
      "Morgan reviews the coaching rubric; Casey defines acceptance checks and the AM retains human closure ownership.",
    output:
      "Safe coaching-packet specification and automation rejection record",
    sources: ["training-policy"],
    prerequisiteIds: ["M-A12", "M-A07"],
  },
];

const capstones: CaseSeed[] = [
  {
    id: "C01",
    competencyIds: ["T01", "T02", "A02", "A03", "A04", "A05", "A06", "A07"],
    account: "harborworks",
    title: "First independent day across three customers",
    briefing:
      "Work independently across HarborWorks, Cedarline and Forgebridge. A notice-status update, credit reconciliation and approver absence compete for a finite day.",
    facts: [
      "HarborWorks needs a verified payment-status update by minute 150.",
      "Cedarline’s draft omits an approved 800-cent credit.",
      "Forgebridge’s practitioner is absent and a record-access backup is not confirmed.",
    ],
    packet:
      "Portfolio packet P-C01: HarborWorks filing accepted, payment still requires positive status; Cedarline original tax 6,400 and approved credit -800; Forgebridge budget approval belongs to sponsor, not practitioner. Remote meetings allowed. Customer promises, internal cutoffs and notice checkpoint are separately tagged.",
    question:
      "Ask Elias for urgent missing evidence, then document which contacts own Cedarline and Forgebridge inputs.",
    answer:
      "Confirm HarborWorks status evidence, Theo’s credit ownership and Imani’s authorized backup; summarize different obligation types.",
    decision:
      "Prioritize verified notice status, reconcile Cedarline to 5,600 cents, and secure a Forgebridge backup without abandoning communications.",
    alternative:
      "Delegate the reversible credit investigation to Casey while keeping the urgent customer update and backup request yourself.",
    failure:
      "Choose only the easiest account and leave another urgent obligation unowned.",
    why: "Independent ownership balances several customers with evidence, realistic capacity and named residual work.",
    request:
      "Casey verifies payment and the credit bridge; Morgan checks capacity and the AM owns all three customer checkpoints.",
    output:
      "Independent portfolio day plan, three evidence records and closing review",
    sources: ["training-policy"],
    prerequisiteIds: [
      "M-T01",
      "M-T02",
      "M-A03",
      "M-A04",
      "M-A05",
      "M-A06",
      "M-A07",
    ],
    stage: "capstone",
  },
  {
    id: "C02",
    competencyIds: ["T09", "T10", "A04", "A05", "A06", "A07"],
    account: "northlight",
    title: "Notice, data defect and meeting collide",
    briefing:
      "A Northlight notice arrives as Cedarline’s draft fails reconciliation and an executive meeting begins. Protect urgency and communicate a recoverable plan.",
    facts: [
      "Northlight notice names Equipment and P0; liability is unreviewed.",
      "Cedarline draft overstates tax by a duplicated 3,200-cent line.",
      "The customer executive review is promised in 90 minutes; Rowan has one usable slot.",
    ],
    packet:
      "Collision packet: entity/period notice evidence missing; Cedarline stable source ID repeated; executive decision can use a written interim brief. No admission, payment, filing or waiver is authorized by the AM. Historical tax expertise and reversible data repair are different workstreams.",
    question:
      "Ask Jonah for notice identity and checkpoint, then clarify what the executive needs at the promised meeting.",
    answer:
      "Identify the urgent legal question, gather the fact packet and negotiate an evidence-based meeting adjustment.",
    decision:
      "Use Rowan for the scoped notice question, Casey for data correction, and keep a named customer update before the promise expires.",
    alternative:
      "Send an interim executive brief while a delegated owner gathers notice records and the specialist slot is reserved.",
    failure:
      "Use the scarce expert on a routine data task or skip the urgent notice without ownership.",
    why: "A portfolio operator separates reversible operations from specialist authority and keeps every communication loop owned.",
    request:
      "Rowan leads notice review, Casey repairs and verifies the draft, and the AM owns meeting recovery plus final closure evidence.",
    output:
      "Collision triage, specialist packet, corrected draft and executive recovery note",
    sources: ["sst", "training-policy"],
    prerequisiteIds: ["X-A06", "X-T09", "M-A05", "M-A04"],
    stage: "capstone",
  },
  {
    id: "C03",
    competencyIds: ["A03", "A04", "A08", "A09", "A10", "A11"],
    account: "forgebridge",
    title: "Renewal, departing champion and a new CFO",
    briefing:
      "Renewal approaches as the champion leaves. The new CFO disputes unsupported value and asks whether a new plant is included.",
    facts: [
      "Champion departure precedes renewal by five fictional sessions.",
      "A savings claim lacks a baseline while certificate outcomes are documented.",
      "New-plant support is outside current fictional scope and terms need Alex approval.",
    ],
    packet:
      "Commercial packet: incoming CFO has not approved budget; procurement lead time 10 days; existing defect reduction is verified; expansion support not reviewed. Customer friendliness and NRR are not signatures. A phased scope discussion and honest forecast are defensible.",
    question:
      "Ask Imani for an authorized transition and the CFO’s decision criteria; avoid private-personal profiling.",
    answer:
      "Confirm successor, budget path and backup, correct the unsupported savings claim and invite the CFO to challenge the evidence.",
    decision:
      "Rebuild the stakeholder path, present credible outcomes and open risks, and forecast uncertainty pending authorized scope and signature.",
    alternative:
      "Recommend a narrowly approved stabilization option while the CFO evaluates a later plant expansion.",
    failure:
      "Claim committed renewal or promise unlimited new-plant coverage to secure a quick signature.",
    why: "Strategic relationship ownership combines truthful value, authority, continuity and commercial fit rather than pressure.",
    request:
      "Alex approves options; the AM owns the transition review, procurement milestones and evidence-based forecast.",
    output:
      "Executive renewal plan, authority map, value evidence and scope options",
    sources: ["taxwire-role", "training-policy"],
    prerequisiteIds: ["X-A03", "X-A04", "X-A10", "X-A11"],
    stage: "capstone",
  },
  {
    id: "C04",
    competencyIds: [
      "T03",
      "T04",
      "T07",
      "T08",
      "T11",
      "T12",
      "A02",
      "A06",
      "A11",
      "A12",
    ],
    account: "northlight",
    title: "International growth after an acquisition",
    briefing:
      "Northlight acquires a digital business and plans EU, UK and Canadian expansion while entity records and platform contracts remain incomplete.",
    facts: [
      "Acquired entity’s establishment and historic registration facts are incomplete.",
      "A platform agreement covers one EU channel; direct UK and Canadian sales remain.",
      "The product bundles digital access and live advisory work; no approved classification exists.",
    ],
    packet:
      "Acquisition packet: parent and target are distinct entities; target history missing; contract names seller differently from invoices; launch plan copies IOSS to digital services; provincial Canadian questions unaddressed. Private future onboarding requires separate authorization and qualified review. No live systems are connected.",
    question:
      "Ask Jonah to confirm entities, acquisition date, actual supply, channels and customer status before discussing growth.",
    answer:
      "Build separate entity, product, channel and jurisdiction fact rows; distinguish confirmed documents, hypotheses and missing evidence.",
    decision:
      "Stage launch behind entity-specific history, classification, contract-responsibility and jurisdiction review gates; offer only authorized support scope.",
    alternative:
      "Limit the first pilot to fully evidenced transactions while specialist-owned historical and international workstreams continue.",
    failure:
      "Treat acquisition consolidation or a platform label as global approval and launch every channel with one setting.",
    why: "International and acquisition complexity requires coordinated facts and bounded authority; a staged launch can be an appropriate strategic outcome.",
    request:
      "Rowan leads tax and legal-review questions; Casey verifies separate feeds; Alex approves scope; the AM owns launch gates and customer decisions.",
    output:
      "Acquisition/international dependency map, regime comparison and approved staged plan",
    sources: [
      "sst",
      "ny-software",
      "tx-services",
      "eu-oss",
      "uk-services",
      "ca-gst",
      "training-policy",
    ],
    prerequisiteIds: [
      "X-T03",
      "X-T04",
      "X-T08",
      "X-T11",
      "X-T12",
      "M-A11",
      "M-A12",
    ],
    stage: "capstone",
  },
];

export const advancedMissions = advanced.map((c) =>
  createCase({
    ...c,
    stage: "advanced",
    ...(c.id === "X-A12"
      ? { failureCritical: "Disclosure through an unapproved external service" }
      : {}),
  }),
);
export const capstoneMissions = capstones.map(createCase);
