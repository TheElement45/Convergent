// File: app/profile.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // Link is not used directly here anymore
import { auth, firestoreDB } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore'; // updateDoc might not be needed if theme saving is removed
import { useAuth } from './_layout'; // Path to root _layout for useAuth

type UserProfile = {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  // appSettings?: { theme?: string }; // Can be removed if dark mode is fully removed
};

type ListItemProps = {
  icon: React.ComponentProps<typeof FontAwesome5>['name'];
  iconColor?: string;
  text: string;
  onPress?: () => void;
  hideArrow?: boolean;
};

const ProfileListItem: React.FC<ListItemProps> = ({
  icon,
  iconColor = "#4A5568",
  text,
  onPress,
  hideArrow
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center bg-white py-4 px-5 border-b border-light-200 ${!onPress ? '' : 'active:bg-light-100'}`}
    >
      <FontAwesome5 name={icon} size={20} color={iconColor} style={{ width: 28 }} />
      <Text className="text-base text-text flex-1 ml-4 font-sans-medium">{text}</Text>
      {/* Switch removed */}
      {!hideArrow && onPress && (
        <FontAwesome5 name="chevron-right" size={16} color="#A0AEC0" />
      )}
    </TouchableOpacity>
  );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View className="px-5 py-3 bg-light-100 border-b border-light-200">
    <Text className="text-sm font-sans-semibold text-text/70 uppercase tracking-wider">
      {title}
    </Text>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const [isDarkMode, setIsDarkMode] = useState(false); // Removed

  useEffect(() => {
    const fetchUserData = async () => {
      if (authUser) {
        setIsLoading(true);
        let displayName = authUser.displayName || "User";
        let email = authUser.email || "No email";
        let photoURL = authUser.photoURL;
        // let appSettings = { theme: "light" }; // Removed if dark mode gone

        try {
          const userDocRef = doc(firestoreDB, "users", authUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const firestoreData = userDocSnap.data() as UserProfile; // Ensure UserProfile type matches
            displayName = firestoreData.displayName || displayName;
            photoURL = firestoreData.photoURL || photoURL;
            // if (firestoreData.appSettings?.theme) { // Removed
            //     appSettings.theme = firestoreData.appSettings.theme;
            //     setIsDarkMode(firestoreData.appSettings.theme === 'dark');
            // }
          }
          // setProfile({ displayName, email, photoURL, appSettings }); // Removed appSettings
          setProfile({ displayName, email, photoURL });
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
          // setProfile({ displayName, email, photoURL, appSettings }); // Fallback, remove appSettings
          setProfile({ displayName, email, photoURL });
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [authUser]);

  const handleEditProfile = () => {
    // Alert.alert("Edit Profile", "Navigate to edit profile screen (to be built)."); // Old
    router.push('/editProfile'); // Navigate to the new screen
  };
  // handleThemeChange function removed

  const generalSettingsItems: ListItemProps[] = [
  ];

  const informationItems: ListItemProps[] = [
  {
    icon: "mobile-alt",
    text: "About App",
    onPress: () =>
      Alert.alert(
        "About Convergent",
        "A Habit Tracker App\nVersion: 1.0.0\nMade By: Element45"
      ),
  },
  {
    icon: "file-contract",
    text: "Terms & Conditions",
    onPress: () =>
      Alert.alert(
        "Terms & Conditions",
        "By using Convergent, you agree to use it lawfully, be at least 13 years old, and accept that the app is provided as-is. We may update these terms or suspend accounts for misuse."
      ),
  },
  {
    icon: "shield-alt",
    text: "Privacy Policy",
    onPress: () =>
      Alert.alert(
        "Privacy Policy",
        "We value your privacy. Your habit data stays on your device unless you sync it to the cloud (if available). We do not share or sell your data. For questions, contact foreelement45@gmail.com."
      ),
  },
  {
    icon: "comments",
    text: "User Feedback",
    onPress: () =>
      Alert.alert(
        "User Feedback",
        "We’d love your input! Please send feedback via our form or email us at foreelement45@gmail.com."
      ),
  },
];


  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: () => {
            auth.signOut().then(() => {
              console.log("User signed out");
            }).catch(error => {
                Alert.alert("Logout Error", error.message);
                console.error("Logout error: ", error);
            });
        }, style: "destructive" }
    ]);
  };

  if (isLoading || (!authUser && !profile)) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-light-100">
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  if (!authUser || !profile) {
    return (
        <SafeAreaView className="flex-1 justify-center items-center bg-light-100">
             <Text>Please log in to view your profile.</Text>
             <TouchableOpacity onPress={() => router.replace("/(auth)/login")} className="mt-4 bg-primary p-3 rounded-md">
                <Text className="text-white">Go to Login</Text>
             </TouchableOpacity>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-light-100">
      <View className="bg-primary px-5 py-4 flex-row items-center justify-between shadow-md">
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/home')} className="p-1">
          <FontAwesome5 name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-xl text-white font-sans-bold">Profile</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center py-8 bg-white border-b border-light-200">
          <View className="relative mb-2">
            <Image
              source={profile.photoURL ? { uri: profile.photoURL } : require('../assets/images/default-avatar.jpg')}
              className="w-24 h-24 rounded-full border-2 border-primary"
            />
            <TouchableOpacity
              onPress={handleEditProfile}
              className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white"
            >
              <FontAwesome5 name="pencil-alt" size={12} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-xl font-sans-bold text-text mt-1">{profile.displayName || 'User'}</Text>
          <Text className="text-sm text-text/60">{profile.email || 'No email'}</Text>
        </View>

        {/* Conditionally render General Settings section only if there are items */}
        {generalSettingsItems.length > 0 && (
          <>
            <SectionHeader title="General Settings" />
            {generalSettingsItems.map((item, index) => (
              <ProfileListItem key={`general-${index}`} {...item} />
            ))}
          </>
        )}

        {/* Information Section will always render as it has items */}
        <SectionHeader title="Information" />
        {informationItems.map((item, index) => (
          <ProfileListItem key={`info-${index}`} {...item} />
        ))}

        <View className="px-5 py-8">
             <TouchableOpacity
                onPress={handleLogout}
                className="bg-red-500 py-3 rounded-lg active:bg-red-600"
            >
                <Text className="text-white text-center text-lg font-sans-semibold">Logout</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}