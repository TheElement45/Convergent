// File: app/(auth)/register.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestoreDB } from '../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
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
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: username.trim() });

      const userDocRef = doc(firestoreDB, "users", user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        displayName: username.trim(),
        createdAt: serverTimestamp(),
      });

      console.log('User registered and profile created:', user.uid);
      Alert.alert("Registration Successful", "Your account has been created!");
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
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A237E', '#6A1B9A']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View className="flex-1 w-full p-6 justify-center">
          <View className="mb-8">
            <Text className="text-4xl font-sans-bold text-white text-center">
              Create Account
            </Text>
            <Text className="text-lg text-white/70 text-center mt-2">
              Start your habit tracking journey!
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-sans-medium text-white/80 mb-1">Username</Text>
            <TextInput
              className="bg-white/10 border border-white/20 text-white text-base rounded-lg p-3 focus:border-primary"
              placeholder="Choose a username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-sans-medium text-white/80 mb-1">Email</Text>
            <TextInput
              className="bg-white/10 border border-white/20 text-white text-base rounded-lg p-3 focus:border-primary"
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-sans-medium text-white/80 mb-1">Password</Text>
            <TextInput
              className="bg-white/10 border border-white/20 text-white text-base rounded-lg p-3 focus:border-primary"
              placeholder="Create a password (min. 6 characters)"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-sans-medium text-white/80 mb-1">Confirm Password</Text>
            <TextInput
              className="bg-white/10 border border-white/20 text-white text-base rounded-lg p-3 focus:border-primary"
              placeholder="Confirm your password"
              placeholderTextColor="#9CA3AF"
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
            <Text className="text-white/70">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary font-sans-semibold">Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});