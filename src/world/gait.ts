/** A distance-driven stride: the stance foot travels backward at body speed and the swing foot clears the floor. */
export function walkingPose(phase: number) {
  const fraction = (((phase / (Math.PI * 2)) % 1) + 1) % 1;
  const stance = fraction < 0.5 ? fraction : (fraction + 0.5) % 1;
  const stanceZ = 0.31 - (stance / 0.5) * 0.62;
  const upper = 0.387,
    lower = 0.355,
    extension = upper + lower - 0.001;
  const drop = Math.sqrt(extension * extension - stanceZ * stanceZ) - extension;
  const leg = (offset: number) => {
    const progress = (fraction + offset) % 1;
    const swing = progress >= 0.5;
    const advance = swing ? (progress - 0.5) / 0.5 : progress / 0.5;
    const z = swing ? -0.31 + advance * 0.62 : 0.31 - advance * 0.62;
    const lift = swing ? Math.sin(advance * Math.PI) * 0.125 : 0;
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
