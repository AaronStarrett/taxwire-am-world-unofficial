import { useState } from "react";
import { content } from "../content";
import { conversationView } from "../engine";
import type { GameAction, GameState } from "../engine/types";
import { appointmentClock, formatTime, WORKDAY_MINUTES } from "../engine/time";
import {
  locations,
  getContactHome,
  getBuildingFloors,
} from "../world/locations";
import { uid } from "./App";
import { Portrait } from "./Portrait";

const topicCopy = {
  discovery: [
    "Get to know their business",
    "Ask, listen, clarify, then agree the next step.",
  ],
  coffee: [
    "Invite them for coffee",
    "Make a considerate invitation and follow through in person.",
  ],
  repair: [
    "Repair a strained relationship",
    "Own the gap without making an unsupported promise.",
  ],
  scope: [
    "Discuss scope and boundaries",
    "Balance commercial pressure with evidence and authority.",
  ],
  handoff: [
    "Coordinate a warm handoff",
    "Keep ownership clear while involving the right specialist.",
  ],
} as const;

export function ConversationPanel({
  state,
  dispatch,
  contactId,
  selectContact,
  go,
  changeFloor,
}: {
  state: GameState;
  dispatch: (action: GameAction) => void;
  contactId?: string;
  selectContact: (id: string) => void;
  go: (id: string) => void;
  changeFloor: (locationId: string, floor: number) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = content.contacts.find((person) => person.id === contactId);
  if (!selected)
    return (
      <div className="conversation-directory">
        <p>
          Meet the people behind the work. Each person has their own role,
          authority, availability and memory of your decisions.
        </p>
        <input
          aria-label="Find a person"
          placeholder="Search a name, role or business…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="people-grid">
          {content.contacts
            .filter((person) =>
              `${person.name} ${person.role} ${person.accountId}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((person) => (
              <button
                className="person-directory-card"
                data-contact-id={person.id}
                key={person.id}
                onClick={() => selectContact(person.id)}
              >
                <span className="portrait">
                  <Portrait name={person.name} color={person.color} />
                </span>
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.role}</small>
                  <small>
                    {locations.find((place) => place.id === person.location)
                      ?.name || "Business district"}
                  </small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
        </div>
      </div>
    );
  const view = conversationView(state, content, selected.id);
  if (!view) return null;
  const { session, node, debrief, relationship } = view;
  const home = getContactHome(selected.id);
  const active = session?.status === "active";
  const appointment = session?.appointment;
  const appointmentMinute = appointment
    ? appointmentClock(appointment.day, appointment.minute)
    : undefined;
  const waitMinutes =
    appointmentMinute === undefined
      ? 0
      : Math.max(0, appointmentMinute - state.clockMinutes);
  const waitStep = Math.min(
    240,
    WORKDAY_MINUTES - (state.clockMinutes % WORKDAY_MINUTES),
    waitMinutes,
  );
  return (
    <div
      className="conversation-panel"
      data-testid="conversation-panel"
      data-npc-id={selected.id}
      data-node-id={node?.id || "topics"}
      data-contact-id={selected.id}
      data-conversation-node={node?.id || "topics"}
    >
      <button className="text-button" onClick={() => selectContact("")}>
        ← All people
      </button>
      <header className="conversation-person">
        <span className="portrait large">
          <Portrait
            name={selected.name}
            color={selected.color}
            mentor={selected.id === "npc-mentor"}
          />
        </span>
        <div>
          <span className="eyebrow">
            {view.account?.name || "Taxwire training team"}
          </span>
          <h2>{selected.name}</h2>
          <p>{selected.role}</p>
        </div>
      </header>
      <div className="relationship-strip" aria-label="Relationship state">
        <span>
          <small>RELATIONSHIP</small>
          <strong>
            {relationship.trust >= 65
              ? "Building confidence"
              : relationship.trust < 40
                ? "Needs care"
                : "Getting acquainted"}
          </strong>
        </span>
        <span>
          <small>TRUST</small>
          <strong>{relationship.trust}/100</strong>
        </span>
        <span>
          <small>CONVERSATIONS</small>
          <strong>{relationship.interactions}</strong>
        </span>
      </div>
      {active && node ? (
        <>
          <div className="conversation-scene">
            <span className="eyebrow">
              {session.topic} ·{" "}
              {locations.find(
                (place) => place.id === (node.location || state.location),
              )?.name || "Business district"}
            </span>
            <h3>{node.title}</h3>
            <p>{node.text}</p>
          </div>
          {appointment && (
            <div className="coffee-appointment">
              <strong>Coffee at Common Ground café</strong>
              <p>
                Day {appointment.day} ·{" "}
                {String(Math.floor(appointment.minute / 60)).padStart(2, "0")}:
                {String(appointment.minute % 60).padStart(2, "0")} ·{" "}
                {appointment.duration} minutes
              </p>
              <div className="guidance-actions">
                {state.location !== "cafe" && (
                  <button className="secondary" onClick={() => go("cafe")}>
                    Visit Common Ground café →
                  </button>
                )}
                {waitMinutes > 0 && appointment.day === state.day && (
                  <button
                    className="secondary"
                    onClick={() =>
                      dispatch({ type: "WAIT", minutes: waitStep })
                    }
                  >
                    Wait {waitStep} business minutes
                  </button>
                )}
                {appointment.day > state.day && (
                  <button
                    className="secondary"
                    onClick={() => dispatch({ type: "END_DAY" })}
                  >
                    Finish today and prepare for tomorrow
                  </button>
                )}
              </div>
              <small>
                Your conversation is saved when you leave. Open People or talk
                to this contact again to continue.
              </small>
            </div>
          )}
          {session.paused && (
            <button
              className="primary"
              onClick={() =>
                dispatch({
                  type: "START_CONVERSATION",
                  id: uid(),
                  npcId: selected.id,
                })
              }
            >
              Resume this conversation
            </button>
          )}
          <div
            className="conversation-choices"
            aria-label="Conversation choices"
          >
            {node.choices.map((choice, index) => (
              <button
                className="conversation-choice"
                disabled={choice.disabled || session.paused}
                data-choice-id={choice.id}
                key={choice.id}
                onClick={() =>
                  dispatch({
                    type: "TALK",
                    id: uid(),
                    npcId: selected.id,
                    nodeId: node.id,
                    choiceId: choice.id,
                  })
                }
              >
                <span className="choice-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  {choice.label}
                  {choice.disabledReason && (
                    <small>{choice.disabledReason}</small>
                  )}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          <p className="conversation-footnote">
            Your reply changes the next conversation, the outcome and this
            person’s relationship with you. Pausing doesn’t make a decision.
          </p>
        </>
      ) : (
        <>
          {debrief && (
            <section
              className={`conversation-debrief outcome-${debrief.outcome}`}
              aria-label="Conversation debrief"
            >
              <span className="eyebrow">
                {debrief.outcome} outcome ·{" "}
                {debrief.replay ? "Practice replay" : "Relationship recorded"}
              </span>
              <h3>{debrief.summary}</h3>
              <div className="outcome-metrics">
                <span>
                  Trust {debrief.trustDelta > 0 ? "+" : ""}
                  {debrief.trustDelta}
                </span>
                <span>
                  Account trust {debrief.accountTrustDelta > 0 ? "+" : ""}
                  {debrief.accountTrustDelta}
                </span>
                <span>
                  Risk {debrief.riskDelta > 0 ? "+" : ""}
                  {debrief.riskDelta}
                </span>
              </div>
              {debrief.whatWorked.length > 0 && (
                <>
                  <h4>What worked</h4>
                  <ul>
                    {debrief.whatWorked.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              {debrief.whatToImprove.length > 0 && (
                <>
                  <h4>What to improve</h4>
                  <ul>
                    {debrief.whatToImprove.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              <p>
                <strong>Next step:</strong> {debrief.nextStep}
              </p>
              {debrief.replay && (
                <small>
                  Replaying this topic doesn’t farm relationship points. Your
                  first outcome remains in the record.
                </small>
              )}
            </section>
          )}
          <p className="conversation-context">{selected.goals}</p>
          <p className="availability-note">{view.availabilityMessage}</p>
          <h3>
            {debrief
              ? "Choose another conversation"
              : "How would you like to approach them?"}
          </h3>
          <div className="conversation-topics">
            {view.topics.map((topic) => (
              <button
                className="conversation-choice"
                key={topic}
                onClick={() =>
                  dispatch({
                    type: "START_CONVERSATION",
                    id: uid(),
                    npcId: selected.id,
                    topic,
                  })
                }
              >
                <span>
                  <strong>{topicCopy[topic][0]}</strong>
                  <small>{topicCopy[topic][1]}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </>
      )}
      {session && session.history.length > 0 && (
        <details className="conversation-history">
          <summary>
            Your conversation so far · {session.history.length} decisions
          </summary>
          <ol>
            {session.history.map((entry, index) => (
              <li key={`${index}-${entry.nodeId}`}>
                <span>{entry.label}</span>
                <small>{formatTime(entry.clockMinutes)}</small>
              </li>
            ))}
          </ol>
        </details>
      )}
      {home && (
        <button
          className="text-button"
          onClick={() => changeFloor(home.locationId, home.floor)}
        >
          Meet in person ·{" "}
          {locations.find((place) => place.id === home.locationId)?.name} ·{" "}
          {getBuildingFloors(home.locationId)[home.floor]?.name} →
        </button>
      )}
      <details className="contact-brief">
        <summary>Contact brief and professional boundaries</summary>
        <dl>
          <dt>They know</dt>
          <dd>{selected.knows.join(" · ")}</dd>
          <dt>Decision authority</dt>
          <dd>{selected.authority}</dd>
          <dt>Communication preference</dt>
          <dd>{selected.preference}</dd>
          <dt>Promises remembered</dt>
          <dd>
            {relationship.commitments.join("; ") ||
              "No commitments recorded yet."}
          </dd>
        </dl>
        <small>
          Fictional authored decisions. No real invitation or message is sent.
          Real tax conclusions still require qualified review.
        </small>
      </details>
    </div>
  );
}
