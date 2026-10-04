import { describe, expect, it } from "vitest";
import {
  colliders,
  findPath,
  isWalkable,
  moveWithCollision,
  safePosition,
  reachableTarget,
  type Collider,
} from "../src/world/collision";
import { getLocationAt, locations, localToWorld } from "../src/world/locations";
import { accounts, contacts } from "../src/content/accounts";
import { walkingPose } from "../src/world/gait";
import { PositionSynchronizer } from "../src/world/PositionSync";

describe("walkable training district", () => {
  it("provides eight distinct safe indoor arrivals and wide unobstructed doors", () => {
    expect(new Set(locations.map((location) => location.id)).size).toBe(8);
    for (const location of locations) {
      expect(isWalkable(location), `${location.id} arrival`).toBe(true);
      expect(getLocationAt(location.x, location.z)?.id).toBe(location.id);
      const outside = localToWorld(
        0,
        6.5,
        location.centerX,
        location.centerZ,
        location.rotation,
      );
      const move = moveWithCollision(
        location,
        outside.x - location.x,
        outside.z - location.z,
      );
      expect(move.x).toBeCloseTo(outside.x, 5);
      expect(move.z).toBeCloseTo(outside.z, 5);
    }
  });
  it("connects every building to the square with collision-safe click paths", () => {
    const square = { x: 0, z: 5 };
    for (const location of locations) {
      const path = findPath(square, location);
      expect(path.length, `${location.id} route`).toBeGreaterThan(0);
      let current = square;
      for (const point of path) {
        expect(isWalkable(point)).toBe(true);
        const move = moveWithCollision(
          current,
          point.x - current.x,
          point.z - current.z,
        );
        expect(
          Math.hypot(move.x - point.x, move.z - point.z),
          `${location.id} collision-free segment`,
        ).toBeLessThan(0.03);
        current = point;
      }
    }
  });
  it("allows approaching all interactable desks, documents, and people", () => {
    for (const location of locations)
      for (const object of location.objects) {
        const approaches = Array.from({ length: 12 }, (_, index) => {
          const angle = (index / 12) * Math.PI * 2;
          return {
            x: object.x + Math.sin(angle) * 2.1,
            z: object.z + Math.cos(angle) * 2.1,
          };
        }).filter(
          (point) =>
            isWalkable(point) &&
            getLocationAt(point.x, point.z)?.id === location.id,
        );
        expect(
          approaches.some((point) => findPath(location, point).length > 0),
          `${location.id}/${object.id}`,
        ).toBe(true);
      }
  });
  it("prevents tunneling through solid obstacles and permits wall sliding", () => {
    const wall: Collider[] = [{ minX: 1, maxX: 1.1, minZ: -8, maxZ: 8 }];
    const moved = moveWithCollision({ x: 0, z: 0 }, 10, 5, wall);
    expect(moved.x).toBeLessThan(0.71);
    expect(moved.z).toBeCloseTo(5, 5);
    expect(isWalkable(moved, wall)).toBe(true);
    expect(findPath({ x: 0, z: 0 }, { x: 1.05, z: 0 }, wall)).toEqual([]);
  });
  it("bounds navigation and rejects non-finite positions", () => {
    expect(isWalkable({ x: NaN, z: 0 })).toBe(false);
    expect(isWalkable({ x: 40, z: 0 })).toBe(false);
    expect(colliders.length).toBeGreaterThan(80);
    expect(findPath({ x: 0, z: 5 }, { x: 200, z: 0 })).toEqual([]);
  });
  it("preserves valid saved positions and repairs invalid geometry positions", () => {
    const oldSave = { x: 0, z: 5, yaw: 1.3 };
    expect(safePosition(oldSave, "home")).toEqual(oldSave);
    for (const location of locations) {
      const repaired = safePosition(
        { x: NaN, z: Infinity, yaw: NaN },
        location.id,
      );
      expect(isWalkable(repaired)).toBe(true);
      expect(getLocationAt(repaired.x, repaired.z)?.id).toBe(location.id);
      expect(Number.isFinite(repaired.yaw)).toBe(true);
    }
    const desk = locations
      .find((location) => location.id === "hq")!
      .objects.find((object) => object.id === "workbench")!;
    expect(isWalkable(desk)).toBe(false);
    expect(isWalkable(safePosition(desk, "hq"))).toBe(true);
  });
  it("puts first-day guidance at the reachable home marker and routes to mentor/workstations", () => {
    const home = locations.find((location) => location.id === "home")!;
    const marker = reachableTarget(
      { locationId: "home", objectId: "first-day-marker", x: -22, z: 22 },
      home,
    )!;
    expect(marker).toMatchObject({
      x: -22,
      z: 22,
      objectId: "first-day-marker",
    });
    expect(Math.hypot(marker.x - home.x, marker.z - home.z)).toBeGreaterThan(1);
    expect(findPath(home, marker).length).toBeGreaterThan(0);
    for (const location of locations)
      for (const object of location.objects) {
        const target = reachableTarget(
          {
            locationId: location.id,
            objectId: object.id,
            x: object.x,
            z: object.z,
          },
          location,
        );
        expect(target, `${location.id}/${object.id}`).toBeDefined();
        expect(isWalkable(target!)).toBe(true);
        expect(
          Math.hypot(target!.x - object.x, target!.z - object.z),
          `${location.id}/${object.id}: ${target!.x},${target!.z} -> ${object.x},${object.z}`,
        ).toBeLessThan(2.4);
      }
    const mentor = locations
      .find((location) => location.id === "hq")!
      .objects.find((object) => object.id === "mentor")!;
    expect(mentor.contactId).toBe("npc-mentor");
  });
  it("keeps stance feet planted while independently clearing the swing foot", () => {
    const upper = 0.387,
      lower = 0.355;
    for (let step = 0; step < 80; step++) {
      const pose = walkingPose((step / 80) * Math.PI * 2);
      for (const leg of [pose.left, pose.right]) {
        const footY =
          pose.drop -
          upper * Math.cos(leg.hip) -
          lower * Math.cos(leg.hip + leg.knee);
        expect(footY).toBeCloseTo(-0.741 + leg.lift, 3);
        expect(leg.hip + leg.knee + leg.ankle).toBeCloseTo(0, 8);
        expect(Number.isFinite(leg.hip)).toBe(true);
      }
    }
  });
  it("keeps visible business and NPC identities consistent with the authored campaign", () => {
    for (const id of ["harborworks", "cedarline"])
      expect(locations.find((place) => place.id === id)?.name).toBe(
        accounts.find((account) => account.id === `acct-${id}`)?.name,
      );
    for (const location of locations)
      for (const person of location.objects.filter(
        (object) => object.kind === "npc",
      )) {
        expect(
          contacts.some((contact) => person.label.startsWith(contact.name)),
          `${location.id}/${person.label}`,
        ).toBe(true);
      }
  });
});

