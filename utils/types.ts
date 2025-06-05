// File: utils/types.ts
import { Timestamp } from 'firebase/firestore';

export type HabitFrequencyConfig =
  | { type: "daily" }
  | { type: "every_x_days"; days: number }
  | { type: "weekly" }; // This simple "weekly" means once per Sun-Sat week

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
  date: Timestamp; // Date of log (midnight UTC)
  loggedAt: Timestamp;
  status: "completed" | "skipped" | "missed" | "pending";
  notes?: string;
};

// This type is specific to the display logic in HomeScreen
export type DisplayHabit = Habit & {
  isCompletedToday: boolean;
  isDueToday: boolean;
  logIdForToday?: string;
};