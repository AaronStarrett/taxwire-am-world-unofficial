import { describe, expect, it } from "vitest";
import type { Choice, ContentPack, Mission, Step } from "../src/content/types";
import {
  activeStep,
  convertTimeZone,
  createState,
  formatTime,
  makeCoachingPacket,
  missionAvailable,
  npcFacts,
  PASS_SCORE,
  reconcile,
  scoreDimensions,
  taxExclusive,
  taxInclusive,
  transition,
} from "../src/engine";
import type { GameState } from "../src/engine";
import { safeCoachReply } from "../src/engine/coach";

const good: Choice = {
  id: "good",
  label: "Verify the records and state bounded ownership",
  feedback: "Evidence supports the action.",
  scores: {
    tax: 90,
    execution: 90,
    communication: 90,
    judgment: 90,
    organization: 90,
  },
  trustDelta: 3,
  riskDelta: -2,
};
const poor: Choice = {
  id: "poor",
  label: "Forward without investigating",
  feedback: "Supply a fact pattern and retain ownership.",
  scores: {
    tax: 20,
    execution: 20,
    communication: 20,
    judgment: 20,
    organization: 20,
  },
};
const critical: Choice = {
  ...poor,
  id: "fabricate",
  criticalFailure: "Fabricated completion evidence",
};
function step(id = "step-1", patch: Partial<Step> = {}): Step {
  return {
    id,
    kind: "research",
    title: "Read a synthetic record",
    instruction: "Inspect evidence and choose a bounded action.",
    duration: 20,
    location: "research",
    documentIds: ["doc-1"],
    sourceIds: ["source-1"],
    choices: [good, poor, critical],
    ...patch,
  };
}
function mission(
  id = "M-T01",
  steps = [step()],
  patch: Partial<Mission> = {},
): Mission {
  return {
    id,
    version: 1,
    title: "Synthetic lifecycle",
    competencyIds: ["T01"],
    accountId: "acct-harborworks",
    stage: "core",
    prerequisiteIds: [],
    briefing: "Synthetic facts only.",
    facts: ["Fictional account; no real tax conclusion."],
    dueMinutes: 300,
    fingerprint: `${id}-case-1`,
    steps,
    consequence: "Ownership stays visible.",
    output: "Evidence-based lifecycle map",
    ...patch,
  };
}
export function contentWith(missions = [mission()]): ContentPack {
  return {
    version: "engine-fixture-v1",
    missions,
    competencies: [
      {
        id: "T01",
        title: "Lifecycle",
        explanation: "Separate collection, filing, payment and verification.",
        example: "Synthetic example",
        glossary: { filing: "A return submission" },
        misconception: "Email does not close an issue.",
        guidedPractice: "Read a lifecycle.",
        independentPractice: "Assign ownership.",
        rubric: ["Evidence", "Named owner"],
        sourceIds: ["source-1"],
        workProduct: "Lifecycle map",
      },
    ],
    accounts: [
      {
        id: "acct-harborworks",
        name: "HarborWorks Software",
        business: "Fictional software",
        entities: ["Synthetic entity"],
        products: ["Subscription"],
        channels: ["Direct"],
        systems: ["Synthetic ledger"],
        geography: ["Training jurisdiction"],
        priorities: ["Evidence"],
        renewalDay: 20,
        annualValueMinor: 120000,
        currency: "USD",
        contacts: ["specialist"],
        research: [],
      },
    ],
    contacts: [
      {
        id: "specialist",
        name: "Synthetic Specialist",
        role: "Tax specialist",
        accountId: "acct-harborworks",
        location: "research",
        goals: "Investigate bounded facts.",
        knows: ["doc-1", "Training collection boundaries"],
        preference: "Written facts",
        authority: "Fictional advice review, no payment authority.",
        availability: [540, 1020],
        color: "#7258f5",
      },
    ],
    sources: [
      {
        id: "source-1",
        title: "Synthetic policy",
        url: "https://example.invalid/training",
        jurisdiction: "Synthetic",
        checkedAt: "2026-10-03",
        applicablePeriod: "Synthetic period",
        facts: "Training only",
        uncertainty: "Not current law",
        status: "fictional_policy",
        summary: "Synthetic policy",
      },
    ],
    documents: [
      {
        id: "doc-1",
        title: "Synthetic document",
        accountId: "acct-harborworks",
        kind: "ledger",
        body: "Fictional evidence",
        sourceIds: ["source-1"],
      },
    ],
    bootcamp: [],
    policies: ["Fictional policies only"],
  };
}
function start(
  content = contentWith(),
  mode: "guided" | "independent" | "replay" = "independent",
  state = createState(),
): GameState {
  return transition(
    state,
    { type: "START_MISSION", missionId: content.missions[0].id, mode },
    content,
  );
}
function choose(
  state: GameState,
  content: ContentPack,
  id = "action-1",
  choiceId = "good",
  value?: number,
): GameState {
  return transition(
    state,
    {
      type: "ACT",
      stepId: activeStep(state, content)!.id,
      choiceId,
      id,
      ...(value !== undefined ? { value } : {}),
    },
    content,
  );
}

describe("pure engine and assessment", () => {
  it("runs headlessly and leaves the input state unchanged", () => {
    const original = createState();
    const next = start();
    expect(original.missions).toEqual({});
    expect(next.activeMissionId).toBe("M-T01");
    expect(next).not.toBe(original);
  });
  it("uses the same state/actions for world and workbench", () => {
    const content = contentWith();
    const base = start(content);
    const workbench = transition(
      base,
      { type: "SETTINGS", patch: { workbench: true } },
      content,
    );
    const worldResult = choose(base, content);
    const workResult = choose(workbench, content);
    expect(workResult.missions).toEqual(worldResult.missions);
    expect(workResult.events).toEqual(worldResult.events);
  });
  it("locks prerequisites until evidence-backed completion", () => {
    const prerequisite = mission();
    const dependent = mission("M-T02", [step()], {
      prerequisiteIds: ["M-T01"],
    });
    const content = contentWith([prerequisite, dependent]);
    let state = createState();
    expect(missionAvailable(state, dependent)).toBe(false);
    state = choose(start(content), content);
    expect(missionAvailable(state, dependent)).toBe(true);
  });
  it("requires 70 points and applies transparent 25/25/20/15/15 weights", () => {
    expect(PASS_SCORE).toBe(70);
    expect(
      scoreDimensions({
        tax: 100,
        execution: 0,
        communication: 0,
        judgment: 0,
        organization: 0,
      }),
    ).toBe(25);
    expect(
      scoreDimensions({
        tax: 0,
        execution: 0,
        communication: 100,
        judgment: 100,
        organization: 100,
      }),
    ).toBe(50);
  });
  it("distinguishes guided learning from independent demonstrated evidence", () => {
    const content = contentWith();
    expect(
      choose(start(content, "guided"), content).competencies.T01.level,
    ).toBe("practiced");
    const independent = choose(start(content, "independent"), content);
    expect(independent.competencies.T01.level).toBe("demonstrated");
    expect(independent.competencies.T01.evidenceMissionIds).toEqual(["M-T01"]);
  });
  it("records critical failure then remediation without rewriting history", () => {
    const content = contentWith();
    const failed = choose(start(content), content, "failure", "fabricate");
    expect(failed.missions["M-T01"].status).toBe("needs_remediation");
    expect(failed.missions["M-T01"].attempts[0].passed).toBe(false);
    const fixed = choose(start(content, "independent", failed), content, "fix");
    expect(fixed.missions["M-T01"].status).toBe("completed");
    expect(fixed.missions["M-T01"].attempts).toHaveLength(2);
    expect(fixed.missions["M-T01"].attempts[1].remediationOf).toBe(
      "M-T01-attempt-1",
    );
    expect(fixed.missions["M-T01"].criticalFailures).toEqual([
      "Fabricated completion evidence",
    ]);
  });
  it("keeps unsupported actions on the same step for correction and records the trace", () => {
    const content = contentWith();
    const poorResult = choose(start(content), content, "poor-action", "poor");
    expect(activeStep(poorResult, content)?.id).toBe("step-1");
    expect(poorResult.missions["M-T01"].evidenceIds).toEqual([]);
    expect(poorResult.missions["M-T01"].attempts[0].trace).toHaveLength(1);
  });
  it("protects duplicate actions, artifacts, time, and relationship awards", () => {
    const content = contentWith([
      mission("M-T01", [step("step-1"), step("step-2")]),
    ]);
    const result = choose(start(content), content);
    const duplicate = transition(
      result,
      { type: "ACT", stepId: "step-1", choiceId: "good", id: "action-1" },
      content,
    );
    expect(duplicate).toBe(result);
    expect(result.clockMinutes).toBe(20);
    expect(result.artifacts).toHaveLength(1);
    expect(result.accountHealth["acct-harborworks"].trust).toBe(53);
  });
  it("case replay cannot farm relationship rewards", () => {
    const content = contentWith();
    const completed = choose(start(content), content);
    const replayed = choose(
      start(content, "replay", completed),
      content,
      "replay",
    );
    expect(replayed.accountHealth["acct-harborworks"].trust).toBe(
      completed.accountHealth["acct-harborworks"].trust,
    );
  });
  it("new guided or independent attempt IDs cannot farm a previously awarded case step", () => {
    const content = contentWith();
    const guided = choose(start(content, "guided"), content, "guided-first");
    const independent = choose(
      start(content, "independent", guided),
      content,
      "independent-second",
    );
    const again = choose(
      start(content, "guided", independent),
      content,
      "guided-third",
    );
    expect(independent.competencies.T01.level).toBe("demonstrated");
    expect(again.missions["M-T01"].attempts).toHaveLength(3);
    expect(again.accountHealth["acct-harborworks"].trust).toBe(53);
    expect(again.accountHealth["acct-harborworks"].risk).toBe(28);
  });
  it("requires recorded prior-step evidence and retains the active step if absent", () => {
    const content = contentWith([
      mission("M-T01", [step("s1"), step("s2", { requiresEvidence: ["s1"] })]),
    ]);
    const state = choose(start(content), content);
    state.missions["M-T01"].evidenceIds = [];
    const blocked = choose(state, content, "second");
    expect(blocked.missions["M-T01"].stepIndex).toBe(1);
    expect(blocked.notifications.at(-1)).toContain("required evidence");
  });
  it("requires correct integer calculation evidence before progression", () => {
    const content = contentWith([
      mission("M-T01", [
        step("calc", { kind: "calculation", expectedValue: 825, tolerance: 0 }),
      ]),
    ]);
    const initial = start(content);
    const missing = choose(initial, content);
    expect(missing.clockMinutes).toBe(0);
    const wrong = choose(initial, content, "wrong", "good", 824);
    expect(activeStep(wrong, content)?.id).toBe("calc");
    const correct = choose(wrong, content, "correct", "good", 825);
    expect(
      correct.missions["M-T01"].attempts[0].trace[1].calculation?.correct,
    ).toBe(true);
  });
  it("does not masquerade learner free-text as expert grading", () => {
    const content = contentWith();
    const initial = start(content);
    const result = transition(
      initial,
      {
        type: "ACT",
        stepId: "step-1",
        choiceId: "good",
        id: "draft",
        draft: "My fictional customer update.",
      },
      content,
    );
    expect(result.artifacts[0].body).toContain(
      "self-review; no approved free-text evaluator",
    );
    expect(makeCoachingPacket(result, content)).toContain(
      "criticalFailuresRequireRemediation",
    );
  });
});
describe("business clock, scheduling, NPC boundaries, and finite capacity", () => {
  it("starts at Day 1 09:00 and study/settings/position do not advance time", () => {
    const content = contentWith();
    let state = createState();
    expect(formatTime(state.clockMinutes)).toBe("Day 1 · 09:00");
    state = transition(
      state,
      { type: "POSITION", x: 10, z: 3, yaw: 1 },
      content,
    );
    state = transition(
      state,
      { type: "SETTINGS", patch: { reducedMotion: true } },
      content,
    );
    expect(state.clockMinutes).toBe(0);
  });
  it("closes the day deliberately and resumes the authoritative next-day clock", () => {
    const state = transition(createState(), { type: "END_DAY" }, contentWith());
    expect(state.day).toBe(2);
    expect(state.clockMinutes).toBe(480);
    expect(formatTime(state.clockMinutes)).toBe("Day 2 · 09:00");
  });
  it("enforces a finite workday including the final close buffer", () => {
    const content = contentWith();
    let state = transition(
      createState(),
      { type: "WAIT", minutes: 240 },
      content,
    );
    state = transition(state, { type: "WAIT", minutes: 238 }, content);
    const blocked = transition(state, { type: "WAIT", minutes: 3 }, content);
    expect(blocked.clockMinutes).toBe(478);
    expect(blocked.notifications.at(-1)).toContain("remaining workday");
  });
  it("marks deadlines only after simulated actions pass the due time", () => {
    const content = contentWith();
    let state = transition(
      createState(),
      {
        type: "TASK",
        id: "promise",
        title: "Verify follow-up",
        owner: "Learner",
        dueMinute: 20,
      },
      content,
    );
    state = transition(state, { type: "WAIT", minutes: 20 }, content);
    expect(state.events.some((event) => event.type === "task-overdue")).toBe(
      false,
    );
    state = transition(state, { type: "WAIT", minutes: 1 }, content);
    expect(
      state.events.filter((event) => event.type === "task-overdue"),
    ).toHaveLength(1);
    state = transition(state, { type: "WAIT", minutes: 1 }, content);
    expect(
      state.events.filter((event) => event.type === "task-overdue"),
    ).toHaveLength(1);
  });
  it("converts explicit offsets across day boundaries without a host timezone", () => {
    expect(convertTimeZone(30, 60, -300)).toEqual({
      minute: 1110,
      dayDelta: -1,
    });
    expect(convertTimeZone(1380, -300, 60)).toEqual({
      minute: 300,
      dayDelta: 1,
    });
  });
  it("accepts adjacent appointments and rejects overlap and out-of-hours booking", () => {
    const content = contentWith();
    let state = transition(
      createState(),
      {
        type: "SCHEDULE",
        id: "a",
        npcId: "specialist",
        day: 1,
        minute: 540,
        duration: 30,
      },
      content,
    );
    const overlap = transition(
      state,
      {
        type: "SCHEDULE",
        id: "b",
        npcId: "specialist",
        day: 1,
        minute: 569,
        duration: 30,
      },
      content,
    );
    expect(overlap.appointments).toHaveLength(1);
    state = transition(
      state,
      {
        type: "SCHEDULE",
        id: "c",
        npcId: "specialist",
        day: 1,
        minute: 570,
        duration: 30,
      },
      content,
    );
    expect(state.appointments).toHaveLength(2);
    expect(
      transition(
        state,
        {
          type: "SCHEDULE",
          id: "d",
          npcId: "specialist",
          day: 1,
          minute: 510,
          duration: 30,
        },
        content,
      ).appointments,
    ).toHaveLength(2);
  });
  it("checks NPC availability instead of making contacts instantly available", () => {
    const content = contentWith([
      mission("M-T01", [
        step("meeting", { kind: "meeting", npcId: "specialist" }),
      ]),
    ]);
    content.contacts[0].availability = [600, 660];
    const initial = start(content);
    const blocked = choose(initial, content);
    expect(blocked.clockMinutes).toBe(0);
    expect(blocked.notifications.at(-1)).toContain("available");
  });
  it("exposes only the NPC’s explicitly authored knowledge", () => {
    const content = contentWith();
    expect(npcFacts("specialist", content)).toEqual([
      "doc-1",
      "Training collection boundaries",
    ]);
    expect(npcFacts("unknown", content)).toEqual([]);
    const facts = npcFacts("specialist", content);
    facts.push("Not allowed");
    expect(content.contacts[0].knows).toHaveLength(2);
  });
  it("reproduces specialist queue delays and event order from the same seed", () => {
    const content = contentWith([
      mission("M-T01", [
        step("coord", { kind: "coordinate", npcId: "specialist" }),
      ]),
    ]);
    const first = choose(
      start(content, "independent", createState(undefined, 99)),
      content,
    );
    const second = choose(
      start(content, "independent", createState(undefined, 99)),
      content,
    );
    expect(first.events).toEqual(second.events);
    expect(first.rngState).toBe(second.rngState);
    expect(
      first.events.some((event) => event.type === "specialist-queue"),
    ).toBe(true);
  });
  it("bounds daily specialist capacity and resets it by simulated day", () => {
    const content = contentWith([
      mission("M-T01", [
        step("a", { npcId: "specialist" }),
        step("b", { npcId: "specialist" }),
        step("c", { npcId: "specialist" }),
        step("d", { npcId: "specialist" }),
      ]),
    ]);
    let state = start(content);
    for (let index = 0; index < 3; index += 1)
      state = choose(state, content, `capacity-${index}`);
    const blocked = choose(state, content, "fourth");
    expect(blocked.missions["M-T01"].stepIndex).toBe(3);
    state = transition(blocked, { type: "END_DAY" }, content);
    state = choose(state, content, "tomorrow");
    expect(state.missions["M-T01"].status).toBe("completed");
  });
});
describe("money, audit trails, and verified closure", () => {
  it("calculates exclusive and inclusive synthetic rates in integer minor units", () => {
    expect(taxExclusive(10000, 825)).toEqual({
      netMinor: 10000,
      taxMinor: 825,
      grossMinor: 10825,
    });
    expect(taxInclusive(10825, 825)).toEqual({
      netMinor: 10000,
      taxMinor: 825,
      grossMinor: 10825,
    });
    expect(taxExclusive(-100, 500).taxMinor).toBe(-5);
  });
  it("rounds half minor units away from zero and refuses fractional money", () => {
    expect(taxExclusive(1, 5000).taxMinor).toBe(1);
    expect(taxExclusive(-1, 5000).taxMinor).toBe(-1);
    expect(() => taxExclusive(1.5, 500)).toThrow();
  });
  it("preserves source records and corrections and forbids mixed currencies", () => {
    const records = [
      { id: "invoice", currency: "USD", amountMinor: 10000 },
      {
        id: "credit",
        currency: "USD",
        amountMinor: -1000,
        corrects: "invoice",
      },
    ];
    expect(reconcile(records, "USD")).toEqual({
      totalMinor: 9000,
      history: records,
    });
    expect(() =>
      reconcile(
        [...records, { id: "eur", currency: "EUR", amountMinor: 2 }],
        "USD",
      ),
    ).toThrow("one currency");
  });
  it("rejects ownerless commitments", () => {
    const state = transition(
      createState(),
      {
        type: "TASK",
        id: "unowned",
        title: "Urgent synthetic notice",
        owner: "",
        dueMinute: 100,
      },
      contentWith(),
    );
    expect(state.tasks).toHaveLength(0);
    expect(state.notifications.at(-1)).toContain("named owner");
  });
  it("requires recorded resolution evidence rather than a sent email claim", () => {
    const content = contentWith();
    let state = transition(
      start(content),
      {
        type: "TASK",
        id: "issue",
        title: "Resolve discrepancy",
        owner: "Learner",
        dueMinute: 100,
      },
      content,
    );
    const unsupported = transition(
      state,
      {
        type: "COMPLETE_TASK",
        id: "close-1",
        taskId: "issue",
        evidence: "email sent",
      },
      content,
    );
    expect(unsupported.tasks[0].status).toBe("open");
    state = choose(state, content);
    const closed = transition(
      state,
      {
        type: "COMPLETE_TASK",
        id: "close-2",
        taskId: "issue",
        evidence: "artifact-action-1",
      },
      content,
    );
    expect(closed.tasks[0].status).toBe("completed");
    expect(
      transition(
        closed,
        {
          type: "COMPLETE_TASK",
          id: "close-2",
          taskId: "issue",
          evidence: "artifact-action-1",
        },
        content,
      ),
    ).toBe(closed);
  });
  it("requires evidence-backed follow-up for residual task closure", () => {
    const taskChoice = {
      ...good,
      createsTask: "Verify reconciliation and explain customer impact",
    };
    const content = contentWith([
      mission("M-T01", [
        step("research", { choices: [taskChoice] }),
        step("followup", { kind: "followup", requiresEvidence: ["research"] }),
      ]),
    ]);
    let state = choose(start(content), content);
    expect(state.tasks[0].status).toBe("open");
    state = choose(state, content, "followup");
    expect(state.tasks[0].status).toBe("completed");
    expect(state.tasks[0].evidence).toContain("research");
    expect(state.missions["M-T01"].status).toBe("completed");
  });
  it("works with authored dialogue when an optional provider is disabled or fails", async () => {
    const request = {
      npcId: "specialist",
      visibleFacts: ["Synthetic fact"],
      learnerDraft: "Question",
      authoredReply: "Bounded authored reply",
    };
    expect(await safeCoachReply(request)).toEqual({
      text: "Bounded authored reply",
      source: "authored",
    });
    expect(
      await safeCoachReply(request, {
        enabled: true,
        async reply() {
          throw new Error("network");
        },
      }),
    ).toEqual({ text: "Bounded authored reply", source: "authored" });
  });
});
