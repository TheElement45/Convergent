// File: utils/types.ts
import { Timestamp } from 'firebase/firestore';

export type HabitFrequencyConfig =
  | { type: "daily" }
  | { type: "every_x_days"; days: number }
  | { type: "weekly" };

export type Habit = {
  id: string;
  name: string;
  userId: string;
  createdAt: Timestamp;
  isActive: boolean;
  streak: number;
  frequency: HabitFrequencyConfig;
  archived?: boolean;
  lastCompletedDate?: Timestamp | null;
};

export type HabitLogEntry = {
  id?: string;
  habitId: string;
  userId: string;
  date: Timestamp;
  loggedAt: Timestamp;
  status: "completed" | "skipped" | "missed" | "pending";
  notes?: string;
};


export type DisplayHabit = Habit & {
  isCompletedToday: boolean;
  isDueToday: boolean;
  logIdForToday?: string;
};