// File: utils/habitUtils.ts

import { Timestamp } from 'firebase/firestore';

// --- Re-export or define types if they are not in a global types file yet ---
// It's best to have these in a shared types file (e.g., types/index.ts) and import here.
// For now, I'll redefine them for clarity if they are not globally accessible.
export type HabitFrequencyConfig =
  | { type: "daily" }
  | { type: "every_x_days"; days: number }
  | { type: "weekly" };

export type HabitCoreInfo = { // Only the info needed for due date calculation
  frequency: HabitFrequencyConfig;
  lastCompletedDate?: Timestamp | null;
};
// ---

export const getMidnightUTCDate = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const getTodayMidnightUTCTimestamp = (): Timestamp => {
  return Timestamp.fromDate(getMidnightUTCDate(new Date()));
};

export const isSameUTCDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
};

export const addUTCDays = (date: Date, days: number): Date => {
  const newDate = new Date(date);
  newDate.setUTCDate(newDate.getUTCDate() + days);
  return newDate;
};

export const getStartOfUTCCurrentWeek = (date: Date): Date => {
    const d = new Date(date);
    const dayOfWeek = d.getUTCDay(); // Sunday = 0, Saturday = 6
    const diff = d.getUTCDate() - dayOfWeek;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0));
};

export const isHabitDueToday = (
  habit: HabitCoreInfo, // Use the minimal type
  today: Date // Pass today's UTC midnight date
): boolean => {
  const { frequency, lastCompletedDate } = habit;
  const lastCompleted = lastCompletedDate ? lastCompletedDate.toDate() : null;

  switch (frequency.type) {
    case "daily":
      return true;

    case "every_x_days":
      if (!lastCompleted) return true;
      // Ensure lastCompleted is treated as UTC midnight for comparison
      const lastCompletedMidnight = getMidnightUTCDate(lastCompleted);
      const dueDate = addUTCDays(lastCompletedMidnight, frequency.days);
      return today.getTime() >= dueDate.getTime();

    case "weekly":
      if (!lastCompleted) return true;
      const startOfThisWeek = getStartOfUTCCurrentWeek(today);
      return lastCompleted.getTime() < startOfThisWeek.getTime();

    default:
      // Should not happen with TypeScript, but good for safety / exhaustiveness
      const _exhaustiveCheck: never = frequency;
      console.warn("Unhandled frequency type:", _exhaustiveCheck);
      return false;
  }
};