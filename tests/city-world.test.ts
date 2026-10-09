import { describe, expect, it } from "vitest";
import { contacts } from "../src/content/accounts";
import {
  getBuildingFloors,
  getFloorArrival,
  getFloorElevation,
  getFloorObjects,
  locations,
  normalizeFloor,
  getContactHome,
  WORLD_FLOOR_HEIGHT,
} from "../src/world/locations";
import {
  findPath,
  getSceneColliders,
  isWalkable,
  moveWithCollision,
  reachableTarget,
  safePosition,
  WORLD_BOUNDARY,
} from "../src/world/collision";

describe("multi-storey corporate district", () => {
  it("makes every advertised storey a named, furnished and interactive floor", () => {
    expect(
      locations.reduce(
        (sum, location) => sum + getBuildingFloors(location.id).length,
        0,
      ),
    ).toBe(88);
    for (const location of locations) {
      const floors = getBuildingFloors(location.id);
      expect(floors.length).toBeGreaterThanOrEqual(8);
      expect(new Set(floors.map((floor) => floor.name)).size).toBe(
        floors.length,
      );
      for (const floor of floors) {
        const objects = getFloorObjects(location.id, floor.index);
        expect(objects.some((object) => object.kind === "elevator")).toBe(true);
        expect(
          objects.filter((object) =>
            ["desk", "document", "meeting"].includes(object.kind),
          ).length,
        ).toBeGreaterThanOrEqual(2);
        expect(getFloorElevation(location.id, floor.index)).toBe(
          floor.index * WORLD_FLOOR_HEIGHT,
        );
      }
    }
  });
  it("gives all 40 authored people one physical home and a direct conversation identity", () => {
    const people = locations.flatMap((location) =>
      getBuildingFloors(location.id).flatMap((floor) =>
        getFloorObjects(location.id, floor.index).filter(
          (object) => object.kind === "npc",
        ),
      ),
    );
    expect(people).toHaveLength(40);
    expect(new Set(people.map((object) => object.contactId)).size).toBe(40);
    for (const contact of contacts) {
      expect(
        people.some(
          (object) =>
            object.contactId === contact.id &&
            object.label.startsWith(contact.name),
        ),
      ).toBe(true);
      expect(getContactHome(contact.id)).toBeDefined();
    }
  });
  it("keeps every floor arrival safe and every activity reachable through clear circulation", () => {
    for (const location of locations)
      for (const floor of getBuildingFloors(location.id)) {
        const arrival = getFloorArrival(location.id, floor.index);
        const obstacles = getSceneColliders(location.id, floor.index);
        expect(
          isWalkable(arrival, obstacles),
          `${location.id}/${floor.index} arrival`,
        ).toBe(true);
        for (const object of getFloorObjects(location.id, floor.index)) {
          const target = reachableTarget(
            {
              locationId: location.id,
              floor: floor.index,
              objectId: object.id,
              x: object.x,
              z: object.z,
            },
            arrival,
          );
          expect(
            target,
            `${location.id}/${floor.index}/${object.id}`,
          ).toBeDefined();
          expect(isWalkable(target!, obstacles)).toBe(true);
          expect(
            Math.hypot(target!.x - object.x, target!.z - object.z),
          ).toBeLessThan(2.4);
          const path = findPath(arrival, target!, obstacles);
          expect(
            path.length,
            `${location.id}/${floor.index}/${object.id} path`,
          ).toBeGreaterThan(0);
          let current = arrival;
          for (const point of path) {
            const next = moveWithCollision(
              current,
              point.x - current.x,
              point.z - current.z,
              obstacles,
            );
            expect(Math.hypot(next.x - point.x, next.z - point.z)).toBeLessThan(
              0.03,
            );
            current = { ...next, yaw: arrival.yaw };
          }
        }
      }
  });
  it("prevents upper-floor escape and repairs bad positions on the same floor", () => {
    for (const location of locations) {
      const floor = getBuildingFloors(location.id).length - 1;
      const obstacles = getSceneColliders(location.id, floor);
      const arrival = getFloorArrival(location.id, floor);
      expect(isWalkable({ x: 0, z: 5 }, obstacles)).toBe(false);
      for (const [dx, dz] of [
        [150, 0],
        [-150, 0],
        [0, 150],
        [0, -150],
      ]) {
        const moved = moveWithCollision(arrival, dx, dz, obstacles);
        expect(isWalkable(moved, obstacles)).toBe(true);
        expect(Math.abs(moved.x - location.centerX)).toBeLessThan(6);
        expect(Math.abs(moved.z - location.centerZ)).toBeLessThan(6);
      }
      expect(safePosition({ x: Infinity, z: NaN }, location.id, floor)).toEqual(
        arrival,
      );
      expect(
        safePosition({ ...arrival, yaw: 1.5 }, location.id, floor),
      ).toEqual({ ...arrival, yaw: 1.5 });
    }
  });
  it("normalizes corrupt floor metadata and preserves original street-level navigation", () => {
    for (const location of locations)
      for (const invalid of [-1, 1000, 1.5, NaN, Infinity])
        expect(normalizeFloor(location.id, invalid)).toBe(0);
    expect(WORLD_BOUNDARY).toBe(64);
    expect(isWalkable({ x: 60, z: 5 })).toBe(true);
    expect(isWalkable({ x: 65, z: 5 })).toBe(false);
    expect(findPath({ x: 0, z: 5 }, { x: 60, z: 5 }).length).toBeGreaterThan(0);
  });
});
