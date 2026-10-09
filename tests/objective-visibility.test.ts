import { describe, expect, it } from "vitest";
import { defaultObjectiveCollapsed } from "../src/ui/objectiveVisibility";

describe("mobile objective presentation", () => {
  it("starts small on portrait phones and short landscape viewports", () => {
    expect(defaultObjectiveCollapsed(390, 844)).toBe(true);
    expect(defaultObjectiveCollapsed(844, 390)).toBe(true);
    expect(defaultObjectiveCollapsed(710, 1536)).toBe(true);
    expect(defaultObjectiveCollapsed(1280, 480)).toBe(true);
  });
  it("keeps desktop teaching expanded by default", () => {
    expect(defaultObjectiveCollapsed(1280, 720)).toBe(false);
    expect(defaultObjectiveCollapsed(1024, 768)).toBe(false);
  });
});
