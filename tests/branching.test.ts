import { describe, expect, it } from "vitest";
import { content } from "../src/content";
import { validateMissionBranching } from "../src/content/branching";
import type { BranchOutcome, ContentPack, Mission } from "../src/content/types";
import {
  activeStep,
  createState,
  exportProgress,
  mergeProgress,
  migrateState,
  minuteOfDay,
  missionRouteView,
  readCityNavigation,
  scoreDimensions,
  transition,
} from "../src/engine";
import type { GameState } from "../src/engine";

let action = 0;
const packFor = (mission: Mission): ContentPack => ({
  ...content,
  missions: [{ ...mission, prerequisiteIds: [] }],
});
function choose(
  state: GameState,
  pack: ContentPack,
  choiceId: string,
): GameState {
  const step = activeStep(state, pack)!;
  const npc = pack.contacts.find((contact) => contact.id === step.npcId);
  if (
    npc &&
    (minuteOfDay(state.clockMinutes) + step.duration > npc.availability[1] ||
      (state.specialistCapacity[`${state.day}:${npc.id}`] ?? 0) >= 3)
  )
    state = transition(state, { type: "END_DAY" }, pack);
  if (npc && minuteOfDay(state.clockMinutes) < npc.availability[0])
    state = transition(
      state,
      {
        type: "WAIT",
        minutes: npc.availability[0] - minuteOfDay(state.clockMinutes),
      },
      pack,
    );
  if (minuteOfDay(state.clockMinutes) + step.duration + 26 >= 1020)
    state = transition(state, { type: "END_DAY" }, pack);
  if (npc && minuteOfDay(state.clockMinutes) < npc.availability[0])
    state = transition(
      state,
      {
        type: "WAIT",
        minutes: npc.availability[0] - minuteOfDay(state.clockMinutes),
      },
      pack,
    );
  const result = transition(
    state,
    {
      type: "ACT",
      id: `branch-test-${++action}`,
      stepId: step.id,
      choiceId,
      ...(step.expectedValue !== undefined
        ? { value: step.expectedValue }
        : {}),
    },
    pack,
  );
  expect(result.processedActions.length, result.notifications.at(-1)).toBe(
    state.processedActions.length + 1,
  );
  return result;
}
function best(state: GameState, pack: ContentPack): string {
  return [...activeStep(state, pack)!.choices]
    .filter((choice) => !choice.criticalFailure)
    .sort((a, b) => scoreDimensions(b.scores) - scoreDimensions(a.scores))[0]
    .id;
}
function finish(state: GameState, pack: ContentPack): GameState {
  let guard = 0;
  while (state.activeMissionId && guard++ < 25)
    state = choose(state, pack, best(state, pack));
  expect(guard).toBeLessThan(25);
  return state;
}
function run(mission: Mission, ending: BranchOutcome): GameState {
  const pack = packFor(mission);
  let state = transition(
    createState(),
    { type: "START_MISSION", missionId: mission.id, mode: "independent" },
    pack,
  );
  if (ending === "mixed") {
    state = choose(state, pack, "question");
    expect(activeStep(state, pack)?.id).toBe(
      `${mission.id}-s1-branch-question`,
    );
    state = choose(state, pack, "bound");
  } else if (ending === "recovery" || ending === "poor") {
    state = choose(state, pack, "assume");
    expect(activeStep(state, pack)?.id).toBe(`${mission.id}-s1-branch-assume`);
    state = choose(state, pack, ending === "recovery" ? "repair" : "dismiss");
  }
  return finish(state, pack);
}

describe("all-case authored branch graphs", () => {
  it("keeps every case ID, original stage and evidence route with no unreachable or trapped branch", () => {
    expect(content.missions).toHaveLength(52);
    for (const mission of content.missions) {
      expect(validateMissionBranching(mission)).toEqual([]);
      expect(mission.branching!.nodes.length).toBeGreaterThanOrEqual(
        mission.steps.length,
      );
      for (const step of mission.steps) {
        const routes = mission.branching!.routes.filter(
          (route) => route.fromStepId === step.id,
        );
        expect(routes).toHaveLength(step.choices.length);
        expect(
          new Set(routes.map((route) => route.nextStepId ?? route.ending)).size,
        ).toBeGreaterThanOrEqual(2);
        for (const route of routes.filter((row) =>
          row.nextStepId?.includes("-branch-"),
        )) {
          const node = mission.branching!.nodes.find(
            (item) => item.id === route.nextStepId,
          )!;
          expect(node.instruction).toContain(mission.title);
          expect(node.instruction).toContain(step.instruction);
          expect(node.choices).toHaveLength(3);
        }
      }
    }
  });
  it.each(content.missions.map((mission) => [mission.id, mission] as const))(
    "%s supports good, mixed, poor and recovery outcomes through actual transitions",
    (_id, mission) => {
      const results = Object.fromEntries(
        (["good", "mixed", "poor", "recovery"] as BranchOutcome[]).map(
          (outcome) => [outcome, run(mission, outcome)],
        ),
      ) as Record<BranchOutcome, GameState>;
      for (const [outcome, state] of Object.entries(results)) {
        const attempt = state.missions[mission.id].attempts[0];
        expect(attempt.outcome).toBe(outcome);
        expect(attempt.debrief?.outcome).toBe(outcome);
        expect(attempt.debrief?.decisions.length).toBe(attempt.trace.length);
        expect(attempt.debrief?.nextSteps.length).toBeGreaterThan(0);
        expect(attempt.passed).toBe(outcome !== "poor");
      }
      expect(results.good.missions[mission.id].attempts[0].trace).toHaveLength(
        mission.steps.length,
      );
      expect(
        results.recovery.missions[mission.id].attempts[0].trace.some(
          (trace) => trace.choiceId === "repair",
        ),
      ).toBe(true);
      expect(results.mixed.accountHealth[mission.accountId].trust).toBeLessThan(
        results.good.accountHealth[mission.accountId].trust,
      );
      expect(
        results.poor.accountHealth[mission.accountId].risk,
      ).toBeGreaterThan(results.good.accountHealth[mission.accountId].risk);
    },
  );
  it("rejects dangling edges, duplicate routes, missing endings and reachable traps", () => {
    const mission = structuredClone(content.missions[0]);
    mission.branching!.routes[0].nextStepId = "missing";
    mission.branching!.routes[0].ending = undefined;
    expect(validateMissionBranching(mission).join(" ")).toContain(
      "missing target",
    );
    mission.branching!.routes.push({ ...mission.branching!.routes[1] });
    expect(validateMissionBranching(mission).join(" ")).toContain(
      "exactly one branch route",
    );
    const trap = structuredClone(content.missions[0]);
    for (const edge of trap.branching!.routes) {
      edge.nextStepId = edge.fromStepId;
      delete edge.ending;
    }
    expect(validateMissionBranching(trap).join(" ")).toContain("branch trap");
  });
});

describe("branch persistence and consequences", () => {
  const mission = content.missions.find((item) => item.id === "M-A02")!;
  const pack = packFor(mission);
  it("interrupts, reloads and resumes the exact branch without replaying rewards", () => {
    let state = transition(
      createState(),
      { type: "START_MISSION", missionId: mission.id },
      pack,
    );
    state = choose(state, pack, "assume");
    state.extensions.futureVendorField = { opaque: ["preserve", 42] };
    const resumed = migrateState(JSON.parse(JSON.stringify(state))).state;
    expect(resumed.missions).toEqual(state.missions);
    expect(activeStep(resumed, pack)?.id).toContain("branch-assume");
    const selected = transition(
      resumed,
      { type: "START_MISSION", missionId: mission.id, mode: "independent" },
      pack,
    );
    expect(selected.missions[mission.id].attempts).toHaveLength(1);
    expect(selected.extensions.futureVendorField).toEqual({
      opaque: ["preserve", 42],
    });
    expect(missionRouteView(selected, pack, mission.id)?.onBranch).toBe(true);
  });
  it("preserves legacy attempts and their original same-step retry semantics", () => {
    let state = transition(
      createState(),
      { type: "START_MISSION", missionId: mission.id },
      pack,
    );
    const attempt = state.missions[mission.id].attempts[0];
    delete attempt.branchVersion;
    delete attempt.routeNodeId;
    delete attempt.routeMarks;
    delete attempt.relationshipStart;
    state = migrateState(JSON.parse(JSON.stringify(state))).state;
    state = choose(state, pack, "assume");
    expect(activeStep(state, pack)?.id).toBe(mission.steps[0].id);
    expect(state.missions[mission.id].attempts[0].trace).toHaveLength(1);
  });
  it("does not award a pass for a polite early containment ending or erase critical failures", () => {
    let state = transition(
      createState(),
      { type: "START_MISSION", missionId: mission.id },
      pack,
    );
    state = choose(state, pack, "assume");
    state = choose(state, pack, "contain");
    expect(state.missions[mission.id].attempts[0].outcome).toBe("mixed");
    expect(state.missions[mission.id].attempts[0].passed).toBe(false);
    expect(state.tasks.some((task) => task.status === "open")).toBe(true);
    const criticalMission = structuredClone(mission);
    criticalMission.steps[0].choices.find(
      (choice) => choice.id === "assume",
    )!.criticalFailure = "Fabricated completion evidence";
    const criticalPack = packFor(criticalMission);
    let criticalState = transition(
      createState(),
      { type: "START_MISSION", missionId: mission.id },
      criticalPack,
    );
    criticalState = choose(criticalState, criticalPack, "assume");
    expect(criticalState.missions[mission.id].attempts[0].outcome).toBe("poor");
    expect(
      criticalState.missions[mission.id].attempts[0].criticalFailures,
    ).toContain("Fabricated completion evidence");
  });
  it("rejects a stale graph edge before spending time or recording an artifact", () => {
    const pack = packFor(structuredClone(mission));
    const state = transition(
      createState(),
      { type: "START_MISSION", missionId: mission.id },
      pack,
    );
    pack.missions[0].branching!.routes =
      pack.missions[0].branching!.routes.filter(
        (route) =>
          !(
            route.fromStepId === mission.steps[0].id &&
            route.choiceId === "brief"
          ),
      );
    const rejected = transition(
      state,
      {
        type: "ACT",
        id: "missing-edge",
        stepId: mission.steps[0].id,
        choiceId: "brief",
      },
      pack,
    );
    expect(rejected.clockMinutes).toBe(state.clockMinutes);
    expect(rejected.missions).toEqual(state.missions);
    expect(rejected.artifacts).toEqual(state.artifacts);
    expect(rejected.processedActions).not.toContain("missing-edge");
    expect(rejected.notifications.at(-1)).toContain("history is preserved");
  });
  it("keeps wrong arithmetic at its original decision and never unlocks graph evidence", () => {
    const calcMission = content.missions.find((item) =>
      item.steps.some((step) => step.expectedValue !== undefined),
    )!;
    const calcPack = packFor(calcMission);
    let state = transition(
      createState(),
      { type: "START_MISSION", missionId: calcMission.id },
      calcPack,
    );
    while (activeStep(state, calcPack)!.expectedValue === undefined)
      state = choose(state, calcPack, best(state, calcPack));
    const step = activeStep(state, calcPack)!;
    const result = transition(
      state,
      {
        type: "ACT",
        id: "wrong-arithmetic-branch",
        stepId: step.id,
        choiceId: best(state, calcPack),
        value: step.expectedValue! + 1,
      },
      calcPack,
    );
    expect(activeStep(result, calcPack)?.id).toBe(step.id);
    expect(result.missions[calcMission.id].evidenceIds).not.toContain(step.id);
  });
  it("replays all relationship effects as practice and rejects duplicated action IDs", () => {
    const completed = run(mission, "good");
    let state = transition(
      completed,
      { type: "START_MISSION", missionId: mission.id, mode: "replay" },
      pack,
    );
    state = choose(state, pack, "assume");
    const step = activeStep(state, pack)!;
    const request = {
      type: "ACT" as const,
      id: "duplicate-repair",
      stepId: step.id,
      choiceId: "repair",
    };
    state = transition(state, request, pack);
    expect(transition(state, request, pack)).toBe(state);
    state = finish(state, pack);
    expect(state.accountHealth[mission.accountId].trust).toBe(
      completed.accountHealth[mission.accountId].trust,
    );
    expect(state.accountHealth[mission.accountId].risk).toBe(
      completed.accountHealth[mission.accountId].risk,
    );
  });
  it("keeps portable world-only extension history as provenance without replacing live scene state", () => {
    const source = run(mission, "good");
    source.extensions.cityNavigation = { version: 1, location: "hq", floor: 5 };
    source.extensions.relationshipConversations = {
      version: 1,
      sessions: {},
      history: [],
      awarded: ["npc-mentor:discovery"],
    };
    source.extensions.futureVendorField = { portable: "preserved" };
    const exported = exportProgress(source, content);
    const imported = mergeProgress(createState(), exported, content);
    expect(imported.extensions.cityNavigation).toBeUndefined();
    expect(imported.extensions.relationshipConversations).toBeUndefined();
    expect(imported.imports[0].extensions.relationshipConversations).toEqual(
      source.extensions.relationshipConversations,
    );
    expect(imported.extensions.futureVendorField).toEqual(
      source.extensions.futureVendorField,
    );
    expect(migrateState(imported).state.location).toBe("home");
  });
  it("rejects future branch schemas and malformed debriefs without discarding their original data", () => {
    const future = run(mission, "good");
    const raw = JSON.parse(JSON.stringify(future));
    raw.missions[mission.id].attempts[0].branchVersion = 20;
    expect(() => migrateState(raw)).toThrow("unsupported case-branch version");
    const corrupt = JSON.parse(JSON.stringify(future));
    corrupt.missions[mission.id].attempts[0].debrief.decisions = "broken";
    expect(() => migrateState(corrupt)).toThrow("Invalid case-branch debrief");
    expect(corrupt.missions[mission.id].attempts[0].debrief.decisions).toBe(
      "broken",
    );
  });
  it("records a ground-floor walk-in without teleporting, spending time or altering case and relationship evidence", () => {
    const initial = run(mission, "good");
    const original = JSON.parse(JSON.stringify(initial));
    const entered = transition(
      initial,
      { type: "ENTER_LOCATION", location: "cafe" },
      content,
    );
    expect(entered.location).toBe("cafe");
    expect(entered.visitedLocations).toContain("cafe");
    expect(readCityNavigation(entered)).toEqual({
      version: 1,
      location: "cafe",
      floor: 0,
    });
    expect(entered.position).toEqual(initial.position);
    expect(entered.clockMinutes).toBe(initial.clockMinutes);
    expect(entered.missions).toEqual(initial.missions);
    expect(entered.accountHealth).toEqual(initial.accountHealth);
    expect(entered.npcMemory).toEqual(initial.npcMemory);
    expect(initial).toEqual(original);
    const repeated = transition(
      entered,
      { type: "ENTER_LOCATION", location: "cafe" },
      content,
    );
    expect(repeated.events).toEqual(entered.events);
    expect(
      repeated.visitedLocations.filter((id) => id === "cafe"),
    ).toHaveLength(1);
    expect(
      transition(
        entered,
        { type: "ENTER_LOCATION", location: "unmapped" },
        content,
      ).location,
    ).toBe("cafe");
    const upstairs = transition(
      entered,
      { type: "SET_FLOOR", location: "cafe", floor: 3 },
      content,
    );
    expect(
      transition(upstairs, { type: "ENTER_LOCATION", location: "hq" }, content)
        .location,
    ).toBe("cafe");
    const future = structuredClone(entered);
    future.extensions.cityNavigation = { version: 99, opaque: true };
    const protectedState = transition(
      future,
      { type: "ENTER_LOCATION", location: "hq" },
      content,
    );
    expect(protectedState.location).toBe("cafe");
    expect(protectedState.extensions.cityNavigation).toEqual(
      future.extensions.cityNavigation,
    );
    const traveled = transition(
      entered,
      { type: "TRAVEL", location: "hq" },
      content,
    );
    expect(traveled.clockMinutes).toBe(entered.clockMinutes + 10);
  });
  it("persists floor selection without touching world positions or unknown save extensions", () => {
    let state = transition(
      createState(),
      { type: "TRAVEL", location: "hq" },
      content,
    );
    state.extensions.futureVendorField = { version: 8, opaque: true };
    state = transition(
      state,
      { type: "SET_FLOOR", location: "hq", floor: 8 },
      content,
    );
    const resumed = migrateState(JSON.parse(JSON.stringify(state))).state;
    expect(readCityNavigation(resumed)).toEqual({
      version: 1,
      location: "hq",
      floor: 8,
    });
    expect(resumed.extensions.futureVendorField).toEqual(
      state.extensions.futureVendorField,
    );
    expect(
      transition(
        resumed,
        { type: "SET_FLOOR", location: "home", floor: 7 },
        content,
      ).extensions.cityNavigation,
    ).toEqual(resumed.extensions.cityNavigation);
    expect(
      readCityNavigation(
        transition(resumed, { type: "TRAVEL", location: "cafe" }, content),
      ).floor,
    ).toBe(0);
    resumed.extensions.cityNavigation = { version: 99, opaque: "newer city" };
    expect(
      transition(
        resumed,
        { type: "SET_FLOOR", location: "hq", floor: 0 },
        content,
      ).extensions.cityNavigation,
    ).toEqual(resumed.extensions.cityNavigation);
  });
});
