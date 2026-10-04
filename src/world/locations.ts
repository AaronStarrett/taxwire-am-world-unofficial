export type InteractionKind =
  "desk" | "npc" | "document" | "meeting" | "portal";
export type WorldObject = {
  id: string;
  label: string;
  kind: InteractionKind;
  x: number;
  z: number;
  contactId?: string;
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
      [
        "academy",
        personLabel("npc-mentor", "Account management mentor"),
        "npc",
        -3.5,
        1.2,
      ],
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
