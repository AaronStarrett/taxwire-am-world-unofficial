import { useEffect, useMemo } from "react";
import { CanvasTexture, PlaneGeometry, SRGBColorSpace } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useContactShadow, useSurface, type SurfaceName } from "./Surfaces";

type Triple = [number, number, number];
export function Solid({
  at,
  size,
  color,
  surface = "wall",
  radius = 0.025,
  rotation = [0, 0, 0],
  obstacle = false,
}: {
  at: Triple;
  size: Triple;
  color?: string;
  surface?: SurfaceName;
  radius?: number;
  rotation?: Triple;
  obstacle?: boolean;
}) {
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        ...size,
        2,
        Math.min(radius, ...size.map((value) => value * 0.42)),
      ),
    [size[0], size[1], size[2], radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useSurface(surface, color);
  return (
    <mesh
      position={at}
      rotation={rotation}
      geometry={geometry}
      material={material}
      castShadow={surface !== "glass"}
      receiveShadow
      userData={{ cameraObstacle: obstacle }}
    />
  );
}
export function Rod({
  at,
  radius = 0.035,
  length = 1,
  rotation = [0, 0, 0],
  color,
  surface = "metal",
}: {
  at: Triple;
  radius?: number;
  length?: number;
  rotation?: Triple;
  color?: string;
  surface?: SurfaceName;
}) {
  const material = useSurface(surface, color);
  return (
    <mesh position={at} rotation={rotation} material={material} castShadow>
      <cylinderGeometry args={[radius, radius, length, 16]} />
    </mesh>
  );
}
export function ContactShadow({
  x = 0,
  z = 0,
  width = 2,
  depth = 1.5,
  opacity = 0.55,
}: {
  x?: number;
  z?: number;
  width?: number;
  depth?: number;
  opacity?: number;
}) {
  const map = useContactShadow();
  return (
    <mesh position={[x, 0.077, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        map={map}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Actual chair silhouette: molded fabric shell, lumbar back, arms, lift, five-spoke base and casters. */
export function OfficeChair({
  x = 0,
  z = 0,
  rotation = 0,
  color = "#596f69",
}: {
  x?: number;
  z?: number;
  rotation?: number;
  color?: string;
}) {
  const caster = useSurface("rubber");
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <ContactShadow width={1} depth={1} />
      <Solid
        at={[0, 0.47, 0]}
        size={[0.55, 0.1, 0.52]}
        surface="fabric"
        color={color}
        radius={0.065}
      />
      <Solid
        at={[0, 0.805, -0.226]}
        size={[0.5, 0.58, 0.085]}
        surface="fabric"
        color={color}
        radius={0.04}
        rotation={[-0.12, 0, 0]}
      />
      <Solid
        at={[0, 0.76, -0.286]}
        size={[0.45, 0.43, 0.027]}
        surface="rubber"
        color="#40504e"
        radius={0.012}
        rotation={[-0.12, 0, 0]}
      />
      <Rod at={[0, 0.265, 0]} radius={0.032} length={0.35} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Rod at={[side * 0.28, 0.56, -0.025]} radius={0.018} length={0.25} />
          <Solid
            at={[side * 0.28, 0.69, 0.016]}
            size={[0.06, 0.046, 0.33]}
            surface="rubber"
            radius={0.017}
          />
        </group>
      ))}
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2;
        return (
          <group key={index} rotation={[0, angle, 0]}>
            <Rod
              at={[0, 0.105, 0.17]}
              radius={0.025}
              length={0.35}
              rotation={[Math.PI / 2, 0, 0]}
            />
            <mesh
              position={[0, 0.067, 0.335]}
              rotation={[0, 0, Math.PI / 2]}
              material={caster}
            >
              <cylinderGeometry args={[0.04, 0.04, 0.06, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function TaskScreen({
  type = "workspace",
  width = 0.82,
}: {
  type?: string;
  width?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 320;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#f0f3f0";
    c.fillRect(0, 0, 512, 320);
    c.fillStyle = "#153e36";
    c.fillRect(0, 0, 512, 46);
    c.fillStyle = "#edf3eb";
    c.font = "600 18px Arial";
    c.fillText(
      type === "research"
        ? "RESEARCH & SOURCE REVIEW"
        : type === "studio"
          ? "HARBORWORKS · WORKFLOW"
          : type === "calendar"
            ? "CALENDAR · OWN THE NEXT STEP"
            : "ACCOUNT WORKSPACE",
      20,
      29,
    );
    c.fillStyle = "#dce6e0";
    c.fillRect(0, 46, 108, 274);
    c.font = "12px Arial";
    c.fillStyle = "#385c50";
    ["Inbox", "Calendar", "Accounts", "Evidence", "Journal"].forEach(
      (name, index) => c.fillText(name, 15, 79 + index * 40),
    );
    c.fillStyle = "#254b40";
    c.font = "600 18px Arial";
    c.fillText(
      type === "research" ? "Confirm the facts" : "Your next customer request",
      128,
      83,
    );
    c.fillStyle = "#72857a";
    c.font = "13px Arial";
    c.fillText("Understand · Coordinate · Follow through", 128, 107);
    [0, 1, 2].forEach((index) => {
      c.fillStyle = index === 0 ? "#d5e6dd" : "#fff";
      c.fillRect(126, 129 + index * 49, 363, 39);
      c.fillStyle = "#4f7764";
      c.beginPath();
      c.arc(144, 148 + index * 49, 5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#647c70";
      c.fillRect(160, 139 + index * 49, 224 - index * 34, 4);
      c.fillStyle = "#adbbb2";
      c.fillRect(160, 150 + index * 49, 180, 3);
    });
    c.fillStyle = "#267458";
    c.fillRect(128, 283, 136, 23);
    c.fillStyle = "#fff";
    c.font = "11px Arial";
    c.fillText("Open the work tools", 143, 299);
    const image = new CanvasTexture(canvas);
    image.colorSpace = SRGBColorSpace;
    return image;
  }, [type]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 0, 0.032]}>
      <planeGeometry args={[width, width * 0.625]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export function Desk({
  document = false,
  type = "workspace",
}: {
  document?: boolean;
  type?: string;
}) {
  const wood = useSurface("wood");
  const metal = useSurface("metal", "#5f6c6e");
  const paper = useSurface("paper");
  const rubber = useSurface("rubber");
  if (document)
    return (
      <group>
        <ContactShadow width={1.2} depth={1.2} />
        <mesh position={[0, 0.82, 0]} material={wood} castShadow>
          <cylinderGeometry args={[0.425, 0.425, 0.055, 48]} />
        </mesh>
        <Rod at={[0, 0.414, 0]} radius={0.055} length={0.78} color="#606d69" />
        <mesh position={[0, 0.075, 0]} material={metal}>
          <cylinderGeometry args={[0.31, 0.33, 0.055, 32]} />
        </mesh>
        <Solid
          at={[-0.04, 0.867, 0.04]}
          size={[0.36, 0.028, 0.46]}
          surface="paper"
          radius={0.004}
        />
        <Solid
          at={[-0.09, 0.885, 0.04]}
          size={[0.011, 0.008, 0.44]}
          color="#a18a63"
          surface="wood"
          radius={0.002}
        />
        <Solid
          at={[0.21, 0.86, 0.11]}
          size={[0.095, 0.025, 0.18]}
          surface="rubber"
          color="#365d50"
          radius={0.01}
        />
        <mesh
          position={[-0.09, 0.89, 0.04]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={paper}
        >
          <planeGeometry args={[0.25, 0.36]} />
        </mesh>
        <Rod
          at={[0.28, 0.9, -0.05]}
          radius={0.005}
          length={0.2}
          rotation={[Math.PI / 2, 0, 0.2]}
          color="#305846"
        />
      </group>
    );
  return (
    <group>
      <ContactShadow width={2.6} depth={1.9} />
      <Solid
        at={[0, 0.78, 0]}
        size={[2.1, 0.06, 1.05]}
        surface="wood"
        radius={0.03}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Rod at={[side * 0.85, 0.391, -0.36]} radius={0.022} length={0.75} />
          <Rod at={[side * 0.85, 0.391, 0.36]} radius={0.022} length={0.75} />
          <Rod
            at={[side * 0.85, 0.074, 0]}
            radius={0.024}
            length={0.86}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      ))}
      <Solid
        at={[-0.68, 0.55, -0.05]}
        size={[0.39, 0.35, 0.66]}
        color="#cbd0c9"
        radius={0.023}
      />
      <Solid
        at={[-0.68, 0.62, 0.289]}
        size={[0.27, 0.013, 0.023]}
        surface="metal"
        radius={0.004}
      />
      <Solid
        at={[-0.68, 0.48, 0.289]}
        size={[0.27, 0.013, 0.023]}
        surface="metal"
        radius={0.004}
      />
      <group position={[0, 1.13, -0.285]} rotation={[-0.04, 0, 0]}>
        <Solid
          at={[0, 0, 0]}
          size={[0.93, 0.59, 0.036]}
          surface="rubber"
          color="#263a3b"
          radius={0.018}
        />
        <TaskScreen type={type} />
      </group>
      <Rod at={[0, 0.96, -0.29]} radius={0.025} length={0.3} />
      <Solid
        at={[0, 0.824, -0.26]}
        size={[0.28, 0.024, 0.18]}
        surface="metal"
        radius={0.018}
      />
      <Solid
        at={[0, 0.831, 0.188]}
        size={[0.66, 0.027, 0.205]}
        surface="rubber"
        color="#52615e"
        radius={0.011}
      />
      {[0, 1, 2, 3].map((row) => (
        <Solid
          key={row}
          at={[0, 0.848, 0.124 + row * 0.04]}
          size={[0.55, 0.004, 0.018]}
          surface="paper"
          color="#b9c2bc"
          radius={0.002}
        />
      ))}
      <mesh
        position={[0.5, 0.845, 0.208]}
        scale={[0.047, 0.022, 0.069]}
        material={rubber}
      >
        <sphereGeometry args={[1, 20, 14]} />
      </mesh>
      <Solid
        at={[0.705, 0.827, -0.07]}
        size={[0.25, 0.023, 0.32]}
        surface="paper"
        radius={0.008}
      />
      <Rod
        at={[0.59, 0.852, -0.1]}
        radius={0.004}
        length={0.18}
        rotation={[Math.PI / 2, 0, 0.18]}
        color="#395849"
      />
      <Cup x={-0.78} z={0.2} y={0.811} />
      <DeskLamp x={0.8} z={-0.34} />
      <OfficeChair x={0} z={0.86} rotation={Math.PI} />
    </group>
  );
}
export function Cup({
  x = 0,
  z = 0,
  y = 0.85,
}: {
  x?: number;
  z?: number;
  y?: number;
}) {
  const material = useSurface("paper", "#d9e0d7");
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.064, 0]} material={material}>
        <cylinderGeometry args={[0.049, 0.043, 0.128, 24, 1, true]} />
      </mesh>
      <mesh position={[0, 0.121, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.043, 20]} />
        <meshStandardMaterial color="#684b36" roughness={0.48} />
      </mesh>
      <mesh
        position={[0.051, 0.065, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={material}
      >
        <torusGeometry args={[0.031, 0.01, 8, 16]} />
      </mesh>
    </group>
  );
}
function DeskLamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.818, z]}>
      <Solid
        at={[0, 0.018, 0]}
        size={[0.2, 0.036, 0.15]}
        surface="metal"
        radius={0.025}
      />
      <Rod
        at={[0, 0.19, 0]}
        radius={0.012}
        length={0.36}
        rotation={[0, 0, -0.15]}
      />
      <Rod
        at={[-0.065, 0.375, 0]}
        radius={0.012}
        length={0.18}
        rotation={[0, 0, 1.04]}
      />
      <Solid
        at={[-0.14, 0.414, 0]}
        size={[0.23, 0.038, 0.13]}
        surface="metal"
        radius={0.018}
      />
      <Solid
        at={[-0.14, 0.391, 0]}
        size={[0.17, 0.007, 0.09]}
        surface="paper"
        color="#eee4c7"
        radius={0.004}
      />
    </group>
  );
}
export function MeetingTable() {
  return (
    <group>
      <ContactShadow width={3.5} depth={3.1} />
      <Solid
        at={[0, 0.765, 0]}
        size={[2.6, 0.065, 1.5]}
        surface="wood"
        radius={0.06}
      />
      {[-0.88, 0.88].map((x) => (
        <Solid
          key={x}
          at={[x, 0.383, 0]}
          size={[0.09, 0.74, 0.78]}
          surface="metal"
          color="#6d7e7c"
          radius={0.018}
        />
      ))}
      {[-0.8, 0.8].map((x) => (
        <OfficeChair
          key={x}
          x={x}
          z={1.07}
          rotation={Math.PI}
          color="#707d80"
        />
      ))}
      <OfficeChair x={0} z={-1.07} color="#707d80" />
      <Solid
        at={[-0.65, 0.817, 0]}
        size={[0.33, 0.023, 0.42]}
        surface="paper"
        radius={0.004}
      />
      <group position={[0.65, 0.801, -0.1]}>
        <Solid
          at={[0, 0.018, 0]}
          size={[0.54, 0.027, 0.36]}
          surface="metal"
          radius={0.015}
        />
        <group position={[0, 0.16, -0.17]} rotation={[-0.22, 0, 0]}>
          <Solid
            at={[0, 0, 0]}
            size={[0.54, 0.34, 0.015]}
            surface="rubber"
            radius={0.01}
          />
          <TaskScreen width={0.49} type="calendar" />
        </group>
      </group>
      <Cup x={-0.92} z={0.27} y={0.8} />
      <Cup x={0.91} z={-0.29} y={0.8} />
      <Plant x={0} z={0} y={0.8} scale={0.25} />
    </group>
  );
}

