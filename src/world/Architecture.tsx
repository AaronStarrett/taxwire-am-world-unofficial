import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  SRGBColorSpace,
  Group,
  Mesh,
  MeshStandardMaterial,
  BoxGeometry,
  InstancedMesh,
  Matrix4,
} from "three";
import { AvatarModel } from "./Avatar";
import { locations, type WorldLocation, type WorldObject } from "./locations";

function Box({
  at,
  size,
  color,
  obstacle = false,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
  obstacle?: boolean;
}) {
  return (
    <mesh
      position={at}
      castShadow
      receiveShadow
      userData={{ cameraObstacle: obstacle }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.87} />
    </mesh>
  );
}

export function Sign({
  title,
  subtitle = "",
  color = "#063322",
  width = 6,
  at = [0, 3.9, 5.19],
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
    canvas.height = 192;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1024, 192);
      ctx.fillStyle = "#faf6eb";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let fontSize = 62;
      ctx.font = `600 ${fontSize}px Arial, sans-serif`;
      while (ctx.measureText(title).width > 942 && fontSize > 24) {
        fontSize -= 2;
        ctx.font = `600 ${fontSize}px Arial, sans-serif`;
      }
      ctx.fillText(title, 512, subtitle ? 77 : 96);
      if (subtitle) {
        ctx.fillStyle = "#d6e5d9";
        ctx.font = "27px Arial, sans-serif";
        ctx.fillText(subtitle, 512, 140);
      }
      ctx.fillStyle = "#87bd99";
      ctx.fillRect(0, 182, 1024, 10);
    }
    const generated = new CanvasTexture(canvas);
    generated.colorSpace = SRGBColorSpace;
    return generated;
  }, [title, subtitle, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={at}>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, (width * 192) / 1024]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, (width * 192) / 1024]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Chair({
  x,
  z,
  rotation = 0,
  color = "#51746b",
}: {
  x: number;
  z: number;
  rotation?: number;
  color?: string;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <Box at={[0, 0.54, 0]} size={[0.6, 0.15, 0.58]} color={color} />
      <Box at={[0, 0.95, -0.25]} size={[0.6, 0.67, 0.12]} color={color} />
      {[-0.2, 0.2].flatMap((x) =>
        [-0.2, 0.2].map((z) => (
          <Box
            key={`${x}-${z}`}
            at={[x, 0.24, z]}
            size={[0.055, 0.48, 0.055]}
            color="#4a5350"
          />
        )),
      )}
    </group>
  );
}

function Desk({ document = false }: { document?: boolean }) {
  return (
    <group>
      <Box
        at={[0, 0.91, 0]}
        size={document ? [0.85, 0.13, 0.85] : [2.1, 0.13, 1.05]}
        color="#bc9670"
      />
      <Box
        at={[document ? 0 : -0.77, 0.44, 0]}
        size={document ? [0.3, 0.88, 0.3] : [0.35, 0.85, 0.8]}
        color="#e8e0ce"
      />
      {!document && (
        <Box at={[0.77, 0.44, 0]} size={[0.12, 0.85, 0.8]} color="#e8e0ce" />
      )}
      {document ? (
        <group>
          <Box
            at={[-0.08, 1.02, 0]}
            size={[0.46, 0.085, 0.58]}
            color="#f9f5e8"
          />
          <Box
            at={[0.19, 1.07, -0.07]}
            size={[0.16, 0.02, 0.27]}
            color="#228e64"
          />
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              at={[-0.12, 1.066, -0.15 + index * 0.1]}
              size={[0.2, 0.005, 0.025]}
              color="#748c82"
            />
          ))}
        </group>
      ) : (
        <group>
          <Box
            at={[0, 1.32, -0.28]}
            size={[0.9, 0.55, 0.065]}
            color="#29463d"
          />
          <Box
            at={[0, 1.33, -0.242]}
            size={[0.78, 0.43, 0.007]}
            color="#a8dac6"
          />
          <Box
            at={[-0.2, 1.43, -0.236]}
            size={[0.29, 0.04, 0.009]}
            color="#faf7ee"
          />
          <Box
            at={[-0.16, 1.31, -0.236]}
            size={[0.38, 0.02, 0.009]}
            color="#589c87"
          />
          <Box at={[0, 1.1, -0.28]} size={[0.07, 0.3, 0.06]} color="#29463d" />
          <Box
            at={[0, 1.005, 0.21]}
            size={[0.8, 0.055, 0.26]}
            color="#d7ded8"
          />
          <mesh position={[0.73, 1.075, 0.2]}>
            <cylinderGeometry args={[0.08, 0.07, 0.17, 10]} />
            <meshStandardMaterial color="#d4e0c9" />
          </mesh>
          <Chair x={0} z={0.86} rotation={Math.PI} />
        </group>
      )}
    </group>
  );
}