describe("scene position acknowledgements", () => {
  // Actual poses from the failed mentor-to-desk route: A arrived after B was emitted.
  const a = {
    x: -2.2753967006279896,
    z: -22.091375812978008,
    yaw: 4.680015428992586,
  };
  const b = {
    x: -2.3930751745502374,
    z: -22.094502340556538,
    yaw: 4.68356309099757,
  };
  const arrival = { x: 0, z: -19.6, yaw: 0 };

  it("recognizes a delayed local pose without cancelling the newer walking route", () => {
    const sync = new PositionSynchronizer();
    sync.emit(a);
    sync.emit(b);
    expect(sync.receive(a)).toBe("echo");
    expect(sync.receive(b)).toBe("echo");
    expect(sync.receive(a)).toBe("stale");
  });

  it("accepts a batched newest acknowledgement and ignores skipped older echoes", () => {
    const sync = new PositionSynchronizer();
    const mutable = { ...a };
    sync.emit(mutable);
    mutable.x = 30;
    sync.emit(b);
    expect(sync.receive(b)).toBe("echo");
    expect(sync.receive(a)).toBe("stale");
    expect(sync.receive(mutable)).toBe("external");
  });

  it("applies an unmatched external restore and rejects pre-restore walking echoes", () => {
    const sync = new PositionSynchronizer();
    sync.emit(a);
    sync.emit(b);
    expect(sync.receive(arrival)).toBe("external");
    expect(sync.receive(a)).toBe("stale");
    expect(sync.receive(b)).toBe("stale");
    sync.emit(arrival);
    expect(sync.receive(arrival)).toBe("echo");
  });

  it("honors explicit checkpoint/import revisions even at a locally emitted pose", () => {
    const sync = new PositionSynchronizer();
    sync.emit(a);
    sync.emit(b);
    expect(sync.receive(a, 1)).toBe("restore");
    expect(sync.receive(b, 0)).toBe("stale");
    expect(sync.receive(b, 1)).toBe("stale");
    expect(sync.receive(a, 2)).toBe("restore");
    expect(sync.receive(arrival, 1)).toBe("stale");
  });

  it("keeps local recovery/travel arrivals authoritative and new profiles independent", () => {
    const sync = new PositionSynchronizer(4);
    sync.emit(a);
    sync.reset();
    sync.emit(arrival);
    expect(sync.receive(a, 4)).toBe("stale");
    expect(sync.receive(arrival, 4)).toBe("echo");
    const restoredProfile = new PositionSynchronizer(5);
    expect(restoredProfile.receive(a, 5)).toBe("external");
  });

  it("accepts newest echoes and explicit old checkpoints after long bounded histories", () => {
    const sync = new PositionSynchronizer(0, 4);
    const poses = Array.from({ length: 20 }, (_, index) => ({
      x: index / 10,
      z: -19.6,
      yaw: 0,
    }));
    for (const pose of poses) sync.emit(pose);
    expect(sync.receive(poses[19])).toBe("echo");
    expect(sync.receive(poses[18])).toBe("stale");
    expect(sync.receive(poses[0], 1)).toBe("restore");
  });
});
