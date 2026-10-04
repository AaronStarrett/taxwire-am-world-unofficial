import type { ContentPack } from "./types";
import { accounts, contacts } from "./accounts";
import { competencies } from "./competencies";
import { sources } from "./sources";
import { coreMissions } from "./missions-core";
import { advancedMissions, capstoneMissions } from "./missions-advanced";
import { documents } from "./mission-tools";

export const content: ContentPack = {
  version: "twaw-2026.10.03-v2",
  competencies,
  accounts,
  contacts,
  sources,
  documents,
  missions: [...coreMissions, ...advancedMissions, ...capstoneMissions],
  bootcamp: [
    {
      session: 1,
      title: "An owned first day: lifecycle, discovery and clear updates",
      missionIds: ["M-A02", "M-A01", "M-T01", "M-A04"],
    },
    {
      session: 2,
      title: "Finance facts, stakeholder authority and a feasible day",
      missionIds: ["M-A03", "M-A05", "M-T02", "M-T03"],
    },
    {
      session: 3,
      title: "Products, locations, risk and durable evidence",
      missionIds: ["M-T04", "M-A06", "M-T05", "M-A07"],
    },
    {
      session: 4,
      title: "Certificates, channels and customer health",
      missionIds: ["M-T06", "M-T07", "M-A08", "M-A09"],
    },
    {
      session: 5,
      title: "Operational dates, source controls and commercial readiness",
      missionIds: ["M-T08", "M-T09", "M-A10", "M-A11"],
    },
    {
      session: 6,
      title: "Notices, international fundamentals and safe improvement",
      missionIds: ["M-T10", "M-T11", "M-T12", "M-A12"],
    },
    {
      session: 7,
      title: "Independent ownership and portfolio case preparation",
      missionIds: ["C01", "X-A06", "X-T09", "C02"],
    },
  ],
  policies: [
    "Unofficial training prototype. Not endorsed by Taxwire. Fictional customers. Educational simulation—not tax advice.",
    "Every customer, contact, transaction, notice, business change, approval and internal procedure is authored fiction. Public Taxwire marketing and job-advertisement context do not establish its actual operating procedures.",
    "Public-source summaries are research leads checked on October 3, 2026. Every tax-law source remains needs_professional_review. A retrieval date does not establish legal currency, legal advice or case-period applicability. No AI source check substitutes for qualified review.",
    "Authoritative scoring here concerns stated synthetic arithmetic, evidence handling, communication and bounded authority. Where law is unreviewed, the defensible action is a precise fact-based research or specialist request; the game does not grade a disputed real legal conclusion as current law.",
    "Synthetic State Alpha/Beta, rates, thresholds, currency amounts and compressed dates apply only to the specified exercise. Never reuse them as real law or a real filing calendar. Money uses integer minor units; each calculation specifies currency, base and rounding.",
    "Fictional AMs may research, reconcile, coordinate and communicate. Tax specialists approve tax positions; customer-authorized approvers approve financial actions; the commercial lead approves offers. No actual CRM, email, calendar, tax, bank or payment system is connected.",
    "An issue requires evidence, customer communication and owned residual work before bounded closure. Filing submission, filing acceptance, payment instruction and payment acceptance are separate stages. Specialist involvement retains AM ownership; blanket forwarding consumes finite capacity.",
    "NPC knowledge and authority are limited to their records and role. Availability uses the simulation day, not real wall-clock time. Travel is a game choice; remote meetings remain possible. Study, pause and time away do not create penalties.",
    "Assessment weights are tax/evidence 25%, execution/verification 25%, communication 20%, judgment 15%, organization 15%. Structured action evidence is graded deterministically. Free text uses an inspectable rubric, model comparison and learner self-review; it is not automatically expert-judged.",
    "Critical failures include fabricated completion evidence, confidential disclosure, unauthorized financial/tax commitment and knowingly abandoned urgent obligations. Preserve original attempts and require a clean remedial attempt before passing. Repeated actions do not farm rewards.",
    "Campaign titles are Guided Associate, Independent Account Owner, Portfolio Operator and Strategic Account Leader. Titles and imported history reflect game evidence only; they are not professional credentials or proof of actual employer readiness.",
    "Localhost, this hosted origin and other devices have separate browser-local storage. Move saves deliberately by export/import. Never put learner saves in Git, public content, builds or Actions artifacts. An ordinary browser may store data outside the D:-backed dedicated development profile.",
    "Portable training history is self-reported and separate from engine-specific world saves. Preserve original imported history and unknown extensions; different case fingerprints must not silently pass another local case. Cross-app interoperability remains unverified until a real other-edition export is tested.",
    "Optional AI is disabled. No provider credentials, paid inference, external learner-data transfer or model-generated tax rules are used. Coaching packets may be exported for a voluntary debrief, with fictional facts, actions, sources and rubrics.",
    "Local scenario editing is a convenience, not enterprise authorization. Future private employer content must stay outside this public repository and build, use a separately approved source and receive qualified content and access review.",
  ],
};
