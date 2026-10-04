import { locations, localToWorld } from "./locations";

export type Point = { x: number; z: number };
export type Collider = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};
export const PLAYER_RADIUS = 0.3;
export const WORLD_BOUNDARY = 39;

function rectangle(
  x: number,
  z: number,
  width: number,
  depth: number,
): Collider {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  };
}

export const colliders: Collider[] = locations.flatMap((location) => {
  function localBox(x: number, z: number, width: number, depth: number) {
    const point = localToWorld(
      x,
      z,
      location.centerX,
      location.centerZ,
      location.rotation,
    );
    const sideways = Math.abs(Math.sin(location.rotation)) > 0.5;
    return rectangle(
      point.x,
      point.z,
      sideways ? depth : width,
      sideways ? width : depth,
    );
  }
  const walls = [
    localBox(0, -5, 12.3, 0.3),
    localBox(-6, 0, 0.3, 10.3),
    localBox(6, 0, 0.3, 10.3),
    localBox(-4.2, 5, 3.6, 0.3),
    localBox(4.2, 5, 3.6, 0.3),
  ];
  const furniture = location.objects.map((object) => {
    const widths =
      object.kind === "meeting"
        ? [2.6, 1.5]
        : object.kind === "desk"
          ? [2.1, 1.05]
          : [0.85, 0.85];
    const sideways = Math.abs(Math.sin(location.rotation)) > 0.5;
    return rectangle(
      object.x,
      object.z,
      widths[sideways ? 1 : 0],
      widths[sideways ? 0 : 1],
    );
  });
  const chairs = location.objects.flatMap((object) => {
    const dx = object.x - location.centerX,
      dz = object.z - location.centerZ;
    const x =
      dx * Math.cos(location.rotation) - dz * Math.sin(location.rotation);
    const z =
      dx * Math.sin(location.rotation) + dz * Math.cos(location.rotation);
    if (object.kind === "desk") return [localBox(x, z + 0.86, 0.6, 0.58)];
    if (object.kind === "meeting")
      return [
        localBox(x - 0.8, z + 1.07, 0.6, 0.58),
        localBox(x + 0.8, z + 1.07, 0.6, 0.58),
        localBox(x, z - 1.07, 0.6, 0.58),
      ];
    return [];
  });
  const extras: Collider[] = [];
  if (["research", "academy", "cedarline", "home"].includes(location.id))
    extras.push(
      localBox(-3.8, -4.48, 2.35, 0.45),
      localBox(3.8, -4.48, 2.35, 0.45),
    );
  if (location.id === "home")
    extras.push(localBox(-3.7, 2.8, 2.6, 1.1), localBox(3.6, 2.9, 2.4, 1.2));
  if (location.id === "hq") extras.push(localBox(1.8, -0.2, 0.1, 4.2));
  if (location.id === "hq") extras.push(localBox(0, -4.13, 3.15, 0.66));
  if (location.id === "operations")
    extras.push(
      localBox(-3.8, -4.48, 2.35, 0.45),
      localBox(3.8, -4.48, 2.35, 0.45),
      localBox(4.9, 3.5, 1.1, 0.65),
    );
  if (location.id === "cedarline")
    extras.push(
      localBox(-5.64, 1.7, 0.45, 2.35),
      localBox(-5.64, -1.5, 0.45, 2.35),
      localBox(4.7, 2.9, 1.6, 1.15),
    );
  if (location.id === "harborworks")
    extras.push(localBox(-5.2, -2.5, 0.75, 0.85));
  if (location.id === "cafe")
    extras.push(
      localBox(2.8, -3.9, 4.4, 0.9),
      localBox(-2.65, 2.7, 1.1, 1.1),
      localBox(-3.8, 2.9, 0.6, 0.58),
      localBox(-1.5, 2.9, 0.6, 0.58),
    );
  return [...walls, ...furniture, ...chairs, ...extras];
});

export type GuidanceTarget = {
  locationId: string;
  objectId?: string;
  x?: number;
  z?: number;
  label?: string;
};

/** Preserve any valid old save position; repair only invalid/out-of-bounds positions to an existing safe arrival. */
export function safePosition(
  position: Point & { yaw?: number },
  locationId = "home",
): { x: number; z: number; yaw: number } {
  if (isWalkable(position))
    return {
      x: position.x,
      z: position.z,
      yaw: Number.isFinite(position.yaw) ? position.yaw! : 0,
    };
  const location =
    locations.find((place) => place.id === locationId) ?? locations[0];
  return { x: location.x, z: location.z, yaw: location.rotation };
}

/** Work desks/NPC centers are solid. Guidance points at a reachable approach, never inside furniture. */
export function reachableTarget(
  target: GuidanceTarget,
  start: Point,
):
  | (Point & { objectId?: string; locationId: string; label?: string })
  | undefined {
  const location = locations.find((place) => place.id === target.locationId);
  if (!location) return undefined;
  const object = location.objects.find(
    (candidate) => candidate.id === target.objectId,
  );
  const explicit = Number.isFinite(target.x) && Number.isFinite(target.z);
  const center = explicit
    ? { x: target.x!, z: target.z! }
    : (object ?? location);
  const safeStart = safePosition(start, location.id);
  const candidates: Point[] = [];
  if (isWalkable(center)) candidates.push(center);
  if (object)
    for (const radius of [1.3, 1.8, 2.15])
      for (let i = 0; i < 16; i++)
        candidates.push({
          x: center.x + Math.sin((i / 16) * Math.PI * 2) * radius,
          z: center.z + Math.cos((i / 16) * Math.PI * 2) * radius,
        });
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x - safeStart.x, a.z - safeStart.z) -
      Math.hypot(b.x - safeStart.x, b.z - safeStart.z),
  );
  const point = candidates.find(
    (candidate) =>
      isWalkable(candidate) &&
      getPlace(candidate, location.id) &&
      findPath(safeStart, candidate).length > 0,
  );
  return point
    ? {
        ...point,
        locationId: location.id,
        objectId: target.objectId,
        label: target.label ?? object?.label ?? location.name,
      }
    : undefined;
}
function getPlace(point: Point, locationId: string) {
  const location = locations.find((place) => place.id === locationId)!;
  const local = localToWorld(
    point.x - location.centerX,
    point.z - location.centerZ,
    0,
    0,
    -location.rotation,
  );
  return Math.abs(local.x) < 5.6 && Math.abs(local.z) < 4.7;
}

