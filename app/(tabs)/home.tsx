// File: app/(tabs)/home.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDocs, Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { firestoreDB } from '../../firebaseConfig';
import { useAuth } from '../_layout';

import {
  isSameUTCDay,
  isHabitDueToday,
  getTimestampForStartOfLocalDay,
} from '../../utils/habitUtils';

import { Habit, HabitLogEntry, DisplayHabit } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [habits, setHabits] = useState<DisplayHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); 

  const [currentLocalDayDate, setCurrentLocalDayDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        const startOfTodayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (startOfTodayLocal.getTime() !== currentLocalDayDate.getTime()) {
            setCurrentLocalDayDate(startOfTodayLocal);
        }
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [currentLocalDayDate]);

  useEffect(() => {
    if (!authUser) {
      setHabits([]);
      setIsLoading(false);
      return () => {};
    }

    const habitsQuery = query(
      collection(firestoreDB, "habits"),
      where("userId", "==", authUser.uid),
      where("isActive", "==", true),
      where("archived", "in", [false, null])
    );
    const todayLogTimestamp = getTimestampForStartOfLocalDay(currentLocalDayDate);

    const unsubscribeHabits = onSnapshot(habitsQuery, async (querySnapshot) => {
      setIsLoading(true); 
      const fetchedHabits: Habit[] = [];
      querySnapshot.forEach((doc) => {
        fetchedHabits.push({ id: doc.id, ...doc.data() } as Habit);
      });

      const displayHabitsPromises = fetchedHabits.map(async (habit) => {
        const habitIsDueToday = isHabitDueToday(
            { frequency: habit.frequency, lastCompletedDate: habit.lastCompletedDate },
            currentLocalDayDate
        );
        let isCompletedForDuePeriod = false;
        let logIdForTodayEntry: string | undefined = undefined;

        const habitLogQuery = query(
          collection(firestoreDB, "habitLog"),
          where("userId", "==", authUser.uid),
          where("habitId", "==", habit.id),
          where("date", "==", todayLogTimestamp)
        );
        const logSnapshot = await getDocs(habitLogQuery);
        if (!logSnapshot.empty) {
          const logDoc = logSnapshot.docs[0];
          logIdForTodayEntry = logDoc.id;
          isCompletedForDuePeriod = (logDoc.data() as HabitLogEntry).status === "completed";
        }
        return {
          ...habit,
          isDueToday: habitIsDueToday,
          isCompletedToday: habitIsDueToday && isCompletedForDuePeriod,
          logIdForToday: logIdForTodayEntry,
        };
      });
      try {
        const resolvedDisplayHabits = await Promise.all(displayHabitsPromises);
        setHabits(resolvedDisplayHabits);
      } catch (error) {
        console.error("Error resolving display habits promises: ", error);
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Error fetching habits:", error);
      setIsLoading(false);
    });
    return () => unsubscribeHabits();
  }, [authUser, currentLocalDayDate]);


  const toggleHabitCompletion = useCallback(async (habitToToggle: DisplayHabit) => {
     if (!authUser) { Alert.alert("Not Authenticated", "Please log in."); return; }
    if (!habitToToggle) { console.warn("toggleHabitCompletion called with undefined habitToToggle"); return; }
    if (!habitToToggle.isDueToday && !habitToToggle.isCompletedToday) { Alert.alert("Not Due", "This habit is not scheduled for completion today."); return; }

    const { id: habitId, isCompletedToday, logIdForToday, streak, lastCompletedDate } = habitToToggle;
    const newIsCompletedForToday = !isCompletedToday;
    const todayTimestampForLog = getTimestampForStartOfLocalDay(currentLocalDayDate);
    const batch = writeBatch(firestoreDB);

    setHabits(prevHabits => prevHabits.map(h => h.id === habitId ? { ...h, isCompletedToday: newIsCompletedForToday } : h ));

    try {
      const habitDocRef = doc(firestoreDB, "habits", habitId);
      let newStreak = streak;
      let newLastCompletedDate: Timestamp | null = lastCompletedDate || null;

      if (logIdForToday) {
        const logDocRef = doc(firestoreDB, "habitLog", logIdForToday);
        batch.update(logDocRef, { status: newIsCompletedForToday ? "completed" : "pending", loggedAt: serverTimestamp(), });
      } else if (newIsCompletedForToday) {
        const newLogRef = doc(collection(firestoreDB, "habitLog"));
        batch.set(newLogRef, { habitId: habitId, userId: authUser.uid, date: todayTimestampForLog, loggedAt: serverTimestamp(), status: "completed", });
        setHabits(prevHabits => prevHabits.map(h => h.id === habitId ? { ...h, logIdForToday: newLogRef.id } : h ));
      }

      if (newIsCompletedForToday) {
        newStreak = (streak || 0) + 1;
        newLastCompletedDate = todayTimestampForLog;
      } else {
        if (newLastCompletedDate && isSameUTCDay(newLastCompletedDate, todayTimestampForLog)) {
          newStreak = Math.max(0, (streak || 1) - 1);
          newLastCompletedDate = newStreak === 0 ? null : null; 
        }
      }

      if (newStreak !== streak || newLastCompletedDate !== (lastCompletedDate || null) ) {
        batch.update(habitDocRef, { streak: newStreak, lastCompletedDate: newLastCompletedDate });
      }
      await batch.commit();
      setHabits(prevHabits => prevHabits.map(h => h.id === habitId ? { ...h, streak: newStreak, lastCompletedDate: newLastCompletedDate, isDueToday: isHabitDueToday({ frequency: h.frequency, lastCompletedDate: newLastCompletedDate }, currentLocalDayDate) } : h ));
    } catch (error) {
      console.error("Error toggling habit completion:", error);
      Alert.alert("Error", "Could not update habit status.");
      setHabits(prevHabits => prevHabits.map(h => h.id === habitId ? { ...h, isCompletedToday: isCompletedToday } : h ));
    }
  }, [authUser, currentLocalDayDate]);


  const handleDeleteHabit = async (habitId: string, habitName: string) => {
    if (!authUser) {
      Alert.alert("Error", "You must be logged in to delete habits.");
      return;
    }

    Alert.alert(
      "Delete Habit",
      `Are you sure you want to delete "${habitName}"? This will also remove all its logged history. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(habitId); 
            try {
              const batch = writeBatch(firestoreDB);


              const habitDocRef = doc(firestoreDB, "habits", habitId);
              batch.delete(habitDocRef);


              const logsQuery = query(
                collection(firestoreDB, "habitLog"),
                where("userId", "==", authUser.uid),
                where("habitId", "==", habitId)
              );
              const logDocsSnapshot = await getDocs(logsQuery);
              logDocsSnapshot.forEach((logDoc) => {
                batch.delete(logDoc.ref);
              });

              await batch.commit();
              Alert.alert("Habit Deleted", `"${habitName}" and its history have been deleted.`);

            } catch (error) {
              console.error("Error deleting habit:", error);
              Alert.alert("Deletion Error", "Could not delete habit. Please try again.");
            } finally {
              setIsDeleting(null);
            }
          },
        },
      ]
    );
  };

  const renderHabitItem = ({ item }: { item: DisplayHabit }) => (
    <View className={`p-4 rounded-lg mb-3 flex-row items-center justify-between shadow ${!item.isDueToday && !item.isCompletedToday ? 'bg-light-200 opacity-70' : 'bg-light-100'}`}>
      <View className="flex-1 mr-2">
        <Text className={`text-lg font-sans-medium ${!item.isDueToday && !item.isCompletedToday ? 'text-text/70' : 'text-text'}`}>{item.name}</Text>
        {item.streak > 0 ? (
          <Text className={`text-sm mt-1 ${!item.isDueToday && !item.isCompletedToday ? 'text-secondary/70' : 'text-secondary'}`}>
            Streak: {item.streak} day{item.streak !== 1 ? 's' : ''}
          </Text>
        ) : null}
        {!item.isDueToday && !item.isCompletedToday ? (
            <Text className="text-xs text-text/60 mt-1 italic">Not due today</Text>
        ) : null}
         {item.isDueToday && !item.isCompletedToday ? (
            <Text className="text-xs text-accent/80 mt-1 italic">Due today</Text>
        ) : null}
      </View>

      <View className="flex-row items-center">

        <TouchableOpacity
          onPress={() => toggleHabitCompletion(item)}
          disabled={(isDeleting === item.id) || (!item.isDueToday && !item.isCompletedToday)}
          className={`w-12 h-12 rounded-full items-center justify-center border-2
                      ${item.isCompletedToday ? 'bg-accent border-accent' : 'bg-transparent border-light-300'}
                      ${((!item.isDueToday && !item.isCompletedToday) || isDeleting === item.id) ? 'opacity-50' : ''} mr-2`}
        >
          {item.isCompletedToday ? (
            <FontAwesome5 name="check" size={20} color="white" />
          ) : (
            <View className="w-5 h-5 rounded-full border-2 border-light-300" />
          )}
        </TouchableOpacity>

        {isDeleting === item.id ? (
          <ActivityIndicator size="small" color="#EF4444" style={{padding: 10}} />
        ) : (
          <TouchableOpacity
            onPress={() => handleDeleteHabit(item.id, item.name)}
            className="p-2"
            disabled={isDeleting !== null && isDeleting !== item.id} 
          >
            <FontAwesome5 name="trash-alt" size={20} color="#EF4444" /> 
          </TouchableOpacity>
        )}
      </View>
    </View>
  );


  if (isLoading && habits.length === 0) { 
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="bg-primary px-5 py-4 flex-row items-center justify-between shadow-md">
        <TouchableOpacity onPress={() => router.push('/profile')} className="p-1">
          <FontAwesome5 name="user-cog" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-xl text-white font-sans-bold">{"Today's Habits"}</Text>
        <View style={{width: 28}} />
      </View>


      <View className="p-6 flex-1">

        {isLoading && habits.length > 0 && (
            <View className="absolute top-2 right-2 z-10 p-2 bg-light-100 rounded-full shadow">
                <ActivityIndicator size="small" color="#4F46E5" />
            </View>
        )}
        {habits.length > 0 ? (
          <FlatList
            data={habits}
            renderItem={renderHabitItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            extraData={{habits, isDeleting}} 
          />
        ) : (
           !isLoading && ( 
            <View className="flex-1 items-center justify-center">
                <FontAwesome5 name="calendar-check" size={60} color="#D1D5DB" />
                <Text className="text-xl text-text/60 mt-4 font-sans-medium">No active habits!</Text>
                <Text className="text-text/50 text-center mt-2">
                {'Tap the \'+\' button below or on the \'Add Habit\' tab to add your first habit.'}
                </Text>
            </View>
           )
        )}
      </View>

       <TouchableOpacity
        className="absolute bottom-8 right-6 bg-primary w-16 h-16 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('/(tabs)/habit')}
      >
        <FontAwesome5 name="plus" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}