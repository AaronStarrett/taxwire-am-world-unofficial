import { describe, expect, it } from "vitest";
import { content } from "../src/content";
import {
  getVerificationRecord,
  renderVerificationRecord,
  verificationRecords,
} from "../src/content/verifications";
import { validateContent } from "../src/content/validate";

describe("authored returned evidence", () => {
  it("covers every retained mission with distinct identified findings and owned residual work", () => {
    expect(Object.keys(verificationRecords).sort()).toEqual(
      content.missions.map((mission) => mission.id).sort(),
    );
    expect(
      new Set(
        Object.values(verificationRecords).map((record) =>
          record.records.map((finding) => finding.finding).join("|"),
        ),
      ).size,
    ).toBe(52);
    for (const mission of content.missions) {
      const record = getVerificationRecord(mission.id)!;
      const document = content.documents.find(
        (item) => item.id === `${mission.id}-verification`,
      )!;
      expect(record.records.length).toBeGreaterThanOrEqual(2);
      expect(new Set(record.records.map((item) => item.id)).size).toBe(
        record.records.length,
      );
      expect(record.records.every((item) => item.finding.length > 30)).toBe(
        true,
      );
      expect(
        content.contacts.some(
          (contact) => contact.id === record.residualWork.ownerId,
        ),
      ).toBe(true);
      expect(document.body).toBe(renderVerificationRecord(mission.id));
      expect(document.body).toContain("Supported conclusion:");
      expect(document.body).toContain("Cannot conclude:");
      expect(document.body).toContain(
        "No external filing, payment, notice response or employer approval has occurred.",
      );
      const matchingChoice = mission.steps
        .filter((step) => step.kind === "meeting")
        .flatMap((step) => step.choices)
        .some((choice) => document.body.includes(choice.label));
      expect(matchingChoice).toBe(false);
    }
  });
  it("distinguishes reviewed Cedarline records from unresolved launch and pilot facts", () => {
    const record = getVerificationRecord("M-A02")!;
    expect(record.records.map((item) => item.finding).join(" ")).toContain(
      "does not give a confirmed launch date",
    );
    expect(record.records.map((item) => item.finding).join(" ")).toContain(
      "no wholesale pilot transaction",
    );
    expect(record.supports).toContain("launch itself remains unconfirmed");
    expect(record.residualWork.ownerId).toBe("npc-cedarline-1");
    expect(record.residualWork.action).toContain("Lena");
  });
  it("marks only genuinely added response facts as changed mission versions", () => {
    expect(content.version).toBe("twaw-2026.10.03-v2");
    const changed = content.missions.filter(
      (mission) => getVerificationRecord(mission.id)?.altersCaseFacts,
    );
    expect(changed.map((mission) => mission.id).sort()).toEqual([
      "M-T01",
      "X-A06",
      "X-A09",
    ]);
    for (const mission of content.missions) {
      expect(mission.version).toBe(changed.includes(mission) ? 2 : 1);
      expect(mission.fingerprint.endsWith(":response-v2")).toBe(
        changed.includes(mission),
      );
    }
  });
  it("rejects action-only replies, invented owner references and missing bounded conclusions", () => {
    const actionOnly = structuredClone(content);
    const document = actionOnly.documents.find(
      (item) => item.id === "M-A02-verification",
    )!;
    document.body =
      "Ask whether the portal is live and where the transactions appear.";
    expect(
      validateContent(actionOnly).some((error) =>
        error.includes("returned evidence needs two identified findings"),
      ),
    ).toBe(true);
    expect(
      validateContent(actionOnly).some((error) =>
        error.includes("returned evidence missing Cannot conclude"),
      ),
    ).toBe(true);
    const badOwner = structuredClone(content);
    const second = badOwner.documents.find(
      (item) => item.id === "M-A02-verification",
    )!;
    second.body = second.body.replace("npc-cedarline-1", "npc-invented-owner");
    expect(
      validateContent(badOwner).some((error) =>
        error.includes("valid named residual owner"),
      ),
    ).toBe(true);
  });
});
