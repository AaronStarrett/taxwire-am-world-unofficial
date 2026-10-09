import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Bone,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DataTexture,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  RGBAFormat,
  Skeleton,
  SkinnedMesh,
  Sphere,
  SphereGeometry,
  TubeGeometry,
  Uint16BufferAttribute,
  Vector2,
  Vector3,
} from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { STRIDE_LENGTH, walkingPose } from "./gait";

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
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
    ? value
    : (presets[value] ?? fallback);
}

/** Stable, appearance-linked tailoring. Never randomize a contact on a rerender. */
export function characterStyle(variant: number, hair: string) {
  const identity = Math.abs(Math.trunc(Number.isFinite(variant) ? variant : 0));
  return {
    wardrobe: identity % 4,
    hair:
      hair === "bob"
        ? 1
        : hair === "curly"
          ? 2
          : hair === "short"
            ? 0
            : identity % 4,
    glasses: identity % 5 === 2,
    faceWidth: 0.98 + (identity % 3) * 0.025,
    shoulderWidth: 0.98 + (identity % 4) * 0.018,
  };
}

type Point = [number, number, number];
function ellipsoid(position: Point, scale: Point, width = 20, height = 14) {
  const geometry = new SphereGeometry(1, width, height);
  geometry.scale(...scale);
  geometry.translate(...position);
  return geometry;
}
function box(position: Point, size: Point, rotationZ = 0) {
  const geometry = new BoxGeometry(...size);
  geometry.rotateZ(rotationZ);
  geometry.translate(...position);
  return geometry;
}
function curvedLine(points: Point[], radius: number, segments = 16) {
  return new TubeGeometry(
    new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
    segments,
    radius,
    5,
    false,
  );
}
/** Merge small details by material, rather than one draw call for every finger/button/hair. */
function combine(parts: BufferGeometry[]) {
  const geometry = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  return geometry;
}
/** Front depth of the same elliptical rings used by the garment mesh. */
export function garmentSurfaceDepth(x: number, y: number, shoulderWidth = 1) {
  const height = y - 0.893;
  if (height < 0 || height > 0.523) return 0;
  for (let i = 0; i < torsoProfile.length - 1; i++) {
    const a = torsoProfile[i],
      b = torsoProfile[i + 1];
    if (height <= b.y) {
      const radius = a.x + ((b.x - a.x) * (height - a.y)) / (b.y - a.y);
      return (
        Math.sqrt(Math.max(0, radius * radius - (x / shoulderWidth) ** 2)) *
        0.63
      );
    }
  }
  return 0;
}

function patch(
  points: Point[],
  triangles: number[],
  layer = 0.005,
  shoulderWidth = 1,
) {
  // Tessellation matters here: a flat triangle between collar and waist cuts
  // through the convex chest even when its corner vertices are on the surface.
  const vertices = points.map((point) => [...point] as Point);
  let outward = [...triangles];
  for (let i = 0; i < outward.length; i += 3) {
    const a = points[outward[i]],
      b = points[outward[i + 1]],
      c = points[outward[i + 2]];
    if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0)
      [outward[i + 1], outward[i + 2]] = [outward[i + 2], outward[i + 1]];
  }
  for (let pass = 0; pass < 4; pass++) {
    const edges = new Map<string, number>();
    const midpoint = (a: number, b: number) => {
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      const existing = edges.get(key);
      if (existing !== undefined) return existing;
      const index = vertices.length;
      vertices.push(
        vertices[a].map(
          (value, axis) => (value + vertices[b][axis]) / 2,
        ) as Point,
      );
      edges.set(key, index);
      return index;
    };
    const next: number[] = [];
    for (let i = 0; i < outward.length; i += 3) {
      const a = outward[i],
        b = outward[i + 1],
        c = outward[i + 2];
      const ab = midpoint(a, b),
        bc = midpoint(b, c),
        ca = midpoint(c, a);
      next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    }
    outward = next;
  }
  for (const vertex of vertices)
    vertex[2] = Math.max(
      vertex[2],
      garmentSurfaceDepth(vertex[0], vertex[1], shoulderWidth) + layer,
    );
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(vertices.flat(), 3),
  );
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(
      vertices.flatMap((point) => [point[0] * 8, point[1] * 8]),
      2,
    ),
  );
  geometry.setIndex(outward);
  geometry.computeVertexNormals();
  return geometry;
}

// Small, original deterministic surface maps are shared by every colleague. Their lifetime
// is the renderer's module lifetime; individual avatars must not dispose shared textures.
let surfaceMaps: { weave: DataTexture; grain: DataTexture } | undefined;
function originalSurfaces() {
  if (surfaceMaps) return surfaceMaps;
  const make = (fabric: boolean) => {
    const size = 64,
      data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        const noise = ((x * 73 + y * 151 + x * y * 11) % 31) - 15;
        const weave = (x % 4 < 2 ? 12 : -12) + (y % 4 < 2 ? 9 : -9);
        const value = Math.round(
          128 + (fabric ? weave + noise * 0.18 : noise * 0.8),
        );
        data.set([value, value, value, 255], index);
      }
    const texture = new DataTexture(data, size, size, RGBAFormat);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.repeat.set(fabric ? 7 : 3, fabric ? 7 : 3);
    texture.needsUpdate = true;
    return texture;
  };
  surfaceMaps = { weave: make(true), grain: make(false) };
  return surfaceMaps;
}

const torsoProfile = [
  new Vector2(0.16, 0),
  new Vector2(0.168, 0.06),
  new Vector2(0.163, 0.15),
  new Vector2(0.176, 0.27),
  new Vector2(0.206, 0.39),
  new Vector2(0.224, 0.446),
  new Vector2(0.212, 0.466),
  new Vector2(0.154, 0.494),
  new Vector2(0.068, 0.523),
];
const pelvisProfile = [
  new Vector2(0, -0.01),
  new Vector2(0.09, 0.005),
  new Vector2(0.146, 0.05),
  new Vector2(0.166, 0.11),
  new Vector2(0.166, 0.18),
  new Vector2(0.157, 0.202),
];
const sleeve = [
  new Vector2(0, -0.584),
  new Vector2(0.039, -0.579),
  new Vector2(0.041, -0.535),
  new Vector2(0.049, -0.46),
  new Vector2(0.054, -0.37),
  new Vector2(0.057, -0.3),
  new Vector2(0.062, -0.22),
  new Vector2(0.069, -0.1),
  new Vector2(0.073, -0.025),
  new Vector2(0.059, 0.025),
  new Vector2(0, 0.045),
];
const trouserLeg = [
  new Vector2(0, -0.753),
  new Vector2(0.055, -0.748),
  new Vector2(0.059, -0.7),
  new Vector2(0.066, -0.59),
  new Vector2(0.068, -0.49),
  new Vector2(0.07, -0.387),
  new Vector2(0.079, -0.29),
  new Vector2(0.09, -0.17),
  new Vector2(0.097, -0.055),
  new Vector2(0.1, 0.025),
  new Vector2(0.078, 0.075),
  new Vector2(0, 0.09),
];

function gaussian(value: number, center: number, width: number) {
  return Math.exp(-(((value - center) / width) ** 2));
}

/** A continuous sculpt, including the bridge, nostrils, cheek planes and eye sockets.
 * Vertex tint puts warmth into cheeks/lips without painted-on floating facial balls. */
