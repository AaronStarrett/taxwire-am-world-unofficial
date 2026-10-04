import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Bone,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  TubeGeometry,
  Uint16BufferAttribute,
  Vector2,
  Vector3,
} from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import { walkingPose } from "./gait";

export type AvatarAppearance = { shirt: string; skin: string; hair: string };
export type CharacterMotion = { speed: number; interaction: number };
export function materialColor(value: string, fallback: string) {
  const presets: Record<string, string> = {
    emerald: "#228e64",
    forest: "#063322",
    blue: "#547da7",
    coral: "#b97662",
    cream: "#efe8d8",
    light: "#efd0b1",
    medium: "#b77c55",
    dark: "#704831",
    warm: "#c98e64",
    brown: "#51372d",
    black: "#262c2b",
    blonde: "#c9a365",
    silver: "#b8b8b0",
    short: "#49342d",
    curly: "#302925",
    bob: "#714b34",
  };
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value : (presets[value] ?? fallback);
}

const torsoProfile = [
  new Vector2(0.145, 0),
  new Vector2(0.158, 0.07),
  new Vector2(0.17, 0.17),
  new Vector2(0.205, 0.31),
  new Vector2(0.224, 0.42),
  new Vector2(0.186, 0.485),
  new Vector2(0.078, 0.515),
];
const pelvisProfile = [
  new Vector2(0, -0.012),
  new Vector2(0.08, 0),
  new Vector2(0.135, 0.03),
  new Vector2(0.164, 0.065),
  new Vector2(0.176, 0.105),
  new Vector2(0.178, 0.14),
  new Vector2(0.168, 0.18),
  new Vector2(0.155, 0.2),
];
const collarProfile = [
  new Vector2(0.078, 0),
  new Vector2(0.085, 0.01),
  new Vector2(0.072, 0.036),
  new Vector2(0.064, 0.059),
];

/** Smooth original head mesh: sculpted jaw, chin, cheeks, forehead, and cranium. */
function sculptHead() {
  const geometry = new SphereGeometry(1, 40, 32);
  const vertices = geometry.attributes.position;
  for (let index = 0; index < vertices.count; index++) {
    const x = vertices.getX(index),
      y = vertices.getY(index),
      z = vertices.getZ(index);
    const jaw = y < -0.2 ? 1 - Math.max(0, -y - 0.2) * 0.32 : 1;
    const cheek = 1 + Math.exp(-(((y + 0.1) / 0.3) ** 2)) * 0.06;
    const face = z > 0 && y < 0.6 && y > -0.7 ? z * 0.85 : z;
    vertices.setXYZ(index, x * 0.109 * jaw * cheek, y * 0.151, face * 0.105);
  }
  geometry.computeVertexNormals();
  return geometry;
}
function curvedLine(points: number[][], radius: number) {
  return new TubeGeometry(
    new CatmullRomCurve3(
      points.map(
        (point) => new Vector3(...(point as [number, number, number])),
      ),
    ),
    16,
    radius,
    6,
    false,
  );
}

