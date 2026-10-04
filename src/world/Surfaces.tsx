import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  CanvasTexture,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Material,
  type Texture,
} from "three";

export type SurfaceName =
  | "wall"
  | "wood"
  | "fabric"
  | "metal"
  | "glass"
  | "stone"
  | "paper"
  | "leaves"
  | "screen"
  | "brass"
  | "rubber";
type SurfaceCache = {
  get: (surface: SurfaceName, color?: string) => MeshStandardMaterial;
  shadow: Texture;
};
const SurfaceContext = createContext<SurfaceCache | undefined>(undefined);

function texture(kind: "wood" | "fabric" | "stone" | "shadow") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  if (kind === "shadow") {
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 125);
    gradient.addColorStop(0, "rgba(0,0,0,.38)");
    gradient.addColorStop(0.45, "rgba(0,0,0,.2)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  } else {
    ctx.fillStyle =
      kind === "wood" ? "#d5c6ae" : kind === "fabric" ? "#c3c2bb" : "#dbdedc";
    ctx.fillRect(0, 0, 256, 256);
    let seed = 39181;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    if (kind === "wood")
      for (let line = 0; line < 120; line++) {
        const y = random() * 256;
        ctx.strokeStyle = `rgba(82,53,32,${0.04 + random() * 0.08})`;
        ctx.lineWidth = 0.3 + random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(
          70,
          y + random() * 10 - 5,
          160,
          y + random() * 12 - 6,
          256,
          y + random() * 6 - 3,
        );
        ctx.stroke();
      }
    else if (kind === "fabric")
      for (let line = 0; line < 256; line += 3) {
        ctx.strokeStyle =
          line % 6 ? "rgba(255,255,255,.14)" : "rgba(30,39,35,.08)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(line, 0);
        ctx.lineTo(line, 256);
        ctx.moveTo(0, line);
        ctx.lineTo(256, line);
        ctx.stroke();
      }
    else
      for (let mark = 0; mark < 900; mark++) {
        ctx.fillStyle = `rgba(${random() > 0.5 ? "255,255,255" : "54,67,62"},.04)`;
        ctx.fillRect(
          random() * 256,
          random() * 256,
          0.7 + random() * 3,
          0.7 + random() * 2,
        );
      }
  }
  const output = new CanvasTexture(canvas);
  output.colorSpace = SRGBColorSpace;
  if (kind !== "shadow") {
    output.wrapS = output.wrapT = RepeatWrapping;
    output.repeat.set(kind === "wood" ? 3 : 4, kind === "wood" ? 1 : 4);
  }
  return output;
}

/** Original procedural material textures; no remote images, HDRs, fonts, or asset licenses. */
export function SurfaceProvider({ children }: { children: ReactNode }) {
  const cache = useMemo(() => {
    const maps = {
      wood: texture("wood"),
      fabric: texture("fabric"),
      stone: texture("stone"),
      shadow: texture("shadow"),
    };
    const materials = new Map<string, MeshStandardMaterial>();
    const defaults: Record<SurfaceName, string> = {
      wall: "#e2e3dc",
      wood: "#c3a379",
      fabric: "#64746f",
      metal: "#8f999c",
      glass: "#abc8cc",
      stone: "#c1c9c8",
      paper: "#eeeae0",
      leaves: "#38644b",
      screen: "#173b40",
      brass: "#ba9c68",
      rubber: "#303c3e",
    };
    const get = (surface: SurfaceName, color?: string) => {
      const key = surface + ":" + (color ?? defaults[surface]);
      let result = materials.get(key);
      if (result) return result;
      if (surface === "glass")
        result = new MeshPhysicalMaterial({
          color: color ?? defaults.glass,
          transparent: true,
          opacity: 0.2,
          roughness: 0.13,
          metalness: 0.04,
          clearcoat: 1,
          clearcoatRoughness: 0.15,
          depthWrite: false,
          side: DoubleSide,
        });
      else
        result = new MeshStandardMaterial({
          color: color ?? defaults[surface],
          roughness:
            surface === "metal"
              ? 0.28
              : surface === "brass"
                ? 0.32
                : surface === "screen"
                  ? 0.3
                  : surface === "fabric"
                    ? 0.94
                    : surface === "wood"
                      ? 0.54
                      : surface === "leaves"
                        ? 0.64
                        : 0.77,
          metalness: surface === "metal" ? 0.75 : surface === "brass" ? 0.7 : 0,
          ...(surface === "leaves" ? { side: DoubleSide } : {}),
          ...(surface === "wood"
            ? { map: maps.wood, bumpMap: maps.wood }
            : surface === "fabric"
              ? { map: maps.fabric, bumpMap: maps.fabric }
              : surface === "stone"
                ? { map: maps.stone }
                : {}),
          bumpScale: surface === "fabric" ? 0.013 : 0.004,
          emissive: surface === "screen" ? "#204844" : "#000000",
          emissiveIntensity: surface === "screen" ? 0.18 : 0,
        });
      materials.set(key, result);
      return result;
    };
    return {
      get,
      shadow: maps.shadow,
      dispose: () => {
        materials.forEach((material: Material) => material.dispose());
        Object.values(maps).forEach((map) => map.dispose());
      },
    };
  }, []);
  useEffect(() => () => cache.dispose(), [cache]);
  return (
    <SurfaceContext.Provider value={cache}>{children}</SurfaceContext.Provider>
  );
}
export function useSurface(surface: SurfaceName, color?: string) {
  const cache = useContext(SurfaceContext);
  if (!cache) throw new Error("Missing scene material provider");
  return cache.get(surface, color);
}
export function useContactShadow() {
  const cache = useContext(SurfaceContext);
  if (!cache) throw new Error("Missing scene material provider");
  return cache.shadow;
}
