import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { content } from "../content";
import type { Mission, Step } from "../content/types";
import { validateContent } from "../content/validate";
import {
  activeStep,
  missionAvailable,
  exportProgress,
  previewImport,
  mergeProgress,
  makeCoachingPacket,
  exportWorldSave,
  importWorldSave,
  listCheckpoints,
  restoreCheckpoint,
} from "../engine";
import type { GameAction, GameState, TrainingExport } from "../engine/types";
import { formatTime, minuteOfDay } from "../engine/time";
import { locations } from "../world/locations";
import { DISCLAIMER, download, uid } from "./App";
export type Panel =
  | "missions"
  | "mission"
  | "map"
  | "inbox"
  | "calendar"
  | "accounts"
  | "people"
  | "research"
  | "reconciliation"
  | "issues"
  | "tasks"
  | "knowledge"
  | "plans"
  | "reviews"
  | "renewals"
  | "journal"
  | "academy"
  | "settings"
  | "saves"
  | "editor"
  | "about";
interface Props {
  panel: Panel;
  open: (p: Panel) => void;
  close: () => void;
  state: GameState;
  dispatch: (a: GameAction) => void;
  setState: Dispatch<SetStateAction<GameState>>;
  go: (id: string) => void;
  profiles: { id: string; displayName: string }[];
  changeProfile: (id: string) => Promise<void>;
  newProfile: () => void;
  reset: () => Promise<void>;
  retryGraphics: () => void;
  telemetry: { fps: number; drawCalls: number; triangles: number };
}
const nav: [Panel, string, string][] = [
  ["missions", "Cases", "▣"],
  ["inbox", "Inbox", "✉"],
  ["calendar", "Calendar", "▦"],
  ["accounts", "Portfolio", "♧"],
  ["people", "People", "♙"],
  ["research", "Research", "⌕"],
  ["reconciliation", "Reconcile", "⊞"],
  ["issues", "Issue board", "⚑"],
  ["tasks", "Commitments", "✓"],
  ["knowledge", "Knowledge", "▤"],
  ["plans", "Account plans", "↗"],
  ["reviews", "Reviews", "◈"],
  ["renewals", "Renewals", "◷"],
  ["journal", "Journal", "✎"],
  ["academy", "Academy", "⌂"],
  ["map", "District map", "◇"],
];
const titles: Record<Panel, string> = {
  missions: "Choose your next case",
  mission: "Your working case",
  map: "A district built for your work",
  inbox: "The customer inbox",
  calendar: "Protect your time. Keep your promises.",
  accounts: "Your account portfolio",
  people: "People make the work happen",
  research: "Build a reliable fact pattern",
  reconciliation: "Follow the money to the source",
  issues: "Own the issue through resolution",
  tasks: "Commitments and dependencies",
  knowledge: "Learn it. Then put it to work.",
  plans: "A plan with named owners",
  reviews: "Evidence before confidence",
  renewals: "An honest renewal forecast",
  journal: "Your working history",
  academy: "Build your account ownership skills",
  settings: "Make this world yours",
  saves: "Your progress travels with you",
  editor: "Local scenario review",
  about: "A fictional world. Real practice.",
};
export default function Workbench(props: Props) {
  const { panel, open, close, state, dispatch, go } = props;
  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>(".workbench");
    const heading = document.getElementById("panel-title");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialog) return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length > 0);
      const first = controls[0],
        last = controls.at(-1);
      if (!first) return;
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === heading)
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [panel]);
  const [selectedAccount, setSelectedAccount] = useState("acct-harborworks"),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [note, setNote] = useState("");
  const [npcId, setNpcId] = useState(content.contacts[0]?.id || ""),
    [day, setDay] = useState(state.day),
    [minute, setMinute] = useState(600);
  const [taskTitle, setTaskTitle] = useState(""),
    [taskOwner, setTaskOwner] = useState("Account owner");
  const [importData, setImportData] = useState<unknown>(null),
    [importError, setImportError] = useState("");
  const [editor, setEditor] = useState(""),
    [editorErrors, setEditorErrors] = useState<string[] | null>(null);
  const account = content.accounts.find((a) => a.id === selectedAccount)!;
  const mission = content.missions.find(
    (m) =>
      m.id ===
      (state.activeMissionId ||
        state.events
          .slice()
          .reverse()
          .find(
            (e) =>
              e.type === "mission-completed" ||
              e.type === "remediation-required",
          )?.missionId),
  );
  const step = activeStep(state, content);
  const preview = importData ? previewImport(importData, state, content) : null;
  const saveNote = (type: string) => {
    if (!note.trim()) return;
    dispatch({
      type: "SAVE_NOTE",
      id: uid(),
      missionId: mission?.id || "free-practice",
      noteType: type,
      body: note,
    });
    setNote("");
  };
  const exportTraining = () =>
    download(
      "taxwire-training-export.json",
      JSON.stringify(exportProgress(state, content), null, 2),
    );
  const showMission = (
    m: Mission,
    mode: "guided" | "independent" | "replay" = "guided",
  ) => {
    dispatch({ type: "START_MISSION", missionId: m.id, mode });
    open("mission");
  };
  const accountPicker = (
    <label className="field">
      Account
      <select
        value={selectedAccount}
        onChange={(e) => setSelectedAccount(e.target.value)}
      >
        {content.accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="workbench-overlay">
      <section
        className="workbench"
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        <aside className="workbench-nav">
          <div className="nav-heading">
            <span className="mark small">T</span> YOUR WORKBENCH
          </div>
          <div className="nav-scroll">
            {nav.map(([id, label, icon]) => (
              <button
                key={id}
                aria-label={label}
                className={panel === id ? "active" : ""}
                onClick={() => {
                  open(id);
                  setSearch("");
                }}
              >
                <span>{icon}</span>
                {label}
                {id === "tasks" &&
                  state.tasks.filter((t) => t.status === "open").length > 0 && (
                    <small>
                      {state.tasks.filter((t) => t.status === "open").length}
                    </small>
                  )}
              </button>
            ))}
          </div>
          <div className="nav-bottom">
            <button onClick={() => open("saves")}>⇅ Saves & export</button>
            <button aria-label="Settings" onClick={() => open("settings")}>
              ⚙ Settings
            </button>
            <button onClick={() => open("about")}>ⓘ About</button>
          </div>
          <p className="local-only">
            SIMULATION ONLY
            <br />
            No real CRM, payments, or email.
          </p>
        </aside>
        <div className="workbench-main">
          <header className="panel-header">
            <div>
              <span className="eyebrow">
                {formatTime(state.clockMinutes)} · {state.campaignStage}
              </span>
              <h1 id="panel-title">{titles[panel]}</h1>
            </div>
            <button
              className="close-btn"
              onClick={close}
              aria-label="Close workbench"
            >
              ×<small>ESC</small>
            </button>
          </header>
          <div className="panel-body">
            {state.notifications.length > 0 && (
              <div className="inline-status" role="status">
                {state.notifications.at(-1)}
              </div>
            )}
            {panel === "missions" && (
              <>
                <div className="panel-intro">
                  <p>
                    Work through a customer situation, produce evidence, and
                    review your decisions. Guided learning and independent
                    attempts are recorded separately.
                  </p>
                  <span className="badge">{content.missions.length} cases</span>
                </div>
                <div className="filter-row">
                  {["all", "core", "advanced", "capstone"].map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "selected" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f === "all"
                        ? "All cases"
                        : f[0].toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                  <input
                    placeholder="Search cases or competencies"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search cases"
                  />
                </div>
                {mission && state.activeMissionId && (
                  <div className="callout">
                    <strong>In progress: {mission.title}</strong>
                    <button onClick={() => open("mission")}>Resume →</button>
                  </div>
                )}
                <div className="mission-grid">
                  {content.missions
                    .filter(
                      (m) =>
                        (filter === "all" || m.stage === filter) &&
                        `${m.title} ${m.id} ${m.competencyIds.join(" ")}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((m, i) => {
                      const p = state.missions[m.id],
                        unlocked = missionAvailable(state, m);
                      return (
                        <article
                          className="mission-card"
                          data-case-id={m.id}
                          key={m.id}
                        >
                          <div className="mission-card-top">
                            <span className="case-number">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className={`badge ${m.stage}`}>
                              {m.stage}
                            </span>
                          </div>
                          <small className="muted">
                            {m.id} ·{" "}
                            {
                              content.accounts.find((a) => a.id === m.accountId)
                                ?.name
                            }
                          </small>
                          <h2>{m.title}</h2>
                          <p>{m.briefing}</p>
                          <div className="tags">
                            {m.competencyIds.map((id) => (
                              <span key={id}>{id}</span>
                            ))}
                          </div>
                          <div className="mission-card-foot">
                            <span>
                              {p?.status === "completed"
                                ? `✓ ${Math.round(p.bestScore)} / 100`
                                : unlocked
                                  ? `${m.steps.length} actions`
                                  : `Requires ${m.prerequisiteIds.join(", ")}`}
                            </span>
                            <button
                              className="primary compact"
                              disabled={!unlocked}
                              onClick={() =>
                                showMission(
                                  m,
                                  p?.status === "completed"
                                    ? "replay"
                                    : "guided",
                                )
                              }
                            >
                              {p?.status === "completed" ? "Replay" : "Begin"} →
                            </button>
                          </div>
                          {unlocked && (
                            <button
                              className="text-button"
                              onClick={() => showMission(m, "independent")}
                            >
                              Independent attempt
                            </button>
                          )}
                        </article>
                      );
                    })}
                </div>
              </>
            )}
            {panel === "mission" && (
              <>
                {mission && step ? (
                  <MissionView
                    key={`${mission.id}-${step.id}-${state.missions[mission.id]?.attempts.length}`}
                    state={state}
                    mission={mission}
                    step={step}
                    dispatch={dispatch}
                    go={go}
                  />
                ) : (
                  <>
                    <div className="empty-state">
                      <span>✓</span>
                      <h2>
                        {mission
                          ? "Case actions complete"
                          : "Your next case is waiting"}
                      </h2>
                      <p>
                        {mission
                          ? mission.consequence
                          : "Choose a case to start. Your work will persist through the world and the workbench."}
                      </p>
                      <button
                        className="primary"
                        onClick={() => open(mission ? "reviews" : "missions")}
                      >
                        {mission ? "View evidence debrief" : "Choose a case"} →
                      </button>
                    </div>
                    {mission && <Debrief state={state} mission={mission} />}
                  </>
                )}
              </>
            )}
            {panel === "map" && (
              <>
                <p className="panel-intro">
                  Walk between eight connected locations. Remote meetings remain
                  available in the workbench. Fast travel unlocks as each
                  location is introduced.
                </p>
                <div className="map-illustration">
                  <div className="map-cross horizontal" />
                  <div className="map-cross vertical" />
                  {locations.map((l) => (
                    <button
                      key={l.id}
                      className={`map-pin ${state.location === l.id ? "current" : ""}`}
                      style={{
                        left: `${50 + l.centerX * 1.6}%`,
                        top: `${50 + l.centerZ * 1.4}%`,
                        borderColor: l.color,
                      }}
                      onClick={() => go(l.id)}
                    >
                      <span>⌂</span>
                      <strong>{l.name}</strong>
                      <small>
                        {state.visitedLocations.includes(l.id)
                          ? "Travel here"
                          : "Introduce location"}
                      </small>
                    </button>
                  ))}
                </div>
                <div className="location-list">
                  {locations.map((l) => (
                    <article key={l.id}>
                      <span style={{ background: l.color }}>⌂</span>
                      <div>
                        <h3>{l.name}</h3>
                        <p>{l.description}</p>
                      </div>
                      <button className="secondary" onClick={() => go(l.id)}>
                        Visit →
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
            {panel === "inbox" && (
              <>
                <div className="panel-intro">
                  <p>
                    Fictional messages reflect case work and your commitments.
                    Sending an update records communication; resolving an issue
                    requires evidence and residual ownership.
                  </p>
                  <button className="secondary" onClick={() => open("mission")}>
                    Current case →
                  </button>
                </div>
                <div className="message-list">
                  {content.missions
                    .filter((m) => m.stage === "core")
                    .slice(0, 8)
                    .map((m, i) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          if (missionAvailable(state, m)) {
                            showMission(m);
                          } else open("missions");
                        }}
                      >
                        <span
                          className="portrait"
                          style={{ background: content.contacts[i]?.color }}
                        >
                          {content.contacts[i]?.name[0]}
                        </span>
                        <div>
                          <small>
                            {
                              content.accounts.find((a) => a.id === m.accountId)
                                ?.name
                            }{" "}
                            · SIMULATED MESSAGE
                          </small>
                          <h3>{m.title}</h3>
                          <p>{m.briefing}</p>
                        </div>
                        <span>↗</span>
                      </button>
                    ))}
                </div>
                <div className="card">
                  <h2>Send a recorded customer update</h2>
                  <p>
                    Write the finding, what remains uncertain, named owner, next
                    action, and promised date. This is simulated communication.
                  </p>
                  {accountPicker}
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Confirmed facts… Uncertainty… Owner… Next update…"
                    aria-label="Customer update"
                  />
                  <button
                    className="primary"
                    onClick={() =>
                      saveNote(`customer-update:${selectedAccount}`)
                    }
                  >
                    Record simulated update
                  </button>
                </div>
              </>
            )}
            {panel === "calendar" && (
              <>
                <div className="two-col">
                  <div className="card">
                    <h2>Book a conversation</h2>
                    <p>
                      Capacity and appointment conflicts are checked by the same
                      business clock. Customer preferences and hours appear in
                      People.
                    </p>
                    <label className="field">
                      Contact
                      <select
                        aria-label="Contact"
                        value={npcId}
                        onChange={(e) => setNpcId(e.target.value)}
                      >
                        {content.contacts.map((n) => (
                          <option value={n.id} key={n.id}>
                            {n.name} · {n.role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Simulated day
                      <input
                        aria-label="Simulated day"
                        type="number"
                        min={state.day}
                        value={day}
                        onChange={(e) => setDay(Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      Start time
                      <select
                        aria-label="Start time"
                        value={minute}
                        onChange={(e) => setMinute(Number(e.target.value))}
                      >
                        {Array.from({ length: 16 }, (_, i) => 540 + i * 30).map(
                          (v) => (
                            <option
                              value={v}
                              key={v}
                            >{`${Math.floor(v / 60)}:${v % 60 ? "30" : "00"}`}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <button
                      className="primary"
                      onClick={() =>
                        dispatch({
                          type: "SCHEDULE",
                          npcId,
                          day,
                          minute,
                          duration: 30,
                          id: uid(),
                        })
                      }
                    >
                      Schedule 30 minutes
                    </button>
                  </div>
                  <div className="card">
                    <h2>Your calendar</h2>
                    {state.appointments.length ? (
                      state.appointments.map((a) => (
                        <div className="record" key={a.id}>
                          <strong>
                            {
                              content.contacts.find((n) => n.id === a.npcId)
                                ?.name
                            }
                          </strong>
                          <p>
                            Day {a.day} · {Math.floor(a.minute / 60)}:
                            {String(a.minute % 60).padStart(2, "0")} ·{" "}
                            {a.duration} min · {a.status}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p>
                        No meetings scheduled. Protect buffers for research and
                        follow-up.
                      </p>
                    )}
                    <div className="callout">
                      Current: {formatTime(state.clockMinutes)}
                      <br />
                      Minutes remaining today:{" "}
                      {1020 - minuteOfDay(state.clockMinutes)}
                    </div>
                    <button
                      className="secondary"
                      onClick={() => dispatch({ type: "WAIT", minutes: 30 })}
                    >
                      Advance 30 business minutes
                    </button>
                    <button
                      className="text-button"
                      onClick={() => dispatch({ type: "END_DAY" })}
                    >
                      Close day deliberately
                    </button>
                  </div>
                </div>
                <div className="callout">
                  <strong>Three deadlines, three meanings</strong>
                  <p>
                    A statutory deadline comes from the applicable authority. A
                    customer promise is your communication commitment. An
                    internal target is a fictional operating goal. Never
                    substitute one for another.
                  </p>
                </div>
              </>
            )}
            {panel === "accounts" && (
              <>
                <div className="account-grid">
                  {content.accounts.map((a) => {
                    const health = state.accountHealth[a.id];
                    return (
                      <button
                        className="account-card"
                        key={a.id}
                        onClick={() => {
                          setSelectedAccount(a.id);
                          open("plans");
                        }}
                      >
                        <span className="account-monogram">
                          {a.name
                            .split(" ")
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <h2>{a.name}</h2>
                        <p>{a.business}</p>
                        <div className="account-data">
                          <span>{a.contacts.length} contacts</span>
                          <span>Renewal day {a.renewalDay}</span>
                        </div>
                        <small>
                          {health
                            ? `Training trust ${health.trust} · Risk ${health.risk}`
                            : "Health: insufficient evidence"}
                        </small>
                        <span className="account-link">
                          Open account plan →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {panel === "people" && (
              <>
                <div className="panel-intro">
                  <p>
                    Each contact has a limited fact set, available hours,
                    decision authority, and fictional relationship memory.
                    Research the business, then ask a focused question.
                  </p>
                </div>
                {accountPicker}
                <div className="people-grid">
                  {content.contacts
                    .filter(
                      (n) =>
                        n.accountId === selectedAccount ||
                        n.accountId === "internal",
                    )
                    .map((n) => (
                      <article className="card person" key={n.id}>
                        <span
                          className="portrait large"
                          style={{ background: n.color }}
                        >
                          {n.name
                            .split(" ")
                            .map((s) => s[0])
                            .join("")}
                        </span>
                        <h2>{n.name}</h2>
                        <span className="badge">{n.role}</span>
                        <p>{n.goals}</p>
                        <dl>
                          <dt>Authority</dt>
                          <dd>{n.authority}</dd>
                          <dt>Communication</dt>
                          <dd>{n.preference}</dd>
                          <dt>Availability</dt>
                          <dd>
                            {Math.floor(n.availability[0] / 60)}:
                            {String(n.availability[0] % 60).padStart(2, "0")}–
                            {Math.floor(n.availability[1] / 60)}:
                            {String(n.availability[1] % 60).padStart(2, "0")}{" "}
                            simulation time
                          </dd>
                          <dt>Visible knowledge</dt>
                          <dd>{n.knows.join(" · ")}</dd>
                          <dt>Memory</dt>
                          <dd>
                            {state.npcMemory[n.id]
                              ? `${state.npcMemory[n.id].interactions} conversations. Commitments: ${state.npcMemory[n.id].commitments.join("; ") || "none"}`
                              : "Introductions still to make."}
                          </dd>
                        </dl>
                        <button
                          className="secondary"
                          onClick={() => {
                            setNpcId(n.id);
                            open("calendar");
                          }}
                        >
                          Prepare meeting →
                        </button>
                      </article>
                    ))}
                </div>
              </>
            )}
            {panel === "research" && (
              <>
                <div className="panel-intro">
                  <p>
                    These are authored fictional business pages and records.
                    Separate confirmed information from hypotheses and discovery
                    questions.
                  </p>
                </div>
                {accountPicker}
                <div className="two-col">
                  <div>
                    {account.research.map((r, i) => (
                      <article className="card" key={i}>
                        <span className={`badge ${r.confidence}`}>
                          {r.confidence}
                        </span>
                        <h2>{r.title}</h2>
                        <p className="prewrap">{r.body}</p>
                      </article>
                    ))}
                  </div>
                  <div>
                    <h2>Case documents</h2>
                    {content.documents
                      .filter((d) => d.accountId === selectedAccount)
                      .map((d) => (
                        <details className="document" key={d.id}>
                          <summary>
                            {d.title}
                            <span>{d.kind}</span>
                          </summary>
                          <p className="prewrap">{d.body}</p>
                          <Sources ids={d.sourceIds} />
                        </details>
                      ))}
                    <div className="card">
                      <h2>Discovery notes</h2>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Confirmed / hypothesis / question / source / owner"
                        aria-label="Discovery notes"
                      />
                      <button
                        className="primary"
                        onClick={() => saveNote(`research:${selectedAccount}`)}
                      >
                        Save fact pattern
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {panel === "reconciliation" && (
              <>
                <div className="callout">
                  <strong>Training assumption · Synthetic 8% tax · USD</strong>
                  <p>
                    The rate is a calculation exercise, not a real jurisdiction
                    rule. Work in integer cents. Credit rows preserve their
                    original source IDs.
                  </p>
                </div>
                <Reconciliation />
                <div className="card">
                  <h2>Evidence trail</h2>
                  {content.documents
                    .filter((d) => d.accountId === selectedAccount)
                    .slice(0, 4)
                    .map((d) => (
                      <details className="document" key={d.id}>
                        <summary>{d.title}</summary>
                        <p className="prewrap">{d.body}</p>
                      </details>
                    ))}
                  <button className="secondary" onClick={() => open("mission")}>
                    Apply to current case →
                  </button>
                </div>
              </>
            )}
            {panel === "issues" && (
              <>
                <p className="panel-intro">
                  A message does not close an issue. A passing case needs a
                  reliable fact pattern, verification, a customer explanation,
                  residual ownership, and preventive follow-up.
                </p>
                <div className="board">
                  {(["not_started", "in_progress", "completed"] as const).map(
                    (status) => (
                      <div className="board-column" key={status}>
                        <h2>
                          {status.replaceAll("_", " ")}{" "}
                          <span>
                            {
                              content.missions.filter(
                                (m) =>
                                  (state.missions[m.id]?.status ||
                                    "not_started") === status,
                              ).length
                            }
                          </span>
                        </h2>
                        {content.missions
                          .filter(
                            (m) =>
                              (state.missions[m.id]?.status ||
                                "not_started") === status,
                          )
                          .slice(0, 10)
                          .map((m) => (
                            <button
                              className="card"
                              key={m.id}
                              onClick={() => {
                                if (status === "in_progress") open("mission");
                                else if (missionAvailable(state, m))
                                  showMission(m);
                              }}
                            >
                              <small>{m.id}</small>
                              <h3>{m.title}</h3>
                              <p>{m.output}</p>
                            </button>
                          ))}
                      </div>
                    ),
                  )}
                </div>
                {Object.entries(state.missions)
                  .filter(([, p]) => p.status === "needs_remediation")
                  .map(([id, p]) => (
                    <div className="callout critical" key={id}>
                      <strong>{id} · Remediation required</strong>
                      <p>{p.criticalFailures.join("; ")}</p>
                      <button
                        onClick={() =>
                          showMission(
                            content.missions.find((m) => m.id === id)!,
                            "independent",
                          )
                        }
                      >
                        Retry with a new evidence trail
                      </button>
                    </div>
                  ))}
              </>
            )}
            {panel === "tasks" && (
              <>
                <div className="two-col">
                  <div className="card">
                    <h2>Create a commitment</h2>
                    <label className="field">
                      Outcome
                      <input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="A concrete next action"
                      />
                    </label>
                    <label className="field">
                      Named owner
                      <input
                        value={taskOwner}
                        onChange={(e) => setTaskOwner(e.target.value)}
                      />
                    </label>
                    <p>
                      Due in 120 business minutes; explicit training promise.
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        dispatch({
                          type: "TASK",
                          id: uid(),
                          title: taskTitle,
                          owner: taskOwner,
                          dueMinute: state.clockMinutes + 120,
                        });
                        setTaskTitle("");
                      }}
                    >
                      Create commitment
                    </button>
                  </div>
                  <div>
                    <h2>Open and completed work</h2>
                    {state.tasks.length ? (
                      state.tasks.map((t) => (
                        <article className="card" key={t.id}>
                          <span className="badge">{t.status}</span>
                          <h3>{t.title}</h3>
                          <p>
                            Owner: {t.owner} · Due {formatTime(t.dueMinute)}
                          </p>
                          {t.status === "open" ? (
                            <>
                              <label className="field">
                                Verification evidence
                                <input
                                  placeholder="Evidence record or artifact ID"
                                  aria-label={`Evidence for ${t.title}`}
                                  onChange={(e) => setNote(e.target.value)}
                                />
                              </label>
                              <button
                                className="secondary"
                                onClick={() => {
                                  dispatch({
                                    type: "COMPLETE_TASK",
                                    taskId: t.id,
                                    evidence: note,
                                    id: uid(),
                                  });
                                  setNote("");
                                }}
                              >
                                Verify and close
                              </button>
                            </>
                          ) : (
                            <p>{t.evidence.join(" · ")}</p>
                          )}
                        </article>
                      ))
                    ) : (
                      <p>
                        No recorded commitments yet. Mission choices can create
                        dependencies.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
            {panel === "knowledge" && (
              <>
                <input
                  className="search"
                  placeholder="Search a competency, term, or topic"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search knowledge"
                />
                <div className="knowledge-list">
                  {content.competencies
                    .filter((c) =>
                      `${c.id} ${c.title} ${c.explanation}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((c) => (
                      <details className="knowledge-card" key={c.id}>
                        <summary>
                          <span className="competency-id">{c.id}</span>
                          <div>
                            <h2>{c.title}</h2>
                            <span>
                              {state.competencies[c.id]?.level || "not_started"}
                            </span>
                          </div>
                          <span>+</span>
                        </summary>
                        <div className="knowledge-content">
                          <h3>Teach</h3>
                          <p>{c.explanation}</p>
                          <h3>Worked example</h3>
                          <p>{c.example}</p>
                          <h3>Vocabulary</h3>
                          <dl>
                            {Object.entries(c.glossary).map(
                              ([term, meaning]) => (
                                <div key={term}>
                                  <dt>{term}</dt>
                                  <dd>{meaning}</dd>
                                </div>
                              ),
                            )}
                          </dl>
                          <div className="callout">
                            <strong>Common misconception</strong>
                            <p>{c.misconception}</p>
                          </div>
                          <h3>Guided practice</h3>
                          <p>{c.guidedPractice}</p>
                          <h3>Independent application</h3>
                          <p>{c.independentPractice}</p>
                          <h3>Inspectable rubric</h3>
                          <ul>
                            {c.rubric.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                          <h3>Reusable work product</h3>
                          <p>{c.workProduct}</p>
                          <Sources ids={c.sourceIds} />
                          <button
                            className="primary"
                            onClick={() =>
                              showMission(
                                content.missions.find(
                                  (m) => m.id === `M-${c.id}`,
                                )!,
                              )
                            }
                          >
                            Practice this competency →
                          </button>
                        </div>
                      </details>
                    ))}
                </div>
              </>
            )}
            {panel === "plans" && (
              <>
                {accountPicker}
                <div className="two-col">
                  <div className="card">
                    <span className="badge">FICTIONAL ACCOUNT</span>
                    <h2>{account.name}</h2>
                    <p>{account.business}</p>
                    <dl>
                      {[
                        ["Legal entities", account.entities],
                        ["Products", account.products],
                        ["Channels", account.channels],
                        ["Systems", account.systems],
                        ["Geography", account.geography],
                        ["Business priorities", account.priorities],
                      ].map(([label, items]) => (
                        <div key={String(label)}>
                          <dt>{label}</dt>
                          <dd>{(items as string[]).join(" · ")}</dd>
                        </div>
                      ))}
                    </dl>
                    <h3>Stakeholder map</h3>
                    {content.contacts
                      .filter((n) => n.accountId === account.id)
                      .map((n) => (
                        <div className="relationship-edge" key={n.id}>
                          <span
                            className="portrait"
                            style={{ background: n.color }}
                          >
                            {n.name[0]}
                          </span>
                          <div>
                            <strong>{n.name}</strong>
                            <p>
                              {n.role} → {n.authority}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="card">
                    <h2>Account plan</h2>
                    <p>
                      Connect business goals to evidence, the stakeholder who
                      owns the outcome, a next action, a date, and scope
                      approval.
                    </p>
                    <textarea
                      rows={10}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Outcome / evidence / risk / owner / next review / value / scope"
                      aria-label="Account plan"
                    />
                    <button
                      className="primary"
                      onClick={() =>
                        saveNote(`account-plan:${selectedAccount}`)
                      }
                    >
                      Save plan
                    </button>
                    {state.artifacts
                      .filter(
                        (a) => a.type === `account-plan:${selectedAccount}`,
                      )
                      .map((a) => (
                        <div className="record" key={a.id}>
                          <small>{a.createdAt}</small>
                          <p className="prewrap">{a.body}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
            {panel === "reviews" && (
              <>
                <div className="panel-intro">
                  <p>
                    Tax/evidence 25% · Execution/verification 25% ·
                    Communication 20% · Commercial judgment 15% ·
                    Prioritization/documentation 15%. Critical failures require
                    remediation before a pass.
                  </p>
                </div>
                {content.missions
                  .filter((m) => state.missions[m.id]?.attempts.length)
                  .map((m) => (
                    <Debrief key={m.id} mission={m} state={state} />
                  ))}
                {!Object.values(state.missions).some(
                  (m) => m.attempts.length,
                ) && (
                  <div className="empty-state">
                    <h2>Evidence comes from practice.</h2>
                    <p>
                      Complete a case to see structured grading and your
                      original action history.
                    </p>
                    <button
                      className="primary"
                      onClick={() => open("missions")}
                    >
                      Start a case
                    </button>
                  </div>
                )}
                <h2>Spaced review queue</h2>
                {state.reviewQueue.map((r, i) => (
                  <div className="record" key={i}>
                    <strong>{r.competencyId}</strong>
                    <p>
                      {r.reason} · Due {r.dueAt}
                    </p>
                  </div>
                ))}
              </>
            )}
            {panel === "renewals" && (
              <>
                <div className="callout">
                  <strong>Fictional commercial policy</strong>
                  <p>
                    Forecasts require evidence and approver confirmation. No
                    discounts, tax guarantees, refunds, or expanded scope may be
                    promised by an account owner. A friendly conversation is
                    insufficient renewal evidence.
                  </p>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Annual training value</th>
                      <th>Renewal</th>
                      <th>Evidence / confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.accounts.map((a) => (
                      <tr key={a.id}>
                        <td>{a.name}</td>
                        <td>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: a.currency,
                          }).format(a.annualValueMinor / 100)}
                        </td>
                        <td>Day {a.renewalDay}</td>
                        <td>
                          {state.accountHealth[a.id]?.evidence.length
                            ? `${state.accountHealth[a.id].evidence.length} action records — validate intent`
                            : "Unqualified · intent unknown"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="card">
                  <h2>Record a renewal or expansion hypothesis</h2>
                  {accountPicker}
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    aria-label="Renewal forecast"
                    placeholder="Evidence / decision-maker / risk / confidence / authorized scope / next validation"
                  />
                  <button
                    className="primary"
                    onClick={() => saveNote(`renewal:${selectedAccount}`)}
                  >
                    Save evidence-based forecast
                  </button>
                </div>
              </>
            )}
            {panel === "journal" && (
              <>
                <div className="card">
                  <h2>Your work products</h2>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What changed? What remains uncertain? Who owns the next action?"
                    aria-label="Journal note"
                  />
                  <button
                    className="primary"
                    onClick={() => saveNote("reflection")}
                  >
                    Save reflection
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        "taxwire-coaching-packet.txt",
                        makeCoachingPacket(state, content),
                        "text/plain",
                      )
                    }
                  >
                    Export Coaching Packet
                  </button>
                </div>
                <div className="two-col">
                  <div>
                    <h2>Artifacts</h2>
                    {state.artifacts
                      .slice()
                      .reverse()
                      .map((a) => (
                        <details className="document" key={a.id}>
                          <summary>
                            {a.type}
                            <span>{a.missionId}</span>
                          </summary>
                          <small>{a.createdAt}</small>
                          <p className="prewrap">{a.body}</p>
                        </details>
                      ))}
                  </div>
                  <div>
                    <h2>Action history</h2>
                    {state.events
                      .slice()
                      .reverse()
                      .slice(0, 150)
                      .map((e) => (
                        <div className="timeline-record" key={e.id}>
                          <small>
                            {formatTime(e.clockMinutes)} · {e.type}
                          </small>
                          <h3>{e.title}</h3>
                          <p>{e.message}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
            {panel === "academy" && (
              <>
                <div className="academy-banner">
                  <span className="eyebrow">
                    ADVANCED COMPETENCE STARTS WITH THE BASICS
                  </span>
                  <h2>Practice the whole job.</h2>
                  <p>
                    Mix tax reasoning, customer conversations, execution, and
                    commercial judgment from your first session.
                  </p>
                  <div className="stage-track">
                    {[
                      "Guided Associate",
                      "Independent Account Owner",
                      "Portfolio Operator",
                      "Strategic Account Leader",
                    ].map((s, i) => (
                      <span
                        className={state.campaignStage === s ? "current" : ""}
                        key={s}
                      >
                        <small>0{i + 1}</small>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <h2>Your seven-session Bootcamp</h2>
                <div className="bootcamp-grid">
                  {content.bootcamp.map((b) => (
                    <article className="card" key={b.session}>
                      <span className="eyebrow">SESSION {b.session}</span>
                      <h2>{b.title}</h2>
                      <ul>
                        {b.missionIds.map((id) => (
                          <li key={id}>
                            {content.missions.find((m) => m.id === id)?.title}
                          </li>
                        ))}
                      </ul>
                      <button
                        className="secondary"
                        onClick={() => {
                          const m = content.missions.find(
                            (m) => m.id === b.missionIds[0],
                          );
                          if (m) showMission(m);
                        }}
                      >
                        Begin session →
                      </button>
                    </article>
                  ))}
                </div>
                <div className="two-col">
                  <div className="card">
                    <h2>Free practice & case replay</h2>
                    <p>
                      Replay any unlocked case. Replay does not manufacture
                      independent mastery or repeat rewards. Compare earlier
                      attempts in Reviews.
                    </p>
                    <button
                      className="primary"
                      onClick={() => open("missions")}
                    >
                      Open cases →
                    </button>
                  </div>
                  <div className="card">
                    <h2>Mentor session</h2>
                    <p>
                      Open a concept in Knowledge, write your explanation, then
                      compare with its worked example and rubric. Export a
                      Coaching Packet for discussion in ChatGPT. No API key or
                      paid inference is used by this game.
                    </p>
                    <button
                      className="primary"
                      onClick={() => open("knowledge")}
                    >
                      Study with examples →
                    </button>
                  </div>
                </div>
                <p className="muted">
                  Game titles reflect evidence in this simulation. They are not
                  a professional qualification.
                </p>
              </>
            )}
            {panel === "settings" && (
              <>
                <div className="two-col">
                  <div className="card">
                    <h2>Graphics & accessibility</h2>
                    <label className="field">
                      Quality
                      <select
                        value={state.settings.quality}
                        onChange={(e) =>
                          dispatch({
                            type: "SETTINGS",
                            patch: {
                              quality: e.target
                                .value as GameState["settings"]["quality"],
                            },
                          })
                        }
                      >
                        <option value="low">Low · laptop friendly</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                    <label className="field">
                      Text size
                      <input
                        type="range"
                        min="1"
                        max="1.5"
                        step="0.1"
                        value={state.settings.textScale}
                        onChange={(e) =>
                          dispatch({
                            type: "SETTINGS",
                            patch: { textScale: Number(e.target.value) },
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Camera sensitivity
                      <input
                        type="range"
                        min="0.3"
                        max="2"
                        step="0.1"
                        value={state.settings.cameraSensitivity}
                        onChange={(e) =>
                          dispatch({
                            type: "SETTINGS",
                            patch: {
                              cameraSensitivity: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    {[
                      ["reducedMotion", "Reduced motion"],
                      ["mute", "Mute optional speech"],
                      ["workbench", "Use accessible 2D workbench"],
                    ].map(([key, label]) => (
                      <label className="checkbox" key={key}>
                        <input
                          type="checkbox"
                          checked={
                            !!state.settings[key as keyof GameState["settings"]]
                          }
                          onChange={(e) =>
                            dispatch({
                              type: "SETTINGS",
                              patch: { [key]: e.target.checked },
                            })
                          }
                        />
                        {label}
                      </label>
                    ))}
                    <p>
                      Subtitles are always visible. No microphone or recording.
                      No essential audio.
                    </p>
                    <button className="secondary" onClick={props.retryGraphics}>
                      Retry 3D graphics
                    </button>
                    <p className="muted">
                      Observed renderer: {props.telemetry.fps} FPS ·{" "}
                      {props.telemetry.drawCalls} draw calls ·{" "}
                      {props.telemetry.triangles.toLocaleString()} triangles.
                      This sample describes the current browser only.
                    </p>
                  </div>
                  <div className="card">
                    <h2>Your original avatar</h2>
                    {(["shirt", "skin", "hair"] as const).map((key) => (
                      <label className="field" key={key}>
                        {key[0].toUpperCase() + key.slice(1)}
                        <input
                          type="color"
                          value={state.avatar[key]}
                          onChange={(e) =>
                            dispatch({
                              type: "AVATAR",
                              patch: { [key]: e.target.value },
                            })
                          }
                        />
                      </label>
                    ))}
                    <p>
                      This fictional character is customizable. It is not a
                      likeness of a real person.
                    </p>
                    <h3>Controls</h3>
                    <p>
                      WASD or arrows: move · Mouse drag: camera · E: interact ·
                      R: recover position · M: map · J: journal · P: pause ·
                      Esc: close/release. Click the ground to navigate.
                      Workbench menus provide all learning actions without
                      movement.
                    </p>
                    <button className="secondary" onClick={() => go("home")}>
                      Recover to home
                    </button>
                  </div>
                </div>
              </>
            )}
            {panel === "saves" && (
              <>
                <SaveRecovery {...props} />
                <div className="callout">
                  <strong>Browser-local saves</strong>
                  <p>
                    Localhost, the hosted website, and different devices have
                    separate storage. Use validated progress export/import to
                    transfer learning history. Scene state is engine-specific.
                    Imports are self-reported history, never a verified
                    credential.
                  </p>
                </div>
                <div className="two-col">
                  <div className="card">
                    <h2>Transfer progress</h2>
                    <button className="primary" onClick={exportTraining}>
                      Export training progress
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        download(
                          "taxwire-world-save.json",
                          exportWorldSave(state),
                        )
                      }
                    >
                      Export world checkpoint
                    </button>
                    <label className="field">
                      Import compatible learning history
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5_000_000) {
                            setImportError("Import is larger than 5 MB.");
                            return;
                          }
                          try {
                            setImportData(JSON.parse(await file.text()));
                            setImportError("");
                          } catch {
                            setImportError(
                              "Invalid JSON; the current save was retained.",
                            );
                          }
                        }}
                      />
                    </label>
                    {importError && (
                      <p className="critical-text">{importError}</p>
                    )}
                    {preview && (
                      <div className="import-preview">
                        <h3>
                          {preview.valid
                            ? "Compatible format"
                            : "Import rejected"}
                        </h3>
                        <p>{preview.summary}</p>
                        {preview.errors.map((e, i) => (
                          <p className="critical-text" key={i}>
                            {e}
                          </p>
                        ))}
                        {preview.valid && (
                          <>
                            <p>
                              Source:{" "}
                              {String(
                                (importData as TrainingExport).extensions
                                  .sourceEdition ?? "unspecified",
                              )}{" "}
                              · Content{" "}
                              {(importData as TrainingExport).contentVersion}
                            </p>
                            <p>
                              Matching cases: {preview.matchedMissionIds.length}{" "}
                              · Different local cases:{" "}
                              {preview.mismatchedMissionIds.length}
                            </p>
                            <button
                              className="primary"
                              onClick={() => {
                                props.setState((s) =>
                                  mergeProgress(s, importData, content),
                                );
                                setImportData(null);
                              }}
                            >
                              Merge history without downgrading
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <p className="muted">
                      Shared format: taxwire-am-training · Schema 1 · Content{" "}
                      {content.version}. Unknown extension fields are preserved.
                    </p>
                  </div>
                  <div className="card">
                    <h2>Local learner profiles</h2>
                    <p>Current: {state.learner.displayName}</p>
                    {props.profiles.map((p) => (
                      <button
                        className="secondary profile-button"
                        key={p.id}
                        onClick={() => void props.changeProfile(p.id)}
                      >
                        {p.displayName}
                      </button>
                    ))}
                    <button className="primary" onClick={props.newProfile}>
                      Create another learner
                    </button>
                    <button
                      className="text-button critical-text"
                      onClick={() => void props.reset()}
                    >
                      Reset current learner with confirmation
                    </button>
                    <h3>Where saves live</h3>
                    <p>
                      IndexedDB in this browser profile. The Windows launcher
                      opens a dedicated profile under the project’s .local
                      folder on D:. Ordinary browsers and GitHub Pages use
                      storage managed by that browser on that device.
                    </p>
                    <p>
                      Autosaves and checkpoints preserve meaningful actions.
                      Exports contain the display name you choose; keep learner
                      exports private.
                    </p>
                  </div>
                </div>
              </>
            )}
            {panel === "editor" && (
              <>
                <div className="callout">
                  <strong>
                    Local authoring mode · Not secure enterprise authorization
                  </strong>
                  <p>
                    Validate a content pack before using it in a future private
                    build. This editor does not inject unreviewed rules into
                    graded play or publish files. Private material belongs in a
                    separate approved content source.
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setEditor(JSON.stringify(content, null, 2))}
                >
                  Load public pack for inspection
                </button>
                <textarea
                  className="code-editor"
                  value={editor}
                  onChange={(e) => setEditor(e.target.value)}
                  placeholder="Paste a ContentPack JSON document"
                  aria-label="Scenario editor"
                />
                <button
                  className="primary"
                  onClick={() => {
                    try {
                      setEditorErrors(validateContent(JSON.parse(editor)));
                    } catch (e) {
                      setEditorErrors([
                        e instanceof Error ? e.message : "Invalid JSON",
                      ]);
                    }
                  }}
                >
                  Validate scenario content
                </button>
                {editorErrors && (
                  <div className="record">
                    {editorErrors.length ? (
                      editorErrors.map((e, i) => <p key={i}>{e}</p>)
                    ) : (
                      <p>
                        Validation passed. Tax and procedure review is still
                        required before authoritative use.
                      </p>
                    )}
                  </div>
                )}
                <button
                  className="secondary"
                  onClick={() => {
                    if (editorErrors?.length === 0)
                      download("taxwire-public-content-candidate.json", editor);
                  }}
                >
                  Export validated candidate
                </button>
              </>
            )}
            {panel === "about" && (
              <>
                <div className="about-title">
                  <span className="mark">T</span>
                  <h2>Taxwire | Account Manager World</h2>
                  <p>
                    Own the relationship. Understand the tax. Deliver the
                    outcome.
                  </p>
                </div>
                <div className="callout">
                  <strong>{DISCLAIMER}</strong>
                </div>
                <p>
                  This original district, all customers, staff characters,
                  source transactions, policies, commercial amounts, and
                  deadlines are fictional. Public Taxwire information is used
                  only as narrative context. Internal procedures and authority
                  are unknown. No job offer, affiliation, endorsement,
                  partnership, or official credential is implied.
                </p>
                <p>
                  Real tax rules are source-specific and dependent on period and
                  transaction facts. Public references are shown with review
                  status. Synthetic calculations and policies are labeled.
                  Source retrieval is not qualified professional review.
                </p>
                <p>
                  The entire core campaign uses authored dialogue and
                  deterministic rules. Optional AI is disabled; no API key,
                  analytics, real business connections, or hidden inference is
                  included.
                </p>
                <div className="two-col">
                  <div className="card">
                    <h3>One engine, two views</h3>
                    <p>
                      The walkable 3D world and accessible workbench share the
                      same actions, clock, assessment, and persistence. Study
                      and time away do not generate penalties.
                    </p>
                  </div>
                  <div className="card">
                    <h3>Public / private boundary</h3>
                    <p>
                      Only synthetic content ships in this public build. Future
                      employer customization needs authorized private content,
                      appropriate review, and real access controls.
                    </p>
                  </div>
                </div>
                <button className="secondary" onClick={() => open("editor")}>
                  Open content review tooling
                </button>
                <p>
                  <a
                    href={`${import.meta.env.BASE_URL}THIRD_PARTY_LICENSES.txt`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source software license notices
                  </a>
                </p>
                <h2>Source register</h2>
                <Sources ids={content.sources.map((s) => s.id)} />
              </>
            )}
          </div>
          <footer className="panel-footer">
            <span>
              FICTIONAL POLICIES · PUBLIC REFERENCES · UNKNOWN EMPLOYER
              PROCEDURES
            </span>
            <button onClick={() => open("saves")}>Save & transfer ⇅</button>
          </footer>
        </div>
      </section>
    </div>
  );
}
function SaveRecovery(props: Props) {
  const [checkpoints, setCheckpoints] = useState<
      { id: string; savedAt: string; eventCount: number }[]
    >([]),
    [candidate, setCandidate] = useState<GameState | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    void listCheckpoints(props.state.learner.id)
      .then(setCheckpoints)
      .catch(() =>
        setError("Checkpoint storage is unavailable in this browser."),
      );
  }, [props.state.learner.id]);
  return (
    <div className="card">
      <h2>Restore a world checkpoint</h2>
      <p>
        Scene saves restore this engine’s world. Training history is merged
        separately below.
      </p>
      <label className="field">
        Import engine-specific world save
        <input
          type="file"
          accept=".json,application/json"
          aria-label="Import world checkpoint"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 5_000_000) {
              setError("World save exceeds 5 MB.");
              return;
            }
            try {
              const result = importWorldSave(JSON.parse(await file.text()));
              setError(result.errors.join("; "));
              setCandidate(result.state || null);
            } catch {
              setError("Invalid world save JSON. Current state retained.");
            }
          }}
        />
      </label>
      {error && <p className="critical-text">{error}</p>}
      {candidate && (
        <div className="callout">
          <strong>
            {candidate.learner.displayName} ·{" "}
            {formatTime(candidate.clockMinutes)} · Save version{" "}
            {candidate.version}
          </strong>
          <p>
            This replaces the active world after creating a downloadable backup.
          </p>
          <button
            className="primary"
            onClick={() => {
              download(
                "taxwire-world-save-backup.json",
                exportWorldSave(props.state),
              );
              props.setState(candidate);
              setCandidate(null);
              props.close();
            }}
          >
            Back up and restore world
          </button>
        </div>
      )}
      <details>
        <summary>Browser-local checkpoints ({checkpoints.length})</summary>
        {checkpoints.slice(0, 8).map((c) => (
          <button
            className="secondary profile-button"
            key={c.id}
            onClick={async () => {
              const recovered = await restoreCheckpoint(c.id);
              if (recovered) setCandidate(recovered);
              else
                setError(
                  "Checkpoint failed validation; current state retained.",
                );
            }}
          >
            {c.savedAt} · {c.eventCount} recorded events
          </button>
        ))}
      </details>
    </div>
  );
}
function MissionView({
  state,
  mission,
  step,
  dispatch,
  go,
}: {
  state: GameState;
  mission: Mission;
  step: Step;
  dispatch: (a: GameAction) => void;
  go: (id: string) => void;
}) {
  const [choice, setChoice] = useState(""),
    [value, setValue] = useState(""),
    [draft, setDraft] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [hint, setHint] = useState(false);
  const progress = state.missions[mission.id];
  const npc = content.contacts.find((n) => n.id === step.npcId);
  const trace = progress?.attempts.at(-1)?.trace.at(-1);
  const prior = progress?.stepIndex || 0;
  useEffect(() => {
    setChoice("");
    setValue("");
    setDraft("");
    setReviewed(false);
  }, [step.id]);
  return (
    <div className="mission-workspace">
      <aside className="case-sidebar">
        <span className="badge">{progress?.mode || "guided"} attempt</span>
        <h2>{mission.title}</h2>
        <p>{mission.briefing}</p>
        <div className="case-facts">
          <h3>Case facts</h3>
          <ul>
            {mission.facts.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
        <h3>Action path</h3>
        <ol className="step-path">
          {mission.steps.map((s, i) => (
            <li
              className={i === prior ? "current" : i < prior ? "done" : ""}
              key={s.id}
            >
              <span>{i < prior ? "✓" : i + 1}</span>
              {s.title}
            </li>
          ))}
        </ol>
        <p className="muted">
          Training deadline: {mission.dueMinutes} business minutes. Public rules
          and fictional promises are distinct.
        </p>
        <button className="secondary" onClick={() => go(step.location)}>
          Go to{" "}
          {locations.find((l) => l.id === step.location)?.name || step.location}{" "}
          →
        </button>
        <p className="muted">
          Remote work is supported here; travel is optional for the work.
        </p>
      </aside>
      <div className="case-main">
        {trace && (
          <div className="feedback">
            <span>PREVIOUS ACTION DEBRIEF</span>
            <p>{trace.feedback}</p>
          </div>
        )}
        <div className="step-heading">
          <span className="eyebrow">
            ACTION {prior + 1} / {mission.steps.length} · {step.duration}{" "}
            BUSINESS MINUTES
          </span>
          <h2>{step.title}</h2>
          <p>{step.instruction}</p>
        </div>
        {npc && (
          <div className="npc-dialogue">
            <span className="portrait large" style={{ background: npc.color }}>
              {npc.name
                .split(" ")
                .map((s) => s[0])
                .join("")}
            </span>
            <div>
              <strong>{npc.name}</strong>
              <span>
                {npc.role} · {npc.preference}
              </span>
              <p>Visible knowledge: {npc.knows.join(" · ")}</p>
              <small>Authority: {npc.authority}</small>
            </div>
          </div>
        )}
        <div className="step-documents">
          {step.documentIds.map((id) => {
            const d = content.documents.find((d) => d.id === id);
            return (
              d && (
                <details className="document" open key={id}>
                  <summary>
                    ▤ {d.title}
                    <span>{d.kind}</span>
                  </summary>
                  <p className="prewrap">{d.body}</p>
                </details>
              )
            );
          })}
        </div>
        <Sources ids={step.sourceIds} />
        {step.expectedValue !== undefined && (
          <div className="calculation-box">
            <h3>{step.calculationLabel || "Enter the calculated result"}</h3>
            <p>
              Use the case’s explicit currency and training assumptions. Enter
              integer minor units (cents) unless the task specifies a percentage
              or count.
            </p>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label="Calculated result"
            />
            <button className="text-button" onClick={() => setHint((h) => !h)}>
              {hint
                ? "Hide worked example"
                : "Show worked example (guided study)"}
            </button>
            {hint && (
              <p className="worked-example">
                {step.workedExample ||
                  `Expected training result: ${step.expectedValue}. Explain the source records and rounding before submitting.`}
              </p>
            )}
          </div>
        )}
        {step.draftPrompt && (
          <div className="draft-box">
            <h3>Produce the work</h3>
            <p>{step.draftPrompt}</p>
            <textarea
              rows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Mission work product"
              placeholder="Write your customer explanation or working record…"
            />
            <details>
              <summary>Transparent rubric and model comparison</summary>
              <p>{step.modelAnswer}</p>
              <p>
                Name confirmed facts and uncertainty; identify the action,
                accountable owner, evidence, and next date. Explain scope
                without inventing authority.
              </p>
              <p>
                Free text receives model comparison and self-review.
                Deterministic grading uses your structured choice and
                calculation; it is not expert text evaluation.
              </p>
            </details>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I compared my work against the rubric and identified uncertainty.
            </label>
          </div>
        )}
        <h3>Choose your next action</h3>
        <div className="choice-list">
          {step.choices.map((c) => (
            <label
              className={`choice ${choice === c.id ? "selected" : ""}`}
              key={c.id}
            >
              <input
                type="radio"
                name="mission-choice"
                value={c.id}
                checked={choice === c.id}
                onChange={() => setChoice(c.id)}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
        <div className="submit-row">
          <span>Each decision preserves an evidence trail.</span>
          <button
            className="primary"
            disabled={
              !choice ||
              (step.expectedValue !== undefined && value === "") ||
              !!(step.draftPrompt && (!draft.trim() || !reviewed))
            }
            onClick={() =>
              dispatch({
                type: "ACT",
                id: uid(),
                stepId: step.id,
                choiceId: choice,
                ...(value !== "" ? { value: Number(value) } : {}),
                ...(draft ? { draft } : {}),
              })
            }
          >
            Commit action & continue →
          </button>
        </div>
      </div>
    </div>
  );
}
function Sources({ ids }: { ids: string[] }) {
  return ids.length ? (
    <div className="sources">
      {ids.map((id) => {
        const s = content.sources.find((s) => s.id === id);
        return (
          s && (
            <details key={id}>
              <summary>
                ↗ {s.title}
                <span>
                  {s.status === "fictional_policy"
                    ? "FICTIONAL POLICY"
                    : "PUBLIC REFERENCE · REVIEW PENDING"}
                </span>
              </summary>
              <p>{s.summary}</p>
              <dl>
                <dt>Jurisdiction / period</dt>
                <dd>
                  {s.jurisdiction} · {s.applicablePeriod}
                </dd>
                <dt>Transaction facts</dt>
                <dd>{s.facts}</dd>
                <dt>Checked</dt>
                <dd>
                  {s.checkedAt} · Retrieval does not establish current law.
                </dd>
                <dt>Uncertainty / review</dt>
                <dd>
                  {s.uncertainty} · {s.status}
                </dd>
              </dl>
              {s.status !== "fictional_policy" &&
                s.url.startsWith("https:") && (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    Open official/public source ↗
                  </a>
                )}
            </details>
          )
        );
      })}
    </div>
  ) : null;
}
function Debrief({ state, mission }: { state: GameState; mission: Mission }) {
  const progress = state.missions[mission.id];
  return (
    <article className="debrief card">
      <span className="eyebrow">EVIDENCE-BASED DEBRIEF · {mission.id}</span>
      <h2>{mission.title}</h2>
      <p>{mission.consequence}</p>
      {progress?.attempts.map((a, i) => (
        <details key={a.id} open={i === progress.attempts.length - 1}>
          <summary>
            Attempt {i + 1} · {a.mode} · {Math.round(a.score)} / 100 ·{" "}
            {a.passed
              ? "Passed"
              : a.endedAt === undefined
                ? "In progress"
                : "Retry / remediation"}
          </summary>
          <div className="score-bars">
            {Object.entries(a.dimensions).map(([key, score]) => (
              <div key={key}>
                <span>{key}</span>
                <div>
                  <i style={{ width: `${score}%` }} />
                </div>
                <strong>{Math.round(score)}</strong>
              </div>
            ))}
          </div>
          {a.criticalFailures.length > 0 && (
            <p className="critical-text">
              Critical failures: {a.criticalFailures.join("; ")}. Original
              history retained; remediation required.
            </p>
          )}
          {a.trace.map((t) => (
            <div className="record" key={t.stepId}>
              <strong>
                {mission.steps.find((s) => s.id === t.stepId)?.title}
              </strong>
              <p>{t.feedback}</p>
              <small>
                Evidence: {t.evidenceIds.join(", ") || "structured action"} ·{" "}
                {formatTime(t.clockMinutes)}
              </small>
              {t.calculation && (
                <p>
                  Calculation submitted: {t.calculation.submitted} · expected:{" "}
                  {t.calculation.expected} ·{" "}
                  {t.calculation.correct ? "correct" : "needs correction"}
                </p>
              )}
            </div>
          ))}
        </details>
      ))}
      <p>
        <strong>Reusable output:</strong> {mission.output}
      </p>
      <p className="muted">
        Guided learning is practice evidence. Independent demonstrated results
        require the threshold and no critical failures. Different case retry
        preserves original attempts.
      </p>
    </article>
  );
}
function Reconciliation() {
  const [rows, setRows] = useState([
    { id: "INV-TRAIN-101", base: 100000, tax: 8000 },
    { id: "INV-TRAIN-102", base: 50000, tax: 4000 },
    { id: "CR-TRAIN-101", base: -10000, tax: -800 },
  ]);
  const [ledger, setLedger] = useState(11200);
  const base = rows.reduce((a, r) => a + r.base, 0),
    tax = rows.reduce((a, r) => a + r.tax, 0);
  return (
    <div className="card">
      <h2>Mini reconciliation worksheet</h2>
      <table>
        <thead>
          <tr>
            <th>Source ID (preserved)</th>
            <th>Net cents</th>
            <th>Tax cents</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>
                <input
                  type="number"
                  aria-label={`${r.id} net cents`}
                  value={r.base}
                  onChange={(e) =>
                    setRows((old) =>
                      old.map((x, j) =>
                        j === i ? { ...x, base: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  aria-label={`${r.id} tax cents`}
                  value={r.tax}
                  onChange={(e) =>
                    setRows((old) =>
                      old.map((x, j) =>
                        j === i ? { ...x, tax: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="worksheet-total">
        <span>Net: {base.toLocaleString()} cents</span>
        <span>Source tax: {tax.toLocaleString()} cents</span>
        <span>
          Training 8% check: {Math.round((base * 800) / 10000).toLocaleString()}{" "}
          cents
        </span>
      </div>
      <label className="field">
        Tax-payable ledger (cents)
        <input
          type="number"
          value={ledger}
          onChange={(e) => setLedger(Number(e.target.value))}
        />
      </label>
      <div className={`callout ${ledger === tax ? "success" : "critical"}`}>
        <strong>Difference: {(ledger - tax).toLocaleString()} cents</strong>
        <p>
          {ledger === tax
            ? "Totals agree. Still verify entity, period, duplicates, refunds, approval, and filing/payment evidence."
            : "Investigate the source difference. Do not manufacture a plug adjustment."}
        </p>
      </div>
      <p className="muted">
        This editable worksheet is practice. Case calculations and work products
        are recorded through mission actions.
      </p>
    </div>
  );
}
