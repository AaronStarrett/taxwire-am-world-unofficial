import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
import {
  BufferGeometry,
  Group,
  SkinnedMesh,
  Vector3,
  type Material,
} from "three";

const lifecycle = vi.hoisted(() => ({
  frames: [] as ((state: unknown, delta: number) => void)[],
  cleanups: [] as (() => void)[],
}));
vi.mock("@react-three/fiber", () => ({
  useFrame: (callback: (state: unknown, delta: number) => void) =>
    lifecycle.frames.push(callback),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useMemo: (factory: () => unknown) => factory(),
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => void | (() => void)) => {
    const cleanup = effect();
    if (cleanup) lifecycle.cleanups.push(cleanup);
  },
}));
import {
  AvatarModel,
  characterStyle,
  garmentSurfaceDepth,
  materialColor,
} from "../src/world/Avatar";
import { STRIDE_LENGTH, walkingPose } from "../src/world/gait";

afterEach(() => {
  lifecycle.cleanups.reverse().forEach((cleanup) => cleanup());
  lifecycle.cleanups.length = lifecycle.frames.length = 0;
});

// A headless structural harness constructs the original geometry and rigs without
// WebGL. It is deliberately not a substitute for rendered screenshot inspection.
function buildAvatar(variant: number, reducedMotion = false, paused = false) {
  const meshes: {
    geometry?: BufferGeometry;
    material?: Material;
    object?: SkinnedMesh;
  }[] = [];
  const groups: Group[] = [];
  const visit = (node: ReactNode): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isValidElement<Record<string, unknown>>(node)) return;
    if (typeof node.type === "function") {
      visit(
        (node.type as (props: Record<string, unknown>) => ReactNode)(
          node.props,
        ),
      );
      return;
    }
    if (node.type === "mesh" || node.type === "primitive")
      meshes.push(node.props);
    if (node.type === "group") {
      const group = new Group();
      if (Array.isArray(node.props.position))
        group.position.fromArray(node.props.position as number[]);
      if (Array.isArray(node.props.rotation))
        group.rotation.fromArray(
          node.props.rotation as [number, number, number],
        );
      const ref = node.props.ref as { current: Group } | undefined;
      if (ref) {
        ref.current = group;
        groups.push(group);
      }
    }
    visit(node.props.children as ReactNode);
  };
  const motion = { current: { speed: 1.6, interaction: 0.2 } };
  visit(
    AvatarModel({
      appearance: { shirt: "#56736b", skin: "#b78058", hair: "#49362b" },
      variant,
      reducedMotion,
      paused,
      motion,
    }),
  );
  return { meshes, groups, motion };
}

describe("tailored procedural adults", () => {
  it("keeps the selected/contact palette and stable identity while varying clothing and hair", () => {
    expect(materialColor("#12ab34", "#000000")).toBe("#12ab34");
    expect(materialColor("silver", "#000000")).toBe("#b8b8b0");
    expect(materialColor("not-a-color", "#123456")).toBe("#123456");
    expect(materialColor("#12345", "#123456")).toBe("#123456");
    expect(
      new Set(
        [0, 1, 2, 3].map(
          (variant) => characterStyle(variant, "#312621").wardrobe,
        ),
      ).size,
    ).toBe(4);
    expect(characterStyle(2, "#312621")).toEqual(characterStyle(2, "#312621"));
    expect(characterStyle(0, "bob").hair).toBe(1);
    expect(characterStyle(1, "curly").hair).toBe(2);
    expect(characterStyle(2, "short").hair).toBe(0);
    expect(characterStyle(Number.NaN, "short").wardrobe).toBe(0);
  });

  it.each([0, 1, 2, 3, 7])(
    "builds complete finite wardrobe variant %i with batched detail",
    (variant) => {
      const { meshes } = buildAvatar(variant);
      // The previous model spent eleven draws on hair alone and six per hand.
      expect(meshes.length).toBeLessThanOrEqual(40);
      const rigs = meshes.flatMap((mesh) =>
        mesh.object instanceof SkinnedMesh ? [mesh.object] : [],
      );
      expect(rigs).toHaveLength(4);
      for (const { geometry } of meshes)
        if (geometry) {
          expect(geometry.attributes.position.count).toBeGreaterThan(0);
          for (const value of geometry.attributes.position.array)
            expect(Number.isFinite(value)).toBe(true);
          geometry.computeBoundingSphere();
          expect(Number.isFinite(geometry.boundingSphere!.radius)).toBe(true);
        }
      for (const mesh of rigs) {
        const weights = mesh.geometry.attributes.skinWeight;
        for (let i = 0; i < weights.count; i++)
          expect(weights.getX(i) + weights.getY(i)).toBeCloseTo(1, 7);
        expect(mesh.skeleton.bones).toHaveLength(2);
        expect(mesh.frustumCulled).toBe(true);
        const vertex = new Vector3();
        for (const bend of [-0.8, 0, 1.4]) {
          mesh.skeleton.bones[1].rotation.x = bend;
          mesh.updateMatrixWorld(true);
          for (
            let index = 0;
            index < mesh.geometry.attributes.position.count;
            index += 11
          ) {
            vertex.fromBufferAttribute(
              mesh.geometry.attributes.position,
              index,
            );
            mesh.applyBoneTransform(index, vertex);
            expect(mesh.boundingSphere!.containsPoint(vertex)).toBe(true);
          }
        }
      }
      lifecycle.frames.forEach((frame) => frame({}, 1 / 60));
      for (const mesh of rigs)
        expect(Number.isFinite(mesh.skeleton.bones[1].rotation.x)).toBe(true);
    },
  );

  it("does not animate paused poses and removes idle motion when reduced motion is selected", () => {
    const paused = buildAvatar(0, false, true);
    const before = paused.groups.map((group) =>
      group.position
        .toArray()
        .concat(group.rotation.toArray().slice(0, 3) as number[]),
    );
    lifecycle.frames.forEach((frame) => frame({}, 1 / 30));
    expect(
      paused.groups.map((group) =>
        group.position
          .toArray()
          .concat(group.rotation.toArray().slice(0, 3) as number[]),
      ),
    ).toEqual(before);
    lifecycle.frames.length = 0;
    const reduced = buildAvatar(0, true);
    reduced.motion.current.speed = 0;
    for (let i = 0; i < 60; i++)
      lifecycle.frames.forEach((frame) => frame({}, 1 / 60));
    expect(reduced.groups[0].position.y).toBe(0);
    expect(reduced.groups[1].rotation.y).toBe(0);
    expect(reduced.groups[2].rotation.y).toBe(0);
  });
});

describe("visible tailored layers", () => {
  it.each([0, 2])(
    "keeps the shirt inset outside the actual chest in jacket variant %i",
    (variant) => {
      const { meshes } = buildAvatar(variant);
      const shirtFront = meshes
        .map((mesh) => mesh.geometry)
        .find((geometry) => {
          if (!geometry) return false;
          geometry.computeBoundingBox();
          return (
            geometry.boundingBox!.min.y > 1.12 &&
            geometry.boundingBox!.max.y > 1.42
          );
        });
      expect(shirtFront).toBeDefined();
      const position = shirtFront!.attributes.position;
      const indices = shirtFront!.index!;
      const shoulder = characterStyle(variant, "#49362b").shoulderWidth;
      for (let index = 0; index < indices.count; index += 3) {
        const center = new Vector3();
        for (let corner = 0; corner < 3; corner++)
          center.add(
            new Vector3().fromBufferAttribute(
              position,
              indices.getX(index + corner),
            ),
          );
        center.divideScalar(3);
        if (center.y < 1.405)
          expect(center.z).toBeGreaterThan(
            garmentSurfaceDepth(center.x, center.y, shoulder) - 0.0001,
          );
      }
    },
  );
});

describe("gentle distance-driven gait", () => {
  it("matches stride speed, repeats on full cycles and handles negative phases", () => {
    expect(STRIDE_LENGTH).toBeGreaterThan(0.9);
    expect(STRIDE_LENGTH).toBeLessThan(1.4);
    for (const phase of [-1.2, 0, 1.5, 5.9]) {
      const a = walkingPose(phase),
        b = walkingPose(phase + Math.PI * 2);
      expect(a.drop).toBeCloseTo(b.drop, 10);
      expect(a.left.hip).toBeCloseTo(b.left.hip, 10);
      expect(a.right.knee).toBeCloseTo(b.right.knee, 10);
    }
  });

  it("plants stance feet, clears swing feet and locks ankles without a pelvis discontinuity", () => {
    const epsilon = 0.0001;
    for (const phase of [0, Math.PI, Math.PI * 2]) {
      expect(
        Math.abs(
          walkingPose(phase + epsilon).drop - walkingPose(phase - epsilon).drop,
        ),
      ).toBeLessThan(1e-8);
    }
    for (let sample = 0; sample < 400; sample++) {
      const pose = walkingPose((sample / 400) * Math.PI * 2);
      expect(pose.drop).toBeGreaterThan(-0.056);
      for (const leg of [pose.left, pose.right]) {
        const footY =
          pose.drop -
          0.387 * Math.cos(leg.hip) -
          0.355 * Math.cos(leg.hip + leg.knee);
        expect(footY).toBeCloseTo(-0.741 + leg.lift, 5);
        expect(leg.hip + leg.knee + leg.ankle).toBeCloseTo(0, 10);
        expect(leg.lift).toBeGreaterThanOrEqual(0);
        expect(leg.lift).toBeLessThanOrEqual(0.085);
        expect(leg.knee).toBeGreaterThan(0);
        expect(leg.knee).toBeLessThan(1.4);
      }
    }
  });

  it("recovers a non-finite phase to a finite neutral cycle", () => {
    expect(walkingPose(Number.NaN)).toEqual(walkingPose(0));
    expect(walkingPose(Infinity)).toEqual(walkingPose(0));
  });
});
