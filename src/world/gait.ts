/** One full left/right cycle travels this distance in world metres. */
export const STRIDE_LENGTH = 1.12;

/** Distance-driven stance with a smooth pelvis and a low, eased swing-foot arc. */
export function walkingPose(phase: number) {
  const safePhase = Number.isFinite(phase) ? phase : 0;
  const fraction = (((safePhase / (Math.PI * 2)) % 1) + 1) % 1;
  const halfStride = STRIDE_LENGTH / 4;
  const upper = 0.387,
    lower = 0.355,
    extension = upper + lower - 0.001;
  // A smooth double-support transfer. Unlike a piecewise straight stance leg,
  // this has no abrupt pelvis velocity reversal at heel strike.
  const support = halfStride * Math.cos(fraction * Math.PI * 2);
  const drop = Math.sqrt(extension * extension - support * support) - extension;
  const leg = (offset: number) => {
    const progress = (fraction + offset) % 1,
      swing = progress >= 0.5;
    const advance = swing ? (progress - 0.5) * 2 : progress * 2;
    // Ease the swing at takeoff and landing instead of an abrupt linear
    // reversal. Keep the arc inside the anatomical leg reach.
    const swingProgress = advance * advance * (3 - 2 * advance);
    const z = swing
      ? -halfStride + swingProgress * halfStride * 2
      : halfStride - advance * halfStride * 2;
    const lift = swing ? Math.sin(advance * Math.PI) ** 2 * 0.085 : 0;
    const vertical = extension + drop - lift;
    const distance = Math.min(extension, Math.hypot(vertical, z));
    const safeCos = (value: number) => Math.max(-1, Math.min(1, value));
    const hip =
      -Math.atan2(z, vertical) -
      Math.acos(
        safeCos(
          (upper * upper + distance * distance - lower * lower) /
            (2 * upper * distance),
        ),
      );
    const knee =
      Math.PI -
      Math.acos(
        safeCos(
          (upper * upper + lower * lower - distance * distance) /
            (2 * upper * lower),
        ),
      );
    return { hip, knee, ankle: -hip - knee, lift, z };
  };
  return { drop, left: leg(0), right: leg(0.5) };
}
