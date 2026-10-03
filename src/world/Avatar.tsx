import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

export type AvatarAppearance = { shirt: string; skin: string; hair: string };
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

/** An original articulated professional character, built entirely from simple geometry. */
export function AvatarModel({
  appearance,
  moving = false,
  reducedMotion = false,
}: {
  appearance: AvatarAppearance;
  moving?: boolean;
  reducedMotion?: boolean;
}) {
  const leftArm = useRef<Group>(null),
    rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null),
    rightLeg = useRef<Group>(null),
    torso = useRef<Group>(null);
  const phase = useRef(0);
  const skin = materialColor(appearance.skin, "#c98e64");
  const shirt = materialColor(appearance.shirt, "#228e64");
  const hair = materialColor(appearance.hair, "#49342d");
  useFrame((_, delta) => {
    phase.current += Math.min(delta, 0.05) * (moving ? 10 : 1.4);
    const swing = moving
      ? Math.sin(phase.current) * (reducedMotion ? 0.2 : 0.56)
      : 0;
    if (leftArm.current) leftArm.current.rotation.x = swing;
    if (rightArm.current) rightArm.current.rotation.x = -swing;
    if (leftLeg.current) leftLeg.current.rotation.x = -swing;
    if (rightLeg.current) rightLeg.current.rotation.x = swing;
    if (torso.current)
      torso.current.position.y =
        moving && !reducedMotion
          ? Math.abs(Math.sin(phase.current)) * 0.045
          : 0;
  });
  return (
    <group ref={torso}>
      <mesh position={[0, 1.04, 0]} castShadow>
        <boxGeometry args={[0.53, 0.58, 0.3]} />
        <meshStandardMaterial color={shirt} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.76, 0]} castShadow>
        <boxGeometry args={[0.46, 0.15, 0.29]} />
        <meshStandardMaterial color="#303d3d" />
      </mesh>
      <mesh position={[0, 0.76, 0.157]}>
        <boxGeometry args={[0.08, 0.06, 0.025]} />
        <meshStandardMaterial color="#bfa97c" metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.41, 0]}>
        <cylinderGeometry args={[0.09, 0.1, 0.15, 6]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[-0.075, 1.3, 0.166]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.13, 0.13, 0.025]} />
        <meshStandardMaterial color="#f6f1e8" />
      </mesh>
      <mesh position={[0.075, 1.3, 0.166]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.13, 0.13, 0.025]} />
        <meshStandardMaterial color="#f6f1e8" />
      </mesh>
      <mesh position={[-0.14, 1.07, 0.164]}>
        <boxGeometry args={[0.115, 0.12, 0.02]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[-0.14, 1.15, 0.18]}>
        <boxGeometry args={[0.12, 0.022, 0.015]} />
        <meshStandardMaterial color="#e7e5d4" />
      </mesh>
      <mesh position={[0, 1.63, 0]} castShadow>
        <boxGeometry args={[0.38, 0.39, 0.35]} />
        <meshStandardMaterial color={skin} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.84, -0.015]} castShadow>
        <boxGeometry args={[0.4, 0.13, 0.39]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      <mesh position={[-0.167, 1.69, -0.03]}>
        <boxGeometry args={[0.08, 0.23, 0.32]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      <mesh position={[0.166, 1.75, -0.03]}>
        <boxGeometry args={[0.08, 0.13, 0.32]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      <mesh position={[0, 1.73, -0.163]}>
        <boxGeometry args={[0.38, 0.23, 0.08]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.083, 1.655, 0.179]}>
            <boxGeometry args={[0.044, 0.048, 0.015]} />
            <meshStandardMaterial color="#243332" />
          </mesh>
          <mesh position={[side * 0.083, 1.707, 0.185]}>
            <boxGeometry args={[0.065, 0.021, 0.018]} />
            <meshStandardMaterial color={hair} />
          </mesh>
          <mesh position={[side * 0.215, 1.622, 0]}>
            <boxGeometry args={[0.065, 0.115, 0.07]} />
            <meshStandardMaterial color={skin} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.606, 0.191]}>
        <boxGeometry args={[0.05, 0.058, 0.055]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.531, 0.184]}>
        <boxGeometry args={[0.08, 0.021, 0.015]} />
        <meshStandardMaterial color="#9b6155" />
      </mesh>
      {[-1, 1].map((side) => (
        <group
          key={`arm-${side}`}
          ref={side < 0 ? leftArm : rightArm}
          position={[side * 0.36, 1.22, 0]}
        >
          <mesh position={[0, -0.12, 0]} castShadow>
            <boxGeometry args={[0.18, 0.27, 0.22]} />
            <meshStandardMaterial color={shirt} />
          </mesh>
          <mesh position={[0, -0.34, 0]} castShadow>
            <boxGeometry args={[0.13, 0.23, 0.15]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          <mesh position={[0, -0.49, 0.018]} castShadow>
            <boxGeometry args={[0.15, 0.16, 0.16]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {side < 0 && (
            <mesh position={[0, -0.405, 0]}>
              <boxGeometry args={[0.152, 0.05, 0.17]} />
              <meshStandardMaterial color="#283536" />
            </mesh>
          )}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group
          key={`leg-${side}`}
          ref={side < 0 ? leftLeg : rightLeg}
          position={[side * 0.135, 0.69, 0]}
        >
          <mesh position={[0, -0.27, 0]} castShadow>
            <boxGeometry args={[0.2, 0.54, 0.24]} />
            <meshStandardMaterial color="#364747" roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.59, 0.052]} castShadow>
            <boxGeometry args={[0.22, 0.13, 0.35]} />
            <meshStandardMaterial color="#283231" />
          </mesh>
          <mesh position={[0, -0.66, 0.05]}>
            <boxGeometry args={[0.225, 0.035, 0.36]} />
            <meshStandardMaterial color="#c6bfae" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
