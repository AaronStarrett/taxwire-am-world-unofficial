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
import { Group, Mesh, Raycaster, Vector3, MathUtils } from "three";
import { AvatarModel, type AvatarAppearance } from "./Avatar";
import { District } from "./Architecture";
import {
  findPath,
  isWalkable,
  moveWithCollision,
  type Point,
} from "./collision";
import {
  getLocationAt,
  locations,
  worldObjects,
  type WorldObject,
} from "./locations";
import "./world.css";

export type WorldPosition = { x: number; z: number; yaw: number };
export type WorldProps = {
  paused: boolean;
  location: string;
  position: WorldPosition;
  avatar: AvatarAppearance;
  showcase?: boolean;
  quality: "low" | "medium" | "high";
  reducedMotion: boolean;
  cameraSensitivity: number;
  onInteract: (objectId: string) => void;
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
}: {
  props: WorldProps;
  controls: React.RefObject<Controls>;
  onNearby: (object: WorldObject | undefined) => void;
}) {
  const player = useRef<Group>(null);
  const marker = useRef<Group>(null);
  const current = useRef<WorldPosition>({ ...props.position });
  const lastEmitted = useRef<WorldPosition>({ ...props.position });
  const positioned = useRef(false);
  const callbacks = useRef(props);
  callbacks.current = props;
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const sample = useRef({ time: 0, frames: 0, ui: 0, position: 0 });
  const nearby = useRef<WorldObject | undefined>(undefined);
  const { camera, scene, gl } = useThree();
  const ray = useMemo(() => new Raycaster(), []);
  const cameraPoint = useMemo(() => new Vector3(), []);
  const targetPoint = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const cameraWalls = useRef<Mesh[]>([]);

  useEffect(() => {
    const walls: Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof Mesh && object.userData.cameraObstacle)
        walls.push(object);
    });
    cameraWalls.current = walls;
  }, [scene]);

  useEffect(() => {
    const handleLoss = (event: Event) => {
      event.preventDefault();
      callbacks.current.onError();
    };
    gl.domElement.addEventListener("webglcontextlost", handleLoss, false);
    return () =>
      gl.domElement.removeEventListener("webglcontextlost", handleLoss, false);
  }, [gl]);

  useEffect(() => {
    const location =
      locations.find((candidate) => candidate.id === props.location) ??
      locations[0];
    // A new location is a fast-travel command. First mount honors a valid saved position.
    const valid = isWalkable(props.position);
    current.current =
      valid &&
      (!positioned.current ||
        getLocationAt(props.position.x, props.position.z)?.id === location.id)
        ? { ...props.position }
        : { x: location.x, z: location.z, yaw: location.rotation };
    positioned.current = true;
    controls.current.path = [];
    controls.current.keys.clear();
    controls.current.orbit = current.current.yaw;
    if (callbacks.current.showcase) camera.position.set(44, 41, 50);
    else
      camera.position.set(
        current.current.x - Math.sin(current.current.yaw) * 6,
        5.8,
        current.current.z - Math.cos(current.current.yaw) * 6,
      );
    lastEmitted.current = { ...current.current };
    callbacks.current.onPosition({ ...current.current });
  }, [props.location]); // Normal save-position echoes must not reset navigation.

  useEffect(() => {
    const externalChange =
      Math.hypot(
        props.position.x - lastEmitted.current.x,
        props.position.z - lastEmitted.current.z,
      ) > 0.001 ||
      Math.abs(props.position.yaw - lastEmitted.current.yaw) > 0.001;
    if (externalChange && isWalkable(props.position)) {
      current.current = { ...props.position };
      lastEmitted.current = { ...props.position };
      controls.current.orbit = props.position.yaw;
      controls.current.path = [];
    }
  }, [props.position.x, props.position.z, props.position.yaw]);

  useEffect(() => {
    if (props.paused) {
      controls.current.keys.clear();
      controls.current.path = [];
    }
  }, [props.paused]);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.06);
    const input = controls.current;
    const config = callbacks.current;
    let next = { x: current.current.x, z: current.current.z };
    if (input.recoverRequested) {
      const area =
        getLocationAt(next.x, next.z) ??
        locations.find((place) => place.id === config.location) ??
        locations[0];
      current.current = { x: area.x, z: area.z, yaw: area.rotation };
      input.orbit = area.rotation;
      input.path = [];
      input.recoverRequested = false;
      next = { x: current.current.x, z: current.current.z };
      lastEmitted.current = { ...current.current };
      config.onPosition({ ...current.current });
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
      const magnitude = Math.hypot(horizontal, forward);
      const speed = input.keys.has("shift") ? 5.1 : 3.7;
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
      const goal = input.path[0];
      const length = Math.hypot(goal.x - next.x, goal.z - next.z);
      if (length < 0.19) input.path.shift();
      else {
        const speed = Math.min(3.7 * delta, length);
        dx = ((goal.x - next.x) / length) * speed;
        dz = ((goal.z - next.z) / length) * speed;
      }
    }
    const resolved = moveWithCollision(next, dx, dz);
    const walking =
      Math.hypot(resolved.x - next.x, resolved.z - next.z) > 0.002;
    if (walking !== movingRef.current) {
      movingRef.current = walking;
      setMoving(walking);
    }
    if (walking) {
      const yaw = Math.atan2(resolved.x - next.x, resolved.z - next.z);
      const difference = Math.atan2(
        Math.sin(yaw - current.current.yaw),
        Math.cos(yaw - current.current.yaw),
      );
      current.current.yaw += difference * Math.min(1, delta * 13);
      current.current.x = resolved.x;
      current.current.z = resolved.z;
    }
    if (player.current) {
      player.current.position.set(current.current.x, 0.05, current.current.z);
      player.current.rotation.y = current.current.yaw;
    }

    sample.current.ui += delta;
    sample.current.position += delta;
    if (sample.current.ui > 0.1) {
      sample.current.ui = 0;
      let closest: WorldObject | undefined;
      let distance = 2.7;
      const playerArea = getLocationAt(current.current.x, current.current.z);
      for (const object of worldObjects) {
        if (object.kind !== "portal" && !playerArea?.objects.includes(object))
          continue;
        if (object.kind === "portal" && playerArea?.id === object.id.slice(7))
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
      nearby.current = closest;
      onNearby(closest);
    }
    if (input.interactRequested && !config.paused && !config.showcase) {
      input.interactRequested = false;
      const object = nearby.current;
      if (object?.id.startsWith("travel:")) {
        const destination = locations.find(
          (location) => location.id === object.id.slice(7),
        );
        if (destination) {
          input.path = [];
          // New-district travel is confirmed by the shared engine through the location prop.
          // Re-entering the currently designated room needs no business-time travel action.
          if (destination.id === config.location) {
            current.current = {
              x: destination.x,
              z: destination.z,
              yaw: destination.rotation,
            };
            input.orbit = destination.rotation;
            lastEmitted.current = { ...current.current };
            config.onPosition({ ...current.current });
          }
          config.onTravel(destination.id);
        }
      } else if (object) {
        input.path = [];
        config.onInteract(object.id);
      }
    }
    if (marker.current) {
      marker.current.visible =
        Boolean(nearby.current) && !config.paused && !config.showcase;
      if (nearby.current)
        marker.current.position.set(nearby.current.x, 0.07, nearby.current.z);
    }
    targetPoint.set(current.current.x, 1.13, current.current.z);
    const distance = 7.2;
    cameraPoint.set(
      current.current.x - Math.sin(input.orbit) * distance,
      1.13 + Math.sin(input.pitch) * distance,
      current.current.z - Math.cos(input.orbit) * distance,
    );
    direction.copy(cameraPoint).sub(targetPoint);
    const desiredDistance = direction.length();
    direction.normalize();
    ray.set(targetPoint, direction);
    ray.far = desiredDistance;
    const obstruction = ray.intersectObjects(cameraWalls.current, false)[0];
    if (obstruction)
      cameraPoint
        .copy(targetPoint)
        .addScaledVector(direction, Math.max(1.2, obstruction.distance - 0.22));
    if (config.showcase) {
      targetPoint.set(0, 0.7, 0);
      cameraPoint.set(44, 41, 50);
    }
    camera.position.lerp(
      cameraPoint,
      config.reducedMotion ? 1 : 1 - Math.exp(-delta * 7),
    );
    camera.lookAt(targetPoint);
    if (sample.current.position > 0.35) {
      sample.current.position = 0;
      if (
        Math.hypot(
          current.current.x - lastEmitted.current.x,
          current.current.z - lastEmitted.current.z,
        ) > 0.03 ||
        Math.abs(current.current.yaw - lastEmitted.current.yaw) > 0.03
      ) {
        lastEmitted.current = { ...current.current };
        config.onPosition({ ...current.current });
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
    controls.current.path = findPath(current.current, { x, z });
  }, []);
  return (
    <>
      <color attach="background" args={["#c8dcd6"]} />
      <fog
        attach="fog"
        args={[
          "#c8dcd6",
          props.showcase ? 100 : 45,
          props.showcase ? 170 : 108,
        ]}
      />
      <ambientLight intensity={1.3} />
      <hemisphereLight args={["#ebf3ef", "#9ba98a", 1.2]} />
      <directionalLight
        position={[-25, 38, 18]}
        intensity={2.1}
        castShadow={props.quality === "high"}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-far={100}
        shadow-bias={-0.002}
      />
      <District onGroundClick={navigate} />
      <group ref={player}>
        <AvatarModel
          appearance={props.avatar}
          moving={moving}
          reducedMotion={props.reducedMotion}
        />
      </group>
      <group ref={marker} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.17, 1.24, 32]} />
          <meshBasicMaterial color="#f3b958" transparent opacity={0.9} />
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
    pitch: 0.58,
    dragging: false,
    dragMoved: false,
    pointerX: 0,
    pointerY: 0,
    interactRequested: false,
    recoverRequested: false,
  });
  const [nearby, setNearby] = useState<WorldObject | undefined>();
  const state = useRef(props);
  state.current = props;
  useEffect(() => {
    const input = controls.current;
    const down = (event: KeyboardEvent) => {
      if (state.current.paused || isTypingTarget(event.target)) return;
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
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    window.addEventListener("pointerup", pointerRelease);
    const visibility = () => {
      if (document.hidden) release();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
      window.removeEventListener("pointerup", pointerRelease);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
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
      // Synthetic events and browsers that have already released a pointer cannot capture it.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Movement still has pointer-up/blur release. */
      }
      if (!state.current.paused) controls.current.keys.add(key);
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
      className={`am-world ${props.paused ? "is-paused" : ""}`}
      data-testid="world"
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
          input.orbit -= dx * 0.006 * sensitivity;
          input.pitch = MathUtils.clamp(
            input.pitch + dy * 0.004 * sensitivity,
            0.2,
            0.9,
          );
        }
        input.pointerX = event.clientX;
        input.pointerY = event.clientY;
      }}
    >
      <GraphicsBoundary onError={props.onError}>
        <Canvas
          shadows={props.quality === "high"}
          dpr={
            props.quality === "low"
              ? 1
              : props.quality === "medium"
                ? [1, 1.35]
                : [1, 1.7]
          }
          gl={{
            antialias: props.quality !== "low",
            alpha: false,
            powerPreference: "default",
          }}
          camera={{ fov: 50, near: 0.1, far: 170 }}
          fallback={
            <div className="world-graphics-fallback">
              Your browser cannot open the 3D view. Use the accessible
              workbench.
            </div>
          }
          onCreated={({ gl }) => {
            gl.setClearColor("#c8dcd6");
          }}
        >
          <Scene props={props} controls={controls} onNearby={nearbyUpdate} />
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
      {nearby && !props.paused && !props.showcase && (
        <button
          className="world-interact"
          onClick={() => {
            controls.current.interactRequested = true;
          }}
          aria-label={`Interact: ${nearby.label}`}
        >
          <kbd>E</kbd>
          <span>{nearby.label}</span>
          <span aria-hidden="true">↗</span>
        </button>
      )}
      {props.paused && !props.showcase && (
        <div className="world-paused-indicator">
          World paused while you work
        </div>
      )}
    </div>
  );
}
