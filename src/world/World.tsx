import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  Group,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  SRGBColorSpace,
  Vector3,
  MathUtils,
} from "three";
import {
  AvatarModel,
  type AvatarAppearance,
  type CharacterMotion,
} from "./Avatar";
import { District } from "./Architecture";
import {
  findPath,
  isWalkable,
  moveWithCollision,
  reachableTarget,
  safePosition,
  getSceneColliders,
  type Point,
  type GuidanceTarget,
} from "./collision";
import {
  getLocationAt,
  locations,
  worldObjects,
  type WorldObject,
  getBuildingFloors,
  getFloorObjects,
  getFloorArrival,
  getFloorElevation,
  normalizeFloor,
} from "./locations";
import { PositionSynchronizer } from "./PositionSync";
import {
  cameraClearance,
  containFloorCamera,
  conversationCamera,
} from "./camera";
import "./world.css";

export type WorldPosition = { x: number; z: number; yaw: number };
export type { GuidanceTarget } from "./collision";
export type WorldEvent = {
  type: "moved" | "camera" | "interacted" | "target-reached" | "recovered";
  distance?: number;
  angle?: number;
  objectId?: string;
  locationId?: string;
  input?: "keyboard" | "pointer" | "touch" | "menu";
};
export type WorldProps = {
  paused: boolean;
  location: string;
  position: WorldPosition;
  positionRevision?: number;
  floor?: number;
  onFloorChange?: (locationId: string, floor: number) => void;
  onAreaEnter?: (locationId: string) => void;
  conversationContactId?: string;
  meetingContactId?: string;
  avatar: AvatarAppearance;
  showcase?: boolean;
  quality: "low" | "medium" | "high";
  reducedMotion: boolean;
  cameraSensitivity: number;
  guidanceTarget?: GuidanceTarget;
  navigateTo?: GuidanceTarget & { requestId?: number };
  cameraReframe?: number;
  conversationFraming?: boolean;
  onWorldEvent?: (event: WorldEvent) => void;
  onInteract: (objectId: string, contactId?: string) => void;
  onTravel: (locationId: string) => void;
  onPosition: (position: WorldPosition) => void;
  onError: () => void;
  onTelemetry?: (data: {
    fps: number;
    drawCalls: number;
    triangles: number;
  }) => void;
};
type Controls = {
  keys: Set<string>;
  path: Point[];
  orbit: number;
  pitch: number;
  dragging: boolean;
  dragMoved: boolean;
  pointerX: number;
  pointerY: number;
  interactRequested: boolean;
  recoverRequested: boolean;
  input: "keyboard" | "pointer" | "touch";
  cameraAngle: number;
};

class GraphicsBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }
  render() {
    return this.state.failed ? (
      <div className="world-graphics-fallback">
        The 3D view is unavailable. You can continue using the workbench.
      </div>
    ) : (
      this.props.children
    );
  }
}

function Scene({
  props,
  controls,
  onNearby,
  onLiftOpen,
  onAreaChange,
}: {
  props: WorldProps;
  controls: React.RefObject<Controls>;
  onNearby: (object: WorldObject | undefined) => void;
  onLiftOpen: (locationId: string) => void;
  onAreaChange: (locationId?: string) => void;
}) {
  const player = useRef<Group>(null),
    nearMarker = useRef<Group>(null),
    targetMarker = useRef<Group>(null);
  const current = useRef<WorldPosition>({ ...props.position }),
    lastEmitted = useRef<WorldPosition>({ ...props.position }),
    positioned = useRef(false);
  const positionSync = useRef(
    new PositionSynchronizer(props.positionRevision ?? 0),
  );
  const pendingPhysicalEntry = useRef<
    { locationId: string; revision: number } | undefined
  >(undefined);
  const previousArea = useRef<string | undefined>(undefined);
  const callbacks = useRef(props);
  callbacks.current = props;
  const emitPosition = useCallback((position: WorldPosition) => {
    const snapshot = { ...position };
    lastEmitted.current = snapshot;
    positionSync.current.emit(snapshot);
    callbacks.current.onPosition(snapshot);
  }, []);
  const motion = useRef<CharacterMotion>({ speed: 0, interaction: 0 });
  const journey = useRef({ moved: 0, targetTravel: 0, reached: false });
  const sample = useRef({ time: 0, frames: 0, ui: 0, position: 0 });
  const nearby = useRef<WorldObject | undefined>(undefined),
    focusObject = useRef<WorldObject | undefined>(undefined);
  const { camera, scene, gl, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    if (props.showcase && size.width > 750)
      camera.setViewOffset(
        size.width,
        size.height,
        -0.16 * size.width,
        0,
        size.width,
        size.height,
      );
    else if (props.conversationFraming)
      camera.setViewOffset(
        size.width,
        size.height,
        (props.conversationContactId ? 0.18 : -0.23) * size.width,
        0,
        size.width,
        size.height,
      );
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    return () => {
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
  }, [
    camera,
    props.conversationFraming,
    props.conversationContactId,
    props.showcase,
    size.width,
    size.height,
  ]);
  const ray = useMemo(() => new Raycaster(), []),
    cameraPoint = useMemo(() => new Vector3(), []),
    targetPoint = useMemo(() => new Vector3(), []),
    direction = useMemo(() => new Vector3(), []);
  const sky = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#8eaebb");
    gradient.addColorStop(0.62, "#d6e1df");
    gradient.addColorStop(1, "#eef0e5");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 16, 512);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);
  useEffect(() => () => sky.dispose(), [sky]);
  const cameraWalls = useRef<Mesh[]>([]);
  const target = useMemo(
    () =>
      props.guidanceTarget &&
      (props.guidanceTarget.floor ?? 0) === (props.floor ?? 0)
        ? reachableTarget(props.guidanceTarget, current.current)
        : undefined,
    [
      props.guidanceTarget?.locationId,
      props.guidanceTarget?.objectId,
      props.guidanceTarget?.x,
      props.guidanceTarget?.z,
      props.guidanceTarget?.label,
      props.guidanceTarget?.floor,
      props.floor,
    ],
  );
  const previousReframe = useRef(props.cameraReframe ?? 0);
  const sceneReadiness = useRef({ key: "", frames: 0 });
  useEffect(() => {
    const walls: Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof Mesh && object.userData.cameraObstacle)
        walls.push(object);
    });
    cameraWalls.current = walls;
  }, [scene, props.floor, props.location]);
  useEffect(() => {
    const loss = (event: Event) => {
      event.preventDefault();
      callbacks.current.onError();
    };
    gl.domElement.addEventListener("webglcontextlost", loss);
    return () => gl.domElement.removeEventListener("webglcontextlost", loss);
  }, [gl]);
  useEffect(() => {
    const physicalEntry = pendingPhysicalEntry.current;
    pendingPhysicalEntry.current = undefined;
    if (
      physicalEntry?.locationId === props.location &&
      physicalEntry.revision === (props.positionRevision ?? 0) &&
      !props.floor &&
      positioned.current
    ) {
      // An ordinary doorway crossing changes domain location only. Keep the live pose,
      // camera orbit, and the rest of a click-to-walk route intact.
      return;
    }
    const location =
      locations.find((place) => place.id === props.location) ?? locations[0];
    const restored = safePosition(props.position, props.location, props.floor);
    current.current =
      isWalkable(
        props.position,
        getSceneColliders(props.location, props.floor),
      ) &&
      (!positioned.current ||
        getLocationAt(props.position.x, props.position.z)?.id === location.id)
        ? restored
        : getFloorArrival(location.id, props.floor);
    positioned.current = true;
    positionSync.current.reset();
    controls.current.path = [];
    controls.current.keys.clear();
    controls.current.orbit = location.rotation + Math.PI;
    if (callbacks.current.showcase) camera.position.set(84, 36, 98);
    else
      camera.position.set(
        current.current.x - Math.sin(controls.current.orbit) * 4.25,
        2.65 + getFloorElevation(props.location, props.floor),
        current.current.z - Math.cos(controls.current.orbit) * 4.25,
      );
    if (!callbacks.current.showcase) {
      const contained = containFloorCamera(
        camera.position,
        props.location,
        props.floor,
      );
      camera.position.set(contained.x, contained.y, contained.z);
      camera.lookAt(
        current.current.x + Math.sin(controls.current.orbit) * 0.55,
        getFloorElevation(props.location, props.floor) + 1.18,
        current.current.z + Math.cos(controls.current.orbit) * 0.55,
      );
    }
    sceneReadiness.current = { key: "", frames: 0 };
    const element = gl.domElement.closest<HTMLElement>(".am-world");
    if (element) element.dataset.sceneSettled = "false";
    emitPosition(current.current);
  }, [props.location, props.floor]);
  useEffect(() => {
    const update = positionSync.current.receive(
      props.position,
      props.positionRevision ?? 0,
    );
    if (update === "echo" || update === "stale") return;
    const external =
      update === "restore" ||
      Math.hypot(
        props.position.x - lastEmitted.current.x,
        props.position.z - lastEmitted.current.z,
      ) > 0.001 ||
      Math.abs(props.position.yaw - lastEmitted.current.yaw) > 0.001;
    if (external) {
      const next = safePosition(props.position, props.location, props.floor);
      current.current = next;
      lastEmitted.current = { ...next };
      const area = getLocationAt(next.x, next.z);
      controls.current.orbit = area ? area.rotation + Math.PI : next.yaw;
      controls.current.path = [];
      controls.current.keys.clear();
      if (next.x !== props.position.x || next.z !== props.position.z)
        emitPosition(next);
    }
  }, [
    props.position.x,
    props.position.z,
    props.position.yaw,
    props.positionRevision,
    props.floor,
  ]);
  useEffect(() => {
    if (props.paused) {
      controls.current.keys.clear();
      controls.current.path = [];
      motion.current.speed = 0;
    } else focusObject.current = undefined;
  }, [props.paused]);
  useEffect(() => {
    journey.current.targetTravel = 0;
    journey.current.reached = false;
  }, [
    props.guidanceTarget?.locationId,
    props.guidanceTarget?.objectId,
    props.guidanceTarget?.x,
    props.guidanceTarget?.z,
    props.guidanceTarget?.floor,
    props.floor,
  ]);
  useEffect(() => {
    if (!props.navigateTo || props.paused || props.showcase) return;
    const destinationFloor = props.navigateTo.floor ?? 0;
    if (
      destinationFloor !== (props.floor ?? 0) ||
      (destinationFloor > 0 && props.navigateTo.locationId !== props.location)
    ) {
      props.onFloorChange?.(props.navigateTo.locationId, destinationFloor);
      return;
    }
    const point = reachableTarget(props.navigateTo, current.current);
    if (point) {
      controls.current.path = findPath(
        current.current,
        point,
        getSceneColliders(props.location, props.floor),
      );
      controls.current.input = "pointer";
    }
  }, [
    props.navigateTo?.requestId,
    props.navigateTo?.locationId,
    props.navigateTo?.objectId,
    props.navigateTo?.x,
    props.navigateTo?.z,
    props.navigateTo?.floor,
    props.floor,
  ]);
  useEffect(() => {
    const request = props.cameraReframe ?? 0;
    if (request === previousReframe.current) return;
    previousReframe.current = request;
    if (props.paused || props.showcase) return;
    controls.current.orbit += 0.32;
    props.onWorldEvent?.({
      type: "camera",
      angle: 0.32,
      input: "menu",
      locationId: getLocationAt(current.current.x, current.current.z)?.id,
    });
  }, [props.cameraReframe]);
  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.06),
      input = controls.current,
      config = callbacks.current;
    const floor = normalizeFloor(config.location, config.floor);
    const elevation = getFloorElevation(config.location, floor);
    const obstacles = getSceneColliders(config.location, floor);
    let next = { x: current.current.x, z: current.current.z };
    if (input.recoverRequested) {
      const area =
        getLocationAt(next.x, next.z) ??
        locations.find((place) => place.id === config.location) ??
        locations[0];
      current.current = getFloorArrival(area.id, floor);
      input.orbit = area.rotation + Math.PI;
      input.path = [];
      input.recoverRequested = false;
      next = { x: current.current.x, z: current.current.z };
      positionSync.current.reset();
      emitPosition(current.current);
      config.onWorldEvent?.({
        type: "recovered",
        locationId: area.id,
        input: input.input,
      });
    }
    let dx = 0,
      dz = 0;
    const forward =
      Number(input.keys.has("w") || input.keys.has("arrowup")) -
      Number(input.keys.has("s") || input.keys.has("arrowdown"));
    const horizontal =
      Number(input.keys.has("d") || input.keys.has("arrowright")) -
      Number(input.keys.has("a") || input.keys.has("arrowleft"));
    if (!config.paused && !config.showcase && (forward || horizontal)) {
      input.path = [];
      const magnitude = Math.hypot(horizontal, forward),
        speed = input.keys.has("shift") ? 3.3 : 1.8;
      dx =
        ((Math.sin(input.orbit) * forward -
          Math.cos(input.orbit) * horizontal) *
          speed *
          delta) /
        magnitude;
      dz =
        ((Math.cos(input.orbit) * forward +
          Math.sin(input.orbit) * horizontal) *
          speed *
          delta) /
        magnitude;
    } else if (!config.paused && !config.showcase && input.path.length) {
      const goal = input.path[0],
        length = Math.hypot(goal.x - next.x, goal.z - next.z);
      if (length < 0.15) input.path.shift();
      else {
        const speed = Math.min(1.8 * delta, length);
        dx = ((goal.x - next.x) / length) * speed;
        dz = ((goal.z - next.z) / length) * speed;
      }
    }
    const resolved = moveWithCollision(next, dx, dz, obstacles),
      traveled = Math.hypot(resolved.x - next.x, resolved.z - next.z);
    const walking = traveled > 0.002;
    motion.current.speed = delta > 0 ? traveled / delta : 0;
    motion.current.interaction = Math.max(
      0,
      motion.current.interaction - delta * 1.7,
    );
    if (walking) {
      const yaw = Math.atan2(resolved.x - next.x, resolved.z - next.z);
      const difference = Math.atan2(
        Math.sin(yaw - current.current.yaw),
        Math.cos(yaw - current.current.yaw),
      );
      current.current.yaw += difference * Math.min(1, delta * 11);
      current.current.x = resolved.x;
      current.current.z = resolved.z;
    }
    journey.current.moved += traveled;
    journey.current.targetTravel += traveled;
    if (journey.current.moved >= 1) {
      config.onWorldEvent?.({
        type: "moved",
        distance: journey.current.moved,
        locationId: getLocationAt(resolved.x, resolved.z)?.id,
        input: input.input,
      });
      journey.current.moved = 0;
    }
    if (target && targetMarker.current) {
      targetMarker.current.visible = !config.showcase;
      targetMarker.current.position.set(target.x, elevation + 0.09, target.z);
      const arrived =
        Math.hypot(resolved.x - target.x, resolved.z - target.z) < 0.6;
      if (
        arrived &&
        journey.current.targetTravel >= 1 &&
        !journey.current.reached &&
        !config.paused
      ) {
        journey.current.reached = true;
        emitPosition(current.current);
        config.onWorldEvent?.({
          type: "target-reached",
          objectId: target.objectId,
          locationId: target.locationId,
          distance: journey.current.targetTravel,
          input: input.input,
        });
      }
    } else if (targetMarker.current) targetMarker.current.visible = false;
    if (player.current) {
      player.current.position.set(
        current.current.x,
        elevation + 0.055,
        current.current.z,
      );
      player.current.rotation.y = current.current.yaw;
    }
    sample.current.ui += delta;
    sample.current.position += delta;
    if (sample.current.ui > 0.1) {
      sample.current.ui = 0;
      let closest: WorldObject | undefined;
      let distance = 2.4;
      const area = getLocationAt(current.current.x, current.current.z);
      onAreaChange(area?.id);
      if (
        !floor &&
        !config.showcase &&
        !config.paused &&
        area?.id !== previousArea.current
      ) {
        previousArea.current = area?.id;
        if (area && area.id !== config.location && config.onAreaEnter) {
          pendingPhysicalEntry.current = {
            locationId: area.id,
            revision: config.positionRevision ?? 0,
          };
          emitPosition(current.current);
          config.onAreaEnter(area.id);
        }
      }
      const activeObjects = area
        ? getFloorObjects(area.id, floor, config.meetingContactId)
        : [];
      const candidates =
        floor > 0
          ? activeObjects
          : [
              ...activeObjects,
              ...worldObjects.filter((object) => object.kind === "portal"),
            ];
      for (const object of candidates) {
        if (object.kind === "portal" && area?.id === object.id.slice(7))
          continue;
        const candidate = Math.hypot(
          object.x - current.current.x,
          object.z - current.current.z,
        );
        if (candidate < distance) {
          closest = object;
          distance = candidate;
        }
      }
      // A requested desk may be next to a colleague. Preserve the explicit guidance intent within genuine interaction range.
      if (
        config.guidanceTarget?.objectId &&
        config.guidanceTarget.locationId === area?.id &&
        (config.guidanceTarget.floor ?? 0) === floor
      ) {
        const requested = getFloorObjects(
          area.id,
          floor,
          config.meetingContactId,
        )
          .filter((object) => object.id === config.guidanceTarget!.objectId)
          .sort(
            (a, b) =>
              Math.hypot(
                a.x - (config.guidanceTarget!.x ?? a.x),
                a.z - (config.guidanceTarget!.z ?? a.z),
              ) -
              Math.hypot(
                b.x - (config.guidanceTarget!.x ?? b.x),
                b.z - (config.guidanceTarget!.z ?? b.z),
              ),
          )[0];
        if (
          requested &&
          Math.hypot(
            requested.x - current.current.x,
            requested.z - current.current.z,
          ) < 2.4
        )
          closest = requested;
      }
      const walls: Mesh[] = [];
      scene.traverse((object) => {
        if (object instanceof Mesh && object.userData.cameraObstacle)
          walls.push(object);
      });
      cameraWalls.current = walls;
      nearby.current = closest;
      onNearby(closest);
    }
    if (input.interactRequested && !config.paused && !config.showcase) {
      input.interactRequested = false;
      const object = nearby.current;
      if (object?.kind === "elevator") {
        input.path = [];
        input.keys.clear();
        onLiftOpen(
          config.floor
            ? config.location
            : (getLocationAt(current.current.x, current.current.z)?.id ??
                config.location),
        );
      } else if (object?.id.startsWith("travel:")) {
        const destination = locations.find(
          (location) => location.id === object.id.slice(7),
        );
        if (destination) {
          input.path = [];
          if (destination.id === config.location) {
            current.current = {
              x: destination.x,
              z: destination.z,
              yaw: destination.rotation,
            };
            input.orbit = destination.rotation + Math.PI;
            positionSync.current.reset();
            emitPosition(current.current);
          }
          config.onTravel(destination.id);
        }
      } else if (object) {
        input.path = [];
        motion.current.interaction = 1;
        focusObject.current = object;
        config.onInteract(object.id, object.contactId);
        config.onWorldEvent?.({
          type: "interacted",
          objectId: object.id,
          locationId: getLocationAt(current.current.x, current.current.z)?.id,
          input: input.input,
        });
      }
    }
    if (nearMarker.current) {
      nearMarker.current.visible =
        Boolean(nearby.current) && !config.paused && !config.showcase;
      if (nearby.current)
        nearMarker.current.position.set(
          nearby.current.x,
          elevation + 0.073,
          nearby.current.z,
        );
    }
    if (!config.paused && motion.current.interaction === 0)
      focusObject.current = undefined;
    targetPoint.set(
      current.current.x + Math.sin(input.orbit) * 0.55,
      elevation + 1.18,
      current.current.z + Math.cos(input.orbit) * 0.55,
    );
    cameraPoint.set(
      current.current.x - Math.sin(input.orbit) * 4.25,
      elevation + 1.25 + Math.sin(input.pitch) * 4.25,
      current.current.z - Math.cos(input.orbit) * 4.25,
    );
    const conversationPerson =
      focusObject.current?.kind === "npc" &&
      (!config.conversationContactId ||
        focusObject.current.contactId === config.conversationContactId)
        ? focusObject.current
        : config.conversationFraming
          ? getFloorObjects(
              getLocationAt(current.current.x, current.current.z)?.id ??
                config.location,
              floor,
              config.meetingContactId,
            ).find((object) =>
              config.conversationContactId
                ? object.contactId === config.conversationContactId
                : object.id === "mentor",
            )
          : undefined;
    if (conversationPerson && config.paused) {
      const framing = conversationCamera(
        conversationPerson,
        current.current,
        elevation,
      );
      targetPoint.set(framing.target.x, framing.target.y, framing.target.z);
      cameraPoint.set(framing.camera.x, framing.camera.y, framing.camera.z);
    }
    if (config.showcase) {
      targetPoint.set(-4, 25, -8);
      cameraPoint.set(84, 36, 98);
    }
    if (!config.showcase) {
      direction.copy(cameraPoint).sub(targetPoint);
      const desiredDistance = direction.length();
      direction.normalize();
      ray.set(targetPoint, direction);
      ray.far = desiredDistance;
      const obstruction = ray.intersectObjects(
        cameraWalls.current.filter((wall) => {
          let parent = wall.parent;
          while (parent) {
            if (!parent.visible) return false;
            parent = parent.parent;
          }
          return true;
        }),
        false,
      )[0];
      if (obstruction)
        cameraPoint
          .copy(targetPoint)
          .addScaledVector(direction, cameraClearance(obstruction.distance));
      const contained = containFloorCamera(cameraPoint, config.location, floor);
      cameraPoint.set(contained.x, contained.y, contained.z);
    }
    camera.position.lerp(
      cameraPoint,
      config.reducedMotion ? 1 : 1 - Math.exp(-delta * 7),
    );
    if (!config.showcase) {
      // Recheck the smoothed position too: a floor change or old orbit must never
      // interpolate outside the opaque elevated room, even for one frame.
      const contained = containFloorCamera(
        camera.position,
        config.location,
        floor,
      );
      camera.position.set(contained.x, contained.y, contained.z);
    }
    camera.lookAt(targetPoint);
    const sceneKey = `${config.location}:${floor}:${config.conversationContactId ?? ""}`;
    if (sceneReadiness.current.key !== sceneKey)
      sceneReadiness.current = { key: sceneKey, frames: 0 };
    sceneReadiness.current.frames =
      camera.position.distanceTo(cameraPoint) < 0.06
        ? sceneReadiness.current.frames + 1
        : 0;
    const element = gl.domElement.closest<HTMLElement>(".am-world");
    if (element) {
      element.dataset.sceneFloor = String(floor);
      element.dataset.sceneSettled = String(sceneReadiness.current.frames >= 3);
    }
    if (sample.current.position > 0.35) {
      sample.current.position = 0;
      if (
        Math.hypot(
          current.current.x - lastEmitted.current.x,
          current.current.z - lastEmitted.current.z,
        ) > 0.03 ||
        Math.abs(current.current.yaw - lastEmitted.current.yaw) > 0.03
      ) {
        emitPosition(current.current);
      }
    }
    sample.current.time += rawDelta;
    sample.current.frames++;
    if (sample.current.time > 1.5) {
      if (!config.showcase)
        config.onTelemetry?.({
          fps: Math.round(sample.current.frames / sample.current.time),
          drawCalls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
        });
      sample.current.time = 0;
      sample.current.frames = 0;
    }
  });
  const navigate = useCallback((x: number, z: number) => {
    if (
      callbacks.current.paused ||
      callbacks.current.showcase ||
      controls.current.dragMoved
    )
      return;
    controls.current.path = findPath(
      current.current,
      { x, z },
      getSceneColliders(callbacks.current.location, callbacks.current.floor),
    );
    controls.current.input = "pointer";
  }, []);
  return (
    <>
      <primitive attach="background" object={sky} />
      <fog
        attach="fog"
        args={[
          "#d6e1df",
          props.showcase ? 180 : 90,
          props.showcase ? 300 : 220,
        ]}
      />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={["#dce9f1", "#a7a28f", 0.78]} />
      <directionalLight
        position={[-45, 105, 30]}
        intensity={2.25}
        castShadow={props.quality !== "low"}
        shadow-mapSize-width={props.quality === "high" ? 2048 : 1024}
        shadow-mapSize-height={props.quality === "high" ? 2048 : 1024}
        shadow-camera-left={-68}
        shadow-camera-right={68}
        shadow-camera-top={80}
        shadow-camera-bottom={-68}
        shadow-camera-far={230}
        shadow-bias={-0.0007}
        shadow-normalBias={0.045}
        shadow-radius={3}
      />
      <directionalLight
        position={[14, 12, -25]}
        intensity={0.42}
        color="#c6dce9"
      />
      <District
        onGroundClick={navigate}
        position={current}
        showcase={props.showcase}
        floor={props.floor}
        locationId={props.location}
        quality={props.quality}
        reducedMotion={props.reducedMotion}
        meetingContactId={props.meetingContactId}
      />
      <group ref={player}>
        <AvatarModel
          appearance={props.avatar}
          motion={motion}
          reducedMotion={props.reducedMotion}
          paused={props.paused}
        />
      </group>
      <group ref={nearMarker} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.75, 48]} />
          <meshBasicMaterial color="#e2c68a" transparent opacity={0.72} />
        </mesh>
      </group>
      <group ref={targetMarker} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.41, 48]} />
          <meshBasicMaterial color="#d4ad63" transparent opacity={0.94} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <sphereGeometry args={[0.075, 24, 16]} />
          <meshStandardMaterial
            color="#d4b76b"
            emissive="#cab36e"
            emissiveIntensity={0.13}
            roughness={0.4}
          />
        </mesh>
      </group>
    </>
  );
}
function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export default function World(props: WorldProps) {
  const controls = useRef<Controls>({
    keys: new Set(),
    path: [],
    orbit: props.position.yaw,
    pitch: 0.28,
    dragging: false,
    dragMoved: false,
    pointerX: 0,
    pointerY: 0,
    interactRequested: false,
    recoverRequested: false,
    input: "keyboard",
    cameraAngle: 0,
  });
  const [nearby, setNearby] = useState<WorldObject | undefined>();
  const [directory, setDirectory] = useState<string>();
  const directoryPanel = useRef<HTMLElement>(null);
  const [area, setArea] = useState<string | undefined>(props.location);
  const state = useRef(props);
  state.current = { ...props, paused: props.paused || Boolean(directory) };
  const sceneProps = { ...props, paused: props.paused || Boolean(directory) };
  useEffect(() => {
    const input = controls.current;
    const down = (event: KeyboardEvent) => {
      if (
        state.current.paused ||
        state.current.showcase ||
        isTypingTarget(event.target)
      )
        return;
      const key = event.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "shift",
        ].includes(key)
      ) {
        event.preventDefault();
        input.keys.add(key);
        input.input = "keyboard";
      }
      if (key === "e" && !event.repeat) input.interactRequested = true;
      if (key === "r" && !event.repeat) input.recoverRequested = true;
    };
    const up = (event: KeyboardEvent) =>
      input.keys.delete(event.key.toLowerCase());
    const release = () => {
      input.keys.clear();
      input.dragging = false;
    };
    const pointerRelease = () => {
      input.dragging = false;
    };
    const visibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    window.addEventListener("pointerup", pointerRelease);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
      window.removeEventListener("pointerup", pointerRelease);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!directory) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        setDirectory(undefined);
      } else if (event.key === "Tab") {
        const buttons =
          directoryPanel.current?.querySelectorAll<HTMLButtonElement>(
            "button:not([disabled])",
          );
        const first = buttons?.[0],
          last = buttons?.[buttons.length - 1];
        if (!first || !last) return;
        if (
          !directoryPanel.current?.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first)
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, [directory]);
  useEffect(() => {
    setDirectory(undefined);
  }, [props.location, props.floor, props.positionRevision]);
  useEffect(() => {
    if (props.paused) setDirectory(undefined);
  }, [props.paused]);
  const nearbyUpdate = useCallback(
    (object: WorldObject | undefined) =>
      setNearby((previous) =>
        previous?.id === object?.id && previous?.x === object?.x
          ? previous
          : object,
      ),
    [],
  );
  const moveButton = (key: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Inactive synthetic pointer has no capture. */
      }
      if (!state.current.paused) {
        controls.current.keys.add(key);
        controls.current.input = "touch";
      }
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      controls.current.keys.delete(key);
    },
    onPointerCancel: () => controls.current.keys.delete(key),
    onLostPointerCapture: () => controls.current.keys.delete(key),
  });
  return (
    <div
      className={`am-world ${props.paused ? "is-paused" : ""} ${directory ? "has-directory" : ""}`}
      data-testid="world"
      data-guidance-target={props.guidanceTarget?.objectId ?? ""}
      data-current-floor={props.floor ?? 0}
      data-current-building={area ?? "street"}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest("button")
        )
          return;
        if (props.paused) return;
        controls.current.dragging = true;
        controls.current.dragMoved = false;
        controls.current.pointerX = event.clientX;
        controls.current.pointerY = event.clientY;
      }}
      onPointerMove={(event) => {
        const input = controls.current;
        if (!input.dragging || props.paused) return;
        const dx = event.clientX - input.pointerX,
          dy = event.clientY - input.pointerY;
        if (Math.abs(dx) + Math.abs(dy) > 2) input.dragMoved = true;
        if (input.dragMoved) {
          const sensitivity = MathUtils.clamp(
            props.cameraSensitivity || 1,
            0.2,
            3,
          );
          const before = input.pitch;
          input.orbit -= dx * 0.006 * sensitivity;
          input.pitch = MathUtils.clamp(
            input.pitch + dy * 0.004 * sensitivity,
            0.12,
            0.64,
          );
          input.cameraAngle +=
            Math.abs(dx * 0.006 * sensitivity) + Math.abs(input.pitch - before);
          if (input.cameraAngle >= 0.15) {
            props.onWorldEvent?.({
              type: "camera",
              angle: input.cameraAngle,
              input: event.pointerType === "touch" ? "touch" : "pointer",
            });
            input.cameraAngle = 0;
          }
        }
        input.pointerX = event.clientX;
        input.pointerY = event.clientY;
      }}
    >
      <GraphicsBoundary onError={props.onError}>
        <Canvas
          shadows={props.quality !== "low"}
          dpr={
            props.quality === "low"
              ? 1
              : props.quality === "medium"
                ? [1, 1.25]
                : [1, 1.6]
          }
          gl={{ antialias: true, alpha: false, powerPreference: "default" }}
          camera={{ fov: 56, near: 0.08, far: 340 }}
          fallback={
            <div className="world-graphics-fallback">
              Your browser cannot open the 3D view. Use the accessible
              workbench.
            </div>
          }
          onCreated={({ gl }) => {
            gl.setClearColor("#aebfc3");
            gl.toneMappingExposure = 1.05;
          }}
        >
          <Scene
            props={sceneProps}
            controls={controls}
            onNearby={nearbyUpdate}
            onLiftOpen={setDirectory}
            onAreaChange={setArea}
          />
        </Canvas>
      </GraphicsBoundary>
      {!props.showcase && (
        <div className="world-touch-pad" aria-label="World movement controls">
          <button
            className="world-up"
            aria-label="Walk forward"
            {...moveButton("w")}
          >
            ↑
          </button>
          <button
            className="world-left"
            aria-label="Walk left"
            {...moveButton("a")}
          >
            ←
          </button>
          <button
            className="world-down"
            aria-label="Walk backward"
            {...moveButton("s")}
          >
            ↓
          </button>
          <button
            className="world-right"
            aria-label="Walk right"
            {...moveButton("d")}
          >
            →
          </button>
        </div>
      )}
      {nearby && !props.paused && !directory && !props.showcase && (
        <button
          className="world-interact"
          onClick={() => {
            controls.current.interactRequested = true;
            controls.current.input = "pointer";
          }}
          aria-label={`Interact: ${nearby.label}`}
        >
          <kbd>E</kbd>
          <span>
            {nearby.id === "mentor"
              ? "Talk to Morgan Vale · your mentor"
              : nearby.label}
          </span>
          <span aria-hidden="true">↗</span>
        </button>
      )}
      {!props.showcase &&
        !props.paused &&
        area &&
        props.onFloorChange &&
        !directory && (
          <button
            className="world-elevator"
            data-testid="world-elevator"
            onClick={() => {
              controls.current.keys.clear();
              controls.current.path = [];
              setDirectory(area);
            }}
          >
            <span aria-hidden="true">↕</span>{" "}
            {props.floor
              ? `Level ${String((props.floor ?? 0) + 1).padStart(2, "0")}`
              : "Ground floor"}{" "}
            · Lift directory
          </button>
        )}
      {directory && !props.showcase && (
        <section
          className="world-floor-directory"
          ref={directoryPanel}
          role="dialog"
          aria-modal="true"
          aria-label="Lift directory"
          data-testid="floor-directory"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <small>BUILDING DIRECTORY</small>
              <h2>
                {locations.find((location) => location.id === directory)?.name}
              </h2>
              <p>
                Every floor is furnished and walkable. Lift travel does not
                advance the business clock.
              </p>
            </div>
            <button
              autoFocus
              aria-label="Close lift directory"
              onClick={() => setDirectory(undefined)}
            >
              ×
            </button>
          </header>
          <div className="world-floor-options">
            {getBuildingFloors(directory).map((level) => (
              <button
                key={level.index}
                data-testid={`floor-${level.index}`}
                aria-current={
                  directory === area && level.index === (props.floor ?? 0)
                    ? "true"
                    : undefined
                }
                onClick={() => {
                  props.onFloorChange?.(directory, level.index);
                  setDirectory(undefined);
                }}
              >
                <strong>
                  {level.index ? String(level.index + 1).padStart(2, "0") : "G"}
                </strong>
                <span>
                  {level.name}
                  <small>
                    {level.theme === "lounge"
                      ? "Conversation & reflection"
                      : level.theme === "library"
                        ? "Sources & evidence"
                        : level.theme === "conference"
                          ? "Meetings & planning"
                          : "Work & learning"}
                  </small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <footer>
            Esc closes · R recovers on the current floor · Ground returns to the
            street
          </footer>
        </section>
      )}
      {props.paused && !props.showcase && (
        <div className="world-paused-indicator">
          World paused while you work
        </div>
      )}
    </div>
  );
}
