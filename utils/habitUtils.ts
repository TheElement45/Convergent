// File: utils/habitUtils.ts
import { Timestamp } from 'firebase/firestore';
import { HabitCoreInfoForUtils } from '../types';

// No getMidnightUTCDate needed here if we consistently work with start-of-local-day Timestamps

export const getTimestampForStartOfLocalDay = (referenceDate: Date): Timestamp => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const day = referenceDate.getDate();
    const startOfLocalDayDateObj = new Date(year, month, day, 0, 0, 0, 0);
    return Timestamp.fromDate(startOfLocalDayDateObj);
};

export const isSameUTCDay = (ts1: Timestamp, ts2: Timestamp): boolean => {
    // Compare Timestamps by converting to JS Date and checking YMD in UTC
    // This is okay if ts1 and ts2 *both* represent start-of-day in some consistent frame.
    // More robust: check if they fall into the same UTC day bucket.
    const d1 = ts1.toDate();
    const d2 = ts2.toDate();
    return (
        d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate()
    );
};
// Helper to convert Firestore Timestamp to a JS Date representing start of its local day
export const timestampToStartOfItsLocalDayDate = (ts: Timestamp): Date => {
    const d = ts.toDate(); // Converts to local timezone Date object
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};


export const addDaysToTimestamp = (ts: Timestamp, days: number): Timestamp => {
  const date = ts.toDate();
  date.setDate(date.getDate() + days); // addDays, not UTC days if we want to keep local day alignment
  return Timestamp.fromDate(date);
};

// getStartOfUTCCurrentWeek is fine as is, it takes a Date and finds UTC Sunday
export const getStartOfUTCCurrentWeek = (date: Date): Date => {
    const d = new Date(date); // Ensure it's a new instance
    const dayOfWeek = d.getUTCDay(); // Sunday = 0, Saturday = 6
    const diff = d.getUTCDate() - dayOfWeek; // Go back to Sunday
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0));
};


export const isHabitDueToday = (
  habit: HabitCoreInfoForUtils,
  startOfCurrentUserLocalDay: Date // JS Date obj representing YYYY-MM-DD 00:00:00 in user's local time
): boolean => {
  const { frequency, lastCompletedDate: lastCompletedTimestamp } = habit;

  // lastCompletedTimestamp is from Firestore, assumed to be start-of-a-local-day
  const lastCompletedDayStart = lastCompletedTimestamp ? timestampToStartOfItsLocalDayDate(lastCompletedTimestamp) : null;

  switch (frequency.type) {
    case "daily":
      return true; // Always due if not completed on startOfCurrentUserLocalDay

    case "every_x_days":
      if (!lastCompletedDayStart) return true;
      const nextDueDate = addDaysToTimestamp(lastCompletedTimestamp!, frequency.days).toDate();
      // We want nextDueDate to be start of day. addDaysToTimestamp should preserve this.
      const nextDueDayStart = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), nextDueDate.getDate());
      return startOfCurrentUserLocalDay.getTime() >= nextDueDayStart.getTime();

    case "weekly":
      if (!lastCompletedDayStart) return true;
      // startOfCurrentUserLocalDay is already the start of the user's "today"
      // We need the Sunday of the week that contains startOfCurrentUserLocalDay
      const startOfThisUserWeek = getStartOfUTCCurrentWeek(startOfCurrentUserLocalDay);
      // If lastCompletedDayStart was before this Sunday, it's due.
      return lastCompletedDayStart.getTime() < startOfThisUserWeek.getTime();

    default:
      const _exhaustiveCheck: never = frequency;
      console.warn("Unhandled frequency type in isHabitDueToday:", _exhaustiveCheck);
      return false;
  }
};