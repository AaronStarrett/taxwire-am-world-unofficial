/** Integer minor units; rates are integer basis points. Half values round away from zero. */
export function roundDivide(numerator: number, denominator: number): number {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    denominator <= 0
  )
    throw new Error(
      "Safe integer minor units and a positive denominator are required.",
    );
  return (
    Math.sign(numerator) *
    Math.floor((Math.abs(numerator) + denominator / 2) / denominator)
  );
}
export function taxExclusive(
  netMinor: number,
  rateBps: number,
): { netMinor: number; taxMinor: number; grossMinor: number } {
  if (!Number.isSafeInteger(netMinor))
    throw new Error("Money must use safe integer minor units.");
  if (!Number.isSafeInteger(rateBps) || rateBps < 0 || rateBps > 10000)
    throw new Error(
      "Training rate must be integer basis points between 0 and 10000.",
    );
  const taxMinor = roundDivide(netMinor * rateBps, 10000);
  return { netMinor, taxMinor, grossMinor: netMinor + taxMinor };
}
export function taxInclusive(
  grossMinor: number,
  rateBps: number,
): { netMinor: number; taxMinor: number; grossMinor: number } {
  if (!Number.isSafeInteger(grossMinor))
    throw new Error("Money must use safe integer minor units.");
  if (!Number.isSafeInteger(rateBps) || rateBps < 0 || rateBps > 10000)
    throw new Error(
      "Training rate must be integer basis points between 0 and 10000.",
    );
  const netMinor = roundDivide(grossMinor * 10000, 10000 + rateBps);
  return { netMinor, taxMinor: grossMinor - netMinor, grossMinor };
}
export function reconcile(
  records: {
    id: string;
    currency: string;
    amountMinor: number;
    corrects?: string;
  }[],
  currency: string,
): { totalMinor: number; history: typeof records } {
  if (
    records.some(
      (row) =>
        row.currency !== currency || !Number.isSafeInteger(row.amountMinor),
    )
  )
    throw new Error(
      "Reconcile one currency at a time using integer minor units.",
    );
  const ids = new Set<string>();
  for (const row of records) {
    if (ids.has(row.id)) throw new Error("Duplicate source record.");
    if (row.corrects && !ids.has(row.corrects))
      throw new Error("A correction must reference a preceding source record.");
    ids.add(row.id);
  }
  const totalMinor = records.reduce((sum, row) => sum + row.amountMinor, 0);
  if (!Number.isSafeInteger(totalMinor))
    throw new Error("Reconciliation exceeded the safe integer range.");
  return { totalMinor, history: records.map((row) => ({ ...row })) };
}
