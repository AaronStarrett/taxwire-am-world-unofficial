import type { ConversationAction } from "./conversations";
import type { BranchOutcome, ContentPack, Dimension } from "../content/types";

export type LearningLevel =
  "not_started" | "introduced" | "practiced" | "demonstrated";
export type GuidanceMode = "guided" | "assisted" | "independent";
export type AttemptMode = GuidanceMode | "replay";
export interface AssistanceRecord {
  id: string;
  missionId: string;
  stepId: string;
  kind:
    | "hint"
    | "explain"
    | "demonstration"
    | "show-location"
    | "stuck"
    | "mode-change";
  level: 1 | 2 | 3;
  clockMinutes: number;
  attemptId?: string;
}
export type TutorialStepId =
  | "move"
  | "camera"
  | "mentor"
  | "desk"
  | "inbox"
  | "calendar"
  | "accounts"
  | "journal"
  | "known-missing"
  | "owner"
  | "update"
  | "followup"
  | "later-response"
  | "verify"
  | "debrief";
export interface TutorialTrace {
  id: string;
  run: number;
  stepId: TutorialStepId;
  action: string;
  accepted: boolean;
  clockMinutes: number;
  evidenceIds: string[];
  message: string;
  classifications?: Record<string, "known" | "missing">;
}
export interface TutorialState {
  version: 1;
  status: "not_started" | "active" | "completed" | "skipped";
  stepIndex: number;
  run: number;
  completedStepIds: TutorialStepId[];
  history: TutorialTrace[];
  inputMethod: "keyboard" | "pointer" | "touch" | "menu";
  simulatedMinutes: number;
  legacyOptIn: boolean;
  controlOrigin: { x: number; z: number; yaw: number };
  scenario: {
    accountId: string;
    knownIds: string[];
    missingIds: string[];
    owner: string;
    updateArtifactId?: string;
    followupTaskId?: string;
    responseId?: string;
    responseVerified: boolean;
  };
}
export interface TutorialWorldEvent {
  type: "moved" | "camera" | "interacted" | "target-reached" | "recovered";
  distance?: number;
  angle?: number;
  objectId?: string;
  locationId?: string;
  input?: "keyboard" | "pointer" | "touch" | "menu";
}
export interface Learner {
  id: string;
  displayName: string;
}
export interface EvidenceTrace {
  stepId: string;
  choiceId: string;
  clockMinutes: number;
  scores: Record<Dimension, number>;
  evidenceIds: string[];
  feedback: string;
  criticalFailure?: string;
  calculation?: { submitted: number; expected: number; correct: boolean };
  artifactId?: string;
}
export interface BranchDebrief {
  outcome: BranchOutcome;
  title: string;
  summary: string;
  decisions: string[];
  nextSteps: string[];
  completedStages: number;
  totalStages: number;
  relationship: {
    trustChange: number;
    riskChange: number;
    trust: number;
    risk: number;
  };
}
export interface Attempt {
  id: string;
  mode: AttemptMode;
  startedAt: number;
  endedAt?: number;
  score: number;
  dimensions: Record<Dimension, number>;
  passed: boolean;
  criticalFailures: string[];
  trace: EvidenceTrace[];
  fingerprint: string;
  version: number;
  overdue: boolean;
  remediationOf?: string;
  branchVersion?: 1;
  routeNodeId?: string;
  routeMarks?: ("mixed" | "recovery")[];
  outcome?: BranchOutcome;
  debrief?: BranchDebrief;
  relationshipStart?: { trust: number; risk: number };
  assistance?: AssistanceRecord[];
  assistanceVerified?: boolean;
  unaided?: boolean;
}
export interface MissionProgress {
  status: "not_started" | "in_progress" | "completed" | "needs_remediation";
  stepIndex: number;
  mode: AttemptMode;
  attempts: Attempt[];
  bestScore: number;
  criticalFailures: string[];
  evidenceIds: string[];
  fingerprint?: string;
  imported?: boolean;
}
export interface CompetencyProgress {
  id: string;
  level: LearningLevel;
  bestScore: number;
  attemptCount: number;
  evidenceMissionIds: string[];
}
export interface Task {
  id: string;
  title: string;
  owner: string;
  dueMinute: number;
  status: "open" | "completed";
  evidence: string[];
  missionId?: string;
  completedAt?: number;
}
export interface Appointment {
  id: string;
  npcId: string;
  day: number;
  minute: number;
  duration: number;
  status: "scheduled" | "attended" | "missed";
}
export interface Artifact {
  id: string;
  type: string;
  missionId: string;
  createdAt: string;
  body: string;
}
export interface Review {
  competencyId: string;
  dueAt: string;
  reason: string;
}
export interface SimulationEvent {
  id: string;
  type: string;
  message: string;
  title: string;
  clockMinutes: number;
  day: number;
  missionId?: string;
  details?: Record<string, unknown>;
}
export interface ImportRecord {
  id: string;
  exportedAt: string;
  sourceEdition: string;
  contentVersion: string;
  learner: Learner;
  missions: TrainingExport["missions"];
  extensions: Record<string, unknown>;
  matchedMissionIds: string[];
  mismatchedMissionIds: string[];
  status: "self_reported";
}
export interface Settings {
  quality: "low" | "medium" | "high";
  reducedMotion: boolean;
  textScale: number;
  cameraSensitivity: number;
  mute: boolean;
  workbench: boolean;
}
export interface GameState {
  version: number;
  contentVersion: string;
  learner: Learner;
  seed: number;
  rngState: number;
  clockMinutes: number;
  day: number;
  activeMissionId: string | null;
  missions: Record<string, MissionProgress>;
  competencies: Record<string, CompetencyProgress>;
  events: SimulationEvent[];
  tasks: Task[];
  appointments: Appointment[];
  artifacts: Artifact[];
  visitedLocations: string[];
  location: string;
  npcMemory: Record<
    string,
    { trust: number; commitments: string[]; interactions: number }
  >;
  specialistCapacity: Record<string, number>;
  accountHealth: Record<
    string,
    { trust: number; risk: number; evidence: string[] }
  >;
  settings: Settings;
  avatar: { shirt: string; skin: string; hair: string };
  position: { x: number; z: number; yaw: number };
  reviewQueue: Review[];
  imports: ImportRecord[];
  extensions: Record<string, unknown>;
  processedActions: string[];
  notifications: string[];
  tutorial: TutorialState;
  guidanceMode: GuidanceMode;
  assistanceHistory: AssistanceRecord[];
  campaignStage:
    | "Guided Associate"
    | "Independent Account Owner"
    | "Portfolio Operator"
    | "Strategic Account Leader";
}
export type GameAction =
  | ConversationAction
  | { type: "TUTORIAL_START"; id: string; replay?: boolean }
  | { type: "TUTORIAL_SKIP"; id: string }
  | { type: "TUTORIAL_WORLD"; id: string; event: TutorialWorldEvent }
  | {
      type: "TUTORIAL_ACT";
      id: string;
      stepId: TutorialStepId;
      choiceId: string;
      selectedIds?: string[];
      classifications?: Record<string, "known" | "missing">;
      owner?: string;
      body?: string;
      taskId?: string;
    }
  | {
      type: "ASSISTANCE";
      id: string;
      missionId: string;
      stepId: string;
      kind: AssistanceRecord["kind"];
      level?: 1 | 2 | 3;
    }
  | { type: "SET_GUIDANCE"; mode: GuidanceMode }
  | { type: "START_MISSION"; missionId: string; mode?: AttemptMode }
  | {
      type: "ACT";
      stepId: string;
      choiceId: string;
      value?: number;
      draft?: string;
      id: string;
    }
  | { type: "TRAVEL"; location: string }
  | { type: "ENTER_LOCATION"; location: string }
  | { type: "SET_FLOOR"; location: string; floor: number }
  | { type: "WAIT"; minutes: number }
  | { type: "END_DAY" }
  | {
      type: "SCHEDULE";
      npcId: string;
      day: number;
      minute: number;
      duration: number;
      id: string;
    }
  | {
      type: "TASK";
      id: string;
      title: string;
      owner: string;
      dueMinute: number;
    }
  | {
      type: "COMPLETE_TASK";
      taskId: string;
      evidence: string | string[];
      id: string;
    }
  | {
      type: "SAVE_NOTE";
      missionId: string;
      typeName?: string;
      noteType?: string;
      body: string;
      id: string;
    }
  | { type: "SETTINGS"; patch: Partial<Settings> }
  | { type: "POSITION"; x: number; z: number; yaw: number }
  | { type: "AVATAR"; patch: Partial<GameState["avatar"]> };
export interface TrainingExport {
  format: "taxwire-am-training";
  schemaVersion: 1;
  contentVersion: string;
  exportedAt: string;
  learner: Learner;
  competencies: CompetencyProgress[];
  missions: {
    id: string;
    version: number;
    status: "not_started" | "in_progress" | "completed";
    bestScore: number;
    criticalFailures: string[];
  }[];
  artifacts: Artifact[];
  reviewQueue: Review[];
  extensions: Record<string, unknown>;
}
export interface ImportPreview {
  valid: boolean;
  errors: string[];
  summary: string;
  warnings: string[];
  matchedMissionIds: string[];
  mismatchedMissionIds: string[];
}
export type EngineContent = ContentPack;
