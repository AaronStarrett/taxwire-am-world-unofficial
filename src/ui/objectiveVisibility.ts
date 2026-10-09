/** Presentation only: never advances or rewrites tutorial/case progress. */
export function defaultObjectiveCollapsed(
  width: number,
  height: number,
): boolean {
  return width <= 760 || height <= 500;
}
