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
import {
  getLocationAt,
  locations,
  type WorldLocation,
  type WorldObject,
} from "./locations";

type Point = { x: number; z: number };
export type WorldNavigationRef = React.RefObject<Point>;

/** One material draw per static furniture surface. Transparent glass and animated adults stay separate. */
function Batched({ children }: { children: ReactNode }) {
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
}: {
  position: WorldNavigationRef;
  rotation: number;
  appearance: AvatarAppearance;
  variant: number;
}) {
  const person = useRef<Group>(null),
    worldPoint = useMemo(() => new Vector3(), []),
    motion = useRef<CharacterMotion>({ speed: 0, interaction: 0 });
  const time = useRef(variant);
  useFrame((_, delta) => {
    if (!person.current) return;
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
      <AvatarModel appearance={appearance} variant={variant} motion={motion} />
    </group>
  );
}

function WorldFurniture({
  object,
  color,
  index,
  position,
  rotation,
}: {
  object: WorldObject;
  color: string;
  index: number;
  position: WorldNavigationRef;
  rotation: number;
}) {
  const contactId = object.contactId;
  const characterVariant =
    contactId === "npc-mentor"
      ? 2
      : contactId?.includes("cedarline")
        ? 1
        : contactId?.includes("harborworks")
          ? 1
          : index;
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
          appearance={{
            shirt: contactId === "npc-mentor" ? "#546b76" : color,
            skin: ["#b7815e", "#d2a783", "#8f6349"][index % 3],
            hair:
              contactId === "npc-mentor"
                ? "#6e726b"
                : ["#49362b", "#352e2a", "#805d3b"][index % 3],
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
}: {
  location: WorldLocation;
  position: WorldNavigationRef;
}) {
  const localObjects = location.objects.map((object) => {
    const dx = object.x - location.centerX,
      dz = object.z - location.centerZ;
    return {
      ...object,
      x: dx * Math.cos(location.rotation) - dz * Math.sin(location.rotation),
      z: dx * Math.sin(location.rotation) + dz * Math.cos(location.rotation),
    };
  });
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

function Building({
  location,
  position,
  showcase,
}: {
  location: WorldLocation;
  position: WorldNavigationRef;
  showcase: boolean;
}) {
  const roof = useRef<Group>(null),
    front = useRef<Group>(null),
    rear = useRef<Group>(null),
    left = useRef<Group>(null),
    right = useRef<Group>(null);
  const [detail, setDetail] = useState(false);
  const detailRef = useRef(false);
  const time = useRef(0);
  const height = location.id === "hq" ? 4.25 : 3.55;
  useFrame(({ camera }, delta) => {
    const point = position.current;
    const inside = getLocationAt(point.x, point.z)?.id === location.id;
    const dx = camera.position.x - location.centerX,
      dz = camera.position.z - location.centerZ;
    const cx =
        dx * Math.cos(location.rotation) - dz * Math.sin(location.rotation),
      cz = dx * Math.sin(location.rotation) + dz * Math.cos(location.rotation);
    const cameraInside =
      Math.abs(cx) < 6.2 &&
      Math.abs(cz) < 5.2 &&
      camera.position.y < height + 0.3;
    if (roof.current) roof.current.visible = !(inside || cameraInside);
    if (front.current) front.current.visible = !(inside && cz > 4.9);
    if (rear.current) rear.current.visible = !(inside && cz < -4.9);
    if (left.current) left.current.visible = !(inside && cx < -5.9);
    if (right.current) right.current.visible = !(inside && cx > 5.9);
    time.current += delta;
    if (time.current > 0.25) {
      time.current = 0;
      const near =
        !showcase &&
        Math.hypot(point.x - location.centerX, point.z - location.centerZ) <
          13.2;
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
      <Batched>
        <Solid
          at={[0, -0.06, 0]}
          size={[12.35, 0.18, 10.35]}
          surface="stone"
          color="#bbc4bf"
          radius={0.025}
        />
        <Solid
          at={[0, 0.025, 0]}
          size={[11.85, 0.045, 9.85]}
          surface="stone"
          color="#c5ceca"
          radius={0.01}
        />
      </Batched>
      <group ref={rear}>
        <Batched>
          <WindowWall side="rear" height={height} />
        </Batched>
      </group>
      <group ref={left}>
        <Batched>
          <WindowWall side="left" height={height} />
        </Batched>
      </group>
      <group ref={right}>
        <Batched>
          <WindowWall side="right" height={height} />
        </Batched>
      </group>
      <group ref={front}>
        <Batched>
          {[-4.2, 4.2].map((x) => (
            <group key={x}>
              <Solid
                at={[x, 0.35, 5]}
                size={[3.6, 0.7, 0.3]}
                surface="stone"
                color="#bfc9c4"
                obstacle
                radius={0.015}
              />
              <Solid
                at={[x, 2, 5]}
                size={[3.5, 2.6, 0.035]}
                surface="glass"
                color="#a7c1c6"
                radius={0.002}
              />
              {[-1.76, 1.76].map((offset) => (
                <Solid
                  key={offset}
                  at={[x + offset, height / 2, 5]}
                  size={[0.07, height, 0.19]}
                  surface="metal"
                  color="#6a7f83"
                  radius={0.006}
                />
              ))}
            </group>
          ))}
          <Solid
            at={[0, height - 0.1, 5]}
            size={[12.4, 0.36, 0.5]}
            surface="metal"
            color="#4c6763"
            radius={0.012}
          />
          {[-2.4, 2.4].map((x) => (
            <Solid
              key={x}
              at={[x, 1.58, 5]}
              size={[0.13, 3.16, 0.3]}
              surface="metal"
              color="#456a60"
              radius={0.012}
            />
          ))}
          <Solid
            at={[0, 3.18, 5]}
            size={[4.85, 0.19, 0.3]}
            surface="metal"
            color="#456a60"
            radius={0.012}
          />
          <Sign
            title={location.name}
            subtitle={
              location.id === "hq"
                ? "FICTIONAL TRAINING WORKPLACE"
                : "ACCOUNT MANAGER WORLD"
            }
            color="#174237"
            width={6.8}
            at={[0, height + 0.2, 5.27]}
          />
        </Batched>
      </group>
      <group ref={roof}>
        <Batched>
          {[-4.9, 4.9].map((x) => (
            <Solid
              key={x}
              at={[x, height + 0.23, 0]}
              size={[2.65, 0.17, 10.45]}
              surface="metal"
              color="#718b88"
              radius={0.022}
            />
          ))}
          {[-4.1, 4.1].map((z) => (
            <Solid
              key={z}
              at={[0, height + 0.23, z]}
              size={[7.3, 0.17, 2.25]}
              surface="metal"
              color="#718b88"
              radius={0.022}
            />
          ))}
          <Solid
            at={[0, height + 0.32, 0]}
            size={[7.3, 0.035, 5.9]}
            surface="glass"
            color="#9ab6bb"
            radius={0.005}
          />
          {[-2, 0, 2].map((z) => (
            <Solid
              key={z}
              at={[0, height + 0.35, z]}
              size={[7.4, 0.045, 0.055]}
              surface="metal"
              color="#859b98"
              radius={0.003}
            />
          ))}
        </Batched>
      </group>
      <Batched>
        <Solid
          at={[0, 0.066, 4.13]}
          size={[3.4, 0.014, 1.4]}
          surface="fabric"
          color="#627c6d"
          radius={0.01}
        />
        <Plant x={-5.2} z={5.7} scale={1.1} />
        <Plant x={5.2} z={5.7} scale={1.1} />
      </Batched>
      {detail && <RoomDetails location={location} position={position} />}
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
        <planeGeometry args={[76, 76]} />
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

export function District({
  onGroundClick,
  position,
  showcase = false,
}: {
  onGroundClick: (x: number, z: number) => void;
  position: WorldNavigationRef;
  showcase?: boolean;
}) {
  return (
    <SurfaceProvider>
      <Street onGroundClick={onGroundClick} />
      {locations.map((location) => (
        <Building
          key={location.id}
          location={location}
          position={position}
          showcase={showcase}
        />
      ))}
    </SurfaceProvider>
  );
}
