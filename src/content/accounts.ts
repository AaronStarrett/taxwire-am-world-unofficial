import type { Account, Contact } from "./types";

type AccountSeed = [
  string,
  string,
  string,
  string[],
  string[],
  string[],
  string[],
  string[],
  string[],
  number,
  number,
];
const seeds: AccountSeed[] = [
  [
    "harborworks",
    "HarborWorks Software",
    "Subscription software",
    ["HarborWorks Software LLC"],
    ["Workflow seats", "Analytics add-on", "Implementation"],
    ["Direct annual contracts", "Self-serve monthly"],
    ["Fictional billing ledger", "Seat directory"],
    ["US", "UK evaluation"],
    ["Predictable close", "No surprise notices"],
    28,
    4800000,
  ],
  [
    "cedarline",
    "Cedarline Commerce",
    "Direct and marketplace retail",
    ["Cedarline Retail Inc."],
    ["Homeware", "Accessories"],
    ["Direct store", "MarketHub marketplace"],
    ["Order feed", "Settlement ledger"],
    ["US multistate"],
    ["Channel clarity", "Returns accuracy"],
    36,
    3900000,
  ],
  [
    "forgebridge",
    "Forgebridge Manufacturing",
    "Manufacturing and resale",
    ["Forgebridge Manufacturing LLC"],
    ["Machine components", "Resold supplies", "Maintenance"],
    ["Wholesale", "Direct"],
    ["ERP", "Certificate vault"],
    ["US plants", "Canadian sales"],
    ["Certificate coverage", "Clean purchasing"],
    44,
    5100000,
  ],
  [
    "atlasfield",
    "Atlasfield Services",
    "Distributed service operations",
    ["Atlasfield Services Inc."],
    ["Field maintenance", "Inspection reports"],
    ["Direct service contracts"],
    ["Dispatch system", "Accounting export"],
    ["US distributed teams"],
    ["Employee-location changes", "Contract scope"],
    31,
    2800000,
  ],
  [
    "meridian",
    "Meridian Learning",
    "Digital subscriptions and international customers",
    ["Meridian Learning LLC"],
    ["Digital courses", "Live instruction", "Team subscriptions"],
    ["Direct B2B", "Consumer subscriptions"],
    ["Course platform", "Billing API"],
    ["US", "EU", "UK", "Canada"],
    ["International launch", "Customer-status evidence"],
    52,
    6200000,
  ],
  [
    "northlight",
    "Northlight Holdings",
    "Multiple entities and acquisitions",
    [
      "Northlight Holdings Inc.",
      "Northlight Equipment LLC",
      "Northlight Digital LLC",
    ],
    ["Equipment", "Software licenses"],
    ["Direct", "Acquired channels"],
    ["Separate ERPs", "Consolidation workbook"],
    ["US", "EU acquisition planned"],
    ["Entity visibility", "Acquisition readiness"],
    60,
    8500000,
  ],
  [
    "lumenleaf",
    "Lumenleaf Analytics",
    "Data processing and advisory services",
    ["Lumenleaf Analytics LLC"],
    ["Hosted dashboards", "Analyst reports"],
    ["Direct contracts"],
    ["Usage ledger", "Project tracker"],
    ["US service customers"],
    ["Product-bundle clarity", "Responsible pricing"],
    40,
    3300000,
  ],
  [
    "pinecrest",
    "Pinecrest Outdoor",
    "Outdoor retail and pop-up stores",
    ["Pinecrest Outdoor Inc."],
    ["Equipment", "Repair services"],
    ["Online", "Pop-up", "Marketplace"],
    ["POS", "Commerce connector"],
    ["US"],
    ["Event-location controls", "Stock movement"],
    49,
    3100000,
  ],
  [
    "riverton",
    "Riverton Parts",
    "Industrial component distribution",
    ["Riverton Parts LLC"],
    ["Parts", "Freight", "Warranty replacements"],
    ["Dealer", "Direct"],
    ["Warehouse ERP", "Certificate scanner"],
    ["US", "Canada"],
    ["Returns quality", "Dealer documentation"],
    42,
    2700000,
  ],
  [
    "solstice",
    "Solstice Media",
    "Consumer digital media memberships",
    ["Solstice Media Ltd."],
    ["Streaming memberships", "Downloads"],
    ["Consumer app", "Business licenses"],
    ["Subscription ledger", "Customer evidence vault"],
    ["UK", "EU", "Canada"],
    ["Launch gates", "Invoice evidence"],
    65,
    4300000,
  ],
  [
    "bayshore",
    "Bayshore Robotics",
    "Equipment plus software and support",
    ["Bayshore Robotics Inc."],
    ["Robotic units", "Control software", "Service plans"],
    ["Direct", "Reseller"],
    ["Contracts", "ERP"],
    ["US", "EU pilot"],
    ["Bundle governance", "Launch support"],
    55,
    5700000,
  ],
  [
    "aster",
    "Aster Events",
    "Live and virtual professional events",
    ["Aster Events LLC"],
    ["In-person tickets", "Virtual access", "Sponsorship"],
    ["Ticket portal", "Direct B2B"],
    ["Event platform", "Finance workbook"],
    ["US", "UK event planned"],
    ["Attendance-location evidence", "Transparent responsibilities"],
    58,
    2500000,
  ],
];
const names = [
  ["Maya Chen", "Elias Brooks", "Priya Shah"],
  ["Nora Ellis", "Theo Park", "Lena Ortiz"],
  ["Gavin Cole", "Imani Reed", "Owen Patel"],
  ["Sofia Grant", "Malik Stone", "June Carter"],
  ["Ada Lane", "Felix Moore", "Samira Bell"],
  ["Rhea West", "Jonah Moss", "Talia Ford"],
  ["Cora Lin", "Dev Patel", "Nico Hayes"],
  ["Ivy Ross", "Ben Wilder", "Amal Singh"],
  ["Zoe Hart", "Leon Fields", "Sana Reed"],
  ["Mina Clarke", "Ari Stone", "Jules Vega"],
  ["Dara Wells", "Noel Kim", "Eden Shaw"],
  ["Luca Ames", "Remy Brooks", "Anika Noor"],
];
const colors = [
  "#7a9e93",
  "#b5976e",
  "#798daa",
  "#a381a0",
  "#78988c",
  "#bd9a7e",
];

export const accounts: Account[] = seeds.map((s, i) => ({
  id: `acct-${s[0]}`,
  name: s[1],
  business: s[2],
  entities: s[3],
  products: s[4],
  channels: s[5],
  systems: s[6],
  geography: s[7],
  priorities: s[8],
  renewalDay: s[9],
  annualValueMinor: s[10],
  currency: "USD",
  contacts: [0, 1, 2].map((n) => `npc-${s[0]}-${n}`),
  research: [
    {
      title: "Fictional public company page",
      body: `${s[1]} sells ${s[4].join(", ")} through ${s[5].join(" and ")}. This authored page is a discovery starting point; it does not reveal unreported obligations.`,
      confidence: "confirmed",
    },
    {
      title: "Business change signal",
      body:
        i === 0
          ? "A new analytics tier appeared on the pricing page. Confirm its launch date, supply and invoicing."
          : i === 4
            ? "A product announcement mentions international customer growth. Establish customer status and establishment facts."
            : `Growth could affect ${s[7].join(", ")}. Ask the practitioner which entities, products and channels actually changed.`,
      confidence: "hypothesis",
    },
    {
      title: "Discovery question",
      body: `Which owner can verify ${s[6][0]} completeness, and who approves changes affecting ${s[8][0].toLowerCase()}?`,
      confidence: "question",
    },
  ],
}));

export const contacts: Contact[] = seeds.flatMap((s, i) =>
  [0, 1, 2].map((n) => ({
    id: `npc-${s[0]}-${n}`,
    name: names[i][n],
    role:
      n === 0
        ? "Finance sponsor"
        : n === 1
          ? "Accounting practitioner"
          : "Systems and operations owner",
    accountId: `acct-${s[0]}`,
    location:
      s[0] === "harborworks"
        ? "harborworks"
        : s[0] === "cedarline"
          ? "cedarline"
          : n === 0
            ? "hq"
            : n === 1
              ? "cafe"
              : "operations",
    goals:
      n === 0
        ? `Make ${s[8][0].toLowerCase()} visible with credible outcomes and costs.`
        : n === 1
          ? `Keep ${s[6][0]} reconcilable without surprise deadlines.`
          : `Change ${s[6].join(" and ")} safely with testable acceptance criteria.`,
    knows:
      n === 0
        ? [
            "Business priorities",
            "Budget decision path",
            "Renewal stakeholders",
          ]
        : n === 1
          ? [
              "Invoice and ledger extracts",
              "Open notices",
              "Approver availability",
            ]
          : [
              "Integration mappings",
              "Product releases",
              "Feed failure timestamps",
            ],
    preference:
      n === 0
        ? "Short written decision brief before a scheduled meeting."
        : n === 1
          ? "A numbered evidence request with entity, period and secure record identifiers."
          : "A reproducible example, expected behavior and rollback plan.",
    authority:
      n === 0
        ? "May approve fictional budget within agreed scope; tax positions require a specialist."
        : n === 1
          ? "Can supply and reconcile records; cannot sign commercial terms or authorize bank payments."
          : "Can implement approved test changes; cannot decide tax law or approve returns.",
    availability: n === 0 ? [630, 840] : n === 1 ? [555, 930] : [600, 960],
    color: colors[i % colors.length],
  })),
);
contacts.push(
  {
    id: "npc-mentor",
    name: "Morgan Vale",
    role: "Account management mentor",
    accountId: "internal",
    location: "academy",
    goals: "Teach careful ownership and respectful discovery.",
    knows: [
      "Fictional training policy",
      "Communication rubric",
      "Portfolio planning",
    ],
    preference: "Bring a proposed plan and a specific uncertainty.",
    authority:
      "Can coach and review game work; cannot approve legal positions or commercial offers.",
    availability: [540, 1020],
    color: "#729d96",
  },
  {
    id: "npc-tax",
    name: "Rowan Kim",
    role: "Indirect tax specialist",
    accountId: "internal",
    location: "research",
    goals: "Review complete fact patterns and protect response deadlines.",
    knows: [
      "Source-review boundaries",
      "Notice procedures",
      "Nexus and classification questions",
    ],
    preference:
      "Entity, period, document references, researched facts, precise question.",
    authority:
      "Approves fictional tax conclusions after evidence review; never executes real filings.",
    availability: [570, 840],
    color: "#af9668",
  },
  {
    id: "npc-ops",
    name: "Casey Reed",
    role: "Compliance operations lead",
    accountId: "internal",
    location: "operations",
    goals: "Keep returns traceable to approved source records.",
    knows: [
      "Import control totals",
      "Queue capacity",
      "Filing and payment receipts",
    ],
    preference:
      "Affected period, control total, defect reproduction and deadline.",
    authority:
      "Can reserve fictional operations capacity and test data corrections; customer approval still required.",
    availability: [540, 960],
    color: "#748dac",
  },
  {
    id: "npc-commercial",
    name: "Alex Rivera",
    role: "Commercial approval lead",
    accountId: "internal",
    location: "hq",
    goals:
      "Scope credible renewals and expansion without unsupported promises.",
    knows: [
      "Fictional pricing policy",
      "Offer approval process",
      "Renewal evidence standards",
    ],
    preference:
      "Need, options, tradeoffs, customer decision path and confidence range.",
    authority:
      "Approves game commercial proposals; cannot waive actual tax obligations.",
    availability: [600, 930],
    color: "#a489ad",
  },
);