export function Plant({
  x,
  z,
  y = 0,
  scale = 1,
}: {
  x: number;
  z: number;
  y?: number;
  scale?: number;
}) {
  const leaves = useSurface("leaves"),
    pot = useSurface("stone", "#b8b8ac"),
    stem = useSurface("wood", "#677257");
  const geometry = useMemo(() => {
    const result = new PlaneGeometry(1, 1, 8, 6),
      vertices = result.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const ax = vertices.getX(i),
        ay = vertices.getY(i) + 0.5;
      vertices.setXYZ(
        i,
        ax * Math.sin(ay * Math.PI) * 0.64,
        ay,
        Math.sin(ay * Math.PI) * 0.13 + Math.abs(ax) * 0.16,
      );
    }
    result.computeVertexNormals();
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group position={[x, y, z]} scale={scale}>
      <mesh position={[0, 0.19, 0]} material={pot} castShadow>
        <cylinderGeometry args={[0.18, 0.14, 0.38, 32]} />
      </mesh>
      <mesh position={[0, 0.371, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.163, 24]} />
        <meshStandardMaterial color="#4b4539" roughness={1} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => {
        const angle = i * 2.399,
          height = 0.48 + (i % 4) * 0.14;
        return (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh
              position={[0, 0.39, 0]}
              rotation={[0.25 + (i % 3) * 0.16, 0, 0]}
              geometry={geometry}
              scale={[0.7, height, 0.9]}
              material={leaves}
              castShadow
            />
            <mesh
              position={[0, 0.39, 0]}
              rotation={[0.25 + (i % 3) * 0.16, 0, 0]}
              material={stem}
            >
              <cylinderGeometry args={[0.002, 0.003, height * 0.88, 5]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Shelf({
  x,
  z,
  retail = false,
}: {
  x: number;
  z: number;
  retail?: boolean;
}) {
  return (
    <group position={[x, 0, z]}>
      <Solid
        at={[0, 1.225, -0.13]}
        size={[2.35, 2.45, 0.085]}
        surface="wood"
        color="#a98c67"
        radius={0.012}
      />
      {[-1.13, 1.13].map((side) => (
        <Solid
          key={side}
          at={[side, 1.225, 0]}
          size={[0.08, 2.45, 0.43]}
          surface="wood"
          radius={0.01}
        />
      ))}
      {[0.08, 0.66, 1.26, 1.88, 2.45].map((level) => (
        <Solid
          key={level}
          at={[0, level, 0.03]}
          size={[2.35, 0.045, 0.45]}
          surface="wood"
          radius={0.01}
        />
      ))}
      {[0.11, 0.69, 1.29, 1.91].map((level, row) => (
        <group key={row}>
          {Array.from({ length: retail ? 5 : 8 }, (_, i) =>
            retail ? (
              <group key={i} position={[-0.89 + i * 0.43, level + 0.16, 0.06]}>
                <Solid
                  at={[0, 0, 0]}
                  size={[0.27, 0.3, 0.23]}
                  surface={row % 2 ? "fabric" : "paper"}
                  color={["#b6aa96", "#78917f", "#c3b28e"][i % 3]}
                  radius={0.025}
                />
                <Solid
                  at={[0, 0.02, 0.119]}
                  size={[0.11, 0.09, 0.005]}
                  surface="paper"
                  color="#f0ebe2"
                  radius={0.001}
                />
              </group>
            ) : (
              <Solid
                key={i}
                at={[-0.96 + i * 0.26, level + 0.19 + (i % 2) * 0.025, 0.05]}
                size={[0.12 + (i % 3) * 0.028, 0.35 + (i % 2) * 0.05, 0.24]}
                surface="fabric"
                color={
                  ["#465f54", "#7e8c91", "#b19b79", "#667286", "#b27d6a"][i % 5]
                }
                radius={0.008}
                rotation={[0, 0, i === 7 ? -0.16 : 0]}
              />
            ),
          )}
        </group>
      ))}
    </group>
  );
}

export function Sofa({
  x,
  z,
  width = 2.6,
}: {
  x: number;
  z: number;
  width?: number;
}) {
  return (
    <group position={[x, 0, z]}>
      <ContactShadow width={width + 0.6} depth={1.5} />
      <Solid
        at={[0, 0.31, 0]}
        size={[width, 0.25, 0.91]}
        surface="fabric"
        color="#7e8e86"
        radius={0.08}
      />
      <Solid
        at={[0, 0.75, -0.36]}
        size={[width, 0.65, 0.24]}
        surface="fabric"
        color="#7e8e86"
        radius={0.085}
        rotation={[-0.08, 0, 0]}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Solid
            at={[side * (width / 2 - 0.12), 0.59, 0]}
            size={[0.24, 0.39, 0.95]}
            surface="fabric"
            color="#7e8e86"
            radius={0.065}
          />
          <Solid
            at={[side * (width / 4 - 0.075), 0.483, 0.025]}
            size={[width / 2 - 0.32, 0.17, 0.73]}
            surface="fabric"
            color="#94a297"
            radius={0.07}
          />
          <Solid
            at={[side * (width / 2 - 0.35), 0.74, -0.16]}
            size={[0.35, 0.35, 0.13]}
            surface="fabric"
            color={side > 0 ? "#bcb498" : "#c8c9be"}
            radius={0.05}
            rotation={[0.14, 0, side * 0.14]}
          />
          <Rod
            at={[side * (width / 2 - 0.26), 0.097, 0]}
            radius={0.032}
            length={0.194}
            surface="wood"
            color="#8d7351"
          />
        </group>
      ))}
    </group>
  );
}
export function Bed({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <ContactShadow width={2.9} depth={1.7} />
      <Solid
        at={[0, 0.27, 0]}
        size={[2.4, 0.28, 1.2]}
        surface="wood"
        radius={0.03}
      />
      <Solid
        at={[0, 0.49, 0]}
        size={[2.34, 0.2, 1.15]}
        surface="fabric"
        color="#ece8dc"
        radius={0.075}
      />
      <Solid
        at={[-0.27, 0.61, 0]}
        size={[1.72, 0.07, 1.17]}
        surface="fabric"
        color="#8faaa3"
        radius={0.04}
      />
      <Solid
        at={[0.76, 0.638, 0]}
        size={[0.48, 0.12, 0.83]}
        surface="fabric"
        color="#eeeae0"
        radius={0.055}
      />
      <Solid
        at={[1.18, 0.58, 0]}
        size={[0.055, 0.8, 1.2]}
        surface="wood"
        radius={0.024}
      />
    </group>
  );
}