// Planters border the central square, leaving wide paved approaches open.
for (const x of [-7.5, 7.5])
  for (const z of [-7.5, 7.5]) colliders.push(rectangle(x, z, 2, 2));
colliders.push(rectangle(0, 0, 3.8, 3.8));
colliders.push(rectangle(-6, 0, 0.62, 2.7), rectangle(6, 0, 0.62, 2.7));

export function isWalkable(
  point: Point,
  obstacles: readonly Collider[] = colliders,
  radius = PLAYER_RADIUS,
) {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.z) ||
    Math.abs(point.x) > WORLD_BOUNDARY - radius ||
    Math.abs(point.z) > WORLD_BOUNDARY - radius
  )
    return false;
  return !obstacles.some((box) => {
    const closestX = Math.max(box.minX, Math.min(point.x, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(point.z, box.maxZ));
    return (point.x - closestX) ** 2 + (point.z - closestZ) ** 2 < radius ** 2;
  });
}

/** Substeps prevent tunneling; resolving axes independently permits natural wall sliding. */
export function moveWithCollision(
  point: Point,
  dx: number,
  dz: number,
  obstacles: readonly Collider[] = colliders,
): Point {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  const next = { ...point };
  for (let step = 0; step < steps; step++) {
    if (isWalkable({ x: next.x + dx / steps, z: next.z }, obstacles))
      next.x += dx / steps;
    if (isWalkable({ x: next.x, z: next.z + dz / steps }, obstacles))
      next.z += dz / steps;
  }
  return next;
}

/** Bounded grid A* provides click navigation through doors, around desks, and across the district. */
export function findPath(
  start: Point,
  destination: Point,
  obstacles: readonly Collider[] = colliders,
): Point[] {
  if (!isWalkable(destination, obstacles)) return [];
  const step = 0.65;
  const cell = (point: Point) => ({
    x: Math.round(point.x / step),
    z: Math.round(point.z / step),
  });
  const startCell = cell(start),
    goal = cell(destination);
  const key = (point: Point) => `${point.x},${point.z}`;
  const startKey = key(startCell);
  const goalKey = key(goal);
  const open: { x: number; z: number; g: number; f: number; key: string }[] = [
    { ...startCell, key: startKey, g: 0, f: 0 },
  ];
  const best = new Map<string, number>([[startKey, 0]]);
  const parents = new Map<string, string>();
  const visited = new Set<string>();
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (let iteration = 0; open.length && iteration < 18000; iteration++) {
    let minimum = 0;
    for (let index = 1; index < open.length; index++)
      if (open[index].f < open[minimum].f) minimum = index;
    const current = open.splice(minimum, 1)[0];
    if (visited.has(current.key)) continue;
    visited.add(current.key);
    const currentPoint = { x: current.x * step, z: current.z * step };
    const closeToGoal =
      current.key === goalKey ||
      Math.hypot(
        currentPoint.x - destination.x,
        currentPoint.z - destination.z,
      ) < step;
    const finalMove = closeToGoal
      ? moveWithCollision(
          currentPoint,
          destination.x - currentPoint.x,
          destination.z - currentPoint.z,
          obstacles,
        )
      : currentPoint;
    const finalSegmentClear =
      closeToGoal &&
      Math.hypot(finalMove.x - destination.x, finalMove.z - destination.z) <
        0.01;
    if (finalSegmentClear) {
      const result: Point[] = [destination];
      let cursor = current.key;
      while (cursor !== startKey) {
        const [x, z] = cursor.split(",").map(Number);
        result.push({ x: x * step, z: z * step });
        const parent = parents.get(cursor);
        if (!parent) break;
        cursor = parent;
      }
      return result.reverse();
    }
    for (const [dx, dz] of directions) {
      const neighbor = { x: current.x + dx, z: current.z + dz };
      const neighborKey = key(neighbor);
      if (visited.has(neighborKey)) continue;
      const point = { x: neighbor.x * step, z: neighbor.z * step };
      if (!isWalkable(point, obstacles)) continue;
      // No diagonal corner cutting.
      if (
        dx &&
        dz &&
        (!isWalkable({ x: current.x * step, z: point.z }, obstacles) ||
          !isWalkable({ x: point.x, z: current.z * step }, obstacles))
      )
        continue;
      const g = current.g + Math.hypot(dx, dz);
      if (g >= (best.get(neighborKey) ?? Infinity)) continue;
      best.set(neighborKey, g);
      parents.set(neighborKey, current.key);
      open.push({
        ...neighbor,
        key: neighborKey,
        g,
        f: g + Math.hypot(neighbor.x - goal.x, neighbor.z - goal.z),
      });
    }
  }
  return [];
}
