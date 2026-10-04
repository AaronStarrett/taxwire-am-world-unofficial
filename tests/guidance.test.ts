import { describe, expect, it } from "vitest";
import { content } from "../src/content";
import { advancedMissionLessons } from "../src/content/advanced-guidance";
import {
  firstDayCustomerBrief,
  getBootcampGuidance,
  getStepGuidance,
  guidedFirstDay,
  modeDefinitions,
  recommendedMissionOrder,
} from "../src/content/guidance";

describe("authored beginner and campaign guidance", () => {
  it("authors separate opening-packet teaching for all advanced cases and capstones", () => {
    const later = content.missions.filter(
      (mission) => mission.stage !== "core",
    );
    expect(Object.keys(advancedMissionLessons).sort()).toEqual(
      later.map((mission) => mission.id).sort(),
    );
    expect(
      new Set(
        later.map(
          (mission) =>
            getStepGuidance(content, mission.id, mission.steps[0].id)?.teach,
        ),
      ).size,
    ).toBe(28);
    for (const mission of later) {
      const teaching = advancedMissionLessons[mission.id];
      const guidance = getStepGuidance(
        content,
        mission.id,
        mission.steps[0].id,
      )!;
      expect(guidance.considerations).toContain(teaching.question);
      expect(teaching.considerations).toHaveLength(3);
    }
  });
  it("starts with business discovery and introduces all permanent core families", () => {
    expect(recommendedMissionOrder[0]).toBe("M-A02");
    expect(recommendedMissionOrder[1]).toBe("M-A01");
    expect(new Set(recommendedMissionOrder).size).toBe(24);
    expect(
      recommendedMissionOrder.every((id) =>
        content.missions.some((m) => m.id === id),
      ),
    ).toBe(true);
    expect(content.bootcamp[0].missionIds.slice(0, 2)).toEqual([
      "M-A02",
      "M-A01",
    ]);
  });
  it("ties first-day facts and owners to available customer evidence", () => {
    expect(
      content.accounts.some((a) => a.id === firstDayCustomerBrief.accountId),
    ).toBe(true);
    expect(
      content.documents.some(
        (d) => d.id === firstDayCustomerBrief.requestDocumentId,
      ),
    ).toBe(true);
    expect(firstDayCustomerBrief.knownFacts.map((f) => f.id)).toEqual([
      "channels",
      "announced-portal",
    ]);
    expect(firstDayCustomerBrief.missingFacts.map((f) => f.id)).toEqual([
      "launch-date",
      "pilot-records",
    ]);
    for (const id of [
      firstDayCustomerBrief.customerFactOwnerId,
      firstDayCustomerBrief.mappingOwnerId,
    ])
      expect(content.contacts.some((c) => c.id === id)).toBe(true);
  });
  it("provides contextual definitions, purpose, completion and three progressive hints for all existing steps", () => {
    for (const m of content.missions)
      for (const s of m.steps) {
        const guidance = getStepGuidance(content, m.id, s.id);
        expect(guidance).toBeDefined();
        expect(guidance?.hints).toHaveLength(3);
        expect(guidance?.terms.length).toBeGreaterThanOrEqual(2);
        expect(guidance?.doneWhen.length).toBeGreaterThan(15);
        expect(guidance?.why.length).toBeGreaterThan(15);
        expect(
          guidance?.evidenceIds.every((id) => s.documentIds.includes(id)),
        ).toBe(true);
      }
  });
  it("does not read hidden later verification or grading answer keys to produce a hint", () => {
    const pack = structuredClone(content),
      m = pack.missions.find((m) => m.id === "M-A02")!,
      s = m.steps[0];
    const before = getStepGuidance(pack, m.id, s.id);
    for (const step of m.steps) {
      step.expectedValue = 938472;
      for (const c of step.choices) {
        c.label = "PRIVATE ANSWER KEY MARKER";
        c.feedback = "PRIVATE ANSWER KEY MARKER";
      }
    }
    const later = pack.documents.find((d) => d.id === "M-A02-verification")!;
    later.body = "UNSEEN LATER RESPONSE MARKER";
    later.title = "UNSEEN LATER RESPONSE MARKER";
    const after = getStepGuidance(pack, m.id, s.id);
    expect(after).toEqual(before);
    expect(JSON.stringify(after)).not.toContain("MARKER");
    expect(
      getStepGuidance(pack, m.id, s.id, "guided", [])?.evidenceIds,
    ).toEqual([]);
  });
  it("tapers automatic direction while keeping optional help in all modes", () => {
    expect(modeDefinitions.guided.automaticTeaching).toBe(true);
    expect(modeDefinitions.assisted.automaticTeaching).toBe(false);
    expect(modeDefinitions.independent.automaticTeaching).toBe(false);
    expect(
      [1, 2, 3, 4, 5, 6, 7].map((n) => getBootcampGuidance(n)?.mode),
    ).toEqual([
      "guided",
      "guided",
      "assisted",
      "assisted",
      "assisted",
      "independent",
      "independent",
    ]);
    const m = content.missions[0],
      s = m.steps[0];
    expect(
      getStepGuidance(content, m.id, s.id, "independent")?.hints,
    ).toHaveLength(3);
  });
  it("uses the agreed interactive first-day sequence without adding a mission family", () => {
    expect(guidedFirstDay.map((s) => s.id)).toEqual([
      "move",
      "camera",
      "mentor",
      "desk",
      "inbox",
      "calendar",
      "accounts",
      "journal",
      "known-missing",
      "owner",
      "update",
      "followup",
      "later-response",
      "verify",
      "debrief",
    ]);
    expect(content.missions).toHaveLength(52);
    expect(
      guidedFirstDay.every(
        (s) =>
          s.hints.length === 3 && Boolean(s.doneWhen) && Boolean(s.interact),
      ),
    ).toBe(true);
    expect(
      guidedFirstDay.find((s) => s.id === "later-response")?.teach,
    ).toContain("Only the current returned reply");
  });
  it("returns no fabricated guidance for an unknown mission or step", () => {
    expect(getStepGuidance(content, "unknown", "unknown")).toBeUndefined();
    expect(getStepGuidance(content, "M-A02", "unknown")).toBeUndefined();
    expect(getBootcampGuidance(8)).toBeUndefined();
  });
});