function Meeting() {
  return (
    <group>
      <Box at={[0, 0.87, 0]} size={[2.6, 0.13, 1.5]} color="#c3a17a" />
      <Box at={[0, 0.42, 0]} size={[0.8, 0.83, 0.7]} color="#5d7468" />
      {[-0.8, 0.8].map((x) => (
        <Chair key={x} x={x} z={1.07} rotation={Math.PI} />
      ))}
      <Chair x={0} z={-1.07} />
      <Box at={[-0.6, 0.965, 0]} size={[0.5, 0.025, 0.58]} color="#f7f0df" />
      <Box at={[0.65, 0.973, 0]} size={[0.7, 0.04, 0.44]} color="#668b7b" />
    </group>
  );
}

function BookShelf({
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
      <Box
        at={[0, 1.23, 0]}
        size={[2.35, 2.46, 0.45]}
        color={retail ? "#76917a" : "#9f7e58"}
      />
      {[0.52, 1.16, 1.8].map((y, row) => (
        <group key={y}>
          <Box at={[0, y, 0.06]} size={[2.25, 0.12, 0.55]} color="#e4dac6" />
          {Array.from({ length: 6 }, (_, i) => (
            <Box
              key={i}
              at={[-0.88 + i * 0.35, y + 0.24, 0.12]}
              size={[retail ? 0.27 : 0.2, 0.36 + (i % 2) * 0.1, 0.3]}
              color={
                ["#527e6d", "#b77664", "#daa755", "#5d7395"][(i + row) % 4]
              }
            />
          ))}
        </group>
      ))}
    </group>
  );
}

function Building({ location }: { location: WorldLocation }) {
  const subtitles: Record<string, string> = {
    hq: "FICTIONAL TRAINING DISTRICT",
    research: "READ · COMPARE · DOCUMENT",
    operations: "INBOX · CALENDAR · SUPPORT",
    harborworks: "SOFTWARE & SERVICES",
    cedarline: "RETAIL · ORDERS · CUSTOMER CARE",
    home: "PREPARE FOR YOUR NEXT CHAPTER",
    cafe: "COFFEE · CONVERSATION · REFLECTION",
    academy: "LEARN BY DOING",
  };
  const localObjects = location.objects.map((object) => {
    const dx = object.x - location.centerX,
      dz = object.z - location.centerZ;
    return {
      ...object,
      x: dx * Math.cos(location.rotation) - dz * Math.sin(location.rotation),
      z: dx * Math.sin(location.rotation) + dz * Math.cos(location.rotation),
    };
  });
  return (
    <group
      position={[location.centerX, 0, location.centerZ]}
      rotation={[0, location.rotation, 0]}
    >
      <Box at={[0, -0.06, 0]} size={[12.4, 0.18, 10.4]} color="#f1e9d8" />
      <Box
        at={[0, 0.025, 0]}
        size={[11.65, 0.04, 9.65]}
        color={location.id === "home" ? "#c1ad91" : "#e7e2d4"}
      />
      <Box at={[0, 1.6, -5]} size={[12.3, 3.2, 0.3]} color="#e3d9c3" obstacle />
      <Box at={[-6, 1.6, 0]} size={[0.3, 3.2, 10.3]} color="#e8dfce" obstacle />
      <Box at={[6, 1.6, 0]} size={[0.3, 3.2, 10.3]} color="#e8dfce" obstacle />
      {[-4.2, 4.2].map((x) => (
        <group key={x}>
          <Box
            at={[x, 1.6, 5]}
            size={[3.6, 3.2, 0.3]}
            color="#f2eddf"
            obstacle
          />
          <Box at={[x, 1.65, 5.17]} size={[2.6, 1.4, 0.08]} color="#62988b" />
          <Box at={[x, 1.65, 5.23]} size={[0.06, 1.4, 0.06]} color="#e6eee3" />
          <Box at={[x, 0.91, 5.22]} size={[2.8, 0.12, 0.25]} color="#d7c9ac" />
        </group>
      ))}
      <Box at={[0, 3.38, 5]} size={[12.4, 0.42, 0.62]} color={location.color} />
      <Box at={[0, 3.3, -5]} size={[12.4, 0.26, 0.4]} color={location.color} />
      <Box at={[-6, 3.3, 0]} size={[0.4, 0.26, 10]} color={location.color} />
      <Box at={[6, 3.3, 0]} size={[0.4, 0.26, 10]} color={location.color} />
      <Box at={[0, 2.9, 5]} size={[4.65, 0.35, 0.3]} color={location.color} />
      <Box
        at={[-2.4, 1.48, 5]}
        size={[0.18, 2.96, 0.42]}
        color={location.color}
      />
      <Box
        at={[2.4, 1.48, 5]}
        size={[0.18, 2.96, 0.42]}
        color={location.color}
      />
      <Sign
        title={location.name}
        subtitle={subtitles[location.id]}
        color={location.id === "hq" ? "#063322" : location.color}
        width={8.5}
        at={[0, 3.77, 5.34]}
      />
      <Box
        at={[0, 0.03, 4.12]}
        size={[3.4, 0.05, 1.4]}
        color={location.color}
      />
      {[-4.9, 4.9].map((x) => (
        <mesh key={x} position={[x, 0.38, 5.65]} castShadow>
          <cylinderGeometry args={[0.35, 0.24, 0.75, 8]} />
          <meshStandardMaterial color="#c5af8e" />
        </mesh>
      ))}
      {[-4.9, 4.9].map((x) => (
        <mesh key={`plant-${x}`} position={[x, 1, 5.65]} castShadow>
          <icosahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color="#497956" />
        </mesh>
      ))}
      <Sign
        title={
          location.id === "hq"
            ? "ACCOUNT MANAGEMENT"
            : subtitles[location.id].split(" · ")[0]
        }
        color={location.color}
        width={4.5}
        at={[0, 2.25, -4.82]}
      />
      {localObjects.map((object, index) => (
        <WorldFurniture
          key={`${object.id}-${index}`}
          object={object}
          color={location.color}
          index={index}
        />
      ))}
      {["research", "academy", "cedarline", "home"].includes(location.id) && (
        <>
          <BookShelf x={-3.8} z={-4.48} retail={location.id === "cedarline"} />
          <BookShelf x={3.8} z={-4.48} retail={location.id === "cedarline"} />
        </>
      )}
      {location.id === "harborworks" && (
        <>
          <Box at={[0, 2.1, -4.8]} size={[3.4, 1.5, 0.08]} color="#edf2e6" />
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              at={[-1 + i, 2.16, -4.72]}
              size={[0.66, 0.65, 0.015]}
              color={["#779eb8", "#afa0c7", "#cda46d"][i]}
            />
          ))}
          <Box
            at={[-5.2, 1.1, -2.5]}
            size={[0.75, 2.2, 0.85]}
            color="#394c4a"
          />
          {[0, 1, 2, 3].map((i) => (
            <Box
              key={i}
              at={[-5.2, 0.55 + i * 0.4, -2.05]}
              size={[0.58, 0.04, 0.01]}
              color="#6dc5ad"
            />
          ))}
        </>
      )}
      {location.id === "cafe" && (
        <>
          <Box at={[2.8, 0.63, -3.9]} size={[4.4, 1.25, 0.9]} color="#a88061" />
          <Box at={[2.8, 1.31, -3.9]} size={[4.6, 0.1, 1.05]} color="#e3d9c7" />
          <Box at={[3.3, 1.6, -3.9]} size={[1, 0.52, 0.63]} color="#3e5e58" />
          <Chair x={-3.8} z={2.9} color="#ab8171" />
          <Chair x={-1.5} z={2.9} color="#ab8171" />
          <mesh position={[-2.65, 0.73, 2.7]}>
            <cylinderGeometry args={[0.55, 0.55, 0.08, 12]} />
            <meshStandardMaterial color="#c5a784" />
          </mesh>
          <Box
            at={[-2.65, 0.36, 2.7]}
            size={[0.14, 0.72, 0.14]}
            color="#617467"
          />
        </>
      )}
      {location.id === "home" && (
        <>
          <Box at={[-3.7, 0.46, 2.8]} size={[2.6, 0.55, 1.1]} color="#718877" />
          <Box
            at={[-3.7, 0.93, 3.18]}
            size={[2.6, 0.64, 0.28]}
            color="#718877"
          />
          <Box at={[3.6, 0.4, 2.9]} size={[2.4, 0.65, 1.2]} color="#ded4bc" />
          <Box at={[3.6, 0.75, 3.15]} size={[2.4, 0.14, 0.7]} color="#a9b7ad" />
        </>
      )}
      {location.id === "hq" && (
        <>
          <Box at={[1.8, 1.05, -0.2]} size={[0.1, 2.1, 4.2]} color="#aec8bb" />
          <Box
            at={[-4.0, 0.025, 1.6]}
            size={[3.1, 0.02, 2.4]}
            color="#c9dacc"
          />
        </>
      )}
    </group>
  );
}

function WorldFurniture({
  object,
  color,
  index,
}: {
  object: WorldObject;
  color: string;
  index: number;
}) {
  return (
    <group position={[object.x, 0, object.z]}>
      {object.kind === "desk" && <Desk />}
      {object.kind === "document" && <Desk document />}
      {object.kind === "meeting" && <Meeting />}
      {object.kind === "npc" && (
        <group rotation={[0, Math.PI, 0]}>
          <AvatarModel
            appearance={{
              shirt: color,
              skin: ["#c3926e", "#845338", "#e4bea0"][index % 3],
              hair: ["#44382d", "#714c37", "#30332d"][index % 3],
            }}
          />
        </group>
      )}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[
            object.kind === "meeting" ? 1.65 : 1.05,
            object.kind === "meeting" ? 1.71 : 1.1,
            24,
          ]}
        />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.88, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 1.76, 7]} />
        <meshStandardMaterial color="#94754e" />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <icosahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color="#5b8759" />
      </mesh>
      <mesh position={[0.48, 2.72, -0.05]} castShadow>
        <icosahedronGeometry args={[0.82, 0]} />
        <meshStandardMaterial color="#73975f" />
      </mesh>
    </group>
  );
}

export function District({
  onGroundClick,
}: {
  onGroundClick: (x: number, z: number) => void;
}) {
  const root = useRef<Group>(null);
  // Static cuboids share a unit geometry and are drawn as material-colored instances.
  // The articulated player is outside this group and remains independently animated.
  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const batches = new Map<
      string,
      { material: MeshStandardMaterial; meshes: Mesh[] }
    >();
    group.traverse((object) => {
      if (
        !(object instanceof Mesh) ||
        !(object.geometry instanceof BoxGeometry) ||
        !(object.material instanceof MeshStandardMaterial)
      )
        return;
      const key = object.material.color.getHexString();
      const batch = batches.get(key) ?? {
        material: object.material,
        meshes: [],
      };
      batch.meshes.push(object);
      batches.set(key, batch);
    });
    const instances: InstancedMesh[] = [];
    for (const batch of batches.values()) {
      const instanced = new InstancedMesh(
        new BoxGeometry(1, 1, 1),
        batch.material.clone(),
        batch.meshes.length,
      );
      instanced.castShadow = true;
      instanced.receiveShadow = true;
      batch.meshes.forEach((mesh, index) => {
        const shape = (mesh.geometry as BoxGeometry).parameters;
        const matrix = mesh.matrixWorld
          .clone()
          .multiply(
            new Matrix4().makeScale(shape.width, shape.height, shape.depth),
          );
        instanced.setMatrixAt(index, matrix);
        mesh.visible = false;
      });
      instanced.instanceMatrix.needsUpdate = true;
      instanced.computeBoundingSphere();
      group.add(instanced);
      instances.push(instanced);
    }
    return () => {
      for (const batch of batches.values())
        for (const mesh of batch.meshes) mesh.visible = true;
      for (const instanced of instances) {
        group.remove(instanced);
        instanced.geometry.dispose();
        (instanced.material as MeshStandardMaterial).dispose();
      }
    };
  }, []);
  return (
    <group ref={root}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.18, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onGroundClick(event.point.x, event.point.z);
        }}
      >
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial color="#8faaa0" roughness={1} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.085, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onGroundClick(event.point.x, event.point.z);
        }}
      >
        <planeGeometry args={[76, 76]} />
        <meshStandardMaterial color="#d8d9c9" roughness={1} />
      </mesh>
      {[-12, 12].map((p) => (
        <group key={p}>
          <Box at={[p, -0.055, 0]} size={[5.2, 0.025, 76]} color="#bec8bb" />
          <Box at={[0, -0.053, p]} size={[76, 0.025, 5.2]} color="#bec8bb" />
          <Box
            at={[p - 2.7, -0.03, 0]}
            size={[0.13, 0.06, 76]}
            color="#f2ede0"
          />
          <Box
            at={[p + 2.7, -0.03, 0]}
            size={[0.13, 0.06, 76]}
            color="#f2ede0"
          />
          <Box
            at={[0, -0.026, p - 2.7]}
            size={[76, 0.06, 0.13]}
            color="#f2ede0"
          />
          <Box
            at={[0, -0.026, p + 2.7]}
            size={[76, 0.06, 0.13]}
            color="#f2ede0"
          />
        </group>
      ))}
      <Box at={[0, -0.03, 0]} size={[18, 0.04, 18]} color="#e6dfcc" />
      <mesh position={[0, 0.21, 0]} castShadow>
        <cylinderGeometry args={[1.9, 2.05, 0.46, 12]} />
        <meshStandardMaterial color="#c0b99d" />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[1.67, 1.67, 0.07, 12]} />
        <meshStandardMaterial color="#719fa7" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.17, 0]} castShadow>
        <icosahedronGeometry args={[0.67, 0]} />
        <meshStandardMaterial color="#228e64" roughness={0.5} />
      </mesh>
      <Box at={[0, 0.78, 0]} size={[0.27, 0.62, 0.27]} color="#8b9a81" />
      {[-7.5, 7.5].flatMap((x) =>
        [-7.5, 7.5].map((z) => (
          <group key={`${x}-${z}`}>
            <Box at={[x, 0.27, z]} size={[2, 0.56, 2]} color="#c3ba9f" />
            <Tree x={x} z={z} scale={0.93} />
          </group>
        )),
      )}
      {[-33, 33].flatMap((x) =>
        [-30, -10, 10, 30].map((z) => (
          <Tree key={`${x}-${z}`} x={x} z={z} scale={1.1} />
        )),
      )}
      {[-30, -10, 10, 30].flatMap((x) =>
        [-35, 35].map((z) => (
          <Tree key={`${x}-${z}`} x={x} z={z} scale={1.13} />
        )),
      )}
      {[-6, 6].map((x) => (
        <group
          key={x}
          position={[x, 0, 0]}
          rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
        >
          <Box at={[0, 0.47, 0]} size={[2.7, 0.16, 0.62]} color="#a9906e" />
          <Box at={[0, 0.95, -0.3]} size={[2.7, 0.53, 0.13]} color="#a9906e" />
          {[-1, 1].map((p) => (
            <Box
              key={p}
              at={[p, 0.22, 0]}
              size={[0.08, 0.44, 0.5]}
              color="#4c6f61"
            />
          ))}
        </group>
      ))}
      {[-10, 10].flatMap((x) =>
        [-10, 10].map((z) => (
          <group key={`lamp-${x}-${z}`} position={[x, 0, z]}>
            <Box at={[0, 1.8, 0]} size={[0.13, 3.6, 0.13]} color="#527568" />
            <Box at={[0, 3.55, 0]} size={[0.53, 0.31, 0.53]} color="#f5ebcb" />
            <Box at={[0, 3.75, 0]} size={[0.65, 0.12, 0.65]} color="#527568" />
          </group>
        )),
      )}
      <group position={[0, 0, 7.7]}>
        <Box at={[0, 0.85, 0]} size={[0.14, 1.7, 0.14]} color="#4c7866" />
        <Sign
          title="ACCOUNT MANAGER WORLD"
          subtitle="EXPLORE · ASK · APPLY"
          width={4.2}
          at={[0, 1.95, 0]}
        />
      </group>
      {locations.map((location) => (
        <Building key={location.id} location={location} />
      ))}
    </group>
  );
}
