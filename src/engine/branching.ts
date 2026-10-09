import type {
  BranchOutcome,
  BranchRoute,
  ContentPack,
  Mission,
  Step,
} from "../content/types";
import type { Attempt, GameState, MissionProgress } from "./types";

export function branchRoute(
  mission: Mission,
  attempt: Attempt,
  stepId: string,
  choiceId: string,
): BranchRoute | undefined {
  return attempt.branchVersion === mission.branching?.version
    ? mission.branching?.routes.find(
        (route) => route.fromStepId === stepId && route.choiceId === choiceId,
      )
    : undefined;
}
export function missionNode(
  mission: Mission,
  nodeId: string,
): Step | undefined {
  return [...mission.steps, ...(mission.branching?.nodes ?? [])].find(
    (step) => step.id === nodeId,
  );
}
export function applyBranchRoute(
  mission: Mission,
  progress: MissionProgress,
  attempt: Attempt,
  route: BranchRoute,
): void {
  if (route.mark)
    attempt.routeMarks = [
      ...new Set([...(attempt.routeMarks ?? []), route.mark]),
    ];
  if (route.nextStepId) {
    attempt.routeNodeId = route.nextStepId;
    const index = mission.steps.findIndex(
      (step) => step.id === route.nextStepId,
    );
    if (index >= 0) progress.stepIndex = index;
  } else {
    attempt.outcome = route.ending;
    attempt.routeNodeId = undefined;
  }
}
export function finalizeBranchDebrief(
  state: GameState,
  mission: Mission,
  progress: MissionProgress,
  attempt: Attempt,
): void {
  if (attempt.branchVersion !== 1 || !mission.branching) return;
  let outcome: BranchOutcome = attempt.criticalFailures.length
    ? "poor"
    : (attempt.outcome ?? "good");
  if (outcome === "good") {
    outcome = !attempt.passed
      ? "mixed"
      : attempt.routeMarks?.includes("recovery")
        ? "recovery"
        : attempt.routeMarks?.includes("mixed")
          ? "mixed"
          : "good";
  }
  attempt.outcome = outcome;
  const ending = mission.branching.endings[outcome];
  const health = state.accountHealth[mission.accountId] ?? {
    trust: 50,
    risk: 30,
  };
  const start = attempt.relationshipStart ?? health;
  const unresolved = state.tasks.filter(
    (task) => task.missionId === mission.id && task.status === "open",
  );
  attempt.debrief = {
    outcome,
    title: ending.title,
    summary: `${ending.summary} ${attempt.passed ? "The assessment's evidence and ownership checks passed." : "The evidence or ownership checks require remediation; this ending does not award a pass."}`,
    decisions: attempt.trace.map((trace) => {
      const step = missionNode(mission, trace.stepId);
      const choice = step?.choices.find((item) => item.id === trace.choiceId);
      const route = branchRoute(mission, attempt, trace.stepId, trace.choiceId);
      return `${step?.title ?? trace.stepId}: ${choice?.label ?? trace.choiceId}. ${trace.calculation?.correct === false ? "The arithmetic did not support progress; correction was required." : (route?.label ?? trace.feedback)}`;
    }),
    nextSteps: [
      ending.nextStep,
      ...unresolved.map((task) => `${task.owner} owns ${task.title}`),
    ],
    completedStages: mission.steps.filter((step) =>
      progress.evidenceIds.includes(step.id),
    ).length,
    totalStages: mission.steps.length,
    relationship: {
      trustChange: health.trust - start.trust,
      riskChange: health.risk - start.risk,
      trust: health.trust,
      risk: health.risk,
    },
  };
}
/** Single UI selector for route-aware case progress, also usable in the 2D workbench. */
export function missionRouteView(
  state: GameState,
  content: ContentPack,
  missionId: string,
) {
  const mission = content.missions.find((item) => item.id === missionId);
  const progress = state.missions[missionId];
  const attempt = progress?.attempts.at(-1);
  if (!mission || !progress || !attempt) return undefined;
  return {
    version: attempt.branchVersion,
    currentNodeId:
      attempt.routeNodeId ??
      (progress.status === "in_progress"
        ? mission.steps[progress.stepIndex]?.id
        : undefined),
    completedStages: mission.steps.filter((step) =>
      progress.evidenceIds.includes(step.id),
    ).length,
    totalStages: mission.steps.length,
    decisions: attempt.trace.length,
    onBranch:
      !!attempt.routeNodeId &&
      !mission.steps.some((step) => step.id === attempt.routeNodeId),
    outcome: attempt.outcome,
    debrief: attempt.debrief,
  };
}
