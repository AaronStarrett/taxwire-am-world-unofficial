import {
  getFloorElevation,
  localToWorld,
  locations,
  normalizeFloor,
} from "./locations";

export type CameraPoint = { x: number; y: number; z: number };
export const CAMERA_WALL_MARGIN = 0.45;

/** The orbit can leave a ground-floor doorway, but an elevated room has no exterior camera space. */
export function containFloorCamera(
  point: CameraPoint,
  locationId: string,
  requestedFloor = 0,
): CameraPoint {
  const floor = normalizeFloor(locationId, requestedFloor);
  if (!floor) return { ...point };
  const location =
    locations.find((candidate) => candidate.id === locationId) ?? locations[0];
  const local = localToWorld(
    point.x - location.centerX,
    point.z - location.centerZ,
    0,
    0,
    -location.rotation,
  );
  const clamp = (value: number, minimum: number, maximum: number) =>
    Math.max(minimum, Math.min(value, maximum));
  const position = localToWorld(
    clamp(local.x, -6 + CAMERA_WALL_MARGIN, 6 - CAMERA_WALL_MARGIN),
    clamp(local.z, -5 + CAMERA_WALL_MARGIN, 5 - CAMERA_WALL_MARGIN),
    location.centerX,
    location.centerZ,
    location.rotation,
  );
  const elevation = getFloorElevation(locationId, floor);
  return { ...position, y: clamp(point.y, elevation + 0.5, elevation + 3.2) };
}

/** Never force the camera back through a nearby wall just to retain a minimum boom length. */
export function cameraClearance(distance: number) {
  return Math.max(0, distance - 0.22);
}

/** Framing is relative to the person, so a directory-opened conversation is genuinely close. */
export function conversationCamera(
  person: { x: number; z: number },
  player: { x: number; z: number },
  elevation = 0,
) {
  const yaw = Math.atan2(person.x - player.x, person.z - player.z);
  return {
    target: { x: person.x, y: elevation + 1.48, z: person.z },
    camera: {
      x: person.x - Math.sin(yaw + 0.18) * 2.7,
      y: elevation + 1.83,
      z: person.z - Math.cos(yaw + 0.18) * 2.7,
    },
  };
}
