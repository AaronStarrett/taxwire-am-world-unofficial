import {
  applyConversationAction,
  reconcileConversationAppointments,
} from "./conversations";
import type {
  Choice,
  ContentPack,
  Dimension,
  Mission,
  Step,
} from "../content/types";
import type {
  Attempt,
  AttemptMode,
  GameAction,
  GameState,
  MissionProgress,
} from "./types";
import { readCityNavigation, unsupportedCityNavigation } from "./navigation";
import {
  applyBranchRoute,
  branchRoute,
  finalizeBranchDebrief,
  missionNode,
} from "./branching";
import {
  applyTutorialAction,
  createTutorial,
  TUTORIAL_MISSION_ID,
  tutorialObjective,
} from "./tutorial";
import {
  appointmentClock,
  dayAt,
  formatTime,
  minuteOfDay,
  OPENING_MINUTE,
  overlaps,
  simulationTimestamp,
  WORKDAY_MINUTES,
} from "./time";
export * from "./types";
export * from "./time";
export * from "./money";
export * from "./tutorial";
export * from "./branching";
export * from "./conversations";
export * from "./navigation";
export {
  exportProgress,
  previewImport,
  mergeProgress,
  validateTrainingExport,
  exportWorldSave,
  importWorldSave,
} from "./interoperability";
export {
  saveState,
  loadState,
  listProfiles,
  deleteState,
  listCheckpoints,
  restoreCheckpoint,
  recoverState,
  migrateState,
} from "./persistence";

export const SAVE_VERSION = 3;
export const PASS_SCORE = 70;
export const SCORE_WEIGHTS: Record<Dimension, number> = {
  tax: 25,
  execution: 25,
  communication: 20,
  judgment: 15,
  organization: 15,
};
const DIMENSIONS = Object.keys(SCORE_WEIGHTS) as Dimension[];
const emptyDimensions = (): Record<Dimension, number> => ({
  tax: 0,
  execution: 0,
  communication: 0,
  judgment: 0,
  organization: 0,
});
const bounded = (value: number, low = 0, high = 100) =>
  Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));
const unique = <T>(values: T[]): T[] => [...new Set(values)];
export function createState(
  learner = { id: "learner-local", displayName: "Learner" },
  seed = 1729,
): GameState {
  const safeSeed = Number.isInteger(seed) ? seed >>> 0 : 1729;
  return {
    version: SAVE_VERSION,
    contentVersion: "",
    learner: {
      id: learner.id.slice(0, 100),
      displayName: learner.displayName.slice(0, 100),
    },
    seed: safeSeed,
    rngState: safeSeed || 1,
    clockMinutes: 0,
    day: 1,
    activeMissionId: null,
    missions: {},
    competencies: {},
    events: [],
    tasks: [],
    appointments: [],
    artifacts: [],
    visitedLocations: ["home"],
    location: "home",
    npcMemory: {},
    specialistCapacity: {},
    accountHealth: {},
    settings: {
      quality: "low",
      reducedMotion: false,
      textScale: 1,
      cameraSensitivity: 1,
      mute: true,
      workbench: false,
    },
    avatar: { shirt: "#228e64", skin: "#b78058", hair: "#272435" },
    position: { x: 0, z: 0, yaw: 0 },
    reviewQueue: [],
    imports: [],
    extensions: {},
    processedActions: [],
    notifications: [],
    tutorial: createTutorial(),
    guidanceMode: "guided",
    assistanceHistory: [],
    campaignStage: "Guided Associate",
  };
}
function newProgress(): MissionProgress {
  return {
    status: "not_started",
    stepIndex: 0,
    mode: "guided",
    attempts: [],
    bestScore: 0,
    criticalFailures: [],
    evidenceIds: [],
  };
}
function currentAttempt(progress: MissionProgress): Attempt | undefined {
  const attempt = progress.attempts.at(-1);
  return attempt?.endedAt === undefined ? attempt : undefined;
}
export function missionAvailable(state: GameState, mission: Mission): boolean {
  return mission.prerequisiteIds.every(
    (id) =>
      state.missions[id]?.status === "completed" ||
      state.missions[id]?.attempts.some((attempt) => attempt.passed),
  );
}
export function activeStep(
  state: GameState,
  content: ContentPack,
): Step | undefined {
  const mission = content.missions.find(
    (item) => item.id === state.activeMissionId,
  );
  if (!mission) return undefined;
  const progress = state.missions[mission.id];
  if (progress?.status !== "in_progress") return undefined;
  const attempt = currentAttempt(progress);
  return attempt?.branchVersion === 1 && attempt.routeNodeId
    ? missionNode(mission, attempt.routeNodeId)
    : mission.steps[progress.stepIndex];
}
export function scoreDimensions(scores: Record<Dimension, number>): number {
  return Math.round(
    DIMENSIONS.reduce(
      (sum, dimension) =>
        sum + (bounded(scores[dimension]) * SCORE_WEIGHTS[dimension]) / 100,
      0,
    ),
  );
}
export function npcFacts(npcId: string, content: ContentPack): string[] {
  return [
    ...(content.contacts.find((contact) => contact.id === npcId)?.knows ?? []),
  ];
}
function notify(state: GameState, message: string): GameState {
  state.notifications = [...state.notifications, message].slice(-8);
  return state;
}
function event(
  state: GameState,
  type: string,
  message: string,
  missionId?: string,
  details?: Record<string, unknown>,
): void {
  state.events.push({
    id: `event-${state.events.length + 1}`,
    type,
    message,
    title: message,
    clockMinutes: state.clockMinutes,
    day: state.day,
    ...(missionId ? { missionId } : {}),
    ...(details ? { details } : {}),
  });
}
function random(state: GameState): number {
  let value = state.rngState;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rngState = value >>> 0;
  return state.rngState / 4294967296;
}
function canSpend(state: GameState, minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= 0 &&
    minutes < WORKDAY_MINUTES - (state.clockMinutes % WORKDAY_MINUTES)
  );
}
function spend(state: GameState, minutes: number, content: ContentPack): void {
  state.clockMinutes += minutes;
  state.day = dayAt(state.clockMinutes);
  for (const task of state.tasks)
    if (
      task.status === "open" &&
      task.dueMinute < state.clockMinutes &&
      !state.events.some(
        (item) =>
          item.type === "task-overdue" && item.details?.taskId === task.id,
      )
    )
      event(
        state,
        "task-overdue",
        `Commitment overdue: ${task.title}. Owner ${task.owner} must renegotiate or finish with evidence.`,
        task.missionId,
        { taskId: task.id },
      );
  for (const appointment of state.appointments) {
    if (
      appointment.status === "scheduled" &&
      appointmentClock(appointment.day, appointment.minute) +
        appointment.duration <
        state.clockMinutes
    ) {
      appointment.status = "missed";
      event(
        state,
        "appointment-missed",
        `Missed appointment with ${appointment.npcId}; arrange a recovery update.`,
        undefined,
        { appointmentId: appointment.id },
      );
    }
  }
  reconcileConversationAppointments(state, content);
}
function rememberAction(state: GameState, action: GameAction): boolean {
  if (!("id" in action)) return true;
  if (typeof action.id !== "string" || !action.id || action.id.length > 200) {
    notify(state, "A stable action ID is required.");
    return false;
  }
  return !state.processedActions.includes(action.id);
}
function accepted(state: GameState, action: GameAction): void {
  if ("id" in action) state.processedActions.push(action.id);
}
function syncContent(state: GameState, content: ContentPack): void {
  state.contentVersion = content.version;
  const revised = Object.entries(state.missions).flatMap(([id, progress]) => {
    const local = content.missions.find((mission) => mission.id === id);
    return local &&
      progress.attempts.some(
        (attempt) =>
          attempt.fingerprint !== local.fingerprint ||
          attempt.version !== local.version,
      )
      ? [id]
      : [];
  });
  state.extensions.revisedCaseHistory = revised;
  for (const competency of content.competencies)
    state.competencies[competency.id] ??= {
      id: competency.id,
      level: "not_started",
      bestScore: 0,
      attemptCount: 0,
      evidenceMissionIds: [],
    };
  for (const account of content.accounts)
    state.accountHealth[account.id] ??= { trust: 50, risk: 30, evidence: [] };
}
function startMission(
  state: GameState,
  mission: Mission,
  mode: AttemptMode,
): GameState {
  if (!missionAvailable(state, mission))
    return notify(
      state,
      "Complete the prerequisite missions before this case.",
    );
  const progress = (state.missions[mission.id] ??= newProgress());
  const unfinished = currentAttempt(progress);
  if (
    progress.status === "in_progress" &&
    unfinished &&
    unfinished.fingerprint === mission.fingerprint &&
    unfinished.version === mission.version
  ) {
    state.activeMissionId = mission.id;
    return notify(state, `Resuming ${mission.title}.`);
  }
  if (unfinished && progress.status === "in_progress") {
    unfinished.endedAt = state.clockMinutes;
    event(
      state,
      "case-revision",
      "The earlier in-progress attempt is retained in history. This explicit start applies the revised visible case facts to a fresh attempt.",
      mission.id,
      {
        previousFingerprint: unfinished.fingerprint,
        currentFingerprint: mission.fingerprint,
      },
    );
  }
  const previous = progress.attempts.at(-1);
  progress.status = "in_progress";
  progress.stepIndex = 0;
  progress.mode = mode;
  progress.evidenceIds = [];
  progress.fingerprint = mission.fingerprint;
  progress.attempts.push({
    id: `${mission.id}-attempt-${progress.attempts.length + 1}`,
    mode,
    startedAt: state.clockMinutes,
    score: 0,
    dimensions: emptyDimensions(),
    passed: false,
    criticalFailures: [],
    trace: [],
    fingerprint: mission.fingerprint,
    version: mission.version,
    overdue: false,
    ...(mission.branching
      ? {
          branchVersion: mission.branching.version,
          routeNodeId: mission.branching.startStepId,
          routeMarks: [],
          relationshipStart: {
            trust: state.accountHealth[mission.accountId]?.trust ?? 50,
            risk: state.accountHealth[mission.accountId]?.risk ?? 30,
          },
        }
      : {}),
    assistance: [],
    assistanceVerified: true,
    unaided: mode === "independent",
    ...(previous?.criticalFailures.length
      ? { remediationOf: previous.id }
      : {}),
  });
  state.activeMissionId = mission.id;
  if (mode !== "replay") state.guidanceMode = mode;
  for (const id of mission.competencyIds) {
    const competency = state.competencies[id];
    if (competency?.level === "not_started") competency.level = "introduced";
  }
  event(
    state,
    "mission-started",
    `${mode} attempt: ${mission.title}`,
    mission.id,
  );
  return notify(state, mission.briefing);
}
function scoresFor(
  choice: Choice,
  step: Step,
  value?: number,
): { scores: Record<Dimension, number>; correct?: boolean } {
  const scores = Object.fromEntries(
    DIMENSIONS.map((key) => [key, bounded(choice.scores[key])]),
  ) as Record<Dimension, number>;
  if (step.expectedValue === undefined) return { scores };
  const correct =
    value !== undefined &&
    Number.isFinite(value) &&
    Math.abs(value - step.expectedValue) <= (step.tolerance ?? 0);
  if (!correct) {
    scores.tax = Math.min(scores.tax, 25);
    scores.execution = Math.min(scores.execution, 40);
  }
  return { scores, correct };
}
function completeAttempt(
  state: GameState,
  mission: Mission,
  progress: MissionProgress,
  attempt: Attempt,
): void {
  attempt.endedAt = state.clockMinutes;
  for (const key of DIMENSIONS)
    attempt.dimensions[key] = Math.round(
      attempt.trace.reduce((sum, row) => sum + row.scores[key], 0) /
        Math.max(1, attempt.trace.length),
    );
  attempt.overdue = state.clockMinutes - attempt.startedAt > mission.dueMinutes;
  if (attempt.overdue)
    attempt.dimensions.organization = Math.max(
      0,
      attempt.dimensions.organization - 20,
    );
  const outstanding = state.tasks.filter(
    (task) => task.missionId === mission.id && task.status === "open",
  );
  if (outstanding.length) {
    attempt.dimensions.execution = Math.min(50, attempt.dimensions.execution);
    notify(
      state,
      "Case has residual work. Tasks retain a named owner and must be verified before closure.",
    );
  }
  attempt.score = scoreDimensions(attempt.dimensions);
  attempt.passed =
    attempt.score >= PASS_SCORE &&
    attempt.criticalFailures.length === 0 &&
    outstanding.length === 0 &&
    attempt.outcome !== "poor" &&
    (!attempt.branchVersion ||
      mission.steps.every((step) => progress.evidenceIds.includes(step.id)));
  finalizeBranchDebrief(state, mission, progress, attempt);
  const independentEvidence =
    attempt.passed &&
    attempt.mode === "independent" &&
    attempt.unaided === true &&
    attempt.assistanceVerified === true &&
    !attempt.assistance?.length;
  progress.bestScore = Math.max(progress.bestScore, attempt.score);
  progress.criticalFailures = unique([
    ...progress.criticalFailures,
    ...attempt.criticalFailures,
  ]);
  progress.status = attempt.passed ? "completed" : "needs_remediation";
  for (const id of mission.competencyIds) {
    const competency = state.competencies[id];
    if (!competency) continue;
    competency.attemptCount += 1;
    competency.bestScore = Math.max(competency.bestScore, attempt.score);
    if (competency.level !== "demonstrated")
      competency.level = independentEvidence ? "demonstrated" : "practiced";
    if (independentEvidence)
      competency.evidenceMissionIds = unique([
        ...competency.evidenceMissionIds,
        mission.id,
      ]);
    const reason = attempt.passed
      ? "Spaced review: apply the concept to a different fact pattern."
      : "Remediate using the recorded rubric and a different attempt; original evidence remains.";
    state.reviewQueue = state.reviewQueue.filter(
      (review) => review.competencyId !== id,
    );
    state.reviewQueue.push({
      competencyId: id,
      dueAt: simulationTimestamp(
        state.clockMinutes + (attempt.passed ? 960 : 120),
      ),
      reason,
    });
  }
  const demonstrated = Object.values(state.competencies).filter(
    (item) => item.level === "demonstrated",
  ).length;
  const completedCapstones = Object.entries(state.missions).filter(
    ([id, item]) =>
      id.startsWith("C0") &&
      item.status === "completed" &&
      item.attempts.some(
        (attemptItem) =>
          attemptItem.mode === "independent" &&
          attemptItem.passed &&
          attemptItem.unaided !== false &&
          !attemptItem.assistance?.length,
      ),
  ).length;
  state.campaignStage =
    demonstrated >= 24 && completedCapstones >= 4
      ? "Strategic Account Leader"
      : demonstrated >= 16
        ? "Portfolio Operator"
        : demonstrated >= 8
          ? "Independent Account Owner"
          : "Guided Associate";
  state.activeMissionId = null;
  event(
    state,
    attempt.passed ? "mission-completed" : "remediation-required",
    `${mission.title}: ${attempt.score}/100. ${attempt.passed ? (independentEvidence ? "Unaided independent evidence recorded." : "Learning practice completed; assistance does not count as unaided mastery.") : "Review and remediate before a passing result."}`,
    mission.id,
    {
      attemptId: attempt.id,
      dimensions: attempt.dimensions,
      criticalFailures: attempt.criticalFailures,
      mode: attempt.mode,
      assistanceCount: attempt.assistance?.length ?? 0,
      unaided: independentEvidence,
      ...(attempt.outcome
        ? { outcome: attempt.outcome, debrief: attempt.debrief }
        : {}),
    },
  );
  notify(
    state,
    `${attempt.score}/100 · ${attempt.passed ? "Completed" : "Remediation required"}. ${mission.consequence}`,
  );
}
function act(
  state: GameState,
  action: Extract<GameAction, { type: "ACT" }>,
  content: ContentPack,
): GameState {
  const mission = content.missions.find(
    (item) => item.id === state.activeMissionId,
  );
  const step = activeStep(state, content);
  if (!mission || !step || step.id !== action.stepId)
    return notify(
      state,
      "This action does not belong to the current case step.",
    );
  const progress = state.missions[mission.id];
  const attempt = currentAttempt(progress);
  const choice = step.choices.find((item) => item.id === action.choiceId);
  if (!attempt || !choice)
    return notify(state, "Choose an available authored action.");
  const route = branchRoute(mission, attempt, step.id, choice.id);
  if (attempt.branchVersion && !route)
    return notify(
      state,
      "This saved decision route does not match the available authored case graph. Its history is preserved; use a compatible case version before continuing.",
    );
  if (
    attempt.fingerprint !== mission.fingerprint ||
    attempt.version !== mission.version
  )
    return notify(
      state,
      "This case's visible response facts were revised. Your earlier work is preserved; explicitly start the revised case before continuing assessment.",
    );
  if (step.requiresEvidence?.some((id) => !progress.evidenceIds.includes(id)))
    return notify(
      state,
      `Gather the required evidence first: ${step.requiresEvidence.filter((id) => !progress.evidenceIds.includes(id)).join(", ")}. Replay the case to repair unsupported earlier actions.`,
    );
  if (
    step.expectedValue !== undefined &&
    (action.value === undefined || !Number.isFinite(action.value))
  )
    return notify(
      state,
      "Enter the calculation result before submitting this action.",
    );
  let queueMinutes = 0;
  const npc = step.npcId
    ? content.contacts.find((item) => item.id === step.npcId)
    : undefined;
  const capacityKey = npc ? `${state.day}:${npc.id}` : undefined;
  if (npc) {
    const localMinute = minuteOfDay(state.clockMinutes);
    if (
      localMinute < npc.availability[0] ||
      localMinute + step.duration > npc.availability[1]
    )
      return notify(
        state,
        `${npc.name} is available ${Math.floor(npc.availability[0] / 60)}:00–${Math.floor(npc.availability[1] / 60)}:00. Schedule or use WAIT within business hours.`,
      );
    if (capacityKey && (state.specialistCapacity[capacityKey] ?? 0) >= 3)
      return notify(
        state,
        `${npc.name}'s daily consultation capacity is full. Keep ownership and schedule the next day.`,
      );
    // Deterministic authored specialist delay, never animation or elapsed wall time.
    if (step.kind === "coordinate") {
      const copied = { ...state };
      queueMinutes = 10 + Math.floor(random(copied) * 4) * 5;
    }
  }
  const duration = Math.max(1, Math.round(step.duration)) + queueMinutes;
  if (!canSpend(state, duration))
    return notify(
      state,
      `This action needs ${duration} business minutes. Close the day and resume tomorrow; study is free.`,
    );
  accepted(state, action);
  if (queueMinutes) {
    random(state);
    event(
      state,
      "specialist-queue",
      `Specialist queue: ${queueMinutes} minutes; facts stay within the contact's known remit.`,
      mission.id,
      { npcId: npc?.id, queueMinutes },
    );
  }
  const result = scoresFor(choice, step, action.value);
  const backed =
    scoreDimensions(result.scores) >= 60 &&
    !choice.criticalFailure &&
    result.correct !== false;
  const previouslyAwarded = progress.attempts.some(
    (prior) =>
      prior.fingerprint === mission.fingerprint &&
      prior.trace.some(
        (trace) =>
          trace.stepId === step.id &&
          !trace.criticalFailure &&
          trace.calculation?.correct !== false &&
          scoreDimensions(trace.scores) >= 60,
      ),
  );
  const trustChange =
    attempt.mode === "replay"
      ? 0
      : previouslyAwarded
        ? Math.min(choice.trustDelta ?? 0, 0)
        : (choice.trustDelta ?? 0);
  const riskChange =
    attempt.mode === "replay"
      ? 0
      : previouslyAwarded
        ? Math.max(choice.riskDelta ?? 0, 0)
        : (choice.riskDelta ?? 0);
  const evidenceIds = backed
    ? unique([step.id, ...step.documentIds, ...step.sourceIds])
    : [];
  progress.evidenceIds = unique([...progress.evidenceIds, ...evidenceIds]);
  if (choice.criticalFailure) {
    attempt.criticalFailures.push(choice.criticalFailure);
    event(state, "critical-failure", choice.criticalFailure, mission.id);
  }
  const artifactId = `artifact-${action.id}`;
  const body = [
    step.title,
    `Structured action: ${choice.label}`,
    `Evidence: ${evidenceIds.join(", ") || "No validated supporting action recorded"}`,
    action.value !== undefined
      ? `Calculation: ${action.value}; expected training value ${step.expectedValue}; ${result.correct ? "correct" : "retry required"}`
      : "",
    action.draft
      ? `Learner draft (self-review; no approved free-text evaluator):\n${action.draft.slice(0, 16000)}\nCompare against the displayed rubric and authored model answer.`
      : "",
    `Feedback: ${choice.feedback}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  state.artifacts.push({
    id: artifactId,
    type: backed
      ? action.draft
        ? "draft-self-review"
        : step.kind
      : `unsupported-${step.kind}`,
    missionId: mission.id,
    createdAt: simulationTimestamp(state.clockMinutes),
    body,
  });
  attempt.trace.push({
    stepId: step.id,
    choiceId: choice.id,
    clockMinutes: state.clockMinutes,
    scores: result.scores,
    evidenceIds,
    feedback: choice.feedback,
    ...(choice.criticalFailure
      ? { criticalFailure: choice.criticalFailure }
      : {}),
    ...(step.expectedValue !== undefined
      ? {
          calculation: {
            submitted: action.value!,
            expected: step.expectedValue,
            correct: result.correct!,
          },
        }
      : {}),
    artifactId,
  });
  if (
    choice.createsTask &&
    !state.tasks.some((task) => task.id === `task-${action.id}`)
  )
    state.tasks.push({
      id: `task-${action.id}`,
      title: choice.createsTask,
      owner: state.learner.displayName,
      dueMinute: state.clockMinutes + 180,
      status: "open",
      evidence: [],
      missionId: mission.id,
    });
  if (
    backed &&
    step.kind === "followup" &&
    (!attempt.branchVersion || route?.verifiesTasks)
  )
    for (const task of state.tasks.filter(
      (item) => item.missionId === mission.id && item.status === "open",
    )) {
      task.status = "completed";
      task.evidence = unique([...progress.evidenceIds, artifactId]);
      task.completedAt = state.clockMinutes;
      event(
        state,
        "task-verified",
        `Verified follow-up: ${task.title}. Owner ${task.owner}; evidence ${artifactId}.`,
        mission.id,
        { taskId: task.id },
      );
    }
  if (npc) {
    if (capacityKey)
      state.specialistCapacity[capacityKey] =
        (state.specialistCapacity[capacityKey] ?? 0) + 1;
    const memory = (state.npcMemory[npc.id] ??= {
      trust: 50,
      commitments: [],
      interactions: 0,
    });
    memory.trust = bounded(memory.trust + trustChange);
    memory.interactions += 1;
    memory.commitments = unique([
      ...memory.commitments,
      ...state.tasks
        .filter((task) => task.missionId === mission.id)
        .map((task) => task.id),
    ]);
    for (const appointment of state.appointments)
      if (
        appointment.npcId === npc.id &&
        appointment.day === state.day &&
        overlaps(
          minuteOfDay(state.clockMinutes),
          duration,
          appointment.minute,
          appointment.duration,
        )
      )
        appointment.status = "attended";
  }
  const health = state.accountHealth[mission.accountId];
  if (health) {
    health.trust = bounded(health.trust + trustChange);
    health.risk = bounded(health.risk + riskChange);
    health.evidence = unique([...health.evidence, artifactId]);
  }
  spend(state, duration, content);
  if (backed && mission.steps.some((item) => item.id === step.id))
    progress.stepIndex += 1;
  const followsRoute = !!route && result.correct !== false;
  if (followsRoute) applyBranchRoute(mission, progress, attempt, route);
  event(state, "action", `${step.title}: ${choice.feedback}`, mission.id, {
    stepId: step.id,
    choiceId: choice.id,
    evidenceIds,
    artifactId,
    duration,
    ...(followsRoute
      ? {
          route: route.label,
          nextNodeId: route.nextStepId,
          ending: route.ending,
        }
      : {}),
  });
  notify(state, choice.feedback);
  if (
    choice.criticalFailure ||
    (followsRoute && route.ending) ||
    (!attempt.branchVersion && progress.stepIndex >= mission.steps.length)
  )
    completeAttempt(state, mission, progress, attempt);
  else if (!backed && !followsRoute)
    notify(
      state,
      "Review the feedback and retry this step with corrected evidence. This action remains in the audit trail.",
    );
  return state;
}
/** Pure, immutable transition shared by the 3D renderer and accessible workbench. */
export function transition(
  input: GameState,
  action: GameAction,
  content: ContentPack,
): GameState {
  if ("id" in action && input.processedActions.includes(action.id))
    return input;
  const state = structuredClone(input);
  syncContent(state, content);
  if (!rememberAction(state, action)) return state;
  switch (action.type) {
    case "START_CONVERSATION":
    case "TALK":
    case "CLOSE_CONVERSATION": {
      const result = applyConversationAction(state, action, content);
      if (!result.accepted) return notify(state, result.message);
      accepted(state, action);
      if (result.minutes) spend(state, result.minutes, content);
      event(state, "relationship-conversation", result.message, undefined, {
        npcId: action.npcId,
        action: action.type,
        ...(action.type === "TALK"
          ? { nodeId: action.nodeId, choiceId: action.choiceId }
          : {}),
      });
      return notify(state, result.message);
    }
    case "TUTORIAL_START":
    case "TUTORIAL_SKIP":
    case "TUTORIAL_WORLD":
    case "TUTORIAL_ACT": {
      accepted(state, action);
      applyTutorialAction(state, action, content);
      return state;
    }
    case "ASSISTANCE": {
      const isTutorial =
        action.missionId === TUTORIAL_MISSION_ID &&
        tutorialObjective(state, content)?.id === action.stepId;
      const progress = state.missions[action.missionId];
      const attempt = progress ? currentAttempt(progress) : undefined;
      const isCase =
        state.activeMissionId === action.missionId &&
        activeStep(state, content)?.id === action.stepId &&
        !!attempt;
      if (!isTutorial && !isCase)
        return notify(
          state,
          "Help must refer to your current visible objective or active case step.",
        );
      const level = action.level ?? 1;
      if (
        ![1, 2, 3].includes(level) ||
        ![
          "hint",
          "explain",
          "demonstration",
          "show-location",
          "stuck",
          "mode-change",
        ].includes(action.kind)
      )
        return notify(state, "Use an available authored help level.");
      const record = {
        id: action.id,
        missionId: action.missionId,
        stepId: action.stepId,
        kind: action.kind,
        level,
        clockMinutes: state.clockMinutes,
        ...(attempt ? { attemptId: attempt.id } : {}),
      };
      state.assistanceHistory.push(record);
      if (attempt && isCase) {
        attempt.assistance ??= [];
        attempt.assistance.push(record);
        attempt.unaided = false;
      }
      accepted(state, action);
      event(
        state,
        "authored-assistance",
        `Authored ${action.kind}, level ${level}, recorded. Help does not advance business time; this attempt is assisted evidence.`,
        action.missionId,
        { stepId: action.stepId, level, attemptId: attempt?.id },
      );
      return state;
    }
    case "SET_GUIDANCE": {
      if (!["guided", "assisted", "independent"].includes(action.mode))
        return state;
      if (state.guidanceMode === action.mode) return state;
      state.guidanceMode = action.mode;
      const progress = state.activeMissionId
        ? state.missions[state.activeMissionId]
        : undefined;
      const attempt = progress ? currentAttempt(progress) : undefined;
      if (attempt?.mode === "independent" && action.mode !== "independent") {
        const record = {
          id: `guidance-mode-${state.events.length + 1}`,
          missionId: state.activeMissionId!,
          stepId: activeStep(state, content)?.id ?? "case",
          kind: "mode-change" as const,
          level: 1 as const,
          clockMinutes: state.clockMinutes,
          attemptId: attempt.id,
        };
        attempt.assistance ??= [];
        attempt.assistance.push(record);
        attempt.unaided = false;
        state.assistanceHistory.push(record);
      }
      return notify(
        state,
        "Guidance changed without resetting casework. Requested assistance remains in the assessment history.",
      );
    }
    case "START_MISSION": {
      const mission = content.missions.find(
        (item) => item.id === action.missionId,
      );
      return mission
        ? startMission(state, mission, action.mode ?? "guided")
        : notify(state, "Unknown mission.");
    }
    case "ACT":
      return act(state, action, content);
    case "ENTER_LOCATION": {
      if (unsupportedCityNavigation(state))
        return notify(
          state,
          "This save has a newer city-navigation version; it is preserved without changes.",
        );
      const locations = [
        "home",
        "hq",
        "research",
        "operations",
        "harborworks",
        "cedarline",
        "cafe",
        "academy",
      ];
      if (!locations.includes(action.location))
        return notify(state, "Unknown walkable building.");
      if (readCityNavigation(state).floor > 0)
        return notify(
          state,
          "Return to the ground floor before entering another building.",
        );
      if (state.location === action.location) return state;
      // The world reports genuine doorway crossings. Walking updates logical
      // presence, never teleports or advances the deliberate business clock.
      state.location = action.location;
      state.extensions.cityNavigation = {
        version: 1,
        location: action.location,
        floor: 0,
      };
      state.visitedLocations = unique([
        ...state.visitedLocations,
        action.location,
      ]);
      event(
        state,
        "building-entered",
        `Entered ${action.location} on foot; the business clock is unchanged.`,
      );
      return state;
    }
    case "SET_FLOOR": {
      if (unsupportedCityNavigation(state))
        return notify(
          state,
          "This save has a newer city-navigation version; it is preserved without changes.",
        );
      if (
        action.location !== state.location ||
        !Number.isInteger(action.floor) ||
        action.floor < 0 ||
        action.floor > 30
      )
        return notify(
          state,
          "Choose an available floor in your current building.",
        );
      state.extensions.cityNavigation = {
        version: 1,
        location: action.location,
        floor: action.floor,
      };
      return state;
    }
    case "TRAVEL": {
      if (unsupportedCityNavigation(state))
        return notify(
          state,
          "This save has a newer city-navigation version; it is preserved without changes.",
        );
      const known = new Set([
        "home",
        "hq",
        "reception",
        "desk",
        "research",
        "operations",
        "meeting",
        "harborworks",
        "cedarline",
        "academy",
        "customer-harbor",
        "customer-cedar",
        "cafe",
        "training",
        ...content.contacts.map((item) => item.location),
        ...content.missions.flatMap((item) =>
          item.steps.map((step) => step.location),
        ),
      ]);
      if (!known.has(action.location))
        return notify(state, "Unknown location.");
      if (state.location === action.location) return state;
      const studyTravel = state.tutorial.status === "active";
      if (!studyTravel && !canSpend(state, 10))
        return notify(state, "Close the working day before traveling.");
      if (!studyTravel) spend(state, 10, content);
      state.location = action.location;
      state.extensions.cityNavigation = {
        version: 1,
        location: action.location,
        floor: 0,
      };
      state.visitedLocations = unique([
        ...state.visitedLocations,
        action.location,
      ]);
      event(
        state,
        "travel",
        `Arrived at ${action.location}; ${studyTravel ? "first-day guidance keeps the campaign business clock paused" : "travel used 10 business minutes"}.`,
      );
      return state;
    }
    case "WAIT": {
      if (
        !Number.isInteger(action.minutes) ||
        action.minutes < 1 ||
        action.minutes > 240 ||
        !canSpend(state, action.minutes)
      )
        return notify(
          state,
          "Wait must fit the remaining workday and be 1–240 business minutes. Study and pause do not advance this clock.",
        );
      spend(state, action.minutes, content);
      event(state, "wait", `Waited ${action.minutes} business minutes.`);
      return state;
    }
    case "END_DAY": {
      const unowned = state.tasks.filter(
        (task) => task.status === "open" && !task.owner.trim(),
      );
      if (unowned.length)
        return notify(
          state,
          "Urgent work must retain a named owner before closing the day.",
        );
      const open = state.tasks.filter((task) => task.status === "open");
      event(
        state,
        "day-review",
        `Closed Day ${state.day}. ${open.length} open commitments retain named owners.`,
        undefined,
        { openTaskIds: open.map((task) => task.id) },
      );
      const nextDay = state.day + 1;
      state.clockMinutes = (nextDay - 1) * WORKDAY_MINUTES;
      state.day = nextDay;
      spend(state, 0, content);
      return notify(
        state,
        `${formatTime(state.clockMinutes)}. Review commitments and buffers before starting.`,
      );
    }
    case "SCHEDULE": {
      const npc = content.contacts.find(
        (contact) => contact.id === action.npcId,
      );
      if (
        !npc ||
        ![action.day, action.minute, action.duration].every(Number.isInteger) ||
        action.day < state.day ||
        action.duration < 5 ||
        action.duration > 120 ||
        action.minute < OPENING_MINUTE ||
        action.minute + action.duration > OPENING_MINUTE + WORKDAY_MINUTES ||
        action.minute < npc.availability[0] ||
        action.minute + action.duration > npc.availability[1]
      )
        return notify(
          state,
          "Choose a valid appointment within the contact’s availability and 09:00–17:00 workday.",
        );
      if (appointmentClock(action.day, action.minute) < state.clockMinutes)
        return notify(state, "Appointments cannot start in the past.");
      if (
        state.appointments.some(
          (item) =>
            item.day === action.day &&
            item.status === "scheduled" &&
            overlaps(
              item.minute,
              item.duration,
              action.minute,
              action.duration,
            ),
        )
      )
        return notify(
          state,
          "Scheduling conflict: leave enough time for the existing commitment.",
        );
      state.appointments.push({
        id: action.id,
        npcId: action.npcId,
        day: action.day,
        minute: action.minute,
        duration: action.duration,
        status: "scheduled",
      });
      accepted(state, action);
      event(
        state,
        "appointment-created",
        `Scheduled ${npc.name} for Day ${action.day}, ${String(Math.floor(action.minute / 60)).padStart(2, "0")}:${String(action.minute % 60).padStart(2, "0")}.`,
        undefined,
        { appointmentId: action.id },
      );
      applyTutorialAction(state, action, content);
      return notify(
        state,
        "Appointment scheduled. Calendar is simulated; no external invitations are sent.",
      );
    }
    case "TASK": {
      if (
        !action.title.trim() ||
        !action.owner.trim() ||
        !Number.isInteger(action.dueMinute) ||
        action.dueMinute < state.clockMinutes ||
        state.tasks.some((item) => item.id === action.id)
      )
        return notify(
          state,
          "A new commitment needs a title, named owner, and future due time.",
        );
      state.tasks.push({
        id: action.id,
        title: action.title.trim().slice(0, 200),
        owner: action.owner.trim().slice(0, 100),
        dueMinute: action.dueMinute,
        status: "open",
        evidence: [],
        ...(state.activeMissionId ? { missionId: state.activeMissionId } : {}),
      });
      accepted(state, action);
      event(
        state,
        "task-created",
        `${action.owner} owns ${action.title}.`,
        state.activeMissionId ?? undefined,
        { taskId: action.id },
      );
      return state;
    }
    case "COMPLETE_TASK": {
      const task = state.tasks.find((item) => item.id === action.taskId);
      if (!task) return notify(state, "Unknown task.");
      if (task.status === "completed") return state;
      const ids = (
        Array.isArray(action.evidence)
          ? action.evidence
          : action.evidence.split(/[,\n]/)
      )
        .map((item) => item.trim())
        .filter(Boolean);
      const progress = task.missionId
        ? [state.missions[task.missionId]].filter(Boolean)
        : Object.values(state.missions);
      const available = new Set([
        ...progress.flatMap((item) => item.evidenceIds),
        ...progress.flatMap((item) =>
          item.attempts.flatMap((attempt) =>
            attempt.trace
              .filter(
                (trace) =>
                  !trace.criticalFailure &&
                  trace.calculation?.correct !== false &&
                  scoreDimensions(trace.scores) >= 60,
              )
              .map((trace) => trace.artifactId)
              .filter((id): id is string => !!id),
          ),
        ),
      ]);
      if (!ids.length || ids.some((id) => !available.has(id)))
        return notify(
          state,
          "Closure needs recorded work-product or gathered evidence IDs. An email alone does not verify resolution.",
        );
      task.status = "completed";
      task.evidence = unique(ids);
      task.completedAt = state.clockMinutes;
      accepted(state, action);
      event(
        state,
        "task-verified",
        `Closed ${task.title} with recorded evidence and owner ${task.owner}.`,
        task.missionId,
        { taskId: task.id, evidenceIds: ids },
      );
      return state;
    }
    case "SAVE_NOTE": {
      if (
        (!content.missions.some((item) => item.id === action.missionId) &&
          action.missionId !== "free-practice" &&
          action.missionId !== TUTORIAL_MISSION_ID) ||
        !action.body.trim()
      )
        return notify(
          state,
          "Choose a case or free practice and add a nonempty work product.",
        );
      state.artifacts.push({
        id: action.id,
        type: action.noteType ?? action.typeName ?? "note",
        missionId: action.missionId,
        createdAt: simulationTimestamp(state.clockMinutes),
        body: action.body.trim().slice(0, 16000),
      });
      accepted(state, action);
      event(
        state,
        "artifact-saved",
        "Learner work product saved for transparent self-review.",
        action.missionId,
        { artifactId: action.id },
      );
      applyTutorialAction(state, action, content);
      return notify(
        state,
        "Saved locally. Free text is for self-review against the rubric; it is not expert-graded.",
      );
    }
    case "SETTINGS": {
      const patch = action.patch;
      if (patch.quality && ["low", "medium", "high"].includes(patch.quality))
        state.settings.quality = patch.quality;
      for (const key of ["reducedMotion", "mute", "workbench"] as const)
        if (typeof patch[key] === "boolean") state.settings[key] = patch[key]!;
      if (patch.textScale !== undefined)
        state.settings.textScale = bounded(patch.textScale, 0.9, 1.6);
      if (patch.cameraSensitivity !== undefined)
        state.settings.cameraSensitivity = bounded(
          patch.cameraSensitivity,
          0.2,
          3,
        );
      return state;
    }
    case "POSITION": {
      if ([action.x, action.z, action.yaw].every(Number.isFinite))
        state.position = {
          x: bounded(action.x, -500, 500),
          z: bounded(action.z, -500, 500),
          yaw: action.yaw,
        };
      return state;
    }
    case "AVATAR": {
      for (const key of ["shirt", "skin", "hair"] as const)
        if (/^#[\da-f]{6}$/i.test(action.patch[key] ?? ""))
          state.avatar[key] = action.patch[key]!;
      return state;
    }
    default:
      return notify(state, "Unsupported simulation action.");
  }
}
export function makeCoachingPacket(
  state: GameState,
  content: ContentPack,
): string {
  const mission =
    content.missions.find((item) => item.id === state.activeMissionId) ??
    content.missions.find((item) => state.missions[item.id]?.attempts.length);
  const progress = mission ? state.missions[mission.id] : undefined;
  return JSON.stringify(
    {
      format: "taxwire-coaching-packet",
      sourceEdition: "3d-world",
      disclaimer:
        "Fictional educational simulation. Not tax advice or an expert credential. Learner drafts require self-review.",
      facts: mission?.facts ?? [],
      mission: mission
        ? {
            id: mission.id,
            title: mission.title,
            fingerprint: mission.fingerprint,
            version: mission.version,
          }
        : null,
      actions: progress?.attempts ?? [],
      workProducts: state.artifacts.filter(
        (item) => item.missionId === mission?.id,
      ),
      sources: content.sources.filter((item) =>
        mission?.steps.some((step) => step.sourceIds.includes(item.id)),
      ),
      rubric: {
        weights: SCORE_WEIGHTS,
        threshold: PASS_SCORE,
        criticalFailuresRequireRemediation: true,
      },
      instructions:
        "Debrief only the supplied facts and action evidence. Distinguish synthetic assumptions, public guidance, and unknown employer practice. Do not invent offscreen completion or award an official credential.",
    },
    null,
    2,
  );
}
