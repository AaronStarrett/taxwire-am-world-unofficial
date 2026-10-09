import type { GameState } from "./types";
export interface CityNavigation {
  version: 1;
  location: string;
  floor: number;
}
export function readCityNavigation(state: GameState): CityNavigation {
  const value = state.extensions.cityNavigation;
  if (
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version === 1 &&
    "location" in value &&
    value.location === state.location &&
    "floor" in value &&
    typeof value.floor === "number" &&
    Number.isInteger(value.floor) &&
    value.floor >= 0 &&
    value.floor <= 30
  )
    return { version: 1, location: state.location, floor: value.floor };
  return { version: 1, location: state.location, floor: 0 };
}
export function unsupportedCityNavigation(state: GameState): boolean {
  const value = state.extensions.cityNavigation;
  return (
    !!value &&
    typeof value === "object" &&
    "version" in value &&
    value.version !== 1
  );
}
