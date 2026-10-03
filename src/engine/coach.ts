/** Disabled-by-default adapter seam. The authored simulation is always playable without a provider. */
export interface CoachRequest {
  npcId: string;
  visibleFacts: readonly string[];
  learnerDraft: string;
  authoredReply: string;
}
export interface CoachAdapter {
  enabled: boolean;
  reply(
    request: CoachRequest,
  ): Promise<{ text: string; source: "authored" | "approved-provider" }>;
}
export const authoredCoach: CoachAdapter = {
  enabled: false,
  async reply(request) {
    return { text: request.authoredReply, source: "authored" };
  },
};
export async function safeCoachReply(
  request: CoachRequest,
  adapter: CoachAdapter = authoredCoach,
): Promise<{ text: string; source: "authored" | "approved-provider" }> {
  if (!adapter.enabled) return authoredCoach.reply(request);
  try {
    const result = await adapter.reply({
      ...request,
      visibleFacts: [...request.visibleFacts],
    });
    return result.text.trim() ? result : authoredCoach.reply(request);
  } catch {
    return authoredCoach.reply(request);
  }
}
