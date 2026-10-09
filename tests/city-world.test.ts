import {
  cameraClearance,
  CAMERA_WALL_MARGIN,
  containFloorCamera,
  conversationCamera,
} from "../src/world/camera";
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
  localToWorld,
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

describe("upper-floor and conversation camera safety", () => {
  it("contains every default arrival camera in its elevated room before a frame is shown", () => {
    for (const location of locations)
      for (const floor of getBuildingFloors(location.id).slice(1)) {
        const elevation = getFloorElevation(location.id, floor.index);
        const outside = localToWorld(
          0,
          6.45,
          location.centerX,
          location.centerZ,
          location.rotation,
        );
        const camera = containFloorCamera(
          { ...outside, y: elevation + 2.42 },
          location.id,
          floor.index,
        );
        const local = localToWorld(
          camera.x - location.centerX,
          camera.z - location.centerZ,
          0,
          0,
          -location.rotation,
        );
        expect(local.z).toBeCloseTo(5 - CAMERA_WALL_MARGIN, 7);
        expect(local.z).toBeLessThan(4.92); // The opaque front wall starts here.
        expect(camera.y).toBeCloseTo(elevation + 2.42, 7);
      }
  });
  it("keeps all orbit directions and stale interpolated camera poses inside upper walls", () => {
    for (const location of locations) {
      const floor = getBuildingFloors(location.id).length - 1;
      const elevation = getFloorElevation(location.id, floor);
      for (let index = 0; index < 32; index++) {
        const point = {
          x: location.centerX + Math.sin(index) * 15,
          y: index % 2 ? 0 : 1000,
          z: location.centerZ + Math.cos(index) * 15,
        };
        const camera = containFloorCamera(point, location.id, floor);
        const local = localToWorld(
          camera.x - location.centerX,
          camera.z - location.centerZ,
          0,
          0,
          -location.rotation,
        );
        expect(Math.abs(local.x)).toBeLessThanOrEqual(
          6 - CAMERA_WALL_MARGIN + 1e-9,
        );
        expect(Math.abs(local.z)).toBeLessThanOrEqual(
          5 - CAMERA_WALL_MARGIN + 1e-9,
        );
        expect(camera.y).toBeGreaterThanOrEqual(elevation + 0.5);
        expect(camera.y).toBeLessThanOrEqual(elevation + 3.2);
      }
    }
  });
  it("preserves ground-door camera space and never pushes a short boom through a closer wall", () => {
    const ground = { x: 0, y: 2.65, z: -15.35 };
    expect(containFloorCamera(ground, "hq", 0)).toEqual(ground);
    for (const distance of [0.02, 0.1, 0.5, 1, 1.4, 4.25]) {
      expect(cameraClearance(distance)).toBeLessThanOrEqual(distance);
      expect(cameraClearance(distance)).toBeGreaterThanOrEqual(0);
    }
  });
  it("frames the chosen colleague closely even when a conversation opens from a distant menu", () => {
    const person = { x: -3.6, z: -21 };
    for (const player of [
      { x: 0, z: -19.6 },
      { x: 0, z: 40 },
    ]) {
      const framing = conversationCamera(person, player, 3.8);
      expect(
        Math.hypot(framing.camera.x - person.x, framing.camera.z - person.z),
      ).toBeCloseTo(2.7);
      expect(framing.target.x).toBe(person.x);
      expect(framing.target.z).toBe(person.z);
      expect(framing.target.y).toBeCloseTo(5.28);
    }
  });
});
