import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
  BoxGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  AvatarModel,
  type AvatarAppearance,
  type CharacterMotion,
} from "./Avatar";
import {
  Bed,
  ContactShadow,
  Cup,
  Desk,
  MeetingTable,
  OfficeChair,
  Plant,
  Rod,
  Shelf,
  Sofa,
  Solid,
} from "./Furnishings";
import { SurfaceProvider, useSurface } from "./Surfaces";
import { contacts } from "../content/accounts";
import {
  getLocationAt,
  locations,
  type WorldLocation,
  type WorldObject,
  getBuildingFloors,
  getFloorObjects,
  getFloorElevation,
  WORLD_FLOOR_HEIGHT,
  type BuildingFloor,
} from "./locations";

type Point = { x: number; z: number };
export type WorldNavigationRef = React.RefObject<Point>;

/** One material draw per static furniture surface. Transparent glass and animated adults stay separate. */
export function Batched({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null);
  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const materials = new Map<
      MeshStandardMaterial,
      { meshes: Mesh[]; geometry: BufferGeometry[] }
    >();
    group.traverse((object) => {
      if (
        !(object instanceof Mesh) ||
        !(object.material instanceof MeshStandardMaterial) ||
        object.material.transparent
      )
        return;
      let parent = object.parent;
      while (parent && parent !== group) {
        if (parent.userData.dynamicCharacter) return;
        parent = parent.parent;
      }
      const entry = materials.get(object.material) ?? {
        meshes: [],
        geometry: [],
      };
      const geometry = object.geometry.clone();
      geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      entry.meshes.push(object);
      entry.geometry.push(geometry);
      materials.set(object.material, entry);
    });
    const merged: Mesh[] = [];
    for (const [material, entry] of materials) {
      // All procedural geometries expose positions/normals/UVs; merge nonindexed forms consistently.
      const normalized = entry.geometry.map((geometry) =>
        geometry.index ? geometry.toNonIndexed() : geometry,
      );
      const geometry = mergeGeometries(normalized, false);
      if (geometry) {
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        merged.push(mesh);
        entry.meshes.forEach((source) => (source.visible = false));
      }
      entry.geometry.forEach((geometry) => geometry.dispose());
      normalized.forEach((geometry) => geometry.dispose());
    }
    return () => {
      materials.forEach((entry) =>
        entry.meshes.forEach((source) => (source.visible = true)),
      );
      merged.forEach((mesh) => {
        group.remove(mesh);
        mesh.geometry.dispose();
      });
    };
  }, []);
  return <group ref={root}>{children}</group>;
}

export function Sign({
  title,
  subtitle = "",
  color = "#163f34",
  width = 4,
  at = [0, 2.75, 0],
}: {
  title: string;
  subtitle?: string;
  color?: string;
  width?: number;
  at?: [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 240;
    const c = canvas.getContext("2d")!;
    c.fillStyle = color;
    c.fillRect(0, 0, 1024, 240);
    c.fillStyle = "#eaece4";
    c.textAlign = "center";
    c.textBaseline = "middle";
    let font = 64;
    c.font = `500 ${font}px Arial`;
    while (c.measureText(title).width > 944 && font > 28) {
      font -= 2;
      c.font = `500 ${font}px Arial`;
    }
    c.fillText(title, 512, subtitle ? 94 : 120);
    if (subtitle) {
      c.fillStyle = "#bdccc5";
      c.font = "25px Arial";
      c.fillText(subtitle, 512, 174);
    }
    c.fillStyle = "#87a69a";
    c.fillRect(24, 222, 976, 2);
    const image = new CanvasTexture(canvas);
    image.colorSpace = SRGBColorSpace;
    return image;
  }, [title, subtitle, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={at}>
      {[0, 1].map((side) => (
        <mesh
          key={side}
          position={[0, 0, side === 0 ? 0.01 : -0.01]}
          rotation={[0, side * Math.PI, 0]}
        >
          <planeGeometry args={[width, (width * 240) / 1024]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function WindowWall({
  side,
  height,
}: {
  side: "left" | "right" | "rear";
  height: number;
}) {
  const lateral = side !== "rear";
  const sign = side === "left" ? -1 : 1;
  return (
    <group
      rotation={[0, lateral ? Math.PI / 2 : 0, 0]}
      position={lateral ? [sign * 6, 0, 0] : [0, 0, -5]}
    >
      <Solid
        at={[0, 0.38, 0]}
        size={[lateral ? 10 : 12, 0.76, 0.22]}
        surface="stone"
        color="#c9d0ce"
        obstacle
        radius={0.012}
      />
      <Solid
        at={[0, height - 0.16, 0]}
        size={[lateral ? 10 : 12, 0.32, 0.25]}
        color="#ccd2cf"
        obstacle
        radius={0.012}
      />
      <Solid
        at={[0, (height + 0.76) / 2, 0]}
        size={[lateral ? 9.8 : 11.8, height - 1.08, 0.027]}
        surface="glass"
        color="#99b5bd"
        radius={0.002}
      />
      {(lateral
        ? [-4.95, -2.5, 0, 2.5, 4.95]
        : [-5.95, -4, -2, 0, 2, 4, 5.95]
      ).map((x) => (
        <Solid
          key={x}
          at={[x, height / 2, 0]}
          size={[0.055, height, 0.12]}
          surface="metal"
          color="#62757a"
          radius={0.005}
        />
      ))}
      <Solid
        at={[0, 1.8, 0.025]}
        size={[lateral ? 10 : 12, 0.042, 0.09]}
        surface="metal"
        color="#748385"
        radius={0.004}
      />
    </group>
  );
}

function CeilingLight({ x, z, y = 3.1 }: { x: number; z: number; y?: number }) {
  const material = useSurface("brass");
  return (
    <group position={[x, y, z]}>
      <Rod at={[0, 0.23, 0]} radius={0.007} length={0.46} color="#828e8c" />
      <mesh rotation={[Math.PI / 2, 0, 0]} material={material}>
        <torusGeometry args={[0.53, 0.017, 8, 48]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.524, 0.008, 8, 48]} />
        <meshStandardMaterial
          color="#ede6d1"
          emissive="#ece2bd"
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}

function Colleague({
  position,
  rotation,
  appearance,
  variant,
  reducedMotion = false,
}: {
  position: WorldNavigationRef;
  rotation: number;
  appearance: AvatarAppearance;
  variant: number;
  reducedMotion?: boolean;
}) {
  const person = useRef<Group>(null),
    worldPoint = useMemo(() => new Vector3(), []),
    motion = useRef<CharacterMotion>({ speed: 0, interaction: 0 });
  const time = useRef(variant);
  useFrame((_, delta) => {
    if (!person.current || reducedMotion) return;
    person.current.getWorldPosition(worldPoint);
    const dx = position.current.x - worldPoint.x,
      dz = position.current.z - worldPoint.z,
      distance = Math.hypot(dx, dz);
    const desired = distance < 4.5 ? Math.atan2(dx, dz) - rotation : Math.PI;
    const difference = Math.atan2(
      Math.sin(desired - person.current.rotation.y),
      Math.cos(desired - person.current.rotation.y),
    );
    person.current.rotation.y += difference * Math.min(delta * 3.4, 1);
    time.current += Math.min(delta, 0.05);
    motion.current.interaction =
      distance < 2.5 ? Math.max(0, Math.sin(time.current * 0.72)) * 0.17 : 0;
  });
  return (
    <group
      ref={person}
      position={[0, 0.055, 0]}
      rotation={[0, Math.PI, 0]}
      userData={{ dynamicCharacter: true }}
    >
      <AvatarModel
        appearance={appearance}
        variant={variant}
        motion={motion}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

function WorldFurniture({
  object,
  color,
  index,
  position,
  rotation,
  reducedMotion = false,
}: {
  object: WorldObject;
  color: string;
  index: number;
  position: WorldNavigationRef;
  rotation: number;
  reducedMotion?: boolean;
}) {
  const contactId = object.contactId;
  const identity = contactId
    ? [...contactId].reduce(
        (seed, letter) => (seed * 31 + letter.charCodeAt(0)) >>> 0,
        7,
      )
    : index;
  const contact = contacts.find((person) => person.id === contactId);
  const characterVariant = contactId === "npc-mentor" ? 2 : identity % 8;
  return (
    <group position={[object.x, 0, object.z]}>
      {object.kind === "desk" && (
        <Desk
          type={
            object.id === "knowledge"
              ? "research"
              : object.id === "inbox"
                ? "calendar"
                : "workspace"
          }
        />
      )}
      {object.kind === "document" && <Desk document />}
      {object.kind === "meeting" && <MeetingTable />}
      {object.kind === "npc" && (
        <Colleague
          position={position}
          rotation={rotation}
          variant={characterVariant}
          reducedMotion={reducedMotion}
          appearance={{
            shirt:
              contactId === "npc-mentor"
                ? "#546b76"
                : (contact?.color ?? color),
            skin: ["#b7815e", "#d2a783", "#8f6349", "#694736", "#dabb9c"][
              identity % 5
            ],
            hair:
              contactId === "npc-mentor"
                ? "#6e726b"
                : ["#49362b", "#352e2a", "#805d3b"][identity % 3],
          }}
        />
      )}
    </group>
  );
}

function GlassPartition() {
  return (
    <group>
      <Solid
        at={[1.8, 1.52, -0.2]}
        size={[0.035, 3.04, 4.2]}
        surface="glass"
        radius={0.002}
      />
      {[-2.3, 1.9].map((z) => (
        <Rod
          key={z}
          at={[1.8, 1.51, z]}
          radius={0.024}
          length={3.02}
          color="#778d92"
        />
      ))}
      <Rod
        at={[1.8, 3.04, -0.2]}
        radius={0.025}
        length={4.2}
        rotation={[Math.PI / 2, 0, 0]}
        color="#778d92"
      />
      <Solid
        at={[1.8, 1.02, -0.2]}
        size={[0.045, 0.09, 4.2]}
        surface="paper"
        color="#b2c8c6"
        radius={0.002}
      />
    </group>
  );
}

function RoomDetails({
  location,
  position,
  reducedMotion = false,
  meetingContactId,
}: {
  location: WorldLocation;
  position: WorldNavigationRef;
  reducedMotion?: boolean;
  meetingContactId?: string;
}) {
  const localObjects = getFloorObjects(location.id, 0, meetingContactId).map(
    (object) => {
      const dx = object.x - location.centerX,
        dz = object.z - location.centerZ;
      return {
        ...object,
        x: dx * Math.cos(location.rotation) - dz * Math.sin(location.rotation),
        z: dx * Math.sin(location.rotation) + dz * Math.cos(location.rotation),
      };
    },
  );
  const labels: Record<string, string> = {
    home: "A clear start to your day",
    hq: "Understand. Coordinate. Follow through.",
    research: "Evidence before confidence",
    operations: "A named owner. A clear next step.",
    harborworks: "Software, subscriptions & service",
    cedarline: "The details behind every order",
    cafe: "Good conversations start with listening",
    academy: "Practice with purpose",
  };
  return (
    <>
      <Batched>
        <Solid
          at={[0, 0.034, 0]}
          size={[11.72, 0.045, 9.72]}
          surface={location.id === "home" ? "wood" : "stone"}
          color={location.id === "home" ? "#b6a080" : "#cbd0cc"}
          radius={0.01}
        />
        {location.id === "home"
          ? Array.from({ length: 16 }, (_, i) => (
              <Solid
                key={i}
                at={[-5.45 + i * 0.72, 0.059, 0]}
                size={[0.005, 0.002, 9.6]}
                color="#82735e"
                surface="wood"
                radius={0.001}
              />
            ))
          : [-3, -1, 1, 3].map((z) => (
              <Solid
                key={z}
                at={[0, 0.059, z]}
                size={[11.5, 0.002, 0.007]}
                color="#b4bdb7"
                surface="stone"
                radius={0.001}
              />
            ))}
        <Solid
          at={[0, 1.83, -4.82]}
          size={[4.75, 3.66, 0.07]}
          color={
            location.id === "hq"
              ? "#1d5345"
              : location.id === "home"
                ? "#c4c0ad"
                : "#8a9b9b"
          }
          radius={0.012}
        />
        <Sign
          title={
            location.id === "hq"
              ? "Taxwire"
              : location.id === "home"
                ? "A little preparation."
                : location.name
          }
          subtitle={labels[location.id]}
          width={4.3}
          color={location.id === "home" ? "#6c7766" : "#173f37"}
          at={[0, 2.65, -4.74]}
        />
        <CeilingLight x={0} z={0.7} y={location.id === "hq" ? 3.5 : 3.14} />
        <Plant x={5.35} z={-3.87} scale={1.05} />
        <Plant x={-5.3} z={3.65} scale={0.88} />
        {localObjects.map((object, index) => (
          <WorldFurniture
            key={`${object.id}-${index}`}
            object={object}
            color={
              location.id === "harborworks"
                ? "#4a586d"
                : location.id === "cedarline"
                  ? "#77674f"
                  : location.color
            }
            index={index}
            position={position}
            rotation={location.rotation}
            reducedMotion={reducedMotion}
          />
        ))}
        {["home", "research", "academy", "cedarline"].includes(location.id) && (
          <>
            <Shelf x={-3.8} z={-4.48} retail={location.id === "cedarline"} />
            <Shelf x={3.8} z={-4.48} retail={location.id === "cedarline"} />
          </>
        )}
        {location.id === "home" && (
          <>
            <Solid
              at={[-3.7, 0.063, 2.5]}
              size={[3.5, 0.012, 2.55]}
              surface="fabric"
              color="#c4c0ac"
              radius={0.01}
            />
            <group rotation={[0, Math.PI, 0]}>
              <Sofa x={3.7} z={-2.8} />
            </group>
            <Bed x={3.6} z={2.9} />
            <Solid
              at={[-5.77, 1.71, -0.5]}
              size={[0.14, 2.56, 1.16]}
              surface="fabric"
              color="#d6d3c6"
              radius={0.02}
            />
            <Rod
              at={[-4.6, 1.05, 3.8]}
              radius={0.013}
              length={2}
              surface="metal"
              color="#888b77"
            />
            <mesh
              position={[-4.6, 2.12, 3.8]}
              material={useSurface("fabric", "#d6ccb8")}
            >
              <cylinderGeometry args={[0.22, 0.29, 0.37, 32, 1, true]} />
            </mesh>
          </>
        )}
        {location.id === "hq" && (
          <>
            <Solid
              at={[-3.6, 0.063, -1.15]}
              size={[3.4, 0.012, 3.2]}
              surface="fabric"
              color="#a8b3ab"
              radius={0.01}
            />
            <Solid
              at={[3.45, 0.063, -1.25]}
              size={[4.3, 0.013, 3.5]}
              surface="fabric"
              color="#9aa9ac"
              radius={0.01}
            />
            <GlassPartition />
            <Solid
              at={[0, 0.77, -4.13]}
              size={[3.15, 0.055, 0.66]}
              surface="stone"
              color="#dfddd0"
              radius={0.022}
            />
            <Solid
              at={[0, 0.36, -4.25]}
              size={[3.05, 0.72, 0.45]}
              surface="wood"
              color="#9f9a81"
              radius={0.025}
            />
            <Plant x={-1.1} z={-4.14} y={0.8} scale={0.27} />
          </>
        )}
        {location.id === "research" && (
          <>
            <Solid
              at={[0, 0.063, 0.5]}
              size={[3.6, 0.012, 3.4]}
              surface="fabric"
              color="#aeb8b6"
              radius={0.01}
            />
            <Solid
              at={[-5.7, 1.85, -0.3]}
              size={[0.06, 1.5, 2.3]}
              surface="paper"
              color="#e9e8dd"
              radius={0.012}
            />
            {[-0.7, 0, 0.7].map((z) => (
              <Solid
                key={z}
                at={[-5.65, 1.85, z - 0.3]}
                size={[0.016, 0.73, 0.47]}
                surface="paper"
                color={z === 0 ? "#c2d0c2" : "#d9cdb5"}
                radius={0.003}
              />
            ))}
          </>
        )}
        {location.id === "operations" && (
          <>
            <Solid
              at={[0.5, 0.06, 0.8]}
              size={[5.7, 0.012, 3.25]}
              surface="fabric"
              color="#a8b6b2"
              radius={0.01}
            />
            <Shelf x={-3.8} z={-4.48} />
            <Shelf x={3.8} z={-4.48} />
            <Solid
              at={[4.9, 0.5, 3.5]}
              size={[1.1, 0.94, 0.65]}
              surface="metal"
              color="#c3ccc6"
              radius={0.035}
            />
            <Solid
              at={[4.9, 1.08, 3.5]}
              size={[0.75, 0.24, 0.62]}
              surface="rubber"
              color="#708280"
              radius={0.025}
            />
          </>
        )}
        {location.id === "harborworks" && (
          <>
            <Solid
              at={[-5.2, 1.1, -2.5]}
              size={[0.75, 2.2, 0.85]}
              surface="metal"
              color="#344b4d"
              radius={0.025}
            />
            {[0, 1, 2, 3].map((index) => (
              <Solid
                key={index}
                at={[-5.2, 0.52 + index * 0.42, -2.06]}
                size={[0.58, 0.15, 0.016]}
                surface="rubber"
                color="#789792"
                radius={0.005}
              />
            ))}
            <Solid
              at={[0.4, 0.063, -1.5]}
              size={[5.8, 0.012, 3.4]}
              surface="fabric"
              color="#a2aeb4"
              radius={0.01}
            />
            <Solid
              at={[0, 1.32, -4.72]}
              size={[3.9, 1.55, 0.07]}
              surface="paper"
              color="#edf0e8"
              radius={0.025}
            />
            {[-1, 0, 1].map((x) => (
              <Solid
                key={x}
                at={[x, 1.42, -4.67]}
                size={[0.65, 0.65, 0.007]}
                surface="paper"
                color={x < 0 ? "#a6bac1" : x === 0 ? "#c2b698" : "#a2b6a8"}
                radius={0.003}
              />
            ))}
          </>
        )}
        {location.id === "cedarline" && (
          <>
            <Solid
              at={[0, 0.063, 0]}
              size={[3.6, 0.012, 7.3]}
              surface="fabric"
              color="#b9b09d"
              radius={0.01}
            />
            <group position={[-5.64, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <Shelf x={-1.7} z={0} retail />
              <Shelf x={1.5} z={0} retail />
            </group>
            <Solid
              at={[4.7, 0.43, 2.9]}
              size={[1.6, 0.78, 1.15]}
              surface="wood"
              color="#a89575"
              radius={0.025}
            />
            {[-0.45, 0.1, 0.48].map((x, index) => (
              <mesh
                key={x}
                position={[4.7 + x, 1, 2.9]}
                material={useSurface(
                  "paper",
                  ["#c7c7b7", "#93a391", "#b3a887"][index],
                )}
              >
                <cylinderGeometry args={[0.14, 0.1, 0.27, 24]} />
              </mesh>
            ))}
          </>
        )}
        {location.id === "cafe" && (
          <>
            <Solid
              at={[2.8, 0.635, -3.9]}
              size={[4.4, 1.25, 0.9]}
              surface="wood"
              color="#a18a68"
              radius={0.025}
            />
            <Solid
              at={[2.8, 1.29, -3.9]}
              size={[4.6, 0.06, 1.05]}
              surface="stone"
              color="#d0cfc1"
              radius={0.025}
            />
            <Solid
              at={[3.3, 1.55, -3.9]}
              size={[0.98, 0.48, 0.6]}
              surface="metal"
              color="#607978"
              radius={0.03}
            />
            <Solid
              at={[3.3, 1.59, -3.573]}
              size={[0.85, 0.22, 0.025]}
              surface="rubber"
              color="#2f4140"
              radius={0.01}
            />
            <Rod
              at={[3.02, 1.45, -3.46]}
              length={0.22}
              radius={0.019}
              rotation={[Math.PI / 2, 0, 0]}
            />
            <Rod
              at={[3.57, 1.45, -3.46]}
              length={0.22}
              radius={0.019}
              rotation={[Math.PI / 2, 0, 0]}
            />
            <Cup x={2.9} z={-3.37} y={1.32} />
            <Cup x={3.5} z={-3.37} y={1.32} />
            <OfficeChair x={-3.8} z={2.9} color="#977e6d" />
            <OfficeChair x={-1.5} z={2.9} color="#977e6d" />
            <mesh
              position={[-2.65, 0.735, 2.7]}
              material={useSurface("wood")}
              castShadow
            >
              <cylinderGeometry args={[0.55, 0.55, 0.045, 48]} />
            </mesh>
            <Rod at={[-2.65, 0.365, 2.7]} length={0.73} radius={0.035} />
            <Plant x={-2.65} z={2.7} y={0.76} scale={0.24} />
          </>
        )}
        {location.id === "academy" && (
          <>
            <Solid
              at={[0, 0.063, -0.9]}
              size={[6.8, 0.012, 3.6]}
              surface="fabric"
              color="#b7b9a4"
              radius={0.01}
            />
            <Solid
              at={[0, 1.34, -4.72]}
              size={[4.2, 1.55, 0.065]}
              surface="paper"
              color="#e4e9df"
              radius={0.03}
            />
            {[-1.2, 0, 1.2].map((x) => (
              <Solid
                key={x}
                at={[x, 1.42, -4.665]}
                size={[0.8, 0.45, 0.008]}
                surface="paper"
                color={x < 0 ? "#a5bfae" : x > 0 ? "#cbc2a4" : "#b2c2c4"}
                radius={0.003}
              />
            ))}
          </>
        )}
      </Batched>
    </>
  );
}

/** Simple architectural solids batch efficiently; fine furniture retains its authored rounded forms. */
function Block({
  at,
  size,
  color = "#8d9b9e",
  surface = "metal",
}: {
  at: [number, number, number];
  size: [number, number, number];
  color?: string;
  surface?: "metal" | "stone" | "wood" | "wall" | "screen";
}) {
  const material = useSurface(surface, color);
  const geometry = useMemo(
    () => new BoxGeometry(...size),
    [size[0], size[1], size[2]],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      position={at}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
    />
  );
}

function TowerShell({ location }: { location: WorldLocation }) {
  const floors = getBuildingFloors(location.id).length;
  const height = floors * WORLD_FLOOR_HEIGHT;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = Math.min(2048, 128 * floors);
    const c = canvas.getContext("2d")!;
    c.scale(1, canvas.height / (128 * floors));
    c.fillStyle = "#354c5c";
    c.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < floors; row++)
      for (let col = 0; col < 6; col++) {
        const x = col * 64,
          y = row * 128;
        const shade = (row * 11 + col * 7 + location.id.length) % 9;
        const gradient = c.createLinearGradient(x, y, x + 64, y + 117);
        gradient.addColorStop(
          0,
          ["#8496a0", "#6c8392", "#8998a2", "#637989"][shade % 4],
        );
        gradient.addColorStop(1, ["#415d70", "#4b6475", "#a39e88"][shade % 3]);
        c.fillStyle = gradient;
        c.fillRect(x + 3, y + 4, 58, 110);
        if (shade < 4) {
          c.fillStyle = "#c8c5b18c";
          c.fillRect(x + 4, y + 5, 56, 28 + shade * 13);
          c.strokeStyle = "#54626b66";
          c.lineWidth = 1;
          for (let slat = 8; slat < 28 + shade * 13; slat += 5) {
            c.beginPath();
            c.moveTo(x + 4, y + slat);
            c.lineTo(x + 60, y + slat);
            c.stroke();
          }
        }
        c.fillStyle = "#203643";
        c.fillRect(x, y + 114, 64, 14);
        c.fillStyle = "#bec4c188";
        c.fillRect(x + 2, y + 3, 1, 112);
      }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }, [floors, location.id]);
  useEffect(() => () => texture.dispose(), [texture]);
  const tint =
    location.id === "hq"
      ? "#b4cec9"
      : location.id === "cedarline" || location.id === "home"
        ? "#d4c8b5"
        : "#bbcad3";
  return (
    <>
      {[0, 1, 2, 3].map((side) => (
        <mesh
          key={side}
          position={
            side === 0
              ? [0, (height + 3.8) / 2, 5.015]
              : side === 1
                ? [6.015, (height + 3.8) / 2, 0]
                : side === 2
                  ? [0, (height + 3.8) / 2, -5.015]
                  : [-6.015, (height + 3.8) / 2, 0]
          }
          rotation={[0, (side * Math.PI) / 2, 0]}
          castShadow
          receiveShadow
        >
          <planeGeometry args={[side % 2 ? 10 : 12, height - 3.8]} />
          <meshStandardMaterial
            map={texture}
            color={tint}
            metalness={0.48}
            roughness={0.29}
          />
        </mesh>
      ))}
      <Batched>
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <Block
              key={`${x}:${z}`}
              at={[x * 6.04, height / 2, z * 5.04]}
              size={[0.24, height, 0.24]}
              color="#b4b9b5"
              surface="stone"
            />
          )),
        )}
        {Array.from({ length: floors + 1 }, (_, level) => (
          <group key={level}>
            <Block
              at={[0, level * WORLD_FLOOR_HEIGHT, 5.075]}
              size={[12.4, 0.13, 0.22]}
              color="#859394"
            />
            <Block
              at={[0, level * WORLD_FLOOR_HEIGHT, -5.075]}
              size={[12.4, 0.13, 0.22]}
              color="#859394"
            />
            <Block
              at={[-6.075, level * WORLD_FLOOR_HEIGHT, 0]}
              size={[0.22, 0.13, 10.4]}
              color="#859394"
            />
            <Block
              at={[6.075, level * WORLD_FLOOR_HEIGHT, 0]}
              size={[0.22, 0.13, 10.4]}
              color="#859394"
            />
          </group>
        ))}
        {[-3, 3].map((x) => (
          <Block
            key={x}
            at={[x, height / 2, 5.18]}
            size={[0.12, height, 0.36]}
            color={location.id === "hq" ? "#c2b395" : "#a9b0ad"}
          />
        ))}
        <Block
          at={[0, height + 0.1, 0]}
          size={[12.5, 0.3, 10.5]}
          color="#b3bbb7"
          surface="stone"
        />
        <Block
          at={[0, height + 1.3, -0.5]}
          size={[7.8, 2.4, 5.5]}
          color="#53686b"
        />
        {[-2.8, 0, 2.8].map((x) => (
          <Block
            key={x}
            at={[x, height + 2.6, -0.5]}
            size={[1.9, 0.18, 4.8]}
            color="#9da9a6"
          />
        ))}
        <Block at={[0, 3.5, 5.95]} size={[8.8, 0.17, 2.2]} color="#566f70" />
        <Block
          at={[0, 3.41, 5.95]}
          size={[8.3, 0.04, 1.8]}
          color="#e3dbc8"
          surface="wall"
        />
      </Batched>
      <Sign
        title={location.id === "hq" ? "TAXWIRE" : location.name}
        subtitle={`${floors} EXPLORABLE FLOORS · FICTIONAL TRAINING DISTRICT`}
        width={8.2}
        at={[0, 4.48, 5.25]}
        color="#263d43"
      />
      {location.id === "hq" && (
        <Sign
          title="TAXWIRE"
          subtitle="ACCOUNT MANAGEMENT"
          width={8.5}
          at={[0, height - 2, 5.25]}
          color="#214b43"
        />
      )}
    </>
  );
}

function LiftCab({ floor }: { floor: number }) {
  return (
    <group position={[0, 0, 4.83]}>
      <Batched>
        <Block at={[0, 1.45, 0]} size={[2.1, 2.9, 0.12]} color="#607178" />
        {[-0.5, 0.5].map((x) => (
          <Block
            key={x}
            at={[x, 1.38, -0.08]}
            size={[0.95, 2.62, 0.08]}
            color="#c3c9c5"
          />
        ))}
        <Block
          at={[0, 1.38, -0.13]}
          size={[0.025, 2.64, 0.02]}
          color="#35454e"
        />
        <Block
          at={[1.27, 1.3, -0.09]}
          size={[0.16, 0.32, 0.05]}
          color="#526775"
        />
        <Block
          at={[1.27, 1.31, -0.125]}
          size={[0.05, 0.055, 0.025]}
          color="#d7c48c"
          surface="screen"
        />
      </Batched>
      <Sign
        title={
          floor
            ? `LEVEL ${String(floor + 1).padStart(2, "0")}`
            : "STREET / LIFTS"
        }
        subtitle="USE LIFT DIRECTORY"
        width={1.8}
        at={[0, 2.95, -0.13]}
        color="#263c45"
      />
    </group>
  );
}

function UpperInterior({
  location,
  floor,
  position,
  reducedMotion,
  meetingContactId,
}: {
  location: WorldLocation;
  floor: BuildingFloor;
  position: WorldNavigationRef;
  reducedMotion: boolean;
  meetingContactId?: string;
}) {
  const objects = getFloorObjects(
    location.id,
    floor.index,
    meetingContactId,
  ).map((object) => {
    const dx = object.x - location.centerX,
      dz = object.z - location.centerZ;
    return {
      ...object,
      x: dx * Math.cos(location.rotation) - dz * Math.sin(location.rotation),
      z: dx * Math.sin(location.rotation) + dz * Math.cos(location.rotation),
    };
  });
  const warm = ["lounge", "residence", "library"].includes(floor.theme);
  return (
    <>
      <Batched>
        <Block
          at={[0, -0.06, 0]}
          size={[12.3, 0.2, 10.3]}
          color="#b8beb8"
          surface="stone"
        />
        <Solid
          at={[0, 0.047, 0]}
          size={[11.8, 0.025, 9.8]}
          surface={warm ? "wood" : "fabric"}
          color={warm ? "#b3a28b" : "#8c9697"}
          radius={0.002}
        />
        <Solid
          at={[0, 0.064, 0]}
          size={[2.3, 0.012, 9.5]}
          surface="stone"
          color="#c8ccc7"
          radius={0.002}
        />
        {[-3.4, 3.4].map((x) => (
          <Solid
            key={x}
            at={[x, 0.065, -0.7]}
            size={[4.1, 0.014, 5.4]}
            surface="fabric"
            color={warm ? "#a59f90" : "#727f83"}
            radius={0.002}
          />
        ))}
        <WindowWall side="left" height={3.55} />
        <WindowWall side="right" height={3.55} />
        <WindowWall side="rear" height={3.55} />
        <Block
          at={[0, 1.7, 4.99]}
          size={[12, 3.4, 0.14]}
          color="#d0d4ce"
          surface="wall"
        />
        <Shelf
          x={-3.8}
          z={-4.4}
          retail={floor.theme === "studio" && location.id === "cedarline"}
        />
        <Shelf x={3.8} z={-4.4} />
        <Solid
          at={[0, 1.8, -4.8]}
          size={[4.7, 3.5, 0.07]}
          color={warm ? "#777b6e" : "#4b6266"}
        />
        <Sign
          title={floor.name}
          subtitle={`LEVEL ${String(floor.index + 1).padStart(2, "0")} · ${location.name}`}
          width={4.35}
          at={[0, 2.55, -4.74]}
          color={warm ? "#514f43" : "#2a4149"}
        />
        {[-3.4, 3.4].map((x) => (
          <group key={x}>
            <Block
              at={[x, 3.35, -0.5]}
              size={[2.8, 0.1, 0.18]}
              color="#445458"
            />
            <Block
              at={[x, 3.29, -0.5]}
              size={[2.6, 0.025, 0.13]}
              color="#f3e7c9"
              surface="wall"
            />
          </group>
        ))}
        <Plant x={-5.35} z={3.8} scale={0.9} />
        <Plant x={5.35} z={3.8} scale={0.9} />
        {floor.theme === "studio" && (
          <Solid
            at={[5.81, 1.8, 0]}
            size={[0.045, 1.4, 2.8]}
            color="#e3e5da"
            surface="paper"
          />
        )}
        {floor.theme === "training" && (
          <Sign
            title="PRACTICE · REVIEW · REFINE"
            subtitle="FICTIONAL CASES / PROFESSIONAL JUDGMENT"
            width={3.4}
            at={[0, 1.42, -4.7]}
          />
        )}
        {floor.theme === "conference" && (
          <Sign
            title="UNDERSTAND THE DECISION"
            subtitle="Facts · Options · Owner · Next step"
            width={3.4}
            at={[0, 1.42, -4.7]}
          />
        )}
        {objects
          .filter((object) => object.kind !== "elevator")
          .map((object, index) => (
            <WorldFurniture
              key={`${object.id}:${index}`}
              object={object}
              index={index + floor.index}
              color={location.color}
              position={position}
              rotation={location.rotation}
              reducedMotion={reducedMotion}
            />
          ))}
      </Batched>
      <LiftCab floor={floor.index} />
    </>
  );
}

function Building({
  location,
  position,
  showcase,
  activeFloor,
  activeLocation,
  quality,
  reducedMotion,
  onGroundClick,
  meetingContactId,
}: {
  location: WorldLocation;
  position: WorldNavigationRef;
  showcase: boolean;
  activeFloor: number;
  activeLocation: string;
  quality: "low" | "medium" | "high";
  reducedMotion: boolean;
  onGroundClick: (x: number, z: number) => void;
  meetingContactId?: string;
}) {
  const shell = useRef<Group>(null),
    ground = useRef<Group>(null);
  const [detail, setDetail] = useState(false),
    detailRef = useRef(false),
    time = useRef(0);
  const upper = activeLocation === location.id && activeFloor > 0;
  useFrame((_, delta) => {
    const point = position.current;
    const inside =
      !showcase &&
      (upper ||
        (!activeFloor && getLocationAt(point.x, point.z)?.id === location.id));
    if (shell.current) shell.current.visible = !inside;
    if (ground.current) ground.current.visible = !upper;
    time.current += delta;
    if (time.current > 0.2) {
      time.current = 0;
      const near =
        !showcase &&
        !activeFloor &&
        Math.hypot(point.x - location.centerX, point.z - location.centerZ) <
          (quality === "low" ? 10 : 14);
      if (near !== detailRef.current) {
        detailRef.current = near;
        setDetail(near);
      }
    }
  });
  return (
    <group
      position={[location.centerX, 0, location.centerZ]}
      rotation={[0, location.rotation, 0]}
    >
      <group ref={shell}>
        <TowerShell location={location} />
      </group>
      <group ref={ground}>
        <Batched>
          <WindowWall side="rear" height={3.55} />
          <WindowWall side="left" height={3.55} />
          <WindowWall side="right" height={3.55} />
          {[-4.2, 4.2].map((x) => (
            <group key={x}>
              <Solid
                at={[x, 0.4, 5]}
                size={[3.6, 0.8, 0.25]}
                surface="stone"
                color="#b3b9b4"
                obstacle
              />
              <Solid at={[x, 2, 5]} size={[3.55, 2.4, 0.025]} surface="glass" />
              <Block
                at={[x, 3.55, 5]}
                size={[3.6, 0.24, 0.3]}
                color="#55696d"
              />
            </group>
          ))}
          <Block at={[0, 3.55, 5]} size={[5.2, 0.24, 0.32]} color="#55696d" />
          <Solid
            at={[0, 0.052, 4.2]}
            size={[3.6, 0.018, 1.5]}
            surface="fabric"
            color="#667772"
          />
        </Batched>
        {detail && (
          <group position={[3.7, 0, 0]}>
            <LiftCab floor={0} />
          </group>
        )}
        {detail && (
          <group position={[1.6, 0, 4.3]}>
            <Block
              at={[0, 0.62, 0]}
              size={[0.08, 1.24, 0.12]}
              color="#526569"
            />
            <Sign
              title="LIFT DIRECTORY"
              subtitle="CHOOSE A FLOOR"
              width={0.82}
              at={[0, 1.32, 0]}
              color="#324d51"
            />
          </group>
        )}
        {detail && (
          <RoomDetails
            key={meetingContactId ?? "normal"}
            location={location}
            position={position}
            reducedMotion={reducedMotion}
            meetingContactId={meetingContactId}
          />
        )}
        <Sign
          title={location.name}
          subtitle="OPEN ENTRANCE · LIFT DIRECTORY INSIDE"
          width={6.8}
          at={[0, 3.98, 5.21]}
          color="#263f42"
        />
        <group position={[2.1, 0, 4.6]}>
          <Sign
            title="LIFTS ↑"
            subtitle="ALL FLOORS"
            width={0.75}
            at={[0, 1.8, 0]}
          />
        </group>
      </group>
      {upper && (
        <group
          key={`${location.id}:${activeFloor}:${meetingContactId ?? "normal"}`}
          position={[0, getFloorElevation(location.id, activeFloor), 0]}
        >
          <UpperInterior
            location={location}
            floor={getBuildingFloors(location.id)[activeFloor]}
            position={position}
            reducedMotion={reducedMotion}
            meetingContactId={meetingContactId}
          />
          <mesh
            position={[0, 0.081, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(event) => {
              event.stopPropagation();
              onGroundClick(event.point.x, event.point.z);
            }}
          >
            <planeGeometry args={[11.8, 9.8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  const leaves = useSurface("leaves", "#54765b"),
    bark = useSurface("wood", "#6c6854");
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 1.12, 0]} material={bark} castShadow>
        <cylinderGeometry args={[0.11, 0.17, 2.24, 18]} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const angle = i * 2.399;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 0.64,
              2.35 + (i % 3) * 0.43,
              Math.sin(angle) * 0.64,
            ]}
            scale={[0.81, 0.62, 0.78]}
            material={leaves}
            castShadow
          >
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
        );
      })}
      <ContactShadow width={3.8} depth={3.8} opacity={0.42} />
    </group>
  );
}

function Street({
  onGroundClick,
}: {
  onGroundClick: (x: number, z: number) => void;
}) {
  const stone = useSurface("stone", "#b9c4c0"),
    water = useSurface("glass", "#708f9b");
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.18, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onGroundClick(event.point.x, event.point.z);
        }}
      >
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#798c81" roughness={1} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.087, 0]}
        material={stone}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onGroundClick(event.point.x, event.point.z);
        }}
      >
        <planeGeometry args={[128, 128]} />
      </mesh>
      <Batched>
        {[-12, 12].map((p) => (
          <group key={p}>
            <Solid
              at={[p, -0.06, 0]}
              size={[5.2, 0.028, 76]}
              surface="stone"
              color="#a9b7b1"
              radius={0.003}
            />
            <Solid
              at={[0, -0.056, p]}
              size={[76, 0.028, 5.2]}
              surface="stone"
              color="#a9b7b1"
              radius={0.003}
            />
            <Solid
              at={[p - 2.68, -0.025, 0]}
              size={[0.1, 0.06, 76]}
              surface="stone"
              color="#d7dcd0"
              radius={0.002}
            />
            <Solid
              at={[p + 2.68, -0.025, 0]}
              size={[0.1, 0.06, 76]}
              surface="stone"
              color="#d7dcd0"
              radius={0.002}
            />
          </group>
        ))}
        <Solid
          at={[0, -0.03, 0]}
          size={[18, 0.04, 18]}
          surface="stone"
          color="#c7cfc5"
          radius={0.003}
        />
        <mesh position={[0, 0.18, 0]} material={stone} castShadow>
          <cylinderGeometry args={[1.88, 1.98, 0.38, 64]} />
        </mesh>
        <mesh position={[0, 0.414, 0]} material={water}>
          <cylinderGeometry args={[1.63, 1.63, 0.06, 64]} />
        </mesh>
        <mesh
          position={[0, 0.72, 0]}
          material={useSurface("metal", "#66847e")}
          castShadow
        >
          <sphereGeometry args={[0.27, 28, 20]} />
        </mesh>
        <Rod at={[0, 0.46, 0]} length={0.37} radius={0.052} color="#85988e" />
        {[-7.5, 7.5].flatMap((x) =>
          [-7.5, 7.5].map((z) => (
            <group key={`${x}-${z}`}>
              <Solid
                at={[x, 0.27, z]}
                size={[2, 0.56, 2]}
                surface="stone"
                color="#aeb9ae"
                radius={0.045}
              />
              <Tree x={x} z={z} scale={0.82} />
            </group>
          )),
        )}
        {[-33, 33].flatMap((x) =>
          [-30, -10, 10, 30].map((z) => <Tree key={`${x}-${z}`} x={x} z={z} />),
        )}
        {[-30, -10, 10, 30].flatMap((x) =>
          [-35, 35].map((z) => <Tree key={`${x}-${z}`} x={x} z={z} />),
        )}
        {[-6, 6].map((x) => (
          <group
            key={x}
            position={[x, 0, 0]}
            rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          >
            {[-0.23, -0.08, 0.08, 0.23].map((z) => (
              <Solid
                key={z}
                at={[0, 0.45, z]}
                size={[2.7, 0.045, 0.09]}
                surface="wood"
                color="#a39170"
                radius={0.01}
              />
            ))}
            {[0.69, 0.84, 0.99].map((y) => (
              <Solid
                key={y}
                at={[0, y, -0.29]}
                size={[2.7, 0.1, 0.045]}
                surface="wood"
                color="#a39170"
                radius={0.01}
              />
            ))}
            {[-1, 1].map((p) => (
              <Rod
                key={p}
                at={[p, 0.235, 0]}
                length={0.47}
                radius={0.035}
                color="#73857d"
              />
            ))}
          </group>
        ))}
        {[-10, 10].flatMap((x) =>
          [-10, 10].map((z) => (
            <group key={`${x}-${z}`} position={[x, 0, z]}>
              <Rod
                at={[0, 1.62, 0]}
                radius={0.032}
                length={3.24}
                color="#708780"
              />
              <Solid
                at={[0, 3.25, 0]}
                size={[0.62, 0.058, 0.42]}
                surface="metal"
                color="#536f65"
                radius={0.018}
              />
              <Solid
                at={[0, 3.21, 0]}
                size={[0.48, 0.024, 0.3]}
                surface="paper"
                color="#dddac5"
                radius={0.01}
              />
            </group>
          )),
        )}
      </Batched>
    </>
  );
}

function OuterDistrict({ quality }: { quality: "low" | "medium" | "high" }) {
  return (
    <>
      <Batched>
        {[-42, 42].map((p) => (
          <group key={p}>
            <Block
              at={[p, -0.035, 0]}
              size={[8, 0.035, 126]}
              color="#4d565a"
              surface="stone"
            />
            <Block
              at={[0, -0.032, p]}
              size={[126, 0.035, 8]}
              color="#4d565a"
              surface="stone"
            />
            {[-4.2, 4.2].map((edge) => (
              <group key={edge}>
                <Block
                  at={[p + edge, 0.015, 0]}
                  size={[0.22, 0.085, 126]}
                  color="#c2c5bd"
                  surface="stone"
                />
                <Block
                  at={[0, 0.015, p + edge]}
                  size={[126, 0.085, 0.22]}
                  color="#c2c5bd"
                  surface="stone"
                />
              </group>
            ))}
            {Array.from({ length: 18 }, (_, index) => -59.5 + index * 7).map(
              (along) => (
                <group key={along}>
                  <Block
                    at={[p, -0.007, along]}
                    size={[0.095, 0.006, 2.8]}
                    color="#d3cba8"
                    surface="wall"
                  />
                  <Block
                    at={[along, -0.006, p]}
                    size={[2.8, 0.006, 0.095]}
                    color="#d3cba8"
                    surface="wall"
                  />
                </group>
              ),
            )}
            {[-23, 0, 23].map((along) => (
              <group key={along}>
                {Array.from(
                  { length: 8 },
                  (_, index) => -3.4 + index * 0.95,
                ).map((stripe) => (
                  <group key={stripe}>
                    <Block
                      at={[p + stripe, -0.004, along]}
                      size={[0.46, 0.015, 3.2]}
                      color="#d9ddd3"
                      surface="stone"
                    />
                    <Block
                      at={[along, -0.003, p + stripe]}
                      size={[3.2, 0.015, 0.46]}
                      color="#d9ddd3"
                      surface="stone"
                    />
                  </group>
                ))}
              </group>
            ))}
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group key={side}>
            <Block
              at={[side * 59, -0.015, 0]}
              size={[7, 0.035, 126]}
              color="#a6b3a8"
              surface="stone"
            />
            <Block
              at={[0, -0.014, side * 59]}
              size={[126, 0.035, 7]}
              color="#a6b3a8"
              surface="stone"
            />
            <Block
              at={[side * 63.8, 0.52, 0]}
              size={[0.35, 1.04, 128]}
              color="#818f85"
              surface="stone"
            />
            <Block
              at={[0, 0.52, side * 63.8]}
              size={[128, 1.04, 0.35]}
              color="#818f85"
              surface="stone"
            />
            {[-52, -36, -18, 0, 18, 36, 52].map((along) => (
              <group key={along}>
                <Block
                  at={[side * 53, 0.29, along]}
                  size={[1.8, 0.58, 1.8]}
                  color="#949e95"
                  surface="stone"
                />
                <Block
                  at={[along, 0.29, side * 53]}
                  size={[1.8, 0.58, 1.8]}
                  color="#949e95"
                  surface="stone"
                />
                {quality !== "low" && (
                  <>
                    <Tree x={side * 53} z={along} scale={1.3} />
                    <Tree x={along} z={side * 53} scale={1.3} />
                  </>
                )}
                <Rod
                  at={[side * 48, 2.5, along]}
                  radius={0.055}
                  length={5}
                  color="#46565b"
                />
                <Block
                  at={[side * 48, 5, along]}
                  size={[0.75, 0.09, 0.75]}
                  color="#586b6c"
                />
              </group>
            ))}
            {[-44, -22, 22, 44].map((along) => (
              <group key={along}>
                <Block
                  at={[along, 0.43, side * 59]}
                  size={[3.2, 0.12, 0.85]}
                  color="#8e7960"
                  surface="wood"
                />
                <Block
                  at={[along, 0.9, side * 59.35]}
                  size={[3.2, 0.58, 0.095]}
                  color="#8e7960"
                  surface="wood"
                />
                {[-1.2, 1.2].map((leg) => (
                  <Block
                    key={leg}
                    at={[along + leg, 0.22, side * 59]}
                    size={[0.12, 0.44, 0.6]}
                    color="#536769"
                  />
                ))}
              </group>
            ))}
          </group>
        ))}
        {/* Paving joints establish physical scale rather than an undifferentiated green ground. */}
        {Array.from({ length: 23 }, (_, index) => -33 + index * 3).map((p) => (
          <group key={p}>
            <Block
              at={[p, -0.046, 0]}
              size={[0.018, 0.006, 72]}
              color="#8f9d96"
              surface="stone"
            />
            <Block
              at={[0, -0.045, p]}
              size={[72, 0.006, 0.018]}
              color="#8f9d96"
              surface="stone"
            />
          </group>
        ))}
      </Batched>
      <Sign
        title="CIVIC QUARTER"
        subtitle="EVIDENCE SQUARE · RIVERSIDE PROMENADE"
        width={8}
        at={[0, 2.8, 61.5]}
        color="#324d4d"
      />
      <Sign
        title="EVIDENCE SQUARE"
        subtitle="EIGHT BUILDINGS · WALK IN · EXPLORE EVERY FLOOR"
        width={6.5}
        at={[0, 2.7, -10.5]}
        color="#294641"
      />
      <group position={[-60, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Sign
          title="RIVERSIDE WALK"
          subtitle="A MOMENT TO REFLECT"
          width={7}
          at={[0, 2.7, 0]}
          color="#3b5155"
        />
      </group>
      <mesh position={[-72, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 170]} />
        <meshStandardMaterial
          color="#657f88"
          roughness={0.22}
          metalness={0.55}
        />
      </mesh>
    </>
  );
}

export function District({
  onGroundClick,
  position,
  showcase = false,
  floor = 0,
  locationId = "home",
  quality = "medium",
  reducedMotion = false,
  meetingContactId,
}: {
  onGroundClick: (x: number, z: number) => void;
  position: WorldNavigationRef;
  showcase?: boolean;
  floor?: number;
  locationId?: string;
  quality?: "low" | "medium" | "high";
  reducedMotion?: boolean;
  meetingContactId?: string;
}) {
  return (
    <SurfaceProvider>
      <Street onGroundClick={onGroundClick} />
      <OuterDistrict key={quality} quality={quality} />
      {locations.map((location) => (
        <Building
          key={location.id}
          location={location}
          position={position}
          showcase={showcase}
          activeFloor={floor}
          activeLocation={locationId}
          quality={quality}
          reducedMotion={reducedMotion}
          meetingContactId={meetingContactId}
          onGroundClick={onGroundClick}
        />
      ))}
    </SurfaceProvider>
  );
}
