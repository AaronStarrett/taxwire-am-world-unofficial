import type { ContentPack } from "../content/types";
import type {
  GameAction,
  GameState,
  TutorialState,
  TutorialStepId,
} from "./types";
import { simulationTimestamp } from "./time";

export const TUTORIAL_VERSION = 1;
export const TUTORIAL_MISSION_ID = "guided-first-day";
export const TUTORIAL_PRACTICE_MARKER = { x: -22, z: 22 };
export const TUTORIAL_MARKER_TOLERANCE = 1.5;
export const TUTORIAL_STEP_IDS: readonly TutorialStepId[] = [
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
];
export interface TutorialChoice {
  id: string;
  label: string;
  feedback: string;
  selectedIds?: string[];
  owner?: string;
}
export interface TutorialObjective {
  id: TutorialStepId;
  title: string;
  where: string;
  why: string;
  doneWhen: string;
  locationId: string;
  objectId?: string;
  tool?: string;
  hint: string;
  choices?: TutorialChoice[];
  factOptions?: { id: string; label: string; kind: "known" | "missing" }[];
}
export function createTutorial(legacyOptIn = false): TutorialState {
  return {
    version: TUTORIAL_VERSION,
    status: "not_started",
    stepIndex: 0,
    run: 0,
    completedStepIds: [],
    history: [],
    inputMethod: "keyboard",
    simulatedMinutes: 0,
    legacyOptIn,
    controlOrigin: { x: 0, z: 0, yaw: 0 },
    scenario: {
      accountId: "acct-cedarline",
      knownIds: [],
      missingIds: [],
      owner: "",
      responseVerified: false,
    },
  };
}
function choice(id: string, label: string, feedback: string): TutorialChoice {
  return { id, label, feedback };
}
export function tutorialObjective(
  state: GameState,
  content: ContentPack,
): TutorialObjective | undefined {
  if (state.tutorial.status !== "active") return undefined;
  const id = TUTORIAL_STEP_IDS[state.tutorial.stepIndex];
  if (!id) return undefined;
  const mentor =
    content.contacts.find((contact) => contact.id === "npc-mentor")?.name ??
    "Morgan Vale";
  const practitioner =
    content.contacts.find((contact) => contact.id === "npc-cedarline-1")
      ?.name ?? "Theo";
  const mission = content.missions.find((item) => item.id === "M-A02");
  const factOptions = [
    {
      id: "channels",
      label:
        mission?.facts[0] ??
        "Cedarline sells homeware direct and through MarketHub.",
      kind: "known" as const,
    },
    {
      id: "announced-portal",
      label:
        mission?.facts[1] ?? "The new portal page says wholesale coming soon.",
      kind: "known" as const,
    },
    {
      id: "launch-date",
      label: "The actual transaction launch date has not been confirmed.",
      kind: "missing" as const,
    },
    {
      id: "pilot-records",
      label:
        "The requested pilot transactions and their channel mapping are not yet supplied.",
      kind: "missing" as const,
    },
  ];
  const definitions: Record<TutorialStepId, Omit<TutorialObjective, "id">> = {
    move: {
      title: "Walk to the nearby practice marker",
      where: "Your starting workspace",
      why: "Learn to reach people and useful work objects at your pace.",
      doneWhen:
        "You reach the practice marker after moving at least one metre, or use the explicit navigation alternative.",
      locationId: "home",
      objectId: "first-day-marker",
      hint: "Use W or the up arrow, or click the floor. The menu navigation alternative is equally valid for guided practice.",
    },
    camera: {
      title: "Adjust your view",
      where: "Your starting workspace",
      why: "Frame the person or desk before interacting.",
      doneWhen:
        "You actually turn the camera, or use the camera menu alternative.",
      locationId: "home",
      objectId: "first-day-marker",
      hint: "Drag on the world to rotate the camera. Menus and reading panels stop movement.",
    },
    mentor: {
      title: `Meet ${mentor}, your fictional mentor`,
      where: "Headquarters reception or the named mentor in the workbench",
      why: "An account owner understands the request, finds evidence, coordinates the right people and follows through.",
      doneWhen:
        "You interact with the named mentor using the world or the explicit conversation menu.",
      locationId: "hq",
      objectId: "mentor",
      tool: "guidance",
      hint: "Follow the mentor marker. Press E near Morgan, or choose the named mentor conversation in Help.",
    },
    desk: {
      title: "Open your workstation",
      where: "Headquarters → work desk",
      why: "Your desk opens the actual tools used throughout the campaign.",
      doneWhen: "You interact with the workstation and open its workspace.",
      locationId: "hq",
      objectId: "workbench",
      tool: "inbox",
      hint: "Look for the workstation label. Press E near it, or use the desk/workspace alternative.",
    },
    inbox: {
      title: "Understand the starting request",
      where: "Workstation → Inbox",
      why: "A page announcement is a prompt for discovery, not proof that a channel is live.",
      doneWhen:
        "You identify the request to confirm the wholesale pilot facts before changing scope.",
      locationId: "hq",
      objectId: "workbench",
      tool: "inbox",
      hint: "Cedarline announced a wholesale portal. Start by checking what actually changed and which records can establish it.",
      choices: [
        choice(
          "identify-request",
          "Confirm what changed and request the missing pilot facts",
          "You kept the request bounded: research first, without making a tax or scope promise.",
        ),
        choice(
          "declare-live",
          "Treat the announcement as a completed launch",
          "An announcement does not confirm transactions or launch timing. Find the missing operating facts first.",
        ),
      ],
    },
    calendar: {
      title: "Protect a customer check-in",
      where: "Workstation → Calendar",
      why: "A check-in turns uncertainty into a visible commitment instead of a silent delay.",
      doneWhen: `You create a valid simulated appointment with ${practitioner}, the Cedarline practitioner.`,
      locationId: "hq",
      objectId: "calendar",
      tool: "calendar",
      hint: "Choose the Cedarline practitioner and a slot inside their visible availability. This is a simulated calendar, with no real invitation.",
    },
    accounts: {
      title: "Find two useful customer facts",
      where: "Workstation → Accounts → Cedarline Commerce",
      why: "Channels and the announcement change which discovery questions you should ask.",
      doneWhen:
        "You select both the existing direct/MarketHub channels and the announced wholesale portal as relevant facts.",
      locationId: "hq",
      objectId: "accounts",
      tool: "accounts",
      hint: "Read the visible Cedarline record and M-A02 packet. The confirmed wording is not a confirmed transaction launch.",
      factOptions: factOptions.filter((fact) => fact.kind === "known"),
      choices: [
        choice(
          "relevant-facts",
          "Record the two relevant business facts",
          "Your preparation now has concrete evidence for a useful conversation.",
        ),
      ],
    },
    journal: {
      title: "Keep a short preparation record",
      where: "Workstation → Journal",
      why: "A retained record prevents guesses from becoming accepted facts during a handoff.",
      doneWhen:
        "You save a first-day preparation brief with your own explanation; free text is retained for self-review.",
      locationId: "hq",
      objectId: "journal",
      tool: "journal",
      hint: "Write what the two facts change about your conversation. Save as first-day-brief. The engine does not pretend to expert-grade your wording.",
    },
    "known-missing": {
      title: "Separate confirmed facts from questions",
      where: "Workstation → Cedarline discovery brief",
      why: "Research informs a question. It does not create authorization or prove a headline.",
      doneWhen:
        "You distinguish the two known facts from the missing launch date and pilot transaction records.",
      locationId: "hq",
      objectId: "accounts",
      tool: "accounts",
      hint: "Ask: Is the portal live, when did it start, and where do the actual pilot transactions appear?",
      factOptions,
      choices: [
        choice(
          "separate-facts",
          "Keep known facts and missing evidence separate",
          "You preserved the announcement as evidence of a statement, while leaving launch timing and transactions unverified.",
        ),
      ],
    },
    owner: {
      title: "Name the next owner",
      where: "Workstation → Tasks",
      why: "The practitioner supplies operating facts; you retain the customer check-in and document the result.",
      doneWhen:
        "You keep learner ownership of the follow-up while requesting pilot facts from the appropriate customer practitioner.",
      locationId: "hq",
      objectId: "workbench",
      tool: "tasks",
      hint: `${practitioner} validates pilot facts; the systems owner validates mapping. The account owner coordinates and verifies the response.`,
      choices: [
        {
          ...choice(
            "retain-owner",
            "I own the check-in; the practitioner supplies pilot facts",
            "Named responsibility avoids both blanket escalation and an abandoned commitment.",
          ),
          owner: "learner",
        },
        choice(
          "send-away",
          "Forward the message and remove my ownership",
          "Forwarding is not a handoff unless a named owner accepts the work. Retain the check-in.",
        ),
      ],
    },
    update: {
      title: "Prepare a bounded customer update",
      where: "Workstation → Inbox",
      why: "A good update explains the known facts, uncertainty, owner and next check-in without claiming completion.",
      doneWhen:
        "You retain a written draft and choose the update that preserves the missing facts and ownership.",
      locationId: "hq",
      objectId: "inbox",
      tool: "inbox",
      hint: "Use the two known facts, ask for the launch/pilot records, name the practitioner and your check-in. Free text uses self-review, not hidden keyword grading.",
      choices: [
        choice(
          "bounded-update",
          "Send the reviewed facts, remaining questions and named check-in",
          "Your simulated update improves communication while the underlying launch question remains open.",
        ),
        choice(
          "promise-complete",
          "Tell the customer the launch and scope are confirmed",
          "The missing records still matter. Do not invent launch confirmation or scope authority.",
        ),
      ],
    },
    followup: {
      title: "Create the promised follow-up",
      where: "Workstation → Tasks",
      why: "The next action must remain visible after the message is sent.",
      doneWhen:
        "An actual learner-owned task records the promised pilot-status check-in.",
      locationId: "hq",
      objectId: "workbench",
      tool: "tasks",
      hint: "Create a named-owner task for checking the returned pilot evidence. Sending the update has not closed this task.",
      choices: [
        {
          ...choice(
            "create-followup",
            "Create my owned pilot-status follow-up",
            "The task stays open until you inspect the later simulated response.",
          ),
          owner: "learner",
        },
      ],
    },
    "later-response": {
      title: "Check the later simulated response",
      where: "Workstation → Inbox",
      why: "A sent request is not evidence that its outcome happened.",
      doneWhen:
        "You deliberately check the authored later response; no real service or timer generates it.",
      locationId: "hq",
      objectId: "inbox",
      tool: "inbox",
      hint: "This teaching step advances only the first-day scenario's simulated time. It does not penalize your campaign's business clock.",
      choices: [
        choice(
          "check-response",
          "Check the later simulated customer response",
          "The check-in response is now recorded. It still does not confirm the transaction launch or provide pilot records.",
        ),
      ],
    },
    verify: {
      title: "Verify what the response establishes",
      where: "Workstation → Tasks and the response record",
      why: "You can verify the check-in while retaining ownership of the records that remain missing.",
      doneWhen:
        "You compare the actual recorded response, close only the fulfilled check-in and retain a named residual-evidence task.",
      locationId: "hq",
      objectId: "workbench",
      tool: "tasks",
      hint: "The response confirms existing channels and that the pilot evidence is still pending. Keep the launch question open; do not mark the whole customer issue resolved.",
      choices: [
        choice(
          "verify-response",
          "Verify the check-in; keep the missing records explicitly owned",
          "You verified a bounded outcome and preserved the remaining work. A message was not mistaken for resolution.",
        ),
        choice(
          "close-all",
          "Close the entire launch question because an email arrived",
          "An arrival confirms communication, not the missing operating facts. Keep the unverified launch and pilot records open.",
        ),
      ],
    },
    debrief: {
      title: "Debrief your guided first day",
      where: "Workstation → Reviews",
      why: "Practise the full ownership loop before applying it to a complete case.",
      doneWhen:
        "You retain the evidence, explain the remaining ownership and choose the next guided application.",
      locationId: "hq",
      objectId: "workbench",
      tool: "reviews",
      hint: "You understood the request, found facts, named an owner, communicated, followed up and verified a bounded outcome. Guided practice is not unaided mastery.",
      choices: [
        choice(
          "retain-lesson",
          "Retain the lesson and continue to guided M-A02",
          "Guided first-day practice is complete. The full M-A02 case remains available with all original casework and scoring; no mastery was awarded here.",
        ),
      ],
    },
  };
  return { id, ...definitions[id] };
}
function notification(state: GameState, message: string): void {
  state.notifications = [...state.notifications, message].slice(-8);
}
function trace(
  state: GameState,
  actionId: string,
  action: string,
  accepted: boolean,
  message: string,
  evidenceIds: string[] = [],
  classifications?: Record<string, "known" | "missing">,
): void {
  const stepId = TUTORIAL_STEP_IDS[state.tutorial.stepIndex] ?? "debrief";
  const retainedLabels =
    classifications && typeof classifications === "object"
      ? Object.fromEntries(
          Object.entries(classifications).filter(
            ([id, label]) =>
              [
                "channels",
                "announced-portal",
                "launch-date",
                "pilot-records",
              ].includes(id) && ["known", "missing"].includes(label),
          ),
        )
      : undefined;
  state.tutorial.history.push({
    id: actionId,
    run: state.tutorial.run,
    stepId,
    action,
    accepted,
    clockMinutes: state.clockMinutes,
    evidenceIds,
    message,
    ...(retainedLabels ? { classifications: retainedLabels } : {}),
  });
  state.events.push({
    id: `event-${state.events.length + 1}`,
    type: accepted ? "tutorial-action" : "tutorial-retry",
    title: message,
    message,
    clockMinutes: state.clockMinutes,
    day: state.day,
    missionId: TUTORIAL_MISSION_ID,
    details: {
      tutorialStepId: stepId,
      action,
      evidenceIds,
      run: state.tutorial.run,
      ...(retainedLabels ? { classifications: retainedLabels } : {}),
    },
  });
  notification(state, message);
}
function advance(
  state: GameState,
  actionId: string,
  action: string,
  message: string,
  evidenceIds: string[] = [],
  classifications?: Record<string, "known" | "missing">,
): void {
  trace(state, actionId, action, true, message, evidenceIds, classifications);
  const id = TUTORIAL_STEP_IDS[state.tutorial.stepIndex];
  if (id && !state.tutorial.completedStepIds.includes(id))
    state.tutorial.completedStepIds.push(id);
  state.tutorial.stepIndex += 1;
  if (state.tutorial.stepIndex >= TUTORIAL_STEP_IDS.length)
    state.tutorial.status = "completed";
}
function artifact(
  state: GameState,
  id: string,
  type: string,
  body: string,
): void {
  state.artifacts.push({
    id,
    type,
    missionId: TUTORIAL_MISSION_ID,
    createdAt: simulationTimestamp(state.clockMinutes),
    body,
  });
}
/** Runs only on accepted domain actions or measured world input; panel display is never an action. */
export function applyTutorialAction(
  state: GameState,
  action: GameAction,
  content: ContentPack,
): void {
  if (action.type === "TUTORIAL_START") {
    if (state.tutorial.status === "active" && !action.replay) {
      notification(
        state,
        "Continue your current guided objective. Your casework is preserved.",
      );
      return;
    }
    if (state.tutorial.status === "completed" && !action.replay) {
      notification(
        state,
        "Your first-day practice is complete. Replay guidance or continue the full campaign.",
      );
      return;
    }
    if (state.tutorial.status === "not_started" || action.replay) {
      const history = state.tutorial.history;
      const run = state.tutorial.run + 1;
      state.tutorial = {
        ...createTutorial(state.tutorial.legacyOptIn),
        history,
        run,
        status: "active",
        controlOrigin: { ...state.position },
      };
    } else state.tutorial.status = "active";
    notification(
      state,
      "Welcome. Understand the request, find the evidence, decide the next step, coordinate the right people, and follow through. Your existing progress is retained.",
    );
    return;
  }
  if (action.type === "TUTORIAL_SKIP") {
    if (state.tutorial.status === "active") {
      trace(
        state,
        action.id,
        "skip-guidance",
        true,
        "Guidance paused by choice. Existing casework and first-day evidence remain; resume or replay whenever useful.",
      );
      state.tutorial.status = "skipped";
    }
    return;
  }
  if (state.tutorial.status !== "active") return;
  const objective = tutorialObjective(state, content);
  if (!objective) return;
  if (action.type === "TUTORIAL_WORLD") {
    const input = action.event;
    if (input.input) state.tutorial.inputMethod = input.input;
    const moved =
      objective.id === "move" &&
      (input.type === "moved" ||
        (input.type === "target-reached" &&
          input.objectId === "first-day-marker")) &&
      Number.isFinite(input.distance) &&
      input.distance! >= 1 &&
      input.input !== "menu" &&
      Math.hypot(
        state.position.x - TUTORIAL_PRACTICE_MARKER.x,
        state.position.z - TUTORIAL_PRACTICE_MARKER.z,
      ) <= TUTORIAL_MARKER_TOLERANCE;
    const camera =
      objective.id === "camera" &&
      input.type === "camera" &&
      Number.isFinite(input.angle) &&
      Math.abs(input.angle!) >= 0.15;
    const mentor =
      objective.id === "mentor" &&
      input.type === "interacted" &&
      ["mentor", "npc-mentor"].includes(input.objectId ?? "");
    const desk =
      objective.id === "desk" &&
      input.type === "interacted" &&
      ["workbench", "desk", "inbox", "first-day-workstation"].includes(
        input.objectId ?? "",
      );
    if (moved || camera || mentor || desk)
      advance(
        state,
        action.id,
        `world:${input.type}:${input.input ?? "keyboard"}`,
        `${objective.title}: real input recorded.`,
        [input.objectId ?? objective.id],
      );
    return;
  }
  // Calendar and journal use their existing tool actions after those actions were accepted.
  if (
    objective.id === "calendar" &&
    action.type === "SCHEDULE" &&
    action.npcId === "npc-cedarline-1" &&
    state.appointments.some((item) => item.id === action.id)
  ) {
    advance(
      state,
      action.id,
      "calendar:appointment",
      "A valid simulated check-in is in the real calendar; no external invitation was sent.",
      [action.id],
    );
    return;
  }
  if (
    objective.id === "journal" &&
    action.type === "SAVE_NOTE" &&
    action.missionId === TUTORIAL_MISSION_ID &&
    (action.noteType ?? action.typeName) === "first-day-brief" &&
    action.body.trim().length >= 20 &&
    state.artifacts.some((item) => item.id === action.id)
  ) {
    advance(
      state,
      action.id,
      "journal:brief",
      "Your preparation record is saved for transparent self-review. Showing Journal alone did not complete this step.",
      [action.id],
    );
    return;
  }
  if (action.type !== "TUTORIAL_ACT") return;
  if (action.stepId !== objective.id) {
    trace(
      state,
      action.id,
      action.choiceId,
      false,
      "Complete the current first-day objective before this later action.",
    );
    return;
  }
  if (objective.id === "move" && action.choiceId === "use-map-navigation") {
    const origin = state.tutorial.controlOrigin;
    if (
      Math.hypot(state.position.x - origin.x, state.position.z - origin.z) <
        1 ||
      Math.hypot(
        state.position.x - TUTORIAL_PRACTICE_MARKER.x,
        state.position.z - TUTORIAL_PRACTICE_MARKER.z,
      ) > TUTORIAL_MARKER_TOLERANCE
    ) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "Use the explicit map action to reach the practice marker before confirming menu navigation.",
      );
      return;
    }
    state.tutorial.inputMethod = "menu";
    advance(
      state,
      action.id,
      "menu:navigation",
      "Actual map navigation recorded for the 2D alternative. No walking animation was assessed.",
      ["first-day-marker"],
    );
    return;
  }
  if (objective.id === "camera" && action.choiceId === "use-workbench-view") {
    if (!state.settings.workbench) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "Enable the reading workbench before confirming the 2D layout alternative.",
      );
      return;
    }
    state.tutorial.inputMethod = "menu";
    advance(
      state,
      action.id,
      "menu:reading-layout",
      "The explicit 2D reading layout alternative is recorded. No rendered camera rotation was assessed.",
      ["workbench-layout"],
    );
    return;
  }
  const expected: Partial<Record<TutorialStepId, string>> = {
    inbox: "identify-request",
    accounts: "relevant-facts",
    "known-missing": "separate-facts",
    owner: "retain-owner",
    update: "bounded-update",
    followup: "create-followup",
    "later-response": "check-response",
    verify: "verify-response",
    debrief: "retain-lesson",
  };
  if (action.choiceId !== expected[objective.id]) {
    const feedback =
      objective.choices?.find((item) => item.id === action.choiceId)
        ?.feedback ??
      "Use the current real tool or interaction; opening its panel does not complete the objective.";
    trace(state, action.id, action.choiceId, false, feedback);
    return;
  }
  const selected = new Set(action.selectedIds ?? []);
  const scenario = state.tutorial.scenario;
  if (
    objective.id === "known-missing" &&
    action.classifications !== undefined
  ) {
    const expectedLabels: Record<string, "known" | "missing"> = {
      channels: "known",
      "announced-portal": "known",
      "launch-date": "missing",
      "pilot-records": "missing",
    };
    if (
      !action.classifications ||
      typeof action.classifications !== "object" ||
      Array.isArray(action.classifications) ||
      Object.keys(action.classifications).length !== 4 ||
      Object.entries(expectedLabels).some(
        ([id, label]) => action.classifications?.[id] !== label,
      )
    ) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "Classify the existing channels and the announcement as known facts. Classify the actual transaction launch date and pilot records as missing evidence. An announcement does not confirm a launch.",
        [],
        action.classifications,
      );
      return;
    }
    for (const id of Object.keys(expectedLabels)) selected.add(id);
  }
  if (objective.id === "accounts" || objective.id === "known-missing") {
    const required =
      objective.id === "accounts"
        ? ["channels", "announced-portal"]
        : ["channels", "announced-portal", "launch-date", "pilot-records"];
    if (
      required.some((id) => !selected.has(id)) ||
      [...selected].some(
        (id) =>
          ![
            "channels",
            "announced-portal",
            "launch-date",
            "pilot-records",
          ].includes(id),
      )
    ) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "Select the two visible business facts and, when requested, the missing launch date and pilot records. Do not convert a headline into confirmed operations.",
      );
      return;
    }
    scenario.knownIds = ["channels", "announced-portal"];
    if (objective.id === "known-missing")
      scenario.missingIds = ["launch-date", "pilot-records"];
  }
  if (objective.id === "owner") {
    if (
      !["learner", state.learner.id, state.learner.displayName].includes(
        action.owner ?? "learner",
      )
    ) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "Retain the learner's customer check-in; the practitioner owns supplying pilot facts. A forwarding address is not an accepted handoff.",
      );
      return;
    }
    scenario.owner = state.learner.displayName;
  }
  if (objective.id === "update") {
    if (
      !action.body ||
      action.body.trim().length < 20 ||
      scenario.missingIds.length < 2 ||
      !scenario.owner
    ) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "Retain a short draft and the already-recorded missing facts and named owner. Your wording is self-reviewed; the structured action does not promise completion.",
      );
      return;
    }
    scenario.updateArtifactId = `first-day-update-${action.id}`;
    artifact(
      state,
      scenario.updateArtifactId,
      "first-day-update-self-review",
      `SIMULATED customer update. Learner text for self-review, not expert text evaluation.\n${action.body.trim().slice(0, 16000)}\n\nStructured evidence: ${scenario.knownIds.join(", ")}; remaining questions: ${scenario.missingIds.join(", ")}; check-in owner: ${scenario.owner}. No confirmed launch, tax determination or scope authorization is created.`,
    );
  }
  if (objective.id === "followup") {
    if (!scenario.updateArtifactId || !scenario.owner) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "Prepare the bounded update and owner before committing follow-up work.",
      );
      return;
    }
    scenario.followupTaskId = `first-day-followup-${action.id}`;
    state.tasks.push({
      id: scenario.followupTaskId,
      title:
        "Check Cedarline's returned pilot-status response and retain the missing records",
      owner: scenario.owner,
      dueMinute: state.clockMinutes + 120,
      status: "open",
      evidence: [],
      missionId: TUTORIAL_MISSION_ID,
    });
  }
  if (objective.id === "later-response") {
    if (!scenario.followupTaskId) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "Keep a named follow-up before advancing to the later response.",
      );
      return;
    }
    state.tutorial.simulatedMinutes += 30;
    scenario.responseId = `first-day-response-${action.id}`;
    const practitioner =
      content.contacts.find((contact) => contact.id === "npc-cedarline-1")
        ?.name ?? "Theo";
    artifact(
      state,
      scenario.responseId,
      "first-day-simulated-response",
      `AUTHORED SIMULATED RESPONSE after 30 first-day scenario minutes. ${practitioner} confirms the visible feed still identifies direct and MarketHub channels. The portal announcement is retained, but no transaction launch date or pilot transaction evidence is supplied yet. The practitioner will provide pilot facts; the systems owner will confirm mappings. This record proves a bounded status check-in, not a launched portal, legal conclusion, provider action or completed underlying issue.`,
    );
  }
  if (objective.id === "verify") {
    const task = state.tasks.find(
      (item) => item.id === scenario.followupTaskId,
    );
    if (
      !task ||
      !scenario.responseId ||
      !state.artifacts.some((item) => item.id === scenario.responseId) ||
      (action.taskId && action.taskId !== task.id)
    ) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "Inspect the actual recorded simulated response and the promised task before claiming verification.",
      );
      return;
    }
    task.status = "completed";
    task.evidence = [scenario.updateArtifactId!, scenario.responseId];
    task.completedAt = state.clockMinutes;
    const practitioner =
      content.contacts.find((contact) => contact.id === "npc-cedarline-1")
        ?.name ?? "Theo";
    state.tasks.push({
      id: `first-day-residual-${action.id}`,
      title:
        "Supply Cedarline pilot records and confirmed launch date; learner retains next check-in",
      owner: practitioner,
      dueMinute: state.clockMinutes + 240,
      status: "open",
      evidence: [scenario.responseId],
      missionId: TUTORIAL_MISSION_ID,
    });
    scenario.responseVerified = true;
  }
  if (objective.id === "debrief") {
    if (!scenario.responseVerified) {
      trace(
        state,
        action.id,
        action.choiceId,
        false,
        "The guided debrief needs a verified response and residual ownership first.",
      );
      return;
    }
    artifact(
      state,
      `first-day-debrief-${action.id}`,
      "first-day-debrief",
      "GUIDED PRACTICE, not unaided mastery. Understood the request; retained two visible Cedarline facts; separated missing launch/pilot evidence; named the customer practitioner and learner check-in; drafted a bounded update; created a task; verified the later simulated check-in; preserved residual work. Next: complete the original M-A02 guided case, then gradually reduce assistance. No competency result or mission was reset or awarded by this tutorial.",
    );
  }
  advance(
    state,
    action.id,
    action.choiceId,
    objective.choices?.find((item) => item.id === action.choiceId)?.feedback ??
      "Accepted first-day work recorded.",
    [
      scenario.updateArtifactId,
      scenario.followupTaskId,
      scenario.responseId,
    ].filter((id): id is string => !!id),
    action.classifications,
  );
}
