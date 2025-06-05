// File: types/index.ts
import { Timestamp } from 'firebase/firestore';

export type HabitFrequencyConfig =
  | { type: "daily" }
  | { type: "every_x_days"; days: number }
  | { type: "weekly" };

// For habitUtils.ts, only needs frequency and lastCompletedDate
export type HabitCoreInfoForUtils = {
  frequency: HabitFrequencyConfig;
  lastCompletedDate?: Timestamp | null;
};

// Full Habit document structure from Firestore
export type Habit = {
  id: string; // Document ID from Firestore
  name: string;
  userId: string;
  createdAt: Timestamp;
  isActive: boolean;
  streak: number;
  frequency: HabitFrequencyConfig;
  archived?: boolean;
  lastCompletedDate?: Timestamp | null;
  // color?: string; // Optional fields for future
  // icon?: string;  // Optional fields for future
};

// Structure for habit log entries
export type HabitLogEntry = {
  id?: string; // Document ID from Firestore, optional if not yet created
  habitId: string;
  userId: string;
  date: Timestamp; // Date of log (midnight UTC)
  loggedAt: Timestamp; // Timestamp of actual logging action
  status: "completed" | "skipped" | "missed" | "pending";
  notes?: string;
};

// Type for habits displayed in the UI, combining Habit with UI-specific state
export type DisplayHabit = Habit & {
  isCompletedToday: boolean; // Completed for its current due period today
  isDueToday: boolean;       // Is the habit actually scheduled/due today?
  logIdForToday?: string;   // Firestore doc ID for today's log entry, if any
};

export type Task = {
  id?: string; // Firestore document ID (optional on creation, present when fetched)
  userId: string;
  text: string;
  completed: boolean;
  createdAt: Timestamp; // To order tasks or know when they were added
  // completedAt?: Timestamp | null; // Optional: if you want to track completion time
};

export type UserProfile = { // Or whatever you named your user document type
  displayName: string | null;
  email: string | null; // Usually from auth, not directly editable in Firestore by user
  photoURL: string | null;       // Public download URL
  photoStoragePath?: string | null; // Full path in Firebase Storage, e.g., "profilePictures/uid/filename.jpg"
  createdAt: Timestamp;
  onboardingCompleted: boolean; // Whether the user has completed onboarding
}