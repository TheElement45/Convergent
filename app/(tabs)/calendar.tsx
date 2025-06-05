// File: app/(tabs)/calendar.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  collection,
  query,
  where, onSnapshot
} from 'firebase/firestore';
import { firestoreDB } from '../../firebaseConfig';
import { useAuth } from '../_layout';

// Import types and the new utility function
import { HabitLogEntry } from '../../types'; // Adjust path
import { getTimestampForStartOfLocalDay, timestampToStartOfItsLocalDayDate } from '../../utils/habitUtils'; // Adjust path

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarScreen() {
  const { user: authUser } = useAuth();
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date()); // For month/year navigation
  // Stores data as: { "YYYY-MM-DD": { completedCount: X, totalLogged: Y } }
  // The key "YYYY-MM-DD" will represent the *local date string*.
  const [loggedDataForMonth, setLoggedDataForMonth] = useState<Record<string, { completedCount: number, totalLogged: number }>>({});
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth(); // 0-indexed

  useEffect(() => {
    if (!authUser) {
      setLoggedDataForMonth({});
      setIsLoadingLogs(false);
      return () => {};
    }

    setIsLoadingLogs(true);

    // Determine the first and last day of the currently displayed month *in the user's local timezone*
    // Then get Timestamps for the start of these local days.
    const firstDayOfMonthLocal = new Date(year, month, 1);
    const lastDayOfMonthLocal = new Date(year, month + 1, 0); // Day 0 of next month is last day of current

    const startOfMonthTimestamp = getTimestampForStartOfLocalDay(firstDayOfMonthLocal);
    const endOfMonthTimestamp = getTimestampForStartOfLocalDay(lastDayOfMonthLocal); // Get start of this last day

    // Query habitLog for entries where the 'date' field (which stores start-of-local-day TS)
    // falls within the start of the first local day of the month and the start of the last local day of the month.
    const logsQuery = query(
      collection(firestoreDB, "habitLog"),
      where("userId", "==", authUser.uid),
      where("date", ">=", startOfMonthTimestamp),
      where("date", "<=", endOfMonthTimestamp) // Inclusive of the start of the last day
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const monthlyLogs: Record<string, { completedCount: number, totalLogged: number }> = {};
      snapshot.forEach((doc) => {
        const log = doc.data() as HabitLogEntry;
        // The `log.date` Timestamp already represents the start of a local day.
        // We need to convert this Timestamp to a "YYYY-MM-DD" string key based on that local day.
        const logLocalDate = timestampToStartOfItsLocalDayDate(log.date); // Get JS Date for start of its local day

        const keyYear = logLocalDate.getFullYear();
        const keyMonth = (logLocalDate.getMonth() + 1).toString().padStart(2, '0'); // 1-indexed, padded
        const keyDay = logLocalDate.getDate().toString().padStart(2, '0'); // padded
        const dateStringKey = `${keyYear}-${keyMonth}-${keyDay}`;

        if (!monthlyLogs[dateStringKey]) {
          monthlyLogs[dateStringKey] = { completedCount: 0, totalLogged: 0 };
        }
        monthlyLogs[dateStringKey].totalLogged += 1;
        if (log.status === "completed") {
          monthlyLogs[dateStringKey].completedCount += 1;
        }
      });
      setLoggedDataForMonth(monthlyLogs);
      setIsLoadingLogs(false);
    }, (error) => {
      console.error("Error fetching habit logs for calendar: ", error);
      Alert.alert("Error", "Could not load calendar data.");
      setIsLoadingLogs(false);
    });

    return () => unsubscribe();

  }, [authUser, year, month]); // Re-fetch when user or displayed month/year changes

  const firstDayOfMonthWeekday = new Date(year, month, 1).getDay(); // Local weekday
  const daysInMonthVal = new Date(year, month + 1, 0).getDate(); // Days in current local month
  const todayObjForHighlight = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []); // Only re-calculate once per mount

  const handlePrevMonth = () => {
    setCurrentDisplayDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDisplayDate(new Date(year, month + 1, 1));
  };

  const calendarGrid = useMemo(() => {
    const grid = [];
    for (let i = 0; i < firstDayOfMonthWeekday; i++) {
      grid.push(<View key={`empty-start-${i}`} className="flex-1 aspect-square p-1" />);
    }

    for (let dayCounter = 1; dayCounter <= daysInMonthVal; dayCounter++) {
      // Key for loggedDataForMonth should match the local date of the cell
      const cellMonthPadded = (month + 1).toString().padStart(2, '0');
      const cellDayPadded = dayCounter.toString().padStart(2, '0');
      const dateStringForLogKey = `${year}-${cellMonthPadded}-${cellDayPadded}`;
      const dayLogData = loggedDataForMonth[dateStringForLogKey];

      const cellDateObj = new Date(year, month, dayCounter); // Local date of the current cell
      const isCurrentDisplayDayToday = cellDateObj.getTime() === todayObjForHighlight.getTime();

      let dayStyle = 'bg-light-100';
      let textStyle = 'text-text';

      if (isCurrentDisplayDayToday) {
        dayStyle = 'bg-primary'; // Tailwind primary color
        textStyle = 'text-white';
      } else if (dayLogData) {
        if (dayLogData.completedCount > 0 && dayLogData.completedCount === dayLogData.totalLogged) {
          dayStyle = 'bg-green-500';
          textStyle = 'text-white';
        } else if (dayLogData.completedCount > 0) {
          dayStyle = 'bg-yellow-300';
          textStyle = 'text-yellow-800';
        } else if (dayLogData.totalLogged > 0) {
          dayStyle = 'bg-gray-300';
          textStyle = 'text-gray-700';
        }
      }

      grid.push(
        <TouchableOpacity
          key={`day-${dayCounter}`}
          className={`flex-1 aspect-square p-1 m-0.5 items-center justify-center rounded-full ${dayStyle}`}
          onPress={() => {
            const logInfo = dayLogData
              ? `${dayLogData.completedCount} of ${dayLogData.totalLogged} habits completed.`
              : "No habits logged for this day.";
            Alert.alert(`${monthNames[month]} ${dayCounter}, ${year}`, logInfo); // Show local date in alert
          }}
        >
          <Text className={`text-base font-sans-medium ${textStyle}`}>{dayCounter}</Text>
          {dayLogData && dayLogData.totalLogged > 0 && !isCurrentDisplayDayToday && (
             <View className={`w-1.5 h-1.5 rounded-full ${dayLogData.completedCount === dayLogData.totalLogged ? 'bg-green-700' : (dayLogData.completedCount > 0 ? 'bg-yellow-600' : 'bg-gray-500')} absolute bottom-1.5`}></View>
          )}
        </TouchableOpacity>
      );
    }

    const totalCells = firstDayOfMonthWeekday + daysInMonthVal;
    const remainingCellsInLastRow = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCellsInLastRow; i++) {
        grid.push(<View key={`empty-end-${i}`} className="flex-1 aspect-square p-1" />);
    }
    return grid;
  }, [year, month, firstDayOfMonthWeekday, daysInMonthVal, todayObjForHighlight, loggedDataForMonth]);

  const calendarRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
      rows.push(
        <View key={`row-${i / 7}`} className="flex-row justify-around mb-1">
          {calendarGrid.slice(i, i + 7)}
        </View>
      );
    }
    return rows;
  }, [calendarGrid]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-6 px-2">
          <TouchableOpacity onPress={handlePrevMonth} className="p-2">
            <FontAwesome5 name="chevron-left" size={20} color="#4F46E5" />
          </TouchableOpacity>
          <Text className="text-xl font-sans-bold text-primary">
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} className="p-2">
            <FontAwesome5 name="chevron-right" size={20} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-around mb-3">
          {daysOfWeek.map((day) => (
            <Text key={day} className="flex-1 text-center text-sm font-sans-semibold text-text/70">{day}</Text>
          ))}
        </View>

        {isLoadingLogs ? (
          <View className="flex-1 items-center justify-center py-10 min-h-[200px]">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <View>{calendarRows}</View>
        )}

        <View className="mt-8 items-center">
          <Text className="text-lg text-text/60">
            Select a day to see habit details.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}