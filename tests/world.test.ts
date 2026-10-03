import { describe, expect, it } from "vitest";
import {
  colliders,
  findPath,
  isWalkable,
  moveWithCollision,
  type Collider,
} from "../src/world/collision";
import { getLocationAt, locations, localToWorld } from "../src/world/locations";
import { accounts, contacts } from "../src/content/accounts";

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