function sculptHead(skin: Color, width: number) {
  const geometry = new SphereGeometry(1, 64, 48);
  const positions = geometry.attributes.position;
  const colors: number[] = [];
  const shade = new Color(),
    warm = skin.clone().lerp(new Color("#a96555"), 0.24),
    lip = skin.clone().lerp(new Color("#855047"), 0.42);
  for (let index = 0; index < positions.count; index++) {
    const nx = positions.getX(index),
      ny = positions.getY(index),
      nz = positions.getZ(index);
    const jaw = 1 - Math.max(0, -ny - 0.1) * 0.28;
    const x = nx * 0.106 * jaw * width,
      y = ny * 0.148;
    let z = nz * 0.103;
    const front = Math.max(0, nz);
    if (nz > 0) {
      z = 0.092 * Math.pow(nz, 0.64);
      const central = gaussian(x, 0, 0.015);
      z += central * gaussian(y, 0.002, 0.04) * 0.019;
      z += gaussian(x, 0, 0.019) * gaussian(y, -0.026, 0.015) * 0.025;
      z +=
        gaussian(Math.abs(x), 0.016, 0.007) *
        gaussian(y, -0.032, 0.007) *
        0.009;
      z -=
        gaussian(Math.abs(x), 0.039, 0.024) * gaussian(y, 0.025, 0.015) * 0.011;
      z +=
        gaussian(Math.abs(x), 0.049, 0.028) * gaussian(y, -0.007, 0.02) * 0.009;
      z +=
        gaussian(Math.abs(x), 0.039, 0.027) * gaussian(y, 0.046, 0.01) * 0.006;
      z += gaussian(x, 0, 0.04) * gaussian(y, -0.065, 0.013) * 0.009;
      z += gaussian(x, 0, 0.029) * gaussian(y, -0.105, 0.02) * 0.014;
    }
    positions.setXYZ(index, x, y, z);
    shade.copy(skin);
    const blush =
      gaussian(Math.abs(x), 0.061, 0.032) * gaussian(y, -0.022, 0.025) * front;
    shade.lerp(warm, blush * 0.5);
    const mouth = gaussian(x, 0, 0.028) * gaussian(y, -0.068, 0.0045) * front;
    shade.lerp(lip, mouth * 0.9);
    const socket =
      gaussian(Math.abs(x), 0.04, 0.02) * gaussian(y, 0.022, 0.017) * front;
    shade.multiplyScalar(1 - socket * 0.035);
    colors.push(shade.r, shade.g, shade.b);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function hairGeometry(variant: number) {
  const geometry = new ParametricGeometry(
    (u, v, target) => {
      const phi = -u * Math.PI * 2,
        front = Math.cos(phi);
      const long = variant === 1;
      const fringe =
        variant === 0
          ? Math.max(0, front) *
            (0.08 * Math.sin(phi - 0.55) + 0.025 * Math.cos(phi * 5))
          : 0;
      const extent =
        (long ? 1.75 : 1.65) -
        (long ? 0.57 : 0.49) * Math.max(0, front) +
        (long ? 0.86 : 0.22) * Math.max(0, -front) +
        fringe;
      const theta = v * extent;
      const wave =
        variant === 2
          ? Math.sin(phi * 19 + theta * 13) * Math.sin(theta * 24) * 0.0018
          : 0.001 * Math.cos(phi * 17 + theta * 6);
      const sweep =
        variant === 0
          ? Math.max(0, Math.cos(phi - 0.8)) * Math.sin(theta) * 0.005
          : 0;
      target.set(
        Math.sin(phi) * Math.sin(theta) * ((long ? 0.111 : 0.108) + wave),
        Math.cos(theta) * (0.151 + sweep) + 0.008,
        Math.cos(phi) * Math.sin(theta) * ((long ? 0.109 : 0.106) + wave) -
          0.006,
      );
      if (long && front < 0.15 && theta > 1.35) {
        target.y -= (theta - 1.35) * 0.049;
        target.x *= 1 + (theta - 1.35) * 0.12;
      }
    },
    48,
    30,
  );
  if (variant !== 3) return geometry;
  return combine([
    geometry,
    ellipsoid([0, -0.011, -0.111], [0.052, 0.044, 0.035]),
  ]);
}

function Face({
  materials,
  style,
}: {
  materials: ReturnType<typeof createMaterials>;
  style: ReturnType<typeof characterStyle>;
}) {
  const geometry = useMemo(() => {
    const skin: BufferGeometry[] = [],
      whites: BufferGeometry[] = [],
      irises: BufferGeometry[] = [],
      dark: BufferGeometry[] = [],
      brows: BufferGeometry[] = [],
      rims: BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      skin.push(
        ellipsoid([side * 0.105, -0.003, -0.008], [0.016, 0.03, 0.018]),
      );
      skin.push(
        curvedLine(
          [
            [side * 0.109, 0.016, 0.005],
            [side * 0.117, 0.008, 0.007],
            [side * 0.117, -0.01, 0.009],
            [side * 0.111, -0.025, 0.006],
          ],
          0.0035,
          10,
        ),
      );
      const x = side * 0.039;
      // Small almond openings sit inside the sculpted orbit, with skin-toned lids.
      whites.push(ellipsoid([x, 0.025, 0.08], [0.016, 0.0042, 0.004]));
      irises.push(
        ellipsoid([x, 0.025, 0.0835], [0.0038, 0.0038, 0.0014], 16, 10),
      );
      dark.push(ellipsoid([x, 0.025, 0.0846], [0.0017, 0.0021, 0.0007], 12, 8));
      skin.push(
        curvedLine(
          [
            [x - 0.016, 0.025, 0.079],
            [x - 0.008, 0.029, 0.083],
            [x + 0.006, 0.0285, 0.083],
            [x + 0.016, 0.025, 0.078],
          ],
          0.0018,
          12,
        ),
      );
      skin.push(
        curvedLine(
          [
            [x - 0.016, 0.025, 0.079],
            [x, 0.0215, 0.083],
            [x + 0.016, 0.025, 0.078],
          ],
          0.0014,
          10,
        ),
      );
      brows.push(
        curvedLine(
          [
            [x - 0.021, 0.043, 0.083],
            [x - 0.007, 0.048, 0.087],
            [x + 0.008, 0.046, 0.087],
            [x + 0.021, 0.042, 0.081],
          ],
          0.0017,
          12,
        ),
      );
      dark.push(
        ellipsoid(
          [side * 0.012, -0.035, 0.118],
          [0.004, 0.0014, 0.0023],
          12,
          8,
        ),
      );
      if (style.glasses) {
        rims.push(
          curvedLine(
            [
              [x - 0.024, 0.033, 0.095],
              [x - 0.021, 0.012, 0.096],
              [x + 0.019, 0.012, 0.096],
              [x + 0.022, 0.034, 0.094],
              [x - 0.024, 0.033, 0.095],
            ],
            0.0018,
            18,
          ),
        );
        rims.push(
          curvedLine(
            [
              [side * 0.062, 0.032, 0.094],
              [side * 0.098, 0.031, 0.045],
              [side * 0.108, 0.016, -0.009],
            ],
            0.0015,
          ),
        );
      }
    }
    dark.push(
      curvedLine(
        [
          [-0.025, -0.067, 0.088],
          [-0.01, -0.0678, 0.094],
          [0, -0.066, 0.095],
          [0.01, -0.0678, 0.094],
          [0.025, -0.067, 0.088],
        ],
        0.00075,
        16,
      ),
    );
    if (style.glasses)
      rims.push(
        curvedLine(
          [
            [-0.017, 0.031, 0.096],
            [0, 0.036, 0.111],
            [0.017, 0.031, 0.096],
          ],
          0.0017,
        ),
      );
    return {
      head: sculptHead(materials.skin.color, style.faceWidth),
      skin: combine(skin),
      whites: combine(whites),
      irises: combine(irises),
      dark: combine(dark),
      brows: combine(brows),
      hair: hairGeometry(style.hair),
      rims: rims.length ? combine(rims) : undefined,
    };
  }, [materials, style]);
  useEffect(
    () => () => Object.values(geometry).forEach((item) => item?.dispose()),
    [geometry],
  );
  return (
    <>
      <mesh
        geometry={geometry.head}
        material={materials.complexion}
        castShadow
      />
      <mesh geometry={geometry.skin} material={materials.skin} castShadow />
      <mesh geometry={geometry.whites} material={materials.eyes} />
      <mesh geometry={geometry.irises} material={materials.iris} />
      <mesh geometry={geometry.dark} material={materials.facialShadow} />
      <mesh geometry={geometry.brows} material={materials.hair} />
      <mesh geometry={geometry.hair} material={materials.hair} castShadow />
      {geometry.rims && (
        <mesh geometry={geometry.rims} material={materials.frames} />
      )}
    </>
  );
}

function createMaterials(appearance: AvatarAppearance, variant: number) {
  const surfaces = originalSurfaces();
  const skin = new Color(materialColor(appearance.skin, "#c6926e"));
  const shirt = new Color(materialColor(appearance.shirt, "#174f3e"));
  const style = characterStyle(variant, appearance.hair);
  // Keep the selected/contact color recognizable while bringing it into a restrained wardrobe.
  shirt.lerp(
    new Color(style.wardrobe === 1 ? "#a2aaa6" : "#333c40"),
    style.wardrobe === 1 ? 0.24 : 0.51,
  );
  const fabric = {
    roughness: 0.96,
    bumpMap: surfaces.weave,
    bumpScale: 0.00032,
  };
  return {
    skin: new MeshStandardMaterial({
      color: skin,
      roughness: 0.69,
      bumpMap: surfaces.grain,
      bumpScale: 0.00016,
    }),
    complexion: new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      bumpMap: surfaces.grain,
      bumpScale: 0.00013,
    }),
    shirt: new MeshStandardMaterial({ color: shirt, ...fabric }),
    seam: new MeshStandardMaterial({
      color: shirt.clone().multiplyScalar(0.72),
      ...fabric,
    }),
    hair: new MeshStandardMaterial({
      color: materialColor(appearance.hair, "#392c27"),
      roughness: 0.82,
      bumpMap: surfaces.grain,
      bumpScale: 0.0005,
    }),
    trousers: new MeshStandardMaterial({
      color: ["#343d44", "#4c4b45", "#394046", "#4d5050"][style.wardrobe],
      ...fabric,
    }),
    collar: new MeshStandardMaterial({
      color: style.wardrobe === 2 ? "#c8cac1" : "#deddd4",
      ...fabric,
    }),
    leather: new MeshStandardMaterial({
      color: style.wardrobe === 1 ? "#43372e" : "#242a2b",
      roughness: 0.5,
      bumpMap: surfaces.grain,
      bumpScale: 0.0004,
    }),
    eyes: new MeshStandardMaterial({ color: "#bfc0b4", roughness: 0.38 }),
    iris: new MeshStandardMaterial({
      color: variant % 2 ? "#544b37" : "#465751",
      roughness: 0.32,
    }),
    facialShadow: new MeshStandardMaterial({
      color: skin.clone().lerp(new Color("#242328"), 0.76),
      roughness: 0.7,
    }),
    frames: new MeshStandardMaterial({
      color: "#3f4445",
      metalness: 0.48,
      roughness: 0.37,
    }),
    metal: new MeshStandardMaterial({
      color: "#a6aaa6",
      metalness: 0.68,
      roughness: 0.36,
    }),
  };
}

