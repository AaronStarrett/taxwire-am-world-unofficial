import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { content } from "../content";
import { createState, transition, activeStep } from "../engine";
import {
  loadState,
  saveState,
  listProfiles,
  deleteState,
} from "../engine/persistence";
import { formatTime } from "../engine/time";
import type { GameAction, GameState } from "../engine/types";
import { getLocationAt, locations } from "../world/locations";
import { safePosition } from "../world/collision";
import type { Dispatch, SetStateAction } from "react";
import Workbench, { type Panel } from "./Workbench";
import { ObjectivePanel } from "./Guidance";
import { tutorialObjective } from "../engine/tutorial";
import { getStepGuidance } from "../content/guidance";
const World = lazy(() => import("../world/World"));
export const DISCLAIMER =
  "Unofficial training prototype. Not endorsed by Taxwire. Fictional customers. Educational simulation—not tax advice.";
export function uid() {
  return crypto.randomUUID();
}
export function download(
  name: string,
  body: string,
  mime = "application/json",
) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function canRender() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
function safeScene(state: GameState): GameState {
  const position = safePosition(state.position, state.location);
  if (
    Math.hypot(position.x - state.position.x, position.z - state.position.z) <
    0.01
  )
    return state;
  return {
    ...state,
    position,
    notifications: [
      ...state.notifications,
      "Your saved position was moved to a safe arrival. Case progress and work history are preserved.",
    ].slice(-8),
  };
}
export default function App() {
  const [state, setState] = useState<GameState>(() =>
    safeScene(
      createState({ id: "learner-default", displayName: "Learner" }, 20261003),
    ),
  );
  const [ready, setReady] = useState(false),
    [saveProtected, setSaveProtected] = useState(false),
    [entered, setEntered] = useState(false),
    [panel, setPanel] = useState<Panel | null>(null),
    [paused, setPaused] = useState(false);
  const [webgl, setWebgl] = useState(() => canRender()),
    [saveLabel, setSaveLabel] = useState("Loading local save…"),
    [name, setName] = useState("Learner");
  const [profiles, setProfiles] = useState<
      { id: string; displayName: string }[]
    >([]),
    [fps, setFps] = useState(0);
  const [telemetry, setTelemetry] = useState({ drawCalls: 0, triangles: 0 });
  const [navigation, setNavigation] = useState<{
    locationId: string;
    objectId?: string;
    x?: number;
    z?: number;
    label?: string;
    requestId: number;
  }>();
  const [cameraReframe, setCameraReframe] = useState(0);
  const [requestedGuideLocation, setRequestedGuideLocation] =
    useState<string>();
  const profileSwitching = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const open = useCallback((value: Panel) => {
    setPanel(value);
    setPaused(false);
    history.replaceState(null, "", `#${value}`);
  }, []);
  const close = useCallback(() => {
    setPanel(null);
    history.replaceState(null, "", "#world");
    document.getElementById("world-shell")?.focus();
  }, []);
  const dispatch = useCallback(
    (action: GameAction) =>
      setState((s) => {
        if (
          action.type === "POSITION" &&
          Math.hypot(s.position.x - action.x, s.position.z - action.z) < 0.02 &&
          Math.abs(s.position.yaw - action.yaw) < 0.02
        )
          return s;
        return transition(s, action, content);
      }),
    [],
  );
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let activeId = "learner-default";
        try {
          activeId =
            localStorage.getItem("taxwire-am-active-profile") || activeId;
        } catch {
          /* IndexedDB can still work without this convenience key. */
        }
        const saved =
          (await loadState(activeId)) ??
          (activeId !== "learner-default"
            ? await loadState("learner-default")
            : undefined);
        const known = await listProfiles();
        if (alive) {
          if (saved) {
            setState(safeScene(saved));
            setName(saved.learner.displayName);
          }
          setProfiles(known);
          setSaveLabel(saved ? "Local save restored" : "Ready to save locally");
        }
      } catch (error) {
        if (alive) {
          setSaveProtected(true);
          setSaveLabel(
            `Original save retained: ${error instanceof Error ? error.message : "Storage could not be read."}`,
          );
        }
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || saveProtected) return;
    setSaveLabel("Saving…");
    const timer = setTimeout(() => {
      saveState(state)
        .then(() => {
          if (stateRef.current === state) {
            setSaveLabel("Saved in this browser");
            void listProfiles()
              .then(setProfiles)
              .catch(() => {});
          }
        })
        .catch(() => {
          if (stateRef.current === state)
            setSaveLabel("Saving unavailable — export your progress");
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [state, ready, saveProtected]);
  useEffect(() => {
    if (!ready || saveProtected) return;
    setName(state.learner.displayName);
    try {
      localStorage.setItem("taxwire-am-active-profile", state.learner.id);
    } catch {
      /* Saving remains available through IndexedDB and export. */
    }
  }, [ready, saveProtected, state.learner.id, state.learner.displayName]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof HTMLElement &&
        (event.target.matches("input,textarea,select") ||
          event.target.isContentEditable);
      if (event.key === "Escape") {
        close();
        setPaused(false);
        if (document.pointerLockElement) void document.exitPointerLock();
        return;
      }
      if (typing || !entered || panel) return;
      if (event.key.toLowerCase() === "m") open("map");
      if (event.key.toLowerCase() === "j") open("journal");
      if (event.key.toLowerCase() === "p") setPaused((p) => !p);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [entered, open, close, panel]);
  const interaction = useCallback(
    (id: string) => {
      if (id.startsWith("travel:")) {
        dispatch({ type: "TRAVEL", location: id.slice(7) });
        return;
      }
      const target: Record<string, Panel> = {
        mentor: "guidance",
        workbench: "inbox",
        missions: "missions",
        research: "research",
        meeting: "mission",
        specialist: "people",
        inbox: "inbox",
        calendar: "calendar",
        journal: "journal",
        accounts: "accounts",
        academy: "academy",
        knowledge: "knowledge",
        reconciliation: "reconciliation",
      };
      open(target[id] || "mission");
    },
    [dispatch, open],
  );
  const stage = activeStep(state, content),
    mission = content.missions.find((m) => m.id === state.activeMissionId);
  const firstDay = tutorialObjective(state, content);
  const attemptMode = mission ? state.missions[mission.id]?.mode : undefined;
  const caseGuide =
    mission && stage
      ? getStepGuidance(
          content,
          mission.id,
          stage.id,
          attemptMode === "replay" ? "guided" : attemptMode,
        )
      : undefined;
  const freshProfile =
    state.tutorial.status === "not_started" &&
    !state.tutorial.legacyOptIn &&
    state.events.length === 0 &&
    Object.keys(state.missions).length === 0;
  const guidanceTarget = firstDay
    ? {
        locationId: firstDay.locationId,
        objectId: firstDay.objectId,
        label: firstDay.title,
        ...(firstDay.id === "move" ? { x: -22, z: 22 } : {}),
      }
    : caseGuide && state.missions[mission!.id]?.mode === "guided"
      ? { locationId: caseGuide.locationId, label: caseGuide.interact }
      : undefined;
  const location = getLocationAt(state.position.x, state.position.z) || {
    name: "Founders Square",
  };
  const go = (id: string) => {
    setState((s) => {
      const next = transition(s, { type: "TRAVEL", location: id }, content);
      const destination = locations.find((l) => l.id === id);
      return destination && next.location === id
        ? {
            ...next,
            position: {
              x: destination.x,
              z: destination.z,
              yaw: destination.rotation,
            },
          }
        : next;
    });
    close();
  };
  const begin = (guided = false) => {
    setState((s) => ({
      ...s,
      learner: {
        ...s.learner,
        displayName: name.trim().slice(0, 60) || "Learner",
      },
    }));
    setEntered(true);
    if (
      guided &&
      state.tutorial.status === "not_started" &&
      !state.tutorial.legacyOptIn
    ) {
      dispatch({ type: "TUTORIAL_START", id: uid() });
    }
    const hash = locationHash();
    if (hash) open(hash);
  };
  const showWhere = () => {
    const destination =
      guidanceTarget ||
      (caseGuide
        ? { locationId: caseGuide.locationId, label: caseGuide.interact }
        : undefined);
    if (!destination) {
      open("academy");
      return;
    }
    setRequestedGuideLocation(destination.locationId);
    if ((!webgl || state.settings.workbench) && firstDay?.id === "move") {
      dispatch({ type: "POSITION", x: -22, z: 22, yaw: 0 });
      dispatch({
        type: "TUTORIAL_ACT",
        id: uid(),
        stepId: "move",
        choiceId: "use-map-navigation",
      });
      return;
    }
    if (state.location !== destination.locationId) {
      open("map");
      return;
    }
    setNavigation({ ...destination, requestId: Date.now() });
    setPaused(false);
    close();
  };
  const reframe = () => {
    if (!webgl || state.settings.workbench) {
      dispatch({ type: "SETTINGS", patch: { workbench: true } });
      dispatch({
        type: "TUTORIAL_ACT",
        id: uid(),
        stepId: "camera",
        choiceId: "use-workbench-view",
      });
    } else {
      setCameraReframe((value) => value + 1);
      close();
    }
  };
  const changeProfile = async (id: string) => {
    if (profileSwitching.current) return;
    profileSwitching.current = true;
    try {
      if (!saveProtected) await saveState(stateRef.current);
      const saved = await loadState(id);
      if (saved) {
        setState(safeScene(saved));
        setSaveProtected(false);
        setEntered(false);
        close();
      }
      setProfiles(await listProfiles());
    } catch {
      setSaveLabel("Profile switch unavailable - export your progress");
    } finally {
      profileSwitching.current = false;
    }
  };
  const newProfile = async () => {
    if (profileSwitching.current) return;
    profileSwitching.current = true;
    try {
      if (!saveProtected) await saveState(stateRef.current);
      const next = safeScene(
        createState({ id: uid(), displayName: "New learner" }, 20261003),
      );
      await saveState(next);
      setProfiles(await listProfiles());
      setState(next);
      setSaveProtected(false);
      setEntered(false);
      close();
    } catch {
      setSaveLabel("Profile creation unavailable - export your progress");
    } finally {
      profileSwitching.current = false;
    }
  };
  const reset = async () => {
    if (saveProtected) {
      setSaveLabel(
        "Original save protected. Select a compatible profile or create a new learner first.",
      );
      return;
    }
    if (
      !window.confirm(
        "Reset this local learner? Export first. Original progress in other profiles is retained.",
      )
    )
      return;
    await deleteState(state.learner.id);
    setState(safeScene(createState(state.learner, state.seed)));
    close();
    setEntered(false);
  };
  return (
    <div
      className="app"
      style={
        { "--text-scale": state.settings.textScale } as React.CSSProperties
      }
    >
      <header className="topbar">
        <button
          className="wordmark"
          onClick={() => setEntered(false)}
          aria-label="Taxwire Account Manager World home"
        >
          <span className="mark">T</span>
          <span>
            Taxwire<span className="wordmark-sub">ACCOUNT MANAGER WORLD</span>
          </span>
        </button>
        <div className="top-center">
          <span className="live-dot" />
          FICTIONAL BUSINESS DISTRICT
        </div>
        <div className="top-actions">
          <span className="clock">{formatTime(state.clockMinutes)}</span>
          <button
            className="icon-btn"
            aria-label="Settings"
            onClick={() => open("settings")}
          >
            ⚙
          </button>
          <button
            className="icon-btn"
            aria-label="About"
            onClick={() => open("about")}
          >
            ⓘ
          </button>
        </div>
      </header>
      <main
        id="world-shell"
        tabIndex={-1}
        className="world-shell"
        data-position={`${state.position.x.toFixed(2)},${state.position.z.toFixed(2)},${state.position.yaw.toFixed(2)}`}
        data-clock={state.clockMinutes}
        data-tutorial-step={firstDay?.id || state.tutorial.status}
      >
        {!ready ? (
          <div className="world-loading">
            <span className="spinner" />
            Restoring your local world…
          </div>
        ) : webgl && !state.settings.workbench ? (
          <Suspense
            fallback={
              <div className="world-loading">
                <span className="spinner" />
                Building your district…
              </div>
            }
          >
            <World
              key={state.learner.id}
              showcase={!entered}
              paused={!entered || !!panel || paused}
              location={state.location}
              position={state.position}
              avatar={state.avatar}
              quality={state.settings.quality}
              reducedMotion={state.settings.reducedMotion}
              cameraSensitivity={state.settings.cameraSensitivity}
              guidanceTarget={guidanceTarget}
              navigateTo={navigation}
              cameraReframe={cameraReframe}
              conversationFraming={
                panel === "guidance" &&
                state.location === "hq" &&
                (firstDay?.id === "mentor" || firstDay?.id === "desk")
              }
              onWorldEvent={(event) =>
                dispatch({ type: "TUTORIAL_WORLD", id: uid(), event })
              }
              onInteract={interaction}
              onTravel={(id) => dispatch({ type: "TRAVEL", location: id })}
              onPosition={(position) =>
                dispatch({ type: "POSITION", ...position })
              }
              onError={() => {
                setWebgl(false);
                open("missions");
              }}
              onTelemetry={(data) => {
                setFps(Math.round(data.fps));
                setTelemetry({
                  drawCalls: data.drawCalls,
                  triangles: data.triangles,
                });
              }}
            />
          </Suspense>
        ) : (
          <div className="fallback-world">
            <div className="district-grid">
              {locations.map((l) => (
                <button
                  key={l.id}
                  style={{ borderTopColor: l.color }}
                  onClick={() => {
                    go(l.id);
                    open("mission");
                  }}
                >
                  <span>⌂</span>
                  <strong>{l.name}</strong>
                  <small>{l.description}</small>
                </button>
              ))}
            </div>
            <p>
              {!webgl
                ? "3D graphics unavailable. The workbench uses the same simulation and save. Retry graphics in Settings."
                : "Workbench mode · The same campaign, clock, and save."}
            </p>
          </div>
        )}
        {!entered && !panel && (
          <div className="welcome-overlay">
            <div className="welcome-card">
              <span className="eyebrow">
                <span className="live-dot" /> A CAREER YOU CAN PRACTICE
              </span>
              <h1>
                Own the relationship.
                <br />
                <em>Deliver the outcome.</em>
              </h1>
              <p className="welcome-description">
                You are an account manager learning to understand customers,
                coordinate the right people, and keep promises. Morgan Vale will
                guide your first complete work cycle.
              </p>
              <div className="welcome-chips">
                <span>↗ Walkable 3D district</span>
                <span>◷ Your pace. Your progress.</span>
                <span>✓ Fully authored. No AI fees.</span>
              </div>
              <label className="name-label">
                Local learner name{" "}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  aria-label="Learner display name"
                />
              </label>
              <button
                className="primary enter"
                onClick={() => begin(freshProfile)}
                disabled={!ready}
              >
                {freshProfile
                  ? "Start your guided first day"
                  : "Continue your day"}{" "}
                <span>→</span>
              </button>
              {(firstDay || mission) && (
                <p className="resume-recap">
                  Next: {firstDay?.title || stage?.title || mission?.title}
                </p>
              )}
              <button className="text-button" onClick={() => begin(false)}>
                Explore freely
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setEntered(true);
                  open("academy");
                }}
              >
                Explore the curriculum
              </button>
              <p className="disclaimer">{DISCLAIMER}</p>
              <span className="welcome-caption">
                Own the relationship. Understand the tax. Deliver the outcome.
              </span>
            </div>
            <div className="welcome-world-note">
              <span className="pill">01 / 08</span>
              <strong>Your apartment</strong>
              <span>Every working day starts with a little preparation.</span>
            </div>
          </div>
        )}
        {entered && !panel && (
          <>
            <div className="location-tag">
              <span className="live-dot" />
              <div>
                <small>YOU ARE HERE</small>
                <strong>{location.name}</strong>
              </div>
              <button
                aria-label="Open district map"
                onClick={() => open("map")}
              >
                ↗
              </button>
            </div>
            <ObjectivePanel
              key={`${firstDay?.id || stage?.id || "idle"}`}
              state={state}
              dispatch={dispatch}
              open={open}
              showWhere={showWhere}
              reframe={reframe}
            />
            <div className="world-controls">
              <span>
                <kbd>W A S D</kbd> move
              </span>
              <span>drag · camera</span>
              <span>
                <kbd>E</kbd> interact
              </span>
              <span>
                <kbd>R</kbd> recover
              </span>
            </div>
            <nav className="dock" aria-label="World tools">
              <button
                onClick={() => open("guidance")}
                aria-label="First-day guide"
              >
                <span>?</span>
                <small>Guide</small>
              </button>
              {(
                [
                  "missions",
                  "map",
                  "inbox",
                  "calendar",
                  "accounts",
                  "knowledge",
                  "journal",
                ] as Panel[]
              ).map((p, i) => (
                <button
                  key={p}
                  aria-label={
                    p === "missions" ? "Cases" : p[0].toUpperCase() + p.slice(1)
                  }
                  onClick={() => open(p)}
                >
                  <span>{["▣", "◇", "✉", "▦", "♧", "▤", "✎"][i]}</span>
                  <small>
                    {p === "missions"
                      ? "Cases"
                      : p[0].toUpperCase() + p.slice(1)}
                  </small>
                </button>
              ))}
              <button onClick={() => setPaused((p) => !p)}>
                <span>Ⅱ</span>
                <small>Pause</small>
              </button>
            </nav>
          </>
        )}
        {paused && (
          <div className="pause-overlay">
            <div className="card">
              <span className="eyebrow">STUDY TIME IS PENALTY FREE</span>
              <h2>Take your time.</h2>
              <p>
                The business clock advances only through deliberate actions.
              </p>
              <button className="primary" onClick={() => setPaused(false)}>
                Resume world
              </button>
            </div>
          </div>
        )}
        {panel && (
          <Workbench
            panel={panel}
            open={open}
            close={close}
            state={state}
            dispatch={dispatch}
            setState={
              ((update: SetStateAction<GameState>) =>
                setState((previous) =>
                  safeScene(
                    typeof update === "function" ? update(previous) : update,
                  ),
                )) as Dispatch<SetStateAction<GameState>>
            }
            go={go}
            profiles={profiles}
            changeProfile={changeProfile}
            newProfile={newProfile}
            reset={reset}
            retryGraphics={() => setWebgl(canRender())}
            telemetry={{ fps, ...telemetry }}
            showWhere={showWhere}
            reframe={reframe}
            guidanceLocation={
              guidanceTarget?.locationId || requestedGuideLocation
            }
          />
        )}
      </main>
      <footer className="statusbar">
        <span>
          <span className="live-dot" />
          {saveLabel}
        </span>
        <span>
          {fps > 0 && webgl && !state.settings.workbench ? `${fps} FPS · ` : ""}
          Offline authored engine · No connected business systems
        </span>
        <button onClick={() => open("about")}>{DISCLAIMER}</button>
      </footer>
      {state.notifications.length > 0 && entered && !panel && (
        <div className="notification" role="status">
          {state.notifications.at(-1)}
        </div>
      )}
    </div>
  );
}
function locationHash(): Panel | null {
  const hash = window.location.hash.slice(1);
  return [
    "guidance",
    "missions",
    "mission",
    "map",
    "inbox",
    "calendar",
    "accounts",
    "people",
    "research",
    "reconciliation",
    "issues",
    "tasks",
    "knowledge",
    "plans",
    "reviews",
    "renewals",
    "journal",
    "academy",
    "settings",
    "saves",
    "editor",
    "about",
  ].includes(hash)
    ? (hash as Panel)
    : null;
}