function Hair({
  material,
  variant,
}: {
  material: MeshStandardMaterial;
  variant: number;
}) {
  const geometry = useMemo(
    () =>
      new ParametricGeometry(
        (u, v, target) => {
          const phi = -u * Math.PI * 2,
            front = Math.cos(phi);
          const extent =
            1.83 -
            0.66 * Math.max(0, front) +
            (variant % 3 === 1 ? 0.36 : 0.16) * Math.max(0, -front);
          const theta = v * extent,
            part = 0.003 * Math.sin(phi * 3) * Math.sin(theta);
          target.set(
            Math.sin(phi) * Math.sin(theta) * (0.114 + part),
            Math.cos(theta) * 0.158 + 0.012,
            Math.cos(phi) * Math.sin(theta) * 0.112 - 0.005,
          );
        },
        44,
        28,
      ),
    [variant],
  );
  const strands = useMemo(
    () =>
      Array.from({ length: 11 }, (_, index) => {
        const phi = (index / 11) * Math.PI * 2,
          front = Math.cos(phi),
          extent =
            1.83 - 0.66 * Math.max(0, front) + 0.16 * Math.max(0, -front);
        return curvedLine(
          Array.from({ length: 9 }, (_, step) => {
            const theta = 0.2 + (step / 8) * (extent - 0.22),
              angle = phi + 0.12 * Math.sin((step / 8) * Math.PI);
            return [
              Math.sin(angle) * Math.sin(theta) * 0.1155,
              Math.cos(theta) * 0.16 + 0.013,
              Math.cos(angle) * Math.sin(theta) * 0.1135 - 0.005,
            ];
          }),
          0.0011,
        );
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(
    () => () => strands.forEach((strand) => strand.dispose()),
    [strands],
  );
  return (
    <>
      <mesh geometry={geometry} material={material} castShadow />
      {strands.map((strand, index) => (
        <mesh key={index} geometry={strand} material={material} />
      ))}
    </>
  );
}

const sleeve = [
  new Vector2(0, -0.588),
  new Vector2(0.033, -0.584),
  new Vector2(0.037, -0.53),
  new Vector2(0.044, -0.45),
  new Vector2(0.053, -0.32),
  new Vector2(0.059, -0.23),
  new Vector2(0.068, -0.11),
  new Vector2(0.074, -0.025),
  new Vector2(0.064, 0.02),
  new Vector2(0, 0.044),
];
const trouserLeg = [
  new Vector2(0, -0.753),
  new Vector2(0.047, -0.75),
  new Vector2(0.05, -0.69),
  new Vector2(0.062, -0.59),
  new Vector2(0.068, -0.49),
  new Vector2(0.068, -0.387),
  new Vector2(0.074, -0.29),
  new Vector2(0.087, -0.17),
  new Vector2(0.102, -0.055),
  new Vector2(0.105, 0.025),
  new Vector2(0.081, 0.075),
  new Vector2(0, 0.091),
];

/** Two original deformation bones keep the garment continuous across a bending elbow or knee. */
function TailoredLimb({
  profile,
  material,
  joint,
  bend,
  depth,
}: {
  profile: Vector2[];
  material: MeshStandardMaterial;
  joint: number;
  bend: React.RefObject<Group | null>;
  depth: number;
}) {
  const rig = useMemo(() => {
    const sections: Vector2[] = [];
    for (let i = 0; i < profile.length - 1; i++)
      for (let segment = 0; segment < 4; segment++)
        sections.push(profile[i].clone().lerp(profile[i + 1], segment / 4));
    sections.push(profile[profile.length - 1]);
    const geometry = new LatheGeometry(sections, 28);
    geometry.scale(1, 1, depth);
    const indices: number[] = [],
      weights: number[] = [];
    for (
      let vertex = 0;
      vertex < geometry.attributes.position.count;
      vertex++
    ) {
      const y = geometry.attributes.position.getY(vertex),
        blend = Math.max(0, Math.min(1, (-y - joint + 0.075) / 0.15));
      const smooth = blend * blend * (3 - 2 * blend);
      indices.push(0, 1, 0, 0);
      weights.push(1 - smooth, smooth, 0, 0);
    }
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute(indices, 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
    const upper = new Bone(),
      lower = new Bone();
    lower.position.y = -joint;
    upper.add(lower);
    const mesh = new SkinnedMesh(geometry, material);
    mesh.add(upper);
    mesh.bind(new Skeleton([upper, lower]));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return { mesh, lower };
  }, [profile, material, joint, depth]);
  useFrame(() => {
    rig.lower.rotation.x = bend.current?.rotation.x ?? 0;
  });
  useEffect(
    () => () => {
      rig.mesh.geometry.dispose();
      rig.mesh.skeleton.dispose();
    },
    [rig],
  );
  return <primitive object={rig.mesh} />;
}

/** Shared adult proportions; shoulders, elbows, hips, knees and hands are independently articulated. */
export function AvatarModel({
  appearance,
  moving = false,
  reducedMotion = false,
  motion,
  variant = 0,
  paused = false,
}: {
  appearance: AvatarAppearance;
  moving?: boolean;
  reducedMotion?: boolean;
  motion?: React.RefObject<CharacterMotion>;
  variant?: number;
  paused?: boolean;
}) {
  const body = useRef<Group>(null),
    head = useRef<Group>(null);
  const leftArm = useRef<Group>(null),
    rightArm = useRef<Group>(null),
    leftElbow = useRef<Group>(null),
    rightElbow = useRef<Group>(null);
  const leftHip = useRef<Group>(null),
    rightHip = useRef<Group>(null),
    leftKnee = useRef<Group>(null),
    rightKnee = useRef<Group>(null);
  const leftAnkle = useRef<Group>(null),
    rightAnkle = useRef<Group>(null);
  const phase = useRef(variant * 1.7),
    clock = useRef(0),
    blend = useRef(0);
  const materials = useMemo(
    () => ({
      skin: new MeshStandardMaterial({
        color: materialColor(appearance.skin, "#c6926e"),
        roughness: 0.57,
      }),
      shirt: new MeshStandardMaterial({
        color: new Color(materialColor(appearance.shirt, "#174f3e")).lerp(
          new Color("#667369"),
          0.16,
        ),
        roughness: 0.93,
      }),
      hair: new MeshStandardMaterial({
        color: materialColor(appearance.hair, "#392c27"),
        roughness: 0.8,
      }),
      trousers: new MeshStandardMaterial({
        color: variant % 3 === 2 ? "#6d716d" : "#273339",
        roughness: 0.88,
      }),
      collar: new MeshStandardMaterial({ color: "#e9e8de", roughness: 0.82 }),
      leather: new MeshStandardMaterial({ color: "#242a2b", roughness: 0.44 }),
      eyes: new MeshStandardMaterial({ color: "#c9c3b5", roughness: 0.38 }),
      iris: new MeshStandardMaterial({
        color: variant % 2 ? "#514a36" : "#355349",
        roughness: 0.22,
      }),
      dark: new MeshStandardMaterial({ color: "#202729", roughness: 0.38 }),
      lips: new MeshStandardMaterial({ color: "#995e50", roughness: 0.66 }),
      metal: new MeshStandardMaterial({
        color: "#bcc7c8",
        metalness: 0.72,
        roughness: 0.3,
      }),
    }),
    [appearance.shirt, appearance.skin, appearance.hair, variant],
  );
  const faceGeometry = useMemo(sculptHead, []);
  const eyebrow = useMemo(
    () =>
      curvedLine(
        [
          [-0.024, 0, 0],
          [-0.012, 0.006, 0.002],
          [0.008, 0.005, 0.003],
          [0.025, 0, 0],
        ],
        0.0031,
      ),
    [],
  );
  const lip = useMemo(
    () =>
      curvedLine(
        [
          [-0.027, 0, 0],
          [-0.012, -0.001, 0.003],
          [0, 0.002, 0.004],
          [0.012, -0.001, 0.003],
          [0.027, 0, 0],
        ],
        0.0023,
      ),
    [],
  );
  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );
  useEffect(
    () => () => {
      faceGeometry.dispose();
      eyebrow.dispose();
      lip.dispose();
    },
    [faceGeometry, eyebrow, lip],
  );
  useFrame((_, delta) => {
    if (paused) return;
    delta = Math.min(delta, 0.05);
    clock.current += delta;
    const speed = motion?.current.speed ?? (moving ? 3.3 : 0);
    blend.current +=
      (Math.min(speed / 1.1, 1) - blend.current) * Math.min(1, delta * 11);
    phase.current += (delta * speed * Math.PI * 2) / 1.24;
    const gait = Math.sin(phase.current),
      walk = blend.current;
    const pose = walkingPose(phase.current);
    const wave = motion?.current.interaction ?? 0;
    const idle = reducedMotion
      ? 0
      : Math.sin(clock.current * 1.45 + variant) * 0.006;
    if (body.current)
      body.current.position.y = idle * (1 - walk) + pose.drop * walk;
    if (head.current) {
      head.current.rotation.y = reducedMotion
        ? 0
        : Math.sin(clock.current * 0.44 + variant) * 0.04 * (1 - walk);
      head.current.rotation.x = 0.018 * (1 - walk);
    }
    if (leftHip.current) leftHip.current.rotation.x = pose.left.hip * walk;
    if (rightHip.current) rightHip.current.rotation.x = pose.right.hip * walk;
    if (leftKnee.current) leftKnee.current.rotation.x = pose.left.knee * walk;
    if (rightKnee.current)
      rightKnee.current.rotation.x = pose.right.knee * walk;
    if (leftAnkle.current)
      leftAnkle.current.rotation.x = pose.left.ankle * walk;
    if (rightAnkle.current)
      rightAnkle.current.rotation.x = pose.right.ankle * walk;
    if (leftArm.current)
      leftArm.current.rotation.x = -gait * 0.31 * walk - 0.05 * (1 - walk);
    if (rightArm.current)
      rightArm.current.rotation.x = gait * 0.31 * walk - wave * 0.65;
    if (leftElbow.current) leftElbow.current.rotation.x = -0.09 - 0.14 * walk;
    if (rightElbow.current)
      rightElbow.current.rotation.x = -0.09 - 0.14 * walk - wave * 0.5;
  });
  return (
    <group ref={body}>
      <mesh
        position={[0, 0.89, 0]}
        scale={[1, 1, 0.61]}
        material={materials.shirt}
        castShadow
      >
        <latheGeometry args={[torsoProfile, 32]} />
      </mesh>
      <mesh
        position={[0, 0.75, 0]}
        scale={[1, 1, 0.68]}
        material={materials.trousers}
        castShadow
      >
        <latheGeometry args={[pelvisProfile, 28]} />
      </mesh>
      <mesh position={[0, 1.464, 0]} material={materials.skin} castShadow>
        <cylinderGeometry args={[0.05, 0.057, 0.1, 24]} />
      </mesh>
      <mesh
        position={[0, 1.394, 0]}
        scale={[1, 1, 0.83]}
        material={materials.collar}
      >
        <latheGeometry args={[collarProfile, 32]} />
      </mesh>
      <mesh
        position={[0, 0.939, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, 0.66, 1]}
        material={materials.leather}
      >
        <torusGeometry args={[0.157, 0.014, 8, 32]} />
      </mesh>
      <mesh position={[0, 0.936, 0.113]} material={materials.metal}>
        <boxGeometry args={[0.037, 0.026, 0.008]} />
      </mesh>
      <mesh position={[-0.108, 1.211, 0.123]} material={materials.shirt}>
        <boxGeometry args={[0.074, 0.083, 0.013]} />
      </mesh>
      <mesh position={[-0.108, 1.25, 0.137]} material={materials.collar}>
        <boxGeometry args={[0.074, 0.007, 0.004]} />
      </mesh>
      <mesh position={[0, 1.157, 0.123]} material={materials.shirt}>
        <boxGeometry args={[0.019, 0.43, 0.003]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`collar-${side}`}
          position={[side * 0.042, 1.422, 0.041]}
          rotation={[0.45, 0, side * 0.5]}
          scale={[0.035, 0.054, 0.012]}
          material={materials.collar}
        >
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((index) => (
        <mesh
          key={`button-${index}`}
          position={[0, 1.352 - index * 0.095, 0.116]}
          material={materials.collar}
        >
          <sphereGeometry args={[0.004, 8, 6]} />
        </mesh>
      ))}
      <group ref={head} position={[0, 1.631, 0.006]} scale={[0.86, 0.85, 0.89]}>
        <mesh geometry={faceGeometry} material={materials.skin} castShadow />
        <Hair material={materials.hair} variant={variant} />
        {[-1, 1].map((side) => (
          <group key={`face-${side}`}>
            <mesh
              position={[side * 0.112, -0.001, -0.005]}
              scale={[0.016, 0.029, 0.018]}
              material={materials.skin}
            >
              <sphereGeometry args={[1, 20, 16]} />
            </mesh>
            <mesh
              position={[side * 0.119, -0.002, 0.007]}
              scale={[0.004, 0.016, 0.006]}
              material={materials.lips}
            >
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
            <mesh
              position={[side * 0.039, 0.026, 0.082]}
              scale={[0.0165, 0.0057, 0.006]}
              material={materials.eyes}
            >
              <sphereGeometry args={[1, 24, 16]} />
            </mesh>
            <mesh
              position={[side * 0.039, 0.026, 0.0875]}
              scale={[0.0048, 0.0051, 0.002]}
              material={materials.iris}
            >
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
            <mesh
              position={[side * 0.039, 0.026, 0.089]}
              scale={[0.0022, 0.0031, 0.001]}
              material={materials.dark}
            >
              <sphereGeometry args={[1, 12, 8]} />
            </mesh>
            <mesh
              position={[side * 0.039 - 0.001, 0.028, 0.09]}
              material={materials.eyes}
            >
              <sphereGeometry args={[0.0008, 6, 4]} />
            </mesh>
            <mesh
              position={[side * 0.039, 0.046, 0.078]}
              geometry={eyebrow}
              material={materials.hair}
            />
            <mesh
              position={[side * 0.02, -0.028, 0.108]}
              scale={[0.014, 0.011, 0.011]}
              material={materials.skin}
            >
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
          </group>
        ))}
        <mesh
          position={[0, 0.005, 0.088]}
          scale={[0.012, 0.034, 0.015]}
          material={materials.skin}
        >
          <sphereGeometry args={[1, 20, 16]} />
        </mesh>
        <mesh
          position={[0, -0.026, 0.112]}
          scale={[0.014, 0.016, 0.018]}
          material={materials.skin}
        >
          <sphereGeometry args={[1, 20, 16]} />
        </mesh>
        <mesh
          position={[0, -0.066, 0.087]}
          geometry={lip}
          material={materials.lips}
        />
        <mesh
          position={[0, -0.091, 0.069]}
          scale={[0.03, 0.018, 0.017]}
          material={materials.skin}
        >
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      </group>
      {[-1, 1].map((side) => (
        <group
          key={`arm-${side}`}
          ref={side < 0 ? leftArm : rightArm}
          position={[side * 0.18, 1.33, 0]}
          rotation={[0, 0, side * 0.075]}
        >
          <TailoredLimb
            profile={sleeve}
            material={materials.shirt}
            joint={0.295}
            bend={side < 0 ? leftElbow : rightElbow}
            depth={0.93}
          />
          <group
            ref={side < 0 ? leftElbow : rightElbow}
            position={[0, -0.295, 0]}
          >
            <mesh position={[0, -0.267, 0]} material={materials.collar}>
              <cylinderGeometry args={[0.036, 0.034, 0.038, 24]} />
            </mesh>
            <group position={[0, -0.323, 0.001]}>
              <mesh
                scale={[0.041, 0.059, 0.021]}
                material={materials.skin}
                castShadow
              >
                <sphereGeometry args={[1, 18, 14]} />
              </mesh>
              {[0, 1, 2, 3].map((finger) => (
                <mesh
                  key={finger}
                  position={[-0.024 + finger * 0.016, -0.047, 0.006]}
                  rotation={[0.12, 0, (finger - 1.5) * 0.08]}
                  scale={[0.008, 0.027 - Math.abs(finger - 1.4) * 0.003, 0.008]}
                  material={materials.skin}
                >
                  <sphereGeometry args={[1, 10, 8]} />
                </mesh>
              ))}
              <mesh
                position={[side * 0.039, -0.009, 0.013]}
                rotation={[0.25, 0, -side * 0.5]}
                scale={[0.009, 0.03, 0.009]}
                material={materials.skin}
              >
                <sphereGeometry args={[1, 12, 10]} />
              </mesh>
            </group>
            {side < 0 && (
              <mesh
                position={[0, -0.244, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                material={materials.leather}
              >
                <torusGeometry args={[0.05, 0.008, 8, 16]} />
              </mesh>
            )}
          </group>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group
          key={`leg-${side}`}
          ref={side < 0 ? leftHip : rightHip}
          position={[side * 0.085, 0.8, 0]}
        >
          <TailoredLimb
            profile={trouserLeg}
            material={materials.trousers}
            joint={0.387}
            bend={side < 0 ? leftKnee : rightKnee}
            depth={0.9}
          />
          <group
            ref={side < 0 ? leftKnee : rightKnee}
            position={[0, -0.387, 0]}
          >
            <group
              ref={side < 0 ? leftAnkle : rightAnkle}
              position={[0, -0.355, 0]}
            >
              <mesh
                position={[0, 0.003, 0.047]}
                scale={[0.066, 0.052, 0.128]}
                material={materials.leather}
                castShadow
              >
                <sphereGeometry args={[1, 24, 16]} />
              </mesh>
              <mesh
                position={[0, -0.035, 0.042]}
                scale={[0.069, 0.017, 0.131]}
                material={materials.dark}
              >
                <sphereGeometry args={[1, 20, 12]} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
      <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial
          color="#1b272b"
          transparent
          opacity={0.13}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
