export const WORKDAY_MINUTES = 480;
export const OPENING_MINUTE = 540;
export const SIMULATION_EPOCH = Date.UTC(2026, 9, 5, 9);
export function dayAt(clockMinutes: number): number {
  return Math.floor(Math.max(0, clockMinutes) / WORKDAY_MINUTES) + 1;
}
export function minuteOfDay(clockMinutes: number): number {
  return OPENING_MINUTE + (Math.max(0, clockMinutes) % WORKDAY_MINUTES);
}
export function formatTime(clockMinutes: number): string {
  const minutes = minuteOfDay(clockMinutes);
  return `Day ${dayAt(clockMinutes)} · ${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
export function simulationTimestamp(clockMinutes: number): string {
  return new Date(
    SIMULATION_EPOCH +
      (Math.floor(clockMinutes / WORKDAY_MINUTES) * 1440 +
        (clockMinutes % WORKDAY_MINUTES)) *
        60000,
  ).toISOString();
}
/** Appointment minutes are wall-clock local minutes, with explicit offset conversion. No host timezone is consulted. */
export function convertTimeZone(
  localMinute: number,
  fromOffsetMinutes: number,
  toOffsetMinutes: number,
): { minute: number; dayDelta: number } {
  const raw = localMinute - fromOffsetMinutes + toOffsetMinutes;
  return {
    minute: ((raw % 1440) + 1440) % 1440,
    dayDelta: Math.floor(raw / 1440),
  };
}
export function appointmentClock(day: number, minute: number): number {
  return (day - 1) * WORKDAY_MINUTES + minute - OPENING_MINUTE;
}
export function overlaps(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number,
): boolean {
  return aStart < bStart + bDuration && bStart < aStart + aDuration;
}
