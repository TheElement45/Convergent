// File: utils/habitUtils.ts
import { Timestamp } from 'firebase/firestore';
import { HabitCoreInfoForUtils } from '../types';


export const getTimestampForStartOfLocalDay = (referenceDate: Date): Timestamp => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const day = referenceDate.getDate();
    const startOfLocalDayDateObj = new Date(year, month, day, 0, 0, 0, 0);
    return Timestamp.fromDate(startOfLocalDayDateObj);
};

export const isSameUTCDay = (ts1: Timestamp, ts2: Timestamp): boolean => {

    const d1 = ts1.toDate();
    const d2 = ts2.toDate();
    return (
        d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate()
    );
};

export const timestampToStartOfItsLocalDayDate = (ts: Timestamp): Date => {
    const d = ts.toDate();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};


export const addDaysToTimestamp = (ts: Timestamp, days: number): Timestamp => {
  const date = ts.toDate();
  date.setDate(date.getDate() + days);
  return Timestamp.fromDate(date);
};

export const getStartOfUTCCurrentWeek = (date: Date): Date => {
    const d = new Date(date);
    const dayOfWeek = d.getUTCDay(); // Sunday = 0, Saturday = 6
    const diff = d.getUTCDate() - dayOfWeek;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0));
};


export const isHabitDueToday = (
  habit: HabitCoreInfoForUtils,
  startOfCurrentUserLocalDay: Date 
): boolean => {
  const { frequency, lastCompletedDate: lastCompletedTimestamp } = habit;


  const lastCompletedDayStart = lastCompletedTimestamp ? timestampToStartOfItsLocalDayDate(lastCompletedTimestamp) : null;

  switch (frequency.type) {
    case "daily":
      return true; 

    case "every_x_days":
      if (!lastCompletedDayStart) return true;
      const nextDueDate = addDaysToTimestamp(lastCompletedTimestamp!, frequency.days).toDate();
      const nextDueDayStart = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), nextDueDate.getDate());
      return startOfCurrentUserLocalDay.getTime() >= nextDueDayStart.getTime();

    case "weekly":
      if (!lastCompletedDayStart) return true;
      const startOfThisUserWeek = getStartOfUTCCurrentWeek(startOfCurrentUserLocalDay);
      return lastCompletedDayStart.getTime() < startOfThisUserWeek.getTime();

    default:
      const _exhaustiveCheck: never = frequency;
      console.warn("Unhandled frequency type in isHabitDueToday:", _exhaustiveCheck);
      return false;
  }
};