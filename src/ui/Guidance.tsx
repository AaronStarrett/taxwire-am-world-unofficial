import { useState } from "react";
import { content } from "../content";
import {
  firstDayCustomerBrief,
  getStepGuidance,
  recommendedMissionOrder,
  guidedFirstDay,
} from "../content/guidance";
import { activeStep } from "../engine";
import { tutorialObjective } from "../engine/tutorial";
import type { GameAction, GameState } from "../engine/types";
import type { Panel } from "./Workbench";
import { uid } from "./App";
import { Portrait } from "./Portrait";

export interface GuidanceProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
  open: (panel: Panel) => void;
  showWhere: () => void;
  reframe?: () => void;
  compact?: boolean;
}

export function ObjectivePanel(props: GuidanceProps) {
  const { state, dispatch, open, showWhere, compact } = props;
  const tutorial = tutorialObjective(state, content);
  const firstGuide = guidedFirstDay.find((item) => item.id === tutorial?.id);
  const mission = content.missions.find((m) => m.id === state.activeMissionId);
  const step = activeStep(state, content);
  const attemptMode = mission ? state.missions[mission.id]?.mode : undefined;
  const guide =
    !tutorial && mission && step
      ? getStepGuidance(
          content,
          mission.id,
          step.id,
          attemptMode === "replay" ? "guided" : attemptMode,
        )
      : undefined;
  const [explain, setExplain] = useState(false),
    [hint, setHint] = useState(0),
    [stuck, setStuck] = useState(false);
  const next = recommendedMissionOrder.find(
    (id) => state.missions[id]?.status !== "completed",
  );
  const record = (
    kind: "explain" | "hint" | "show-location" | "stuck" | "demonstration",
    level?: 1 | 2 | 3,
  ) => {
    if (tutorial || (mission && step))
      dispatch({
        type: "ASSISTANCE",
        id: uid(),
        missionId: tutorial ? "guided-first-day" : mission!.id,
        stepId: tutorial?.id || step!.id,
        kind,
        ...(level ? { level } : {}),
      });
  };
  return (
    <section
      className={`objective-panel ${compact ? "compact" : ""}`}
      aria-label="Current objective"
      data-tutorial-step={tutorial?.id || "none"}
    >
      <div className="objective-label">
        <span className="live-dot" />
        {tutorial
          ? `GUIDED FIRST DAY · ${state.tutorial.stepIndex + 1} / 15`
          : mission
            ? `${state.missions[mission.id]?.mode.toUpperCase()} CASE`
            : "YOUR NEXT STEP"}
      </div>
      <h2>
        {tutorial?.title ||
          guide?.objective ||
          "Build your account ownership skills"}
      </h2>
      <dl>
        <dt>Where</dt>
        <dd>
          {tutorial?.where ||
            (guide
              ? `${guide.locationId} → ${guide.panel}`
              : "Work tools → Academy")}
        </dd>
        <dt>Interact</dt>
        <dd>
          {guide?.interact ||
            (tutorial?.id === "move"
              ? "W / ↑ or click the floor; reach the marker"
              : tutorial?.id === "camera"
                ? "Drag the world, or choose Reframe camera"
                : tutorial?.id === "mentor"
                  ? "E near Morgan, or Talk to Morgan Vale"
                  : tutorial?.id === "desk"
                    ? "E near the work desk, or Open workstation tools"
                    : tutorial?.tool
                      ? `Open ${tutorial.tool}; complete the displayed action`
                      : "Open your next learning activity")}
        </dd>
        <dt>Why</dt>
        <dd>
          {tutorial?.why ||
            guide?.why ||
            "Practice a small work cycle, then apply it to a different customer situation."}
        </dd>
        <dt>Done when</dt>
        <dd>
          {tutorial?.doneWhen ||
            guide?.doneWhen ||
            "You have reviewed your evidence and chosen the next learning task."}
        </dd>
      </dl>
      <div className="guidance-actions">
        <button
          onClick={() => {
            record("show-location");
            showWhere();
          }}
        >
          Show me where
        </button>
        <button
          onClick={() => {
            record("explain");
            setExplain(!explain);
          }}
        >
          Explain this
        </button>
        <button
          onClick={() => {
            const level = Math.min(3, hint + 1) as 1 | 2 | 3;
            record("hint", level);
            setHint(level);
          }}
        >
          Give me a hint
        </button>
        <button
          onClick={() => {
            record("stuck");
            setStuck(!stuck);
          }}
        >
          I'm stuck
        </button>
      </div>
      {explain && (
        <p className="mentor-help">
          {guide?.teach ||
            firstGuide?.teach ||
            tutorial?.why ||
            "Understand the request, find the evidence, decide the next step, coordinate the right people, and follow through."}
        </p>
      )}
      {hint > 0 && (
        <p className="mentor-help">
          <strong>Morgan · hint {hint}</strong>
          <br />
          {guide?.hints[hint - 1] ||
            firstGuide?.hints[hint - 1] ||
            tutorial?.hint ||
            "Open the highlighted work tool. Record a confirmed fact, the missing evidence, its owner and your next check-in."}
        </p>
      )}
      {stuck && (
        <div className="stuck-help">
          <p>
            Close a panel with Esc to return. Your work stays saved. Use the map
            to reach a room, then its labeled interaction. If a person is
            unavailable, prepare a focused question and book a check-in in
            Calendar.
          </p>
          <div className="guidance-actions">
            <button onClick={() => open("guidance")}>
              Open first-day guide
            </button>
            <button onClick={() => open("map")}>Open map</button>
            <button onClick={() => props.reframe?.()}>Reframe camera</button>
            <button onClick={() => open("settings")}>
              Controls & recovery
            </button>
          </div>
        </div>
      )}
      <div className="objective-footer">
        <button
          className="primary compact"
          onClick={() =>
            open(
              tutorial
                ? ((tutorial.tool || "guidance") as Panel)
                : mission
                  ? "mission"
                  : "academy",
            )
          }
        >
          {tutorial
            ? "Open this step"
            : mission
              ? "Continue case"
              : "Choose next activity"}{" "}
          →
        </button>
        <button className="text-button" onClick={() => open("journal")}>
          Journal
        </button>
        <button className="text-button" onClick={() => open("settings")}>
          Controls
        </button>
      </div>
      {!tutorial && !mission && next && (
        <p className="muted">
          Recommended: {content.missions.find((m) => m.id === next)?.title}
        </p>
      )}
    </section>
  );
}

export function FirstDayTools({
  state,
  dispatch,
  open,
  panel,
}: {
  state: GameState;
  dispatch: (a: GameAction) => void;
  open: (p: Panel) => void;
  panel: Panel;
}) {
  const objective = tutorialObjective(state, content);
  const [selected, setSelected] = useState<string[]>([]),
    [classifications, setClassifications] = useState<
      Record<string, "known" | "missing">
    >({}),
    [body, setBody] = useState(""),
    [reviewed, setReviewed] = useState(false);
  if (!objective || objective.tool !== panel) return null;
  const id = objective.id;
  const act = (choiceId: string, owner?: string) => {
    dispatch({
      type: "TUTORIAL_ACT",
      id: uid(),
      stepId: id,
      choiceId,
      selectedIds:
        id === "known-missing" ? Object.keys(classifications) : selected,
      ...(id === "known-missing" ? { classifications } : {}),
      ...(owner ? { owner } : {}),
      ...(body ? { body } : {}),
    });
    if (id === "debrief" && choiceId === "retain-lesson") open("guidance");
  };
  const toggle = (value: string) =>
    setSelected((values) =>
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );
  return (
    <article className="first-day-tools card" data-first-day-tool={id}>
      <span className="eyebrow">YOUR GUIDED FIRST DAY · MORGAN VALE</span>
      <h2>{objective.title}</h2>
      <p>{objective.why}</p>
      {id === "inbox" && (
        <div className="document practice-request">
          <h3>Cedarline Commerce · simulated request</h3>
          <p>{firstDayCustomerBrief.request}</p>
          <small>
            A fictional discovery request. No tax conclusion or scope change is
            authorized.
          </small>
        </div>
      )}
      {(id === "accounts" || id === "known-missing") && (
        <>
          <h3>Cedarline customer record</h3>
          {firstDayCustomerBrief.knownFacts.map((f) => (
            <div className="fact-context" key={f.id}>
              <strong>{f.text}</strong>
              <p>Why it matters: {f.why}</p>
            </div>
          ))}
          <p>
            <strong>A useful clarifying question:</strong>{" "}
            {firstDayCustomerBrief.clarifyingQuestion}
          </p>
          <div className="fact-options">
            {objective.factOptions?.map((f) =>
              id === "known-missing" ? (
                <label className="field" key={f.id}>
                  {f.label}
                  <select
                    aria-label={`Classify ${f.id}`}
                    value={classifications[f.id] || ""}
                    onChange={(event) =>
                      setClassifications((values) => ({
                        ...values,
                        [f.id]: event.target.value as "known" | "missing",
                      }))
                    }
                  >
                    <option value="">Choose the evidence status</option>
                    <option value="known">
                      Confirmed statement or operating fact
                    </option>
                    <option value="missing">Missing operating evidence</option>
                  </select>
                </label>
              ) : (
                <label className="checkbox" key={f.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(f.id)}
                    onChange={() => toggle(f.id)}
                  />
                  {f.label}
                </label>
              ),
            )}
          </div>
        </>
      )}
      {id === "calendar" && (
        <p>
          Book Theo Park, the Cedarline practitioner, for a short preparation
          conversation using the Calendar form below. A real accepted
          appointment advances this step; reading the calendar does not.
        </p>
      )}
      {id === "journal" && (
        <p>
          Use the journal below to record the two facts, one open question and
          who will verify it. Saving your note advances this step.
        </p>
      )}
      {id === "owner" && (
        <p>
          Theo supplies customer launch facts; Lena checks channel mappings. You
          keep the customer check-in and verify the evidence. Asking a
          specialist preserves your ownership.
        </p>
      )}
      {id === "update" && (
        <>
          <label className="field">
            First-day customer update
            <textarea
              aria-label="First-day customer update"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Confirmed… Still unknown… Owner… Next check-in…"
            />
          </label>
          <details>
            <summary>Model comparison and transparent self-review</summary>
            <p>
              We have confirmed direct and MarketHub sales and a portal
              announcement. Its launch date and pilot transactions remain
              unverified. Theo will provide the launch facts; Lena will check
              mappings. I own the next check-in and will review their evidence
              before revising scope.
            </p>
            <p>
              Your text is preserved for review; structured choices are graded.
              No expert evaluator reads your draft.
            </p>
          </details>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I checked confirmed facts, uncertainty, owner and next check-in.
          </label>
        </>
      )}
      {id === "followup" && (
        <p>
          Create a named commitment in the actual task list. It stays open until
          evidence is checked. Sending your update has recorded communication,
          without closing the work.
        </p>
      )}
      {(id === "later-response" || id === "verify") && (
        <>
          <p>
            Use the authored simulated later response. It is not live customer
            activity or an offscreen claim.
          </p>
          {state.artifacts
            .filter((a) => a.missionId === "guided-first-day")
            .slice(-3)
            .map((a) => (
              <details className="document" open key={a.id}>
                <summary>{a.type}</summary>
                <p>{a.body}</p>
              </details>
            ))}
        </>
      )}
      {objective.choices?.map((c) => (
        <button
          className="secondary tutorial-choice"
          key={c.id}
          disabled={id === "update" && (body.trim().length < 20 || !reviewed)}
          onClick={() => act(c.id, c.owner)}
        >
          {c.label}
        </button>
      ))}
      {id === "debrief" && (
        <div className="callout">
          <h3>Your first complete work cycle</h3>
          <p>
            You found the request, separated facts from assumptions, named
            owners, recorded an update, created a commitment and checked a later
            response. The verification made closure possible. This guided
            practice gives learning evidence, without granting independent
            mastery.
          </p>
          <p>
            Next, apply the discovery concept in{" "}
            <strong>Discover the new channel</strong>. You will explain what
            changed before revising scope.
          </p>
        </div>
      )}
      <button className="text-button" onClick={() => open("guidance")}>
        Help stays available
      </button>
    </article>
  );
}

export function MentorWelcome({
  state,
  dispatch,
  open,
}: Pick<GuidanceProps, "state" | "dispatch" | "open">) {
  return (
    <>
      <div className="mentor-welcome">
        <div className="mentor-identity">
          <Portrait name="Morgan Vale" mentor />
          <strong>
            Morgan Vale
            <br />
            <small>Your fictional mentor</small>
          </strong>
        </div>
        <span className="eyebrow">MORGAN VALE · YOUR FICTIONAL MENTOR</span>
        <h2>Welcome to your first day.</h2>
        <p>
          You are an account manager learning to own a customer relationship:
          understand their business, keep commitments and connect the right
          people.
        </p>
        <p className="core-loop">
          Understand the request, find the evidence, decide the next step,
          coordinate the right people, and follow through.
        </p>
        <p>
          Move with WASD or arrows, drag to look around and press E at a labeled
          interaction. Click-to-move and the map offer alternatives. Use the
          objective's help whenever you need it. This lesson takes roughly 10–15
          minutes at your pace, with no countdown.
        </p>
      </div>
      <div className="guidance-actions">
        <button
          className="secondary"
          onClick={() =>
            dispatch({
              type: "TUTORIAL_START",
              id: uid(),
              replay: state.tutorial.status === "completed",
            })
          }
        >
          {state.tutorial.status === "active"
            ? "Keep guiding me"
            : state.tutorial.status === "completed"
              ? "Replay first-day guidance"
              : "Start first-day guidance"}
        </button>
        <button
          className="text-button"
          onClick={() => dispatch({ type: "TUTORIAL_SKIP", id: uid() })}
        >
          Skip guidance for now
        </button>
        <button className="text-button" onClick={() => open("academy")}>
          Explore learning activities
        </button>
      </div>
      <p className="muted">
        Morgan uses authored teaching. No live AI or paid inference is
        connected. Skipping or replaying guidance keeps your cases, history and
        commitments.
      </p>
    </>
  );
}
