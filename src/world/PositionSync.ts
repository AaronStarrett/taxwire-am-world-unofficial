export type ScenePosition = { x: number; z: number; yaw: number };
export type PositionUpdate = "echo" | "stale" | "restore" | "external";

function matches(a: ScenePosition, b: ScenePosition): boolean {
  return (
    Math.hypot(a.x - b.x, a.z - b.z) < 0.001 && Math.abs(a.yaw - b.yaw) < 0.001
  );
}

/** Parent/Canvas commits can acknowledge an older emitted pose after a newer frame. */
export class PositionSynchronizer {
  private pending: ScenePosition[] = [];
  private retired: ScenePosition[] = [];

  constructor(
    private revision = 0,
    private readonly limit = 64,
  ) {}

  emit(position: ScenePosition): void {
    const latest = this.pending[this.pending.length - 1];
    if (!latest || !matches(latest, position))
      this.pending.push({ ...position });
    if (this.pending.length > this.limit)
      this.retire(this.pending.splice(0, this.pending.length - this.limit));
  }

  /** A real restore retires pending echoes so they cannot undo the restored position. */
  reset(): void {
    this.retire(this.pending);
    this.pending = [];
  }

  private retire(positions: ScenePosition[]): void {
    this.retired.push(...positions);
    if (this.retired.length > this.limit)
      this.retired.splice(0, this.retired.length - this.limit);
  }

  receive(position: ScenePosition, revision = this.revision): PositionUpdate {
    if (revision < this.revision) return "stale";
    if (revision > this.revision) {
      this.revision = revision;
      this.reset();
      return "restore";
    }
    const pending = this.pending.findIndex((emission) =>
      matches(emission, position),
    );
    if (pending >= 0) {
      // Intermediate acknowledgements can be skipped by a parent render batch.
      this.retire(this.pending.splice(0, pending + 1));
      return "echo";
    }
    if (this.retired.some((emission) => matches(emission, position)))
      return "stale";
    this.reset();
    return "external";
  }
}
