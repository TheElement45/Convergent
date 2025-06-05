// File: app/_layout.tsx

import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native'; // For loading state
import { auth } from '../firebaseConfig'; // Adjust path if your firebaseConfig.ts is elsewhere
import './globals.css'; // Your global styles

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create a Context to expose the auth state
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// AuthProvider component to wrap the app
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading: isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Main Root Layout Component
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Splash screen will be hidden in RootLayoutNav
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

// Navigation logic component
function RootLayoutNav() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isAuthLoading) return;

    SplashScreen.hideAsync();

    const firstSegment = String(segments[0]);
    const isAtAppRootIndex = segments.length as number === 0;
    const inAuthGroup = firstSegment === '(auth)';
    const inAppArea = firstSegment === '(tabs)' || firstSegment === 'profile';

    if (user) {
      if (inAuthGroup || isAtAppRootIndex) {
        console.log("User signed in, on auth/root page, redirecting to home:", segments);
        router.replace('/(tabs)/home');
      }
    } else {
      if (inAppArea) {
        console.log("User NOT signed in, on app page, redirecting to login:", segments);
        router.replace('/(auth)/login');
      }
    }
  }, [user, isAuthLoading, segments, router]);

  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="editProfile" options={{ headerShown: false }} />
    </Stack>
  );
}