function Tailoring({
  materials,
  wardrobe,
  shoulderWidth,
}: {
  materials: ReturnType<typeof createMaterials>;
  wardrobe: number;
  shoulderWidth: number;
}) {
  const geometry = useMemo(() => {
    // Distinct physical layers avoid coplanar white/green fragments in close-ups.
    // Shirt < tie < jacket lapel < folded collar; preserve a gap after tessellation.
    const fitPatch = (points: Point[], triangles: number[], layer = 0.012) =>
      patch(points, triangles, layer, shoulderWidth);
    const light: BufferGeometry[] = [],
      dark: BufferGeometry[] = [],
      seams: BufferGeometry[] = [],
      metal: BufferGeometry[] = [];
    const jacket = wardrobe === 0 || wardrobe === 2;
    // Inset shirt-front and angular lapels follow the curved chest rather than hovering over it.
    if (jacket) {
      light.push(
        fitPatch(
          [
            [-0.061, 1.412, 0.043],
            [0.061, 1.412, 0.043],
            [0.055, 1.27, 0.12],
            [0, 1.129, 0.105],
            [-0.055, 1.27, 0.12],
          ],
          [0, 4, 3, 0, 3, 1, 1, 3, 2],
          0.0035,
        ),
      );
      for (const side of [-1, 1]) {
        const points: Point[] = [
          [side * 0.068, 1.402, 0.054],
          [side * 0.116, 1.325, 0.115],
          [side * 0.084, 1.308, 0.13],
          [side * 0.105, 1.277, 0.132],
          [side * 0.012, 1.132, 0.108],
          [side * 0.041, 1.304, 0.132],
        ];
        const triangles =
          side < 0
            ? [0, 5, 2, 0, 2, 1, 2, 5, 4, 2, 4, 3]
            : [0, 2, 5, 0, 1, 2, 2, 4, 5, 2, 3, 4];
        dark.push(fitPatch(points, triangles));
        seams.push(
          curvedLine(
            [
              [side * 0.068, 1.402, 0.056],
              [side * 0.046, 1.302, 0.135],
              [side * 0.012, 1.132, 0.111],
            ],
            0.0011,
          ),
        );
        dark.push(
          box([side * 0.105, 1.039, 0.095], [0.069, 0.007, 0.005], side * 0.08),
        );
      }
      metal.push(
        ellipsoid([0.018, 1.102, 0.11], [0.0045, 0.0045, 0.002], 10, 8),
      );
      if (wardrobe === 0) {
        seams.push(
          fitPatch(
            [
              [-0.012, 1.365, 0.091],
              [0.012, 1.365, 0.091],
              [0.007, 1.333, 0.111],
              [-0.007, 1.333, 0.111],
            ],
            [0, 3, 1, 1, 3, 2],
            0.007,
          ),
        );
        seams.push(
          fitPatch(
            [
              [-0.006, 1.335, 0.11],
              [0.006, 1.335, 0.11],
              [0.012, 1.207, 0.124],
              [0, 1.19, 0.121],
              [-0.012, 1.207, 0.124],
            ],
            [0, 4, 3, 0, 3, 1, 1, 3, 2],
            0.007,
          ),
        );
      }
    } else {
      if (wardrobe === 1) {
        seams.push(
          curvedLine(
            [
              [0, 0.931, 0.103],
              [0, 1.12, 0.108],
              [0, 1.3, 0.133],
              [0, 1.392, 0.069],
            ],
            0.002,
          ),
        );
        for (let index = 0; index < 5; index++) {
          const y = 1.319 - index * 0.082;
          metal.push(
            ellipsoid(
              [0, y, y > 1.2 ? 0.129 : 0.11],
              [0.0028, 0.0028, 0.0017],
              8,
              6,
            ),
          );
        }
        seams.push(
          curvedLine(
            [
              [-0.067, 1.253, 0.13],
              [-0.067, 1.188, 0.121],
              [-0.104, 1.179, 0.108],
              [-0.137, 1.192, 0.098],
              [-0.137, 1.253, 0.111],
            ],
            0.0012,
          ),
        );
      } else {
        dark.push(
          curvedLine(
            [
              [-0.072, 1.406, 0.047],
              [-0.067, 1.375, 0.073],
              [0, 1.355, 0.084],
              [0.067, 1.375, 0.073],
              [0.072, 1.406, 0.047],
            ],
            0.007,
          ),
        );
        dark.push(
          curvedLine(
            [
              [-0.12, 0.902, 0.06],
              [0, 0.904, 0.105],
              [0.12, 0.902, 0.06],
            ],
            0.006,
          ),
        );
      }
    }
    for (const side of [-1, 1]) {
      light.push(
        fitPatch(
          [
            [side * 0.006, 1.417, 0.049],
            [side * 0.054, 1.429, 0.026],
            [side * 0.07, 1.369, 0.081],
            [side * 0.029, 1.347, 0.099],
          ],
          side < 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3],
          0.017,
        ),
      );
    }
    const belt = new LatheGeometry(
      [new Vector2(0.158, 0), new Vector2(0.158, 0.022)],
      32,
    );
    belt.scale(1, 1, 0.68);
    belt.translate(0, 0.924, 0);
    metal.push(box([0, 0.935, 0.108], [0.028, 0.018, 0.004]));
    return {
      light: combine(light),
      dark: dark.length ? combine(dark) : undefined,
      seams: seams.length ? combine(seams) : undefined,
      metal: combine(metal),
      belt,
    };
  }, [wardrobe, shoulderWidth]);
  useEffect(
    () => () => Object.values(geometry).forEach((part) => part?.dispose()),
    [geometry],
  );
  return (
    <>
      <mesh geometry={geometry.light} material={materials.collar} />
      {geometry.dark && (
        <mesh geometry={geometry.dark} material={materials.shirt} />
      )}
      {geometry.seams && (
        <mesh geometry={geometry.seams} material={materials.seam} />
      )}
      <mesh geometry={geometry.metal} material={materials.metal} />
      <mesh geometry={geometry.belt} material={materials.leather} />
    </>
  );
}

/** Two deformation bones keep continuous garments across bending elbows and knees. */
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
    const geometry = new LatheGeometry(sections, 24);
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
    mesh.castShadow = mesh.receiveShadow = true;
    // A conservative joint-centered bound covers flexion without disabling culling
    // for every off-screen colleague in the district.
    mesh.boundingSphere = new Sphere(new Vector3(0, -joint, 0), joint + 0.12);
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

function Hand({
  material,
  side,
}: {
  material: MeshStandardMaterial;
  side: number;
}) {
  const geometry = useMemo(() => {
    const parts = [ellipsoid([0, 0, 0], [0.035, 0.048, 0.02])];
    for (let finger = 0; finger < 4; finger++) {
      const x = -0.024 + finger * 0.016;
      parts.push(
        ellipsoid(
          [x, -0.044, 0.005],
          [0.008, 0.028 - Math.abs(finger - 1.2) * 0.004, 0.007],
          12,
          10,
        ),
      );
    }
    const thumb = ellipsoid(
      [-side * 0.033, -0.005, 0.014],
      [0.009, 0.025, 0.01],
      12,
      10,
    );
    parts.push(thumb);
    return combine(parts);
  }, [side]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} castShadow />;
}

/** Adult scale, tailored clothing and anatomically articulated, distance-driven movement. */
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
    upperBody = useRef<Group>(null),
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
  const contactShadow = useRef<Mesh>(null);
  const phase = useRef(variant * 1.7),
    clock = useRef(0),
    blend = useRef(0);
  const style = useMemo(
    () => characterStyle(variant, appearance.hair),
    [variant, appearance.hair],
  );
  const materials = useMemo(
    () => createMaterials(appearance, variant),
    [appearance.shirt, appearance.skin, appearance.hair, variant],
  );
  useEffect(
    () => () =>
      Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  );
  useFrame((_, delta) => {
    if (paused) return;
    delta = Math.min(delta, 0.05);
    clock.current += delta;
    const rawSpeed = motion?.current.speed ?? (moving ? 3.3 : 0);
    const speed = Number.isFinite(rawSpeed) ? Math.max(0, rawSpeed) : 0;
    blend.current +=
      (Math.min(speed / 1.1, 1) - blend.current) * Math.min(1, delta * 11);
    phase.current += (delta * speed * Math.PI * 2) / STRIDE_LENGTH;
    const walk = blend.current,
      pose = walkingPose(phase.current);
    const wave = Math.max(0, Math.min(1, motion?.current.interaction ?? 0));
    const idle = reducedMotion
      ? 0
      : Math.sin(clock.current * 1.3 + variant) * 0.002;
    if (body.current)
      body.current.position.y = idle * (1 - walk) + pose.drop * walk;
    if (contactShadow.current)
      contactShadow.current.position.y =
        0.018 - (body.current?.position.y ?? 0);
    if (upperBody.current)
      upperBody.current.rotation.y = reducedMotion
        ? 0
        : Math.cos(phase.current) * 0.028 * walk;
    if (head.current) {
      head.current.rotation.y = reducedMotion
        ? 0
        : Math.sin(clock.current * 0.38 + variant) * 0.025 * (1 - walk);
      head.current.rotation.x = 0.012 * (1 - walk);
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
      leftArm.current.rotation.x =
        (pose.right.hip * 0.62 + 0.08) * walk - 0.035 * (1 - walk);
    if (rightArm.current)
      rightArm.current.rotation.x =
        (pose.left.hip * 0.62 + 0.08) * walk - wave * 0.55;
    if (leftElbow.current) leftElbow.current.rotation.x = -0.12 - 0.12 * walk;
    if (rightElbow.current)
      rightElbow.current.rotation.x = -0.12 - 0.12 * walk - wave * 0.4;
  });
  return (
    <group ref={body}>
      <mesh
        position={[0, 0.75, 0]}
        scale={[1, 1, 0.7]}
        material={materials.trousers}
        castShadow
      >
        <latheGeometry args={[pelvisProfile, 28]} />
      </mesh>
      <group ref={upperBody}>
        <mesh
          position={[0, 0.893, 0]}
          scale={[style.shoulderWidth, 1, 0.63]}
          material={materials.shirt}
          castShadow
          receiveShadow
        >
          <latheGeometry args={[torsoProfile, 40]} />
        </mesh>
        <mesh position={[0, 1.455, 0]} material={materials.skin} castShadow>
          <cylinderGeometry args={[0.059, 0.067, 0.098, 24]} />
        </mesh>
        <Tailoring
          materials={materials}
          wardrobe={style.wardrobe}
          shoulderWidth={style.shoulderWidth}
        />
        <group
          ref={head}
          position={[0, 1.595, 0.003]}
          scale={[0.86, 0.84, 0.9]}
        >
          <Face materials={materials} style={style} />
        </group>
        {[-1, 1].map((side) => (
          <group
            key={`arm-${side}`}
            ref={side < 0 ? leftArm : rightArm}
            position={[side * 0.202 * style.shoulderWidth, 1.332, 0]}
            rotation={[0, 0, side * 0.065]}
          >
            <TailoredLimb
              profile={sleeve}
              material={materials.shirt}
              joint={0.295}
              bend={side < 0 ? leftElbow : rightElbow}
              depth={0.94}
            />
            <group
              ref={side < 0 ? leftElbow : rightElbow}
              position={[0, -0.295, 0]}
            >
              <mesh position={[0, -0.279, 0]} material={materials.collar}>
                <cylinderGeometry args={[0.039, 0.036, 0.028, 20]} />
              </mesh>
              <group position={[0, -0.337, 0.001]}>
                <Hand material={materials.skin} side={side} />
              </group>
              {side < 0 && (
                <group position={[0, -0.272, 0]}>
                  <mesh material={materials.leather}>
                    <cylinderGeometry args={[0.04, 0.04, 0.015, 20, 1, true]} />
                  </mesh>
                  <mesh
                    position={[-0.037, 0, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                    material={materials.metal}
                  >
                    <cylinderGeometry args={[0.016, 0.016, 0.006, 16]} />
                  </mesh>
                </group>
              )}
            </group>
          </group>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group
          key={`leg-${side}`}
          ref={side < 0 ? leftHip : rightHip}
          position={[side * 0.084, 0.8, 0]}
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
                position={[0, 0.001, 0.042]}
                scale={[0.055, 0.046, 0.119]}
                material={materials.leather}
                castShadow
              >
                <sphereGeometry args={[1, 24, 14]} />
              </mesh>
              <mesh
                position={[0, -0.033, 0.04]}
                scale={[0.056, 0.013, 0.12]}
                material={materials.frames}
              >
                <sphereGeometry args={[1, 20, 10]} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
      <mesh
        ref={contactShadow}
        position={[0, 0.018, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.27, 28]} />
        <meshBasicMaterial
          color="#182025"
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
