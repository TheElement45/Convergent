// File: app/(auth)/login.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig'; // Adjust path if needed

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('User logged in:', userCredential.user.uid);
      // Navigation will be handled by the root layout based on auth state
      // router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error("Login Error:", error);
      let errorMessage = "Login failed. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'That email address is invalid!';
      }
      Alert.alert("Login Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-6 justify-center">
      {/* ... (Your existing UI for title, inputs for email, password) ... */}
      <View className="mb-10">
        <Text className="text-4xl font-sans-bold text-primary text-center">
          Welcome Back!
        </Text>
        <Text className="text-lg text-text/70 text-center mt-2">
          Sign in to continue
        </Text>
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
      <View className="mb-6">
        <Text className="text-sm font-sans-medium text-text/80 mb-1">Password</Text>
        <TextInput
          className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-3 focus:border-primary"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        className={`bg-primary py-4 rounded-lg ${isLoading ? 'opacity-50' : 'active:bg-indigo-700'}`}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="text-white text-center text-lg font-sans-semibold">
            Login
          </Text>
        )}
      </TouchableOpacity>
      <View className="flex-row justify-center mt-8">
        <Text className="text-text/70">{'Don\'t have an account? '}</Text>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-sans-semibold">Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}