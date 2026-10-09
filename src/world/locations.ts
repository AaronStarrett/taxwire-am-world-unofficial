export type InteractionKind =
  "desk" | "npc" | "document" | "meeting" | "portal" | "elevator";
export type WorldObject = {
  id: string;
  label: string;
  kind: InteractionKind;
  x: number;
  z: number;
  contactId?: string;
  floor?: number;
};
export type WorldLocation = {
  id: string;
  name: string;
  description: string;
  x: number;
  z: number;
  color: string;
  centerX: number;
  centerZ: number;
  rotation: number;
  objects: WorldObject[];
};

export function localToWorld(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  rotation: number,
) {
  return {
    x: centerX + x * Math.cos(rotation) + z * Math.sin(rotation),
    z: centerZ - x * Math.sin(rotation) + z * Math.cos(rotation),
  };
}

type LocalObject = [string, string, InteractionKind, number, number];
function personLabel(id: string, fallback: string) {
  const contact = contacts.find((person) => person.id === id);
  return contact ? `${contact.name} · ${contact.role.toLowerCase()}` : fallback;
}
const cafeContact = contacts.find((person) => person.location === "cafe");
function place(
  id: string,
  name: string,
  description: string,
  centerX: number,
  centerZ: number,
  rotation: number,
  color: string,
  localObjects: LocalObject[],
): WorldLocation {
  const spawn = localToWorld(0, 3.4, centerX, centerZ, rotation);
  return {
    id,
    name,
    description,
    ...spawn,
    centerX,
    centerZ,
    rotation,
    color,
    objects: localObjects.map(([objectId, label, kind, x, z]) => ({
      id: objectId,
      label,
      kind,
      ...(kind === "npc"
        ? {
            contactId: contacts.find((person) => label.startsWith(person.name))
              ?.id,
          }
        : {}),
      ...localToWorld(x, z, centerX, centerZ, rotation),
    })),
  };
}

/** All businesses and people in this original district are fictional. Coordinates are world-space. */
export const locations: WorldLocation[] = [
  place(
    "home",
    "Your apartment",
    "A quiet space to review your journal and prepare for the day.",
    -22,
    23,
    Math.PI,
    "#c49a77",
    [
      ["journal", "Personal journal", "document", -3.5, -1.8],
      ["workbench", "Home workstation", "desk", 2.8, -1.8],
    ],
  ),
  place(
    "hq",
    "Taxwire training HQ",
    "Reception, your account desk, team support, and meeting space.",
    0,
    -23,
    0,
    "#228e64",
    [
      ["missions", "Reception · mission board", "document", 0, -2.9],
      ["workbench", "Your account desk", "desk", -3.6, -1.5],
      [
        "specialist",
        personLabel("npc-commercial", "Commercial approval lead"),
        "npc",
        -3.6,
        2.0,
      ],
      ["meeting", "Team meeting", "meeting", 3.4, -1.5],
      [
        "mentor",
        personLabel("npc-mentor", "Account management mentor"),
        "npc",
        -1.5,
        -0.2,
      ],
    ],
  ),
  place(
    "research",
    "Research library",
    "Find public-source guidance, compare evidence, and document assumptions.",
    -22,
    -23,
    0,
    "#627eab",
    [
      ["knowledge", "Public-source library", "desk", -3.5, -1.8],
      ["research", "Research case notes", "document", 3.0, -1.8],
      ["reconciliation", "Evidence review", "desk", 0, 1.0],
      [
        "specialist",
        personLabel("npc-tax", "Indirect tax specialist"),
        "npc",
        3.0,
        1.3,
      ],
    ],
  ),
  place(
    "operations",
    "Account operations",
    "Your inbox, calendar, and specialist support in one place.",
    22,
    0,
    -Math.PI / 2,
    "#517f7a",
    [
      ["inbox", "Customer inbox", "desk", -3.6, -1.8],
      ["calendar", "Calendar and follow-ups", "document", 3.0, -1.8],
      [
        "specialist",
        personLabel("npc-ops", "Compliance operations lead"),
        "npc",
        0,
        1.2,
      ],
    ],
  ),
  place(
    "harborworks",
    accounts.find((account) => account.id === "acct-harborworks")?.name ??
      "HarborWorks Software",
    "A fictional software studio selling subscriptions and implementation services.",
    22,
    23,
    Math.PI,
    "#7272ad",
    [
      [
        "accounts",
        personLabel("npc-harborworks-0", "Software customer finance sponsor"),
        "npc",
        -3.5,
        1.3,
      ],
      ["meeting", "Studio customer meeting", "meeting", 3.2, -1.5],
      ["reconciliation", "Subscription case documents", "document", -3.5, -1.8],
    ],
  ),
  place(
    "cedarline",
    accounts.find((account) => account.id === "acct-cedarline")?.name ??
      "Cedarline Commerce",
    "A fictional retail business with a shop, order counter, and customer case.",
    -22,
    0,
    Math.PI / 2,
    "#bc815c",
    [
      [
        "accounts",
        personLabel("npc-cedarline-0", "Retail customer finance sponsor"),
        "npc",
        -3.5,
        1.2,
      ],
      ["research", "Retail order documents", "document", 3.0, -1.8],
      ["meeting", "Retail customer meeting", "meeting", 1.7, 1.3],
    ],
  ),
  place(
    "cafe",
    "Common Ground café",
    "Take a moment to reflect and talk through professional communication.",
    0,
    23,
    Math.PI,
    "#a76d65",
    [
      ["journal", "Reflection notebook", "document", -3.5, -1.8],
      ["meeting", "Reserved coffee conversation table", "meeting", 0, -1.0],
      [
        "specialist",
        cafeContact
          ? `${cafeContact.name} · café conversation`
          : "Customer café conversation",
        "npc",
        3.1,
        1.4,
      ],
    ],
  ),
  place(
    "academy",
    "Training academy",
    "Practice account management and study the knowledge collection.",
    22,
    -23,
    0,
    "#b68d41",
    [
      ["academy", "Mentor coaching resources", "document", -3.5, 1.2],
      ["knowledge", "Training reference shelf", "document", 3.0, -1.8],
      ["academy", "Professional skills practice", "document", 0, -1.8],
    ],
  ),
];

export function getLocationAt(x: number, z: number): WorldLocation | undefined {
  return locations.find((location) => {
    const point = localToWorld(
      x - location.centerX,
      z - location.centerZ,
      0,
      0,
      -location.rotation,
    );
    return Math.abs(point.x) < 6 && Math.abs(point.z) < 5;
  });
}

export const worldObjects: WorldObject[] = locations.flatMap((location) => [
  ...location.objects,
  {
    id: `travel:${location.id}`,
    label: `Enter ${location.name}`,
    kind: "portal" as const,
    ...localToWorld(
      0,
      5.7,
      location.centerX,
      location.centerZ,
      location.rotation,
    ),
  },
]);
import { accounts, contacts } from "../content/accounts";

/** Floor zero keeps the original learning routes and saved coordinates intact. */
export const WORLD_FLOOR_HEIGHT = 3.8;
export type FloorTheme =
  | "workspace"
  | "conference"
  | "library"
  | "training"
  | "lounge"
  | "studio"
  | "residence";
export type BuildingFloor = {
  index: number;
  name: string;
  theme: FloorTheme;
  description: string;
};
const floorPrograms: Record<string, [string, FloorTheme][]> = {
  home: [
    ["Your apartment", "residence"],
    ["Residents’ coworking", "workspace"],
    ["Reading room", "library"],
    ["Residents’ meeting room", "conference"],
    ["Quiet work suites", "workspace"],
    ["Community studio", "studio"],
    ["Garden lounge", "lounge"],
    ["Skyline residents’ lounge", "lounge"],
  ],
  hq: [
    ["Reception & account desk", "workspace"],
    ["Client welcome suites", "conference"],
    ["Account success", "workspace"],
    ["Portfolio planning", "workspace"],
    ["Customer evidence", "library"],
    ["Commercial partnerships", "conference"],
    ["Finance & reconciliation", "workspace"],
    ["Customer strategy", "conference"],
    ["Service delivery", "workspace"],
    ["Renewal planning", "conference"],
    ["Product coordination", "studio"],
    ["Regional account teams", "workspace"],
    ["Leadership learning", "training"],
    ["Executive briefing", "conference"],
    ["Boardroom", "conference"],
    ["Client hospitality", "lounge"],
    ["Sky library", "library"],
    ["Summit lounge", "lounge"],
  ],
  research: [
    ["Public-source library", "library"],
    ["Source review", "library"],
    ["Research workroom", "workspace"],
    ["Jurisdiction study", "library"],
    ["Evidence archive", "library"],
    ["Case review rooms", "conference"],
    ["Specialist learning", "training"],
    ["Research collaboration", "studio"],
    ["Quiet reading", "library"],
    ["Research fellows’ lounge", "lounge"],
  ],
  operations: [
    ["Inbox & follow-ups", "workspace"],
    ["Customer support", "workspace"],
    ["Reconciliation studio", "studio"],
    ["Integration controls", "studio"],
    ["Compliance coordination", "workspace"],
    ["Service review", "conference"],
    ["Evidence operations", "library"],
    ["Implementation teams", "workspace"],
    ["Quality assurance", "studio"],
    ["Incident review", "conference"],
    ["Delivery planning", "workspace"],
    ["Operations learning", "training"],
    ["Leadership briefing", "conference"],
    ["Team sky lounge", "lounge"],
  ],
  harborworks: [
    ["Studio reception", "studio"],
    ["Customer finance", "workspace"],
    ["Systems & operations", "studio"],
    ["Product engineering", "studio"],
    ["Subscription evidence", "library"],
    ["Implementation suites", "workspace"],
    ["Customer success", "workspace"],
    ["Design collaboration", "studio"],
    ["Release review", "conference"],
    ["Product learning", "training"],
    ["Executive meeting room", "conference"],
    ["Harbor sky lounge", "lounge"],
  ],
  cedarline: [
    ["Showroom & customer welcome", "studio"],
    ["Retail accounting", "workspace"],
    ["Commerce operations", "studio"],
    ["Merchandising studio", "studio"],
    ["Order evidence", "library"],
    ["Channel planning", "conference"],
    ["Customer service", "workspace"],
    ["Retail learning", "training"],
    ["Trading review", "conference"],
    ["Commerce sky lounge", "lounge"],
  ],
  cafe: [
    ["Common Ground coffee bar", "lounge"],
    ["Conversation booths", "lounge"],
    ["Community work tables", "workspace"],
    ["Customer coffee suites", "conference"],
    ["Reading café", "library"],
    ["Workshop room", "training"],
    ["Garden conversations", "lounge"],
    ["Panorama coffee lounge", "lounge"],
  ],
  academy: [
    ["Learning reception", "training"],
    ["Discovery practice", "training"],
    ["Communication studio", "studio"],
    ["Evidence workshops", "library"],
    ["Account-management lab", "workspace"],
    ["Case discussion rooms", "conference"],
    ["Advanced practice", "training"],
    ["Graduates’ lounge", "lounge"],
  ],
};
export function getBuildingFloors(locationId: string): BuildingFloor[] {
  return (floorPrograms[locationId] ?? floorPrograms.home).map(
    ([name, theme], index) => ({
      index,
      name,
      theme,
      description:
        index === 0
          ? "Street-level entrance and original training destinations."
          : `${name}: a furnished, walkable ${theme === "lounge" ? "conversation and reflection space" : "work and learning space"}.`,
    }),
  );
}
export function normalizeFloor(locationId: string, floor = 0) {
  return Number.isInteger(floor) &&
    floor >= 0 &&
    floor < getBuildingFloors(locationId).length
    ? floor
    : 0;
}
export function getFloorElevation(locationId: string, floor = 0) {
  return normalizeFloor(locationId, floor) * WORLD_FLOOR_HEIGHT;
}
export function getFloorArrival(locationId: string, floor = 0) {
  const location =
    locations.find((candidate) => candidate.id === locationId) ?? locations[0];
  return {
    x: location.x,
    z: location.z,
    yaw:
      location.rotation + (normalizeFloor(locationId, floor) > 0 ? Math.PI : 0),
  };
}
const existingContacts = new Set(
  locations.flatMap((location) =>
    location.objects.flatMap((object) =>
      object.contactId ? [object.contactId] : [],
    ),
  ),
);
/** Every additional colleague has one stable physical home. Their authored identity remains the source of truth. */
export const residentContacts = contacts
  .filter((contact) => !existingContacts.has(contact.id))
  .map((contact) => {
    const locationId = locations.some(
      (location) => location.id === contact.location,
    )
      ? contact.location
      : "hq";
    const colleagues = contacts.filter(
      (person) =>
        !existingContacts.has(person.id) &&
        person.location === contact.location,
    );
    const slot = colleagues.findIndex((person) => person.id === contact.id);
    return {
      contactId: contact.id,
      locationId,
      floor: 1 + (slot % (getBuildingFloors(locationId).length - 1)),
      seat: Math.floor(slot / (getBuildingFloors(locationId).length - 1)),
    };
  });
export function getFloorObjects(
  locationId: string,
  requestedFloor = 0,
  meetingContactId?: string,
): WorldObject[] {
  const location = locations.find((candidate) => candidate.id === locationId);
  if (!location) return [];
  const floor = normalizeFloor(locationId, requestedFloor);
  const elevator: WorldObject = {
    id: `elevator:${location.id}`,
    label: "Lift directory · choose a floor",
    kind: "elevator",
    floor,
    ...localToWorld(
      floor === 0 ? 1.6 : 0,
      floor === 0 ? 4.3 : 4.55,
      location.centerX,
      location.centerZ,
      location.rotation,
    ),
  };
  if (floor === 0) {
    const objects = location.objects.filter(
      (object) => !meetingContactId || object.contactId !== meetingContactId,
    );
    const contact =
      locationId === "cafe"
        ? contacts.find((person) => person.id === meetingContactId)
        : undefined;
    if (contact)
      objects.push({
        id: `npc:${contact.id}`,
        label: `${contact.name} · your coffee conversation`,
        kind: "npc",
        contactId: contact.id,
        floor: 0,
        ...localToWorld(
          0,
          1.45,
          location.centerX,
          location.centerZ,
          location.rotation,
        ),
      });
    return [...objects, elevator];
  }
  const program = getBuildingFloors(locationId)[floor];
  const plans: Record<FloorTheme, LocalObject[]> = {
    workspace: [
      ["workbench", "Account workstation", "desk", -3.4, -1.6],
      ["inbox", "Customer correspondence", "desk", 3.4, -1.6],
      ["calendar", "Follow-up planning", "document", -3.4, 1.2],
      ["accounts", "Portfolio review station", "document", 3.4, 1.2],
    ],
    conference: [
      [
        "meeting",
        "Meeting table · prepare a conversation",
        "meeting",
        -2.7,
        -1.2,
      ],
      ["calendar", "Meeting planning station", "desk", 3.5, -1.6],
      ["tasks", "Decisions & named owners", "document", 3.5, 1.3],
    ],
    library: [
      ["knowledge", "Source collection", "desk", -3.4, -1.6],
      ["research", "Research notes", "desk", 3.4, -1.6],
      ["reconciliation", "Evidence comparison", "document", -3.4, 1.2],
      ["journal", "Study reflection", "document", 3.4, 1.2],
    ],
    training: [
      ["academy", "Professional skills practice", "desk", -3.4, -1.6],
      ["knowledge", "Training reference desk", "desk", 3.4, -1.6],
      ["missions", "Case practice board", "document", -3.4, 1.2],
      ["journal", "Learning reflection", "document", 3.4, 1.2],
    ],
    studio: [
      ["issues", "Issue investigation", "desk", -3.4, -1.6],
      ["reconciliation", "Control-total workstation", "desk", 3.4, -1.6],
      ["research", "Evidence handoff", "document", -3.4, 1.2],
      ["tasks", "Delivery commitments", "document", 3.4, 1.2],
    ],
    lounge: [
      ["meeting", "Conversation table", "meeting", -2.7, -1.2],
      ["journal", "Reflection notebook", "document", 3.5, -1.4],
      ["calendar", "Make time to reconnect", "document", 3.5, 1.3],
    ],
    residence: [
      ["journal", "Personal journal", "document", -3.4, -1.6],
      ["workbench", "Private workstation", "desk", 3.4, -1.6],
    ],
  };
  const objects = plans[program.theme].map(([id, label, kind, x, z]) => ({
    id,
    label,
    kind,
    floor,
    ...localToWorld(
      x,
      z,
      location.centerX,
      location.centerZ,
      location.rotation,
    ),
  }));
  const people: WorldObject[] = residentContacts
    .filter(
      (resident) =>
        resident.locationId === locationId &&
        resident.floor === floor &&
        resident.contactId !== meetingContactId,
    )
    .map((resident) => {
      const contact = contacts.find(
        (person) => person.id === resident.contactId,
      )!;
      return {
        id: `npc:${contact.id}`,
        label: `${contact.name} · ${contact.role.toLowerCase()}`,
        kind: "npc",
        contactId: contact.id,
        floor,
        ...localToWorld(
          resident.seat % 2 ? 2.2 : -2.2,
          2.8,
          location.centerX,
          location.centerZ,
          location.rotation,
        ),
      };
    });
  return [...objects, ...people, elevator];
}
export function getContactHome(contactId: string) {
  for (const location of locations) {
    if (location.objects.some((object) => object.contactId === contactId))
      return { locationId: location.id, floor: 0 };
  }
  return residentContacts.find((resident) => resident.contactId === contactId);
}
