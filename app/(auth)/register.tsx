// File: app/(auth)/register.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; // For creating user document
import { auth, firestoreDB } from '../../firebaseConfig'; // Adjust path if needed

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState(''); // For displayName
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in all required fields (username, email, password).");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Update Firebase Auth profile with displayName (optional but good)
      await updateProfile(user, {
        displayName: username.trim(),
        // photoURL: "some-default-avatar.png" // if you have one
      });

      // 3. Create a user document in Firestore
      // Use user.uid as the document ID in your 'users' collection
      const userDocRef = doc(firestoreDB, "users", user.uid);
      await setDoc(userDocRef, {
        // uid: user.uid, // Not needed if doc ID is uid
        email: user.email,
        displayName: username.trim(),
        createdAt: serverTimestamp(),
        onboardingCompleted: false, // Example field
        appSettings: { // Default app settings
          theme: "light", // or 'system'
        }
        // Add other initial fields for the user document if any
      });

      console.log('User registered and profile created:', user.uid);
      Alert.alert("Registration Successful", "Your account has been created!");
      // Navigation will be handled by the root layout based on auth state
      // router.replace('/(tabs)/home'); // Or let the root layout handle redirection
    } catch (error: any) {
      console.error("Registration Error:", error);
      let errorMessage = "Registration failed. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'That email address is already in use!';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'That email address is invalid!';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }
      Alert.alert("Registration Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-6 justify-center">
      {/* ... (Your existing UI for title, inputs for username, email, password, confirmPassword) ... */}
      <View className="mb-8">
        <Text className="text-4xl font-sans-bold text-primary text-center">
          Create Account
        </Text>
        <Text className="text-lg text-text/70 text-center mt-2">
          Start your habit tracking journey!
        </Text>
      </View>

      <View className="mb-4">
        <Text className="text-sm font-sans-medium text-text/80 mb-1">Username</Text>
        <TextInput
          className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-3 focus:border-primary"
          placeholder="Choose a username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>
       <View className="mb-4">
        <Text className="text-sm font-sans-medium text-text/80 mb-1">Email</Text>
        <TextInput
          className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-3 focus:border-primary"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      <View className="mb-4">
        <Text className="text-sm font-sans-medium text-text/80 mb-1">Password</Text>
        <TextInput
          className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-3 focus:border-primary"
          placeholder="Create a password (min. 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>
      <View className="mb-6">
        <Text className="text-sm font-sans-medium text-text/80 mb-1">Confirm Password</Text>
        <TextInput
          className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-3 focus:border-primary"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        className={`bg-primary py-4 rounded-lg ${isLoading ? 'opacity-50' : 'active:bg-indigo-700'}`}
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="text-white text-center text-lg font-sans-semibold">
            Sign Up
          </Text>
        )}
      </TouchableOpacity>
      <View className="flex-row justify-center mt-8">
        <Text className="text-text/70">Already have an account? </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-sans-semibold">Login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}