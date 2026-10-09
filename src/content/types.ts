export type Dimension =
  "tax" | "execution" | "communication" | "judgment" | "organization";
export interface Source {
  id: string;
  title: string;
  url: string;
  jurisdiction: string;
  checkedAt: string;
  applicablePeriod: string;
  facts: string;
  uncertainty: string;
  status: "public_reference" | "needs_professional_review" | "fictional_policy";
  summary: string;
}
export interface Competency {
  id: string;
  title: string;
  explanation: string;
  example: string;
  glossary: Record<string, string>;
  misconception: string;
  guidedPractice: string;
  independentPractice: string;
  rubric: string[];
  sourceIds: string[];
  workProduct: string;
}
export interface Contact {
  id: string;
  name: string;
  role: string;
  accountId: string;
  location: string;
  goals: string;
  knows: string[];
  preference: string;
  authority: string;
  availability: [number, number];
  color: string;
}
export interface Account {
  id: string;
  name: string;
  business: string;
  entities: string[];
  products: string[];
  channels: string[];
  systems: string[];
  geography: string[];
  priorities: string[];
  renewalDay: number;
  annualValueMinor: number;
  currency: string;
  contacts: string[];
  research: {
    title: string;
    body: string;
    confidence: "confirmed" | "hypothesis" | "question";
  }[];
}
export interface Document {
  id: string;
  title: string;
  accountId: string;
  kind: string;
  body: string;
  sourceIds: string[];
}
export interface Choice {
  id: string;
  label: string;
  feedback: string;
  scores: Record<Dimension, number>;
  criticalFailure?: string;
  trustDelta?: number;
  riskDelta?: number;
  createsTask?: string;
}
export interface Step {
  id: string;
  kind:
    | "research"
    | "meeting"
    | "calculation"
    | "investigate"
    | "coordinate"
    | "communicate"
    | "followup"
    | "review";
  title: string;
  instruction: string;
  duration: number;
  location: string;
  npcId?: string;
  documentIds: string[];
  sourceIds: string[];
  choices: Choice[];
  expectedValue?: number;
  tolerance?: number;
  calculationLabel?: string;
  workedExample?: string;
  draftPrompt?: string;
  modelAnswer?: string;
  requiresEvidence?: string[];
}
export type BranchOutcome = "good" | "mixed" | "poor" | "recovery";
export interface BranchRoute {
  fromStepId: string;
  choiceId: string;
  nextStepId?: string;
  ending?: BranchOutcome;
  mark?: "mixed" | "recovery";
  label: string;
  verifiesTasks?: boolean;
}
export interface BranchEnding {
  title: string;
  summary: string;
  nextStep: string;
}
export interface MissionBranching {
  version: 1;
  startStepId: string;
  nodes: Step[];
  routes: BranchRoute[];
  endings: Record<BranchOutcome, BranchEnding>;
}
export interface Mission {
  id: string;
  version: number;
  title: string;
  competencyIds: string[];
  accountId: string;
  stage: "core" | "advanced" | "capstone";
  prerequisiteIds: string[];
  briefing: string;
  facts: string[];
  dueMinutes: number;
  fingerprint: string;
  steps: Step[];
  consequence: string;
  output: string;
  branching?: MissionBranching;
}
export interface ContentPack {
  version: string;
  competencies: Competency[];
  accounts: Account[];
  contacts: Contact[];
  sources: Source[];
  documents: Document[];
  missions: Mission[];
  bootcamp: { session: number; title: string; missionIds: string[] }[];
  policies: string[];
}
