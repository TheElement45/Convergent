// File: app/(tabs)/tasks.tsx

import { FontAwesome5 } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { firestoreDB } from '../../firebaseConfig';
import { useAuth } from '../_layout';

// Assuming Task type is defined in types/index.ts or here
// If defined here:
// export type Task = { /* ... as defined above ... */ };
import { Task } from '../../types'; // Adjust path if necessary

export default function TasksScreen() {
  const { user: authUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true); // For initial load
  const [isSubmitting, setIsSubmitting] = useState(false); // For add task action

  // Fetch tasks from Firestore
  useEffect(() => {
    if (!authUser) {
      setTasks([]);
      setIsLoading(false);
      return () => {};
    }

    setIsLoading(true);
    const tasksQuery = query(
      collection(firestoreDB, "tasks"),
      where("userId", "==", authUser.uid),
      orderBy("createdAt", "desc") // Show newer tasks first, or "asc" for older first
    );

    const unsubscribe = onSnapshot(tasksQuery, (querySnapshot) => {
      const fetchedTasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(fetchedTasks);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching tasks: ", error);
      Alert.alert("Error", "Could not load tasks.");
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [authUser]);

  const handleAddTask = async () => {
    if (inputText.trim() === '') {
      Alert.alert("Empty Task", "Please enter some text for your task.");
      return;
    }
    if (!authUser) {
      Alert.alert("Not Authenticated", "You need to be logged in to add tasks.");
      return;
    }

    setIsSubmitting(true);
    const newTaskData = {
      userId: authUser.uid,
      text: inputText.trim(),
      completed: false,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(firestoreDB, "tasks"), newTaskData);
      setInputText('');
      Keyboard.dismiss();
      // No Alert needed here, onSnapshot will update the list
    } catch (error) {
      console.error("Error adding task: ", error);
      Alert.alert("Error", "Could not save task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    if (!authUser || !task.id) return;

    // Optimistic update
    setTasks(prevTasks =>
        prevTasks.map(t =>
            t.id === task.id ? { ...t, completed: !t.completed } : t
        )
    );

     try {
      const taskDocRef = doc(firestoreDB, "tasks", task.id!); // Use !
      await updateDoc(taskDocRef, {
        completed: !task.completed,
      });
    } catch (error) {
      console.error("Error updating task completion: ", error);
      Alert.alert("Error", "Could not update task status.");
      // Revert optimistic update on error
       setTasks(prevTasks =>
        prevTasks.map(t =>
            t.id === task.id ? { ...t, completed: task.completed } : t // Revert to original
        )
    );
    }
  };

  const handleDeleteTask = (task: Task) => {
    if (!authUser || !task.id) return;

    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task.text}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const taskDocRef = doc(firestoreDB, "tasks", task.id!); // Use !
              await deleteDoc(taskDocRef);
            } catch (error) {
              console.error("Error deleting task: ", error);
              Alert.alert("Error", "Could not delete task.");
              // If you did an optimistic update, you might need to add it back here
            }
          },
        },
      ]
    );
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View
      className={`flex-row items-center p-4 rounded-lg mb-3 shadow
                  ${item.completed ? 'bg-light-200' : 'bg-light-100'}`}
    >
      <TouchableOpacity
        onPress={() => toggleTaskCompletion(item)}
        className="p-2 mr-3"
      >
        <FontAwesome5
          name={item.completed ? 'check-square' : 'square'}
          solid={item.completed} // Ensure 'check-square' is solid
          size={24}
          color={item.completed ? '#10B981' : '#A0A0A0'}
        />
      </TouchableOpacity>
      <Text
        className={`flex-1 text-base font-sans-medium
                    ${item.completed ? 'line-through text-text/50' : 'text-text'}`}
      >
        {item.text}
      </Text>
      <TouchableOpacity
        onPress={() => handleDeleteTask(item)}
        className="p-2 ml-2"
      >
        <FontAwesome5 name="trash-alt" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-6 flex-1">
        <Text className="text-3xl font-sans-bold text-primary mb-6">
          My Tasks
        </Text>

        <View className="flex-row mb-6">
          <TextInput
            className="flex-1 bg-light-100 border border-light-300 text-text text-base rounded-lg p-3 mr-2 focus:border-primary"
            placeholder="Add a new task..."
            placeholderTextColor="#A0A0A0"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleAddTask}
            editable={!isSubmitting}
          />
          <TouchableOpacity
            className={`bg-primary p-3 rounded-lg items-center justify-center active:bg-indigo-700 ${isSubmitting ? 'opacity-50' : ''}`}
            onPress={handleAddTask}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <FontAwesome5 name="plus" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {tasks.length > 0 ? (
          <FlatList
            data={tasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.id!} // item.id will be present when fetched
            showsVerticalScrollIndicator={false}
            extraData={tasks} // To help FlatList re-render on item changes
          />
        ) : (
          <View className="flex-1 items-center justify-center mt-10">
            <FontAwesome5 name="clipboard-list" size={60} color="#D1D5DB" />
            <Text className="text-xl text-text/60 mt-4 font-sans-medium">
              No tasks yet!
            </Text>
            <Text className="text-text/50 text-center mt-2">
              Add a task using the input field above.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}