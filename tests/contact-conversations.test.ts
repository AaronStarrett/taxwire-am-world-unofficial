import { describe, expect, it } from "vitest";
import { content } from "../src/content";
import { createState, transition, migrateState } from "../src/engine";
import type { GameState } from "../src/engine/types";
import {
  applyConversationAction,
  cafeMeetingContactId,
  conversationView,
  readRelationshipConversations,
  reconcileConversationAppointments,
  validateRelationshipConversations,
} from "../src/engine/conversations";
import type { ConversationTopic } from "../src/engine/conversations";
import { appointmentClock, dayAt, WORKDAY_MINUTES } from "../src/engine/time";

let serial = 0;
const id = () => `contact-test-${++serial}`;
const mentor = "npc-mentor";
function fresh(npcId = mentor): GameState {
  const contact = content.contacts.find((c) => c.id === npcId)!;
  const state = createState();
  state.clockMinutes = Math.max(0, contact.availability[0] - 540);
  state.location = contact.location;
  return state;
}
function start(
  state: GameState,
  topic: ConversationTopic = "discovery",
  npcId = mentor,
): GameState {
  return transition(
    state,
    { type: "START_CONVERSATION", id: id(), npcId, topic },
    content,
  );
}
function talk(state: GameState, choiceId: string, npcId = mentor): GameState {
  const node = conversationView(state, content, npcId)?.node;
  expect(node, `${npcId}: missing node for ${choiceId}`).toBeDefined();
  expect(
    node?.choices.some((c) => c.id === choiceId),
    `${node?.id} lacks ${choiceId}`,
  ).toBe(true);
  return transition(
    state,
    { type: "TALK", id: id(), npcId, nodeId: node!.id, choiceId },
    content,
  );
}
function route(state: GameState, choices: string[], npcId = mentor): GameState {
  for (const choice of choices) state = talk(state, choice, npcId);
  return state;
}
function moveClock(state: GameState, clockMinutes: number): GameState {
  const next = structuredClone(state);
  next.clockMinutes = clockMinutes;
  next.day = dayAt(clockMinutes);
  return next;
}
function arrive(state: GameState, npcId = mentor): GameState {
  const a = conversationView(state, content, npcId)!.session!.appointment!;
  state = transition(state, { type: "TRAVEL", location: "cafe" }, content);
  const wait = appointmentClock(a.day, a.minute) - state.clockMinutes;
  if (wait > 0)
    state = transition(state, { type: "WAIT", minutes: wait }, content);
  return talk(state, "arrive", npcId);
}
const good = ["ask_goal", "targeted", "name_gap", "owned_followup"];

describe("authored relationship conversations", () => {
  it("provides role, real authored account context and four-stage discovery for all 40 contacts", () => {
    expect(content.contacts).toHaveLength(40);
    const openings = new Set<string>();
    for (const contact of content.contacts) {
      let state = start(fresh(contact.id), "discovery", contact.id);
      const view = conversationView(state, content, contact.id)!;
      openings.add(view.node!.text);
      expect(view.node!.text).toContain(contact.name);
      expect(view.node!.text).toContain(contact.role);
      expect(view.topics).toEqual([
        "discovery",
        "coffee",
        "repair",
        "scope",
        "handoff",
      ]);
      if (view.account) expect(view.node!.text).toContain(view.account.name);
      state = route(state, good, contact.id);
      const after = conversationView(state, content, contact.id)!;
      expect(after.debrief?.outcome).toBe("good");
      expect(after.debrief?.route).toHaveLength(4);
      expect(after.relationship.trust).toBe(54);
      expect(after.relationship.interactions).toBe(1);
      expect(after.debrief?.whatWorked.join(" ")).toContain(contact.preference);
      expect(
        validateRelationshipConversations(
          state.extensions.relationshipConversations,
        ),
      ).toBe(true);
      expect(state.missions).toEqual({});
    }
    expect(openings.size).toBe(40);
  });

  it("changes later nodes and produces distinct good, mixed, poor and recovery routes", () => {
    const branches = [
      { choices: good, outcome: "good", delta: 4, risk: -2 },
      {
        choices: ["triage", "bounded", "retain"],
        outcome: "mixed",
        delta: 0,
        risk: 1,
      },
      {
        choices: ["assume", "defend", "leave"],
        outcome: "poor",
        delta: -6,
        risk: 4,
      },
      {
        choices: ["assume", "reset", "specific", "commit"],
        outcome: "recovery",
        delta: 2,
        risk: -1,
      },
    ];
    const routes = new Set<string>();
    const npcId = "npc-harborworks-0";
    for (const branch of branches) {
      const state = route(
        start(fresh(npcId), "discovery", npcId),
        branch.choices,
        npcId,
      );
      const view = conversationView(state, content, npcId)!;
      expect(view.debrief?.outcome).toBe(branch.outcome);
      expect(view.debrief?.trustDelta).toBe(branch.delta);
      expect(view.debrief?.riskDelta).toBe(branch.risk);
      expect(view.debrief?.route.length).toBeGreaterThanOrEqual(3);
      expect(view.debrief?.nextStep).toContain(state.learner.displayName);
      routes.add(view.debrief!.route.join(","));
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0].status).toBe("open");
      expect(state.accountHealth["acct-harborworks"].risk).toBe(
        30 + branch.risk,
      );
    }
    expect(routes.size).toBe(4);
  });

  it("authors scope, handoff, repair and respectful boundary routes for every role", () => {
    const paths: [ConversationTopic, string[], string][] = [
      ["scope", ["options", "tradeoffs", "route", "proposal"], "good"],
      ["scope", ["promise", "withdraw", "route", "proposal"], "recovery"],
      ["handoff", ["packet", "owners", "ack", "verify"], "good"],
      ["handoff", ["dump", "rebuild", "repair_packet"], "recovery"],
      ["repair", ["name", "facts", "specific", "commit"], "recovery"],
      ["coffee", ["pressure", "apologize", "professional"], "recovery"],
    ];
    for (const npcId of [
      "npc-harborworks-0",
      "npc-cedarline-1",
      "npc-aster-2",
      mentor,
      "npc-tax",
      "npc-ops",
      "npc-commercial",
    ]) {
      for (const [topic, choices, outcome] of paths) {
        const state = route(start(fresh(npcId), topic, npcId), choices, npcId);
        expect(conversationView(state, content, npcId)?.debrief?.outcome).toBe(
          outcome,
        );
      }
    }
  });

  it("cannot farm trust, account risk, interactions or tasks by replaying a topic", () => {
    const npcId = "npc-harborworks-0";
    let state = route(
      start(fresh(npcId), "discovery", npcId),
      ["assume", "defend", "own"],
      npcId,
    );
    const first = structuredClone({
      memory: state.npcMemory,
      health: state.accountHealth,
      tasks: state.tasks,
    });
    for (let i = 0; i < 3; i += 1)
      state = route(start(state, "discovery", npcId), good, npcId);
    expect({
      memory: state.npcMemory,
      health: state.accountHealth,
      tasks: state.tasks,
    }).toEqual(first);
    expect(conversationView(state, content, npcId)?.debrief).toMatchObject({
      outcome: "good",
      replay: true,
      trustDelta: 0,
      riskDelta: 0,
    });
    state = route(
      start(state, "repair", npcId),
      ["name", "facts", "specific", "commit"],
      npcId,
    );
    expect(state.npcMemory[npcId].trust).toBe(46);
    expect(readRelationshipConversations(state).history).toHaveLength(5);
  });

  it("keeps interruption, topic switching and JSON reload from resetting the active route", () => {
    let state = talk(start(fresh()), "assume");
    const original = conversationView(state, content, mentor)!.session!;
    state = transition(
      state,
      { type: "CLOSE_CONVERSATION", npcId: mentor },
      content,
    );
    expect(conversationView(state, content, mentor)?.session?.paused).toBe(
      true,
    );
    const before = structuredClone(state);
    expect(
      applyConversationAction(
        state,
        {
          type: "TALK",
          id: id(),
          npcId: mentor,
          nodeId: original.nodeId,
          choiceId: "reset",
        },
        content,
      ).accepted,
    ).toBe(false);
    expect(state).toEqual(before);
    state = migrateState(JSON.parse(JSON.stringify(state))).state;
    state = start(state, "coffee");
    expect(conversationView(state, content, mentor)?.session).toMatchObject({
      topic: "discovery",
      paused: false,
      nodeId: "discovery_assumption",
    });
    state = route(state, ["reset", "specific", "commit"]);
    expect(conversationView(state, content, mentor)?.debrief?.outcome).toBe(
      "recovery",
    );
  });

  it("rejects unknown contacts, forged choices, stale nodes, duplicates and insufficient day budget without mutation", () => {
    const state = start(fresh());
    const actions = [
      {
        type: "TALK" as const,
        id: id(),
        npcId: mentor,
        nodeId: "scope_open",
        choiceId: "options",
      },
      {
        type: "TALK" as const,
        id: id(),
        npcId: mentor,
        nodeId: "discovery_open",
        choiceId: "invented",
      },
      { type: "START_CONVERSATION" as const, id: id(), npcId: "not-a-contact" },
      { type: "START_CONVERSATION" as const, id: "", npcId: mentor },
    ];
    for (const action of actions) {
      const before = structuredClone(state);
      expect(applyConversationAction(state, action, content).accepted).toBe(
        false,
      );
      expect(state).toEqual(before);
    }
    const actionId = id();
    const action = {
      type: "TALK" as const,
      id: actionId,
      npcId: mentor,
      nodeId: "discovery_open",
      choiceId: "ask_goal",
    };
    const accepted = transition(state, action, content);
    expect(accepted.processedActions).toContain(actionId);
    const snapshot = structuredClone(accepted);
    expect(applyConversationAction(accepted, action, content).accepted).toBe(
      false,
    );
    expect(accepted).toEqual(snapshot);
    const late = moveClock(state, WORKDAY_MINUTES - 3);
    const lateSnapshot = structuredClone(late);
    expect(
      applyConversationAction(late, { ...action, id: id() }, content).accepted,
    ).toBe(false);
    expect(late).toEqual(lateSnapshot);
  });

  it("uses the actual latest case feedback and previous conversation outcome in relationship history", () => {
    const npcId = "npc-harborworks-0";
    let state = route(start(fresh(npcId), "discovery", npcId), good, npcId);
    const mission = content.missions.find(
      (m) =>
        m.accountId === "acct-harborworks" && m.prerequisiteIds.length === 0,
    )!;
    state = transition(
      state,
      { type: "START_MISSION", missionId: mission.id },
      content,
    );
    const attempt = state.missions[mission.id].attempts.at(-1)!;
    attempt.endedAt = state.clockMinutes;
    attempt.passed = false;
    attempt.trace.push({
      stepId: mission.steps[0].id,
      choiceId: "history-fixture",
      clockMinutes: state.clockMinutes,
      scores: {
        tax: 20,
        execution: 20,
        communication: 20,
        judgment: 20,
        organization: 20,
      },
      evidenceIds: [],
      feedback:
        "The latest recorded fixture still needs an entity-matched source.",
    });
    state = start(state, "scope", npcId);
    const text = conversationView(state, content, npcId)!.node!.text;
    expect(text).toContain(
      "last recorded discovery conversation had a good outcome",
    );
    expect(text).toContain(mission.title);
    expect(text).toContain("recorded attempt needs review");
    expect(text).toContain(
      "latest recorded fixture still needs an entity-matched source",
    );
  });

  it("rejects unavailable contacts without silently advancing business time", () => {
    const state = fresh();
    const view = conversationView(state, content, "npc-harborworks-0")!;
    expect(view.available).toBe(false);
    const before = structuredClone(state);
    expect(
      applyConversationAction(
        state,
        { type: "START_CONVERSATION", npcId: "npc-harborworks-0", id: id() },
        content,
      ).accepted,
    ).toBe(false);
    expect(state).toEqual(before);
  });
});

describe("professional café invitations and actual follow-through", () => {
  it("accepts a mentor invitation but declines an unprepared sponsor and low-trust contact without coercion", () => {
    const accepted = talk(start(fresh(), "coffee"), "invite");
    expect(conversationView(accepted, content, mentor)?.node?.title).toContain(
      "accepted",
    );
    const npcId = "npc-harborworks-0";
    let declined = talk(start(fresh(npcId), "coffee", npcId), "invite", npcId);
    expect(conversationView(declined, content, npcId)?.node?.title).toContain(
      "declined",
    );
    declined = route(
      declined,
      ["respect", "use_preference", "owned_followup"],
      npcId,
    );
    expect(conversationView(declined, content, npcId)?.debrief?.outcome).toBe(
      "mixed",
    );
    expect(declined.appointments).toHaveLength(0);
    const low = fresh();
    low.npcMemory[mentor] = { trust: 30, interactions: 1, commitments: [] };
    const boundary = talk(start(low, "coffee"), "invite");
    expect(conversationView(boundary, content, mentor)?.node?.text).toContain(
      "repair",
    );
  });

  it("considers overdue commitments and improved relationship history in acceptance", () => {
    const npcId = "npc-harborworks-0";
    let state = route(start(fresh(npcId), "discovery", npcId), good, npcId);
    state = talk(start(state, "coffee", npcId), "invite", npcId);
    expect(conversationView(state, content, npcId)?.node?.title).toContain(
      "accepted",
    );
    const overdue = fresh();
    overdue.npcMemory[mentor] = {
      trust: 70,
      interactions: 4,
      commitments: ["late"],
    };
    overdue.tasks.push({
      id: "late",
      title: "Return the bounded update",
      owner: "Learner",
      dueMinute: 0,
      status: "open",
      evidence: [],
    });
    overdue.clockMinutes = 1;
    const response = talk(start(overdue, "coffee"), "invite");
    expect(conversationView(response, content, mentor)?.node?.text).toContain(
      "overdue commitment",
    );
  });

  it("requires a saved appointment, actual café travel, correct time and substantive conversation", () => {
    let state = route(start(fresh(), "coffee"), ["invite", "schedule"]);
    const a = conversationView(state, content, mentor)!.session!.appointment!;
    expect(state.appointments[0]).toMatchObject({
      id: a.id,
      status: "scheduled",
    });
    expect(state.npcMemory[mentor]).toBeUndefined();
    expect(
      conversationView(state, content, mentor)?.node?.choices[0].disabledReason,
    ).toContain("Travel");
    expect(cafeMeetingContactId(state)).toBeUndefined();
    state = transition(state, { type: "TRAVEL", location: "cafe" }, content);
    expect(
      conversationView(state, content, mentor)?.node?.choices[0].disabledReason,
    ).toContain("starts");
    expect(cafeMeetingContactId(state)).toBeUndefined();
    const until = appointmentClock(a.day, a.minute) - state.clockMinutes;
    state = transition(state, { type: "WAIT", minutes: until }, content);
    expect(cafeMeetingContactId(state)).toBe(mentor);
    state = talk(state, "arrive");
    expect(state.appointments[0].status).toBe("attended");
    state = route(state, ["work_style", "reflect", "followup"]);
    expect(conversationView(state, content, mentor)?.debrief).toMatchObject({
      outcome: "good",
      trustDelta: 4,
    });
    expect(
      conversationView(state, content, mentor)?.debrief?.whatWorked.join(" "),
    ).toContain("arrived");
    expect(cafeMeetingContactId(state)).toBeUndefined();
  });

  it("finds a conflict-free slot in availability and respects early/late arrival after reload", () => {
    const state = fresh();
    state.appointments.push({
      id: "existing",
      npcId: "npc-ops",
      day: 1,
      minute: 555,
      duration: 45,
      status: "scheduled",
    });
    const scheduled = route(start(state, "coffee"), ["invite", "schedule"]);
    const a = conversationView(scheduled, content, mentor)!.session!
      .appointment!;
    expect(a.minute).toBeGreaterThanOrEqual(600);
    const reloaded = JSON.parse(JSON.stringify(scheduled)) as GameState;
    reloaded.location = "cafe";
    const late = moveClock(reloaded, appointmentClock(a.day, a.minute) + 15);
    expect(
      conversationView(late, content, mentor)?.node?.choices[0].disabled,
    ).toBe(true);
    const before = structuredClone(late);
    expect(
      applyConversationAction(
        late,
        {
          type: "TALK",
          id: id(),
          npcId: mentor,
          nodeId: "coffee_wait",
          choiceId: "arrive",
        },
        content,
      ).accepted,
    ).toBe(false);
    expect(late).toEqual(before);
  });

  it("reschedules once, cancels respectfully and keeps no-show consequences idempotent", () => {
    let state = route(start(fresh(), "coffee"), ["invite", "schedule"]);
    state = transition(state, { type: "END_DAY" }, content);
    expect(state.npcMemory[mentor].trust).toBe(47);
    expect(state.appointments[0].status).toBe("missed");
    reconcileConversationAppointments(state, content);
    expect(state.npcMemory[mentor].trust).toBe(47);
    expect(
      state.events.filter((e) => e.type === "relationship-missed"),
    ).toHaveLength(1);
    state = talk(state, "reschedule");
    expect(
      conversationView(state, content, mentor)?.node?.choices.find(
        (c) => c.id === "reschedule",
      )?.disabled,
    ).toBe(true);
    state = route(state, ["cancel", "written"]);
    expect(conversationView(state, content, mentor)?.debrief?.outcome).toBe(
      "mixed",
    );
    expect(state.npcMemory[mentor].trust).toBe(47);
    expect(
      state.appointments.filter((a) => a.status === "scheduled"),
    ).toHaveLength(0);
  });

  it("retains meaningful customer risk after a missed café commitment, and does not repeat the penalty on replay", () => {
    const npcId = "npc-cedarline-1";
    let state = route(
      start(fresh(npcId), "coffee", npcId),
      ["invite", "schedule"],
      npcId,
    );
    state = transition(state, { type: "END_DAY" }, content);
    expect(state.accountHealth["acct-cedarline"]).toMatchObject({
      trust: 49,
      risk: 32,
    });
    state = route(state, ["cancel", "written"], npcId);
    const first = structuredClone(state.accountHealth["acct-cedarline"]);
    state = moveClock(state, WORKDAY_MINUTES + 15);
    // A replay can practice respectfully, but neither completion nor repeated no-shows change trust/risk.
    state.tasks.forEach((t) => {
      t.status = "completed";
    });
    state = route(start(state, "coffee", npcId), ["invite", "schedule"], npcId);
    state = transition(state, { type: "END_DAY" }, content);
    expect(state.accountHealth["acct-cedarline"]).toEqual(first);
  });

  it("recovers after arriving then interrupting beyond the appointment, without false completion or a trapped route", () => {
    let state = arrive(route(start(fresh(), "coffee"), ["invite", "schedule"]));
    state = transition(
      state,
      { type: "CLOSE_CONVERSATION", npcId: mentor },
      content,
    );
    state = transition(state, { type: "END_DAY" }, content);
    state = start(JSON.parse(JSON.stringify(state)) as GameState);
    expect(
      conversationView(state, content, mentor)?.node?.choices.map((c) => c.id),
    ).toEqual(["time_followup", "time_abandon"]);
    state = talk(state, "time_followup");
    expect(conversationView(state, content, mentor)?.debrief).toMatchObject({
      outcome: "mixed",
      trustDelta: 0,
    });
    expect(state.appointments[0].status).toBe("attended");
    expect(state.events.some((e) => e.type === "relationship-missed")).toBe(
      false,
    );
  });

  it("allows a professional recovery after inappropriate public-records pressure", () => {
    let state = arrive(route(start(fresh(), "coffee"), ["invite", "schedule"]));
    state = route(state, ["private_records", "respect", "professional"]);
    expect(conversationView(state, content, mentor)?.debrief?.outcome).toBe(
      "recovery",
    );
    expect(
      conversationView(state, content, mentor)?.debrief?.whatToImprove.join(
        " ",
      ),
    ).toContain("public café");
  });
});

describe("relationship history validation and useful work closure", () => {
  it("verifies only an authored acknowledgment and closes the bounded follow-up with evidence", () => {
    let state = route(start(fresh()), good);
    const taskId = state.tasks[0].id;
    state = start(state, "repair");
    expect(
      conversationView(state, content, mentor)?.node?.choices.some(
        (c) => c.id === "check_followup",
      ),
    ).toBe(true);
    state = talk(state, "check_followup");
    expect(conversationView(state, content, mentor)?.node?.text).toContain(
      "No final source verification",
    );
    state = route(state, ["classify", "verify_receipt"]);
    const task = state.tasks.find((t) => t.id === taskId)!;
    expect(task.status).toBe("completed");
    expect(task.missionId).toBe(`relationship:${mentor}`);
    expect(task.evidence).toHaveLength(1);
    expect(
      state.artifacts.find((a) => a.id === task.evidence[0])?.body,
    ).toContain("request receipt and accepted review only");
    expect(state.tasks).toHaveLength(1);
    expect(state.missions).toEqual({});
    expect(conversationView(state, content, mentor)?.debrief?.outcome).toBe(
      "recovery",
    );
  });

  it("does not close the task when acknowledgment is overstated as final account completion", () => {
    let state = route(start(fresh()), good);
    state = route(start(state, "repair"), [
      "check_followup",
      "overclaim",
      "leave",
    ]);
    expect(state.tasks[0].status).toBe("open");
    expect(conversationView(state, content, mentor)?.debrief?.outcome).toBe(
      "poor",
    );
  });

  it("preserves unsupported and malformed extensions rather than resetting them during actions", () => {
    const invalid = [
      { version: 2, sessions: {}, history: [], awarded: [] },
      {
        version: 1,
        sessions: {},
        history: [{ summary: "broken" }],
        awarded: [],
      },
      {
        version: 1,
        sessions: { [mentor]: { nodeId: "made-up", npcId: mentor } },
        history: [],
        awarded: [],
      },
    ];
    for (const value of invalid) {
      const state = fresh();
      state.extensions.relationshipConversations = value;
      const before = structuredClone(state);
      expect(validateRelationshipConversations(value)).toBe(false);
      expect(
        applyConversationAction(
          state,
          { type: "START_CONVERSATION", id: id(), npcId: mentor },
          content,
        ).accepted,
      ).toBe(false);
      reconcileConversationAppointments(state, content);
      expect(state).toEqual(before);
    }
  });

  it("rejects malformed nested timing, sessions and debrief data while retaining valid reloads", () => {
    const state = route(start(fresh(), "coffee"), ["invite", "schedule"]);
    const data = readRelationshipConversations(state);
    expect(
      validateRelationshipConversations(JSON.parse(JSON.stringify(data))),
    ).toBe(true);
    const wrongDuration = structuredClone(data);
    wrongDuration.sessions[mentor].appointment!.duration = 99;
    expect(validateRelationshipConversations(wrongDuration)).toBe(false);
    const missingDebrief = structuredClone(data);
    missingDebrief.sessions[mentor].status = "completed";
    expect(validateRelationshipConversations(missingDebrief)).toBe(false);
    const missingContact = structuredClone(data);
    missingContact.sessions[mentor].npcId = "wrong";
    expect(validateRelationshipConversations(missingContact)).toBe(false);
  });

  it("is deterministic, does not consume RNG or mutate while viewing, and never changes mission progress", () => {
    const initial = fresh();
    const first = route(start(initial), good);
    const snapshot = structuredClone(first);
    conversationView(first, content, mentor);
    readRelationshipConversations(first);
    cafeMeetingContactId(first);
    expect(first).toEqual(snapshot);
    expect(first.rngState).toBe(initial.rngState);
    expect(first.missions).toEqual(initial.missions);
    expect(
      Object.values(first.competencies).every(
        (c) => c.level === "not_started" && c.attemptCount === 0,
      ),
    ).toBe(true);
    expect(conversationView(first, content, "unknown")).toBeUndefined();
  });
});
