import { describe, expect, it } from "vitest";
import { content } from "../src/content";
import { validateContent } from "../src/content/validate";
import type { ContentPack } from "../src/content/types";

const copy = () => structuredClone(content);
describe("authored curriculum release boundaries", () => {
  it("validates complete schema and references", () =>
    expect(validateContent(content)).toEqual([]));
  it("preserves shared IDs, permanent lessons and a genuinely populated campaign", () => {
    expect(content.competencies).toHaveLength(24);
    expect(content.accounts).toHaveLength(12);
    expect(content.contacts).toHaveLength(40);
    expect(content.missions.filter((m) => m.stage === "core")).toHaveLength(24);
    expect(content.missions.filter((m) => m.stage === "advanced")).toHaveLength(
      24,
    );
    expect(content.missions.filter((m) => m.stage === "capstone")).toHaveLength(
      4,
    );
    expect(content.missions.find((m) => m.id === "M-T01")?.steps).toHaveLength(
      8,
    );
    expect(new Set(content.missions.map((m) => m.fingerprint)).size).toBe(52);
    for (const lesson of content.competencies) {
      expect(
        content.missions.find((m) => m.id === `M-${lesson.id}`)?.competencyIds,
      ).toContain(lesson.id);
      expect(Object.keys(lesson.glossary).length).toBeGreaterThanOrEqual(3);
    }
  });
  it("rejects missing public evidence, unsafe structure and future-step dependencies", () => {
    const p = copy();
    p.missions[0].steps[0].sourceIds.push("unknown-source");
    expect(validateContent(p).some((e) => e.includes("unknown-source"))).toBe(
      true,
    );
    const future = copy();
    future.missions[0].steps[0].requiresEvidence = [
      future.missions[0].steps[1].id,
    ];
    expect(
      validateContent(future).some((e) => e.includes("evidence must precede")),
    ).toBe(true);
    expect(
      validateContent({ version: "bad" } as ContentPack).length,
    ).toBeGreaterThan(0);
  });
  it("rejects prerequisite cycles and missing passing branches", () => {
    const p = copy();
    p.missions[0].prerequisiteIds = [p.missions[1].id];
    p.missions[1].prerequisiteIds = [p.missions[0].id];
    expect(
      validateContent(p).some((e) => e.includes("Prerequisite cycle")),
    ).toBe(true);
    const dead = copy();
    for (const c of dead.missions[0].steps[0].choices) {
      c.criticalFailure = "test failure";
    }
    expect(
      validateContent(dead).some((e) => e.includes("orphan passing branch")),
    ).toBe(true);
  });
  it("rejects orphan evidence and wrong account-contact attribution", () => {
    const p = copy();
    p.documents.push({ ...p.documents[0], id: "unused-document" });
    expect(
      validateContent(p).some((e) =>
        e.includes("Orphan document unused-document"),
      ),
    ).toBe(true);
    const wrong = copy();
    wrong.accounts[0].contacts[0] = wrong.accounts[1].contacts[0];
    expect(validateContent(wrong).some((e) => e.includes("belongs to"))).toBe(
      true,
    );
  });
  it("provides explicit synthetic calculation assumptions and unreviewed legal-source boundaries", () => {
    const calcs = content.missions.flatMap((m) =>
      m.steps.filter((s) => s.kind === "calculation"),
    );
    expect(calcs.length).toBeGreaterThanOrEqual(8);
    expect(
      calcs.every(
        (s) =>
          Number.isInteger(s.expectedValue) &&
          s.tolerance === 0 &&
          Boolean(s.workedExample),
      ),
    ).toBe(true);
    for (const id of [
      "sst",
      "ny-software",
      "tx-services",
      "eu-oss",
      "uk-services",
      "ca-gst",
    ])
      expect(content.sources.find((s) => s.id === id)?.status).toBe(
        "needs_professional_review",
      );
    expect(content.policies.some((p) => p.includes("retrieval date"))).toBe(
      true,
    );
  });
  it("keeps the first meeting reachable and choices within documented score units", () => {
    const m = content.missions.find((x) => x.id === "M-T01")!;
    const meeting = m.steps.find((s) => s.kind === "meeting")!;
    const npc = content.contacts.find((c) => c.id === meeting.npcId)!;
    const before =
      m.steps
        .slice(0, m.steps.indexOf(meeting))
        .reduce((n, s) => n + s.duration, 0) + 540;
    expect(before).toBeGreaterThanOrEqual(npc.availability[0]);
    expect(before).toBeLessThan(npc.availability[1]);
    for (const mission of content.missions)
      for (const s of mission.steps)
        for (const c of s.choices)
          expect(Object.values(c.scores).every((n) => n >= 0 && n <= 100)).toBe(
            true,
          );
  });
  it("provides different advanced facts and reusable outputs rather than shared answer strings", () => {
    const advanced = content.missions.filter((m) => m.stage === "advanced");
    expect(new Set(advanced.map((m) => m.facts.join("|"))).size).toBe(24);
    expect(new Set(advanced.map((m) => m.output)).size).toBe(24);
    expect(
      new Set(
        advanced.map(
          (m) => m.steps[2].choices.find((c) => c.id === "evidence")?.label,
        ),
      ).size,
    ).toBe(24);
  });
});
