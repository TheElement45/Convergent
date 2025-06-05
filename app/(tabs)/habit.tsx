// File: app/(tabs)/habit.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal, // Added for dropdown
  StyleSheet, // For modal styling
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { firestoreDB } from '../../firebaseConfig';
import { useAuth } from '../_layout';


let numofDays = 0; // Default value for "Every X Days" frequency, can be adjusted later

export type HabitFrequencyConfig =
  | { type: "daily" }
  | { type: "every_x_days"; days: number }
  | { type: "weekly" }; // Implies once a week, any day, or could be expanded later

const frequencyOptions: { label: string; value: HabitFrequencyConfig }[] = [
  { label: "Daily", value: { type: "daily" } },
  { label: "Every X Days", value: { type: "every_x_days", days: numofDays } },
  { label: "Weekly", value: { type: "weekly" } },
  // Add more options like "Specific days of week" or "Monthly" here in the future
];
// --- End Frequency ---

type NewHabitData = {
  userId: string;
  name: string;
  createdAt: any;
  isActive: boolean;
  streak: number;
  frequency: HabitFrequencyConfig; // Updated type
  archived: boolean;
  lastCompletedDate: Timestamp | null;
};

export default function AddHabitScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [habitName, setHabitName] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState<HabitFrequencyConfig>(frequencyOptions[0].value);
  const [selectedFrequencyLabel, setSelectedFrequencyLabel] = useState<string>(frequencyOptions[0].label);
  const [isFrequencyModalVisible, setIsFrequencyModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveHabit = async () => {
    if (!habitName.trim()) {
      Alert.alert("Missing Information", "Please enter a name for your habit.");
      return;
    }

    if (!authUser) {
      Alert.alert(
        "Authentication Error",
        "You need to be logged in to add a habit. Please log in and try again."
      );
      return;
    }

    setIsLoading(true);

    try {
      const newHabitData: NewHabitData = {
        userId: authUser.uid,
        name: habitName.trim(),
        createdAt: serverTimestamp(),
        isActive: true,
        streak: 0,
        frequency: selectedFrequency, // Use selected frequency
        archived: false,
        lastCompletedDate: null,
      };

      const docRef = await addDoc(collection(firestoreDB, "habits"), newHabitData);
      console.log("Habit added to Firestore with ID: ", docRef.id, "with frequency:", selectedFrequency);

      Alert.alert("Habit Saved", `"${habitName.trim()}" has been added to your list!`);
      setHabitName('');
      setSelectedFrequency(frequencyOptions[0].value); // Reset frequency
      setSelectedFrequencyLabel(frequencyOptions[0].label);
      router.push('/(tabs)/home');

    } catch (error) {
      console.error("Error adding habit to Firestore: ", error);
      Alert.alert("Save Error", "Could not save habit. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFrequency = (option: { label: string; value: HabitFrequencyConfig }) => {
    setSelectedFrequency(option.value);
    setSelectedFrequencyLabel(option.label);
    setIsFrequencyModalVisible(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-6 flex-1">
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/home')} className="p-2 mr-2">
            <FontAwesome5 name="arrow-left" size={20} color="#4F46E5" />
          </TouchableOpacity>
          <Text className="text-2xl font-sans-bold text-primary">
            Add New Habit
          </Text>
        </View>

        {/* Habit Name Input */}
        <View className="mb-5">
          <Text className="text-sm font-sans-medium text-text/80 mb-1 ml-1">
            Habit Name
          </Text>
          <TextInput
            className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-4 focus:border-primary"
            placeholder="e.g., Read for 30 minutes"
            placeholderTextColor="#A0A0A0"
            value={habitName}
            onChangeText={setHabitName}
            editable={!isLoading}
          />
        </View>

        {/* Frequency Selector */}
        <View className="mb-5">
          <Text className="text-sm font-sans-medium text-text/80 mb-1 ml-1">
            Frequency
          </Text>
          <TouchableOpacity
            onPress={() => setIsFrequencyModalVisible(true)}
            disabled={isLoading}
            className="bg-light-100 border border-light-300 rounded-lg p-4 flex-row justify-between items-center"
          >
            <Text className="text-text text-base">{selectedFrequencyLabel}</Text>
            <FontAwesome5 name="chevron-down" size={16} color="#A0A0A0" />
          </TouchableOpacity>
        </View>

        {selectedFrequency.type === "every_x_days" && (
        <View className="mb-5">
          <Text className="text-sm font-sans-medium text-text/80 mb-1 ml-1">
            Number of Days 
          </Text>
          <TextInput
            className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-4 focus:border-primary"
            placeholder="Enter number of days"
            placeholderTextColor="#A0A0A0"
            value={String(numofDays)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              numofDays = isNaN(num) ? 1 : num;
              // If "Every X Days" is selected, update the frequency config as well
              if (selectedFrequency.type === "every_x_days") {
                setSelectedFrequency({ type: "every_x_days", days: numofDays });
              }
            }}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>
        )}

        {/* TODO: Add UI for color, icon, reminders if needed */}
      </View>

      {/* Action Buttons */}
      <View className="px-6 pb-6 border-t border-light-200 pt-4">
        <TouchableOpacity
          className={`py-4 rounded-lg ${isLoading ? 'bg-primary/50' : 'bg-primary active:bg-indigo-700'}`}
          onPress={handleSaveHabit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-center text-lg font-sans-semibold">
              Save Habit
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          className={`mt-3 py-4 rounded-lg border border-light-300 ${isLoading ? 'opacity-50' : 'active:bg-light-100'}`}
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <Text className="text-text/90 text-center text-lg font-sans-semibold">
            Cancel
          </Text>
        </TouchableOpacity>
      </View>

      {/* Frequency Selection Modal */}
      <Modal
        transparent={true}
        visible={isFrequencyModalVisible}
        animationType="fade" // 'slide' or 'fade'
        onRequestClose={() => setIsFrequencyModalVisible(false)}
      >
        <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setIsFrequencyModalVisible(false)} // Close on tap outside
        >
            <View style={styles.modalContent} className="bg-white rounded-lg shadow-xl w-4/5 max-w-sm">
                 <Text className="text-lg font-sans-semibold text-primary p-4 border-b border-light-200">
                    Select Frequency
                </Text>
                {frequencyOptions.map((option, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => handleSelectFrequency(option)}
                    className="p-4 border-b border-light-200 active:bg-light-100"
                >
                    <Text className="text-base text-text">{option.label}</Text>
                </TouchableOpacity>
                ))}
                <TouchableOpacity
                    onPress={() => setIsFrequencyModalVisible(false)}
                    className="p-4 items-center"
                >
                    <Text className="text-base text-red-500 font-sans-medium">Cancel</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    // Tailwind classes used directly for styling this view
    // bg-white rounded-lg shadow-xl w-4/5 max-w-sm
    // You can add specific non-Tailwind styles here if needed
  },
});