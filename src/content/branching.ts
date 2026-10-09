import type {
  BranchRoute,
  Choice,
  Dimension,
  Mission,
  MissionBranching,
  Step,
} from "./types";

const dimensions: Dimension[] = [
  "tax",
  "execution",
  "communication",
  "judgment",
  "organization",
];
const average = (choice: Choice) =>
  dimensions.reduce((sum, key) => sum + choice.scores[key], 0) /
  dimensions.length;
const option = (
  id: string,
  label: string,
  feedback: string,
  points: number,
  extra: Partial<Choice> = {},
): Choice => ({
  id,
  label,
  feedback,
  scores: Object.fromEntries(dimensions.map((key) => [key, points])) as Record<
    Dimension,
    number
  >,
  ...extra,
});

/** Authored decision patterns use only the current stage's visible facts. Later evidence is never revealed early. */
const stageResponses: Record<
  Step["kind"],
  { provisional: string; challenge: string; consequence: string }
> = {
  research: {
    provisional:
      "Your short question is useful, but the customer asks which entity, period and business change it covers. A smaller brief saves preparation time and leaves a scope gap for you to own.",
    challenge:
      "The headline and the underlying packet do not establish the same thing. Your customer asks where the decision came from before anyone acts on it.",
    consequence:
      "An untested assumption can send every later request to the wrong records or owner.",
  },
  meeting: {
    provisional:
      "The practitioner explains the operational impact, then asks what exact record or decision you need next. Listening opened the conversation; the missing fact still needs a precise question.",
    challenge:
      "The contact pushes back: explaining records does not give me authority to approve that commitment. They want you to correct the request before involving their sponsor.",
    consequence:
      "Respecting remit keeps the working relationship usable and gets the question to someone who can answer it.",
  },
  calculation: {
    provisional:
      "Your arithmetic uses the stated exercise inputs, but the reviewer asks what the number does and does not establish. A correct amount is not evidence of legal treatment or operational acceptance.",
    challenge:
      "The reviewer cannot reproduce the decision from the shown basis, units and records. They return it with a request to preserve the original and show the correction.",
    consequence:
      "A reproducible calculation is a review input, never an invented real tax conclusion.",
  },
  investigate: {
    provisional:
      "The owner can work with the provisional route, but asks which assumption remains unverified and which change must stay on hold. You need to choose the narrower next action.",
    challenge:
      "The records do not support the proposed shortcut. The customer asks whether any action has already been taken and who will stop the unsupported change.",
    consequence:
      "A reversible holding plan limits disruption while the missing evidence is obtained.",
  },
  coordinate: {
    provisional:
      "The specialist offers a later slot and asks you to protect the customer checkpoint. Reserving capacity is a dependency, not approval; you still own the interim plan.",
    challenge:
      "The reviewer cannot accept the implied promise or an unscoped handoff. They need you to retract it and return with evidence, a bounded question and an owner.",
    consequence:
      "A specific request protects scarce capacity without abandoning the account relationship.",
  },
  communicate: {
    provisional:
      "The customer accepts a call, then asks for the written decision record and the next check-in. A reassuring conversation will not replace the evidence trail.",
    challenge:
      "The customer asks for the acceptance record behind your message. The record does not support that claim, so the conversation has shifted from progress to credibility.",
    consequence:
      "A candid correction can reopen the discussion; leaving an unsupported promise standing deepens the trust problem.",
  },
  followup: {
    provisional:
      "The later response leaves a precise clarification outstanding. The customer asks what is actually verified now and what still needs an owner. This route cannot silently close the open verification task.",
    challenge:
      "The returned record contradicts the proposed closure. The customer needs the original evidence retained and the gap investigated rather than removed.",
    consequence:
      "Only the stated evidence supports closure; a sent request or a pleasant conversation is insufficient.",
  },
  review: {
    provisional:
      "The sponsor accepts a bounded operational stage but asks you to state the residual work and its next checkpoint. Choose whether to carry that uncertainty honestly or reopen the work.",
    challenge:
      "The sponsor spots an unowned obligation in your close-out. Satisfaction with an update does not mean the remaining work disappeared.",
    consequence:
      "A useful debrief distinguishes a good relationship moment from an actually verified outcome.",
  },
};

/** Original step IDs, facts, fingerprints and ideal paths stay intact for saved history. New attempts opt into this separate graph version. */
export function authorMissionBranches(mission: Mission): Mission {
  const nodes: Step[] = [];
  const routes: BranchRoute[] = [];
  for (const [index, step] of mission.steps.entries()) {
    const nextStep = mission.steps[index + 1];
    const advance = nextStep
      ? { nextStepId: nextStep.id }
      : { ending: "good" as const };
    const best = [...step.choices]
      .filter((choice) => !choice.criticalFailure)
      .sort((a, b) => average(b) - average(a))[0];
    for (const choice of step.choices) {
      const base = { fromStepId: step.id, choiceId: choice.id };
      if (choice.criticalFailure) {
        routes.push({
          ...base,
          ending: "poor",
          label: "Trust breach: a fresh remedial attempt is required",
        });
        continue;
      }
      if (choice === best) {
        routes.push({
          ...base,
          ...advance,
          label: "Evidence-backed route",
          verifiesTasks: step.kind === "followup",
        });
        continue;
      }
      const supported = average(choice) >= 60;
      const id = `${step.id}-branch-${choice.id}`;
      routes.push({
        ...base,
        nextStepId: id,
        label: supported
          ? "Provisional plan: customer requests a limit"
          : "Customer challenges the unsupported action",
        ...(supported ? { mark: "mixed" as const } : {}),
      });
      const response = stageResponses[step.kind];
      const choices = supported
        ? [
            option(
              "bound",
              `Keep the narrower route for ${mission.output.toLowerCase()}; record its limit and checkpoint.`,
              `${response.consequence} Your provisional route remains visible in the debrief.`,
              82,
              { trustDelta: -1, riskDelta: 1 },
            ),
            option(
              "reopen",
              `Reopen “${step.title}” and test the stronger evidence route before continuing.`,
              "The original action stays in history. You return to the exact unresolved decision and must demonstrate it again.",
              88,
            ),
            option(
              "pause",
              `Pause this case and carry the unresolved ${step.kind} work with a named owner.`,
              "The conversation ends honestly with an owned open item; this is a mixed business outcome, not a completed case.",
              72,
              {
                createsTask: `Resolve the ${step.title.toLowerCase()} limit in ${mission.title}; review the recorded packet before restarting.`,
              },
            ),
          ]
        : [
            option(
              "repair",
              `Acknowledge the concern, preserve the record and retry “${step.title}”.`,
              `${choice.feedback} The customer agrees to review a corrected action. Acknowledgment alone does not supply missing evidence.`,
              86,
            ),
            option(
              "contain",
              `Stop the proposed action and retain an owned review for ${mission.output.toLowerCase()}.`,
              "The customer accepts containment, but the case stays unverified. Resume with the missing evidence and a fresh attempt.",
              68,
              {
                createsTask: `Review the unsupported ${step.title.toLowerCase()} action in ${mission.title} before case closure.`,
              },
            ),
            option(
              "dismiss",
              "Dismiss the concern and leave the unsupported decision standing.",
              "The customer ends the discussion and requests a documented recovery before relying on another update.",
              15,
              { trustDelta: -5, riskDelta: 5 },
            ),
          ];
      nodes.push({
        id,
        kind: "investigate",
        title: `${supported ? "Agree the limit" : "Repair the conversation"}: ${step.title}`,
        instruction: `${supported ? response.provisional : response.challenge}\n\nCase: ${mission.title}. Your previous action: ${choice.label}\n\nCurrent-stage context: ${step.instruction}\n\n${response.consequence} These are fictional professional consequences. No legal conclusion or offscreen completion is implied.`,
        duration: supported ? 10 : 15,
        location: step.location,
        documentIds: [...step.documentIds],
        sourceIds: [...step.sourceIds],
        requiresEvidence: [...(step.requiresEvidence ?? [])],
        choices,
      });
      if (supported) {
        routes.push(
          {
            fromStepId: id,
            choiceId: "bound",
            ...advance,
            mark: "mixed",
            label: "Bounded continuation with visible uncertainty",
          },
          {
            fromStepId: id,
            choiceId: "reopen",
            nextStepId: step.id,
            mark: "recovery",
            label: "Reopened original decision for stronger evidence",
          },
          {
            fromStepId: id,
            choiceId: "pause",
            ending: "mixed",
            label: "Paused with explicitly owned residual work",
          },
        );
      } else {
        routes.push(
          {
            fromStepId: id,
            choiceId: "repair",
            nextStepId: step.id,
            mark: "recovery",
            label: "Corrective conversation returns to the unresolved decision",
          },
          {
            fromStepId: id,
            choiceId: "contain",
            ending: "mixed",
            label: "Contained without claiming resolution",
          },
          {
            fromStepId: id,
            choiceId: "dismiss",
            ending: "poor",
            label: "Customer confidence lost; correction declined",
          },
        );
      }
    }
  }
  const branching: MissionBranching = {
    version: 1,
    startStepId: mission.steps[0].id,
    nodes,
    routes,
    endings: {
      good: {
        title: "Credible account ownership",
        summary: `You retained ${mission.output.toLowerCase()} through the evidence-backed route. ${mission.consequence}`,
        nextStep:
          "Apply the same reasoning to a different fact pattern. Real tax conclusions still require qualified review.",
      },
      mixed: {
        title: "An honest but limited outcome",
        summary: `The customer understands the limit on ${mission.output.toLowerCase()}. Provisional choices or unfinished verification still affect what this case establishes.`,
        nextStep:
          "Check the retained tasks and evidence gaps. Complete the owned verification before calling unresolved work closed.",
      },
      poor: {
        title: "Confidence needs repair",
        summary: `The customer cannot rely on the current ${mission.output.toLowerCase()}. The original decisions remain in the record; a reassuring message cannot erase them.`,
        nextStep:
          "Correct the claim, preserve the evidence and take a fresh remedial attempt. Critical failures are never erased by a recovery conversation.",
      },
      recovery: {
        title: "A repaired working relationship",
        summary: `You acknowledged a problem and returned to the underlying evidence for ${mission.output.toLowerCase()}. The corrected route is visible alongside the original mistake.`,
        nextStep:
          "Check whether the final evidence passed and any task remains open. Explain the preventive change at the next customer checkpoint.",
      },
    },
  };
  return { ...mission, branching };
}

/** Checks every authored edge, reachability and termination, including repair loops. */
export function validateMissionBranching(mission: Mission): string[] {
  const graph = mission.branching;
  if (!graph) return [];
  const errors: string[] = [];
  const nodes = [...mission.steps, ...graph.nodes];
  const byId = new Map(nodes.map((step) => [step.id, step]));
  const endings = new Set(["good", "mixed", "poor", "recovery"]);
  if (graph.version !== 1)
    errors.push(`${mission.id}: unsupported branch version`);
  if (byId.size !== nodes.length)
    errors.push(`${mission.id}: duplicate branch node`);
  if (!byId.has(graph.startStepId))
    errors.push(`${mission.id}: missing branch start`);
  for (const name of endings) {
    const ending = graph.endings[name as keyof typeof graph.endings];
    if (!ending?.title || !ending.summary || !ending.nextStep)
      errors.push(`${mission.id}: missing ${name} debrief`);
  }
  for (const step of nodes)
    for (const choice of step.choices) {
      const edges = graph.routes.filter(
        (route) => route.fromStepId === step.id && route.choiceId === choice.id,
      );
      if (edges.length !== 1)
        errors.push(
          `${step.id}/${choice.id}: exactly one branch route required`,
        );
    }
  for (const route of graph.routes) {
    if (
      !byId
        .get(route.fromStepId)
        ?.choices.some((choice) => choice.id === route.choiceId)
    )
      errors.push(`${mission.id}: branch route has unknown source or choice`);
    if (!!route.nextStepId === !!route.ending)
      errors.push(`${mission.id}: branch route needs one next node or ending`);
    if (route.nextStepId && !byId.has(route.nextStepId))
      errors.push(
        `${mission.id}: branch route missing target ${route.nextStepId}`,
      );
    if (route.ending && !endings.has(route.ending))
      errors.push(`${mission.id}: unknown branch ending`);
  }
  const reachable = new Set<string>();
  const pending = [graph.startStepId];
  while (pending.length) {
    const id = pending.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    pending.push(
      ...graph.routes
        .filter((route) => route.fromStepId === id && route.nextStepId)
        .map((route) => route.nextStepId!),
    );
  }
  for (const step of nodes)
    if (!reachable.has(step.id))
      errors.push(`${mission.id}: unreachable branch node ${step.id}`);
  const terminates = new Set(
    graph.routes
      .filter((route) => route.ending)
      .map((route) => route.fromStepId),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const route of graph.routes)
      if (
        route.nextStepId &&
        terminates.has(route.nextStepId) &&
        !terminates.has(route.fromStepId)
      ) {
        terminates.add(route.fromStepId);
        changed = true;
      }
  }
  for (const id of reachable)
    if (!terminates.has(id)) errors.push(`${mission.id}: branch trap at ${id}`);
  return errors;
}
