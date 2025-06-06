// File: app/profile.tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  Alert, ActivityIndicator, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, firestoreDB } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from './_layout';

type UserProfile = {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

type ListItemProps = {
  icon: React.ComponentProps<typeof FontAwesome5>['name'];
  iconColor?: string;
  text: string;
  onPress?: () => void;
  hideArrow?: boolean;
};

const ProfileListItem: React.FC<ListItemProps> = ({ icon, iconColor = "#4A5568", text, onPress, hideArrow }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
    className="flex-row items-center bg-white py-4 px-5 border-b border-light-200 active:bg-light-100"
  >
    <FontAwesome5 name={icon} size={20} color={iconColor} style={{ width: 28 }} />
    <Text className="text-base text-text flex-1 ml-4 font-sans-medium">{text}</Text>
    {!hideArrow && onPress && (
      <FontAwesome5 name="chevron-right" size={16} color="#A0AEC0" />
    )}
  </TouchableOpacity>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View className="px-5 py-3 bg-light-100 border-b border-light-200">
    <Text className="text-sm font-sans-semibold text-text/70 uppercase tracking-wider">{title}</Text>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  const aboutContent = "Convergent is a modern habit tracking application designed to help you align your daily actions with your long-term goals.\n\nBuild streaks, monitor your progress, and stay motivated on your journey to self-improvement.\n\nVersion: 1.0.8\nDeveloped by: Element45";
  
  const termsContent = "Effective Date: 5/7/2025\n\nWelcome to Convergent! By using our app, you agree to these terms.\n\n1. Use of Service: You agree to use Convergent for lawful purposes only. You are responsible for any data you create or store within the app.\n\n2. Age Requirement: You must be at least 13 years old to use this app.\n\n3. Account Security: You are responsible for safeguarding your account information. Notify us immediately of any unauthorized use.\n\n4. Disclaimers: The app is provided 'as-is' without any warranties. We do not guarantee that the service will be error-free or uninterrupted.\n\n5. Termination: We reserve the right to suspend or terminate your account at our discretion, especially in cases of misuse.\n\n6. Changes to Terms: We may update these terms from time to time. Continued use of the app after changes constitutes acceptance.";

  const privacyContent = "Effective Date: 5/7/2025\n\nYour privacy is important to us. This policy explains how we handle your data.\n\n1. Information We Collect: We collect information you provide directly, such as your email address, display name, and profile picture when you register. We also store the habit data you create.\n\n2. How We Use Information: Your data is used to provide, maintain, and improve the app's functionality. Your email is used for authentication and important communications. We do not use your personal habit data for marketing.\n\n3. Data Storage: Your data is stored securely using Firebase services. We take reasonable measures to protect your information from loss, theft, and unauthorized access.\n\n4. Data Sharing: We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties.\n\n5. Your Control: You can edit your profile information and delete your account through the app's settings. Deleting your account will remove your personal data from our systems.\n\n6. Contact Us: If you have any questions about this Privacy Policy, please contact us at foreelement45@gmail.com.";

  const openLink = async (url: string) => {

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", `Don't know how to open this URL: ${url}`);
    }
  };
  
  useEffect(() => {

    const fetchUserData = async () => {
      if (authUser) {
        setIsLoading(true);
        let displayName = authUser.displayName || "User";
        let email = authUser.email || "No email";
        let photoURL = authUser.photoURL;
        try {
          const userDocRef = doc(firestoreDB, "users", authUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const firestoreData = userDocSnap.data() as UserProfile;
            displayName = firestoreData.displayName || displayName;
            photoURL = firestoreData.photoURL || photoURL;
          }
          setProfile({ displayName, email, photoURL });
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
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
    router.push('/editProfile');
  };

  const informationItems: ListItemProps[] = [
    {
      icon: "info-circle",
      text: "About App",
      onPress: () => router.push({ 
        pathname: '/infoPage', 
        params: { title: 'About Convergent', content: aboutContent }
      }),
    },
    {
      icon: "file-contract",
      text: "Terms & Conditions",
      onPress: () => router.push({ 
        pathname: '/infoPage', 
        params: { title: 'Terms & Conditions', content: termsContent }
      }),
    },
    {
      icon: "shield-alt",
      text: "Privacy Policy",
      onPress: () => router.push({ 
        pathname: '/infoPage', 
        params: { title: 'Privacy Policy', content: privacyContent }
      }),
    },
    {
      icon: "paper-plane",
      iconColor: "#3B82F6",
      text: "Send Feedback",
      onPress: () => openLink("mailto:foreelement45@gmail.com?subject=Convergent App Feedback"),
    },
  ];

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: () => {
            auth.signOut();
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
            <TouchableOpacity onPress={handleEditProfile} className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white">
              <FontAwesome5 name="pencil-alt" size={12} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-xl font-sans-bold text-text mt-1">{profile.displayName || 'User'}</Text>
          <Text className="text-sm text-text/60">{profile.email || 'No email'}</Text>
        </View>

        <SectionHeader title="Information & Support" />
        {informationItems.map((item, index) => (
          <ProfileListItem key={`info-${index}`} {...item} />
        ))}

        <View className="px-5 py-8">
             <TouchableOpacity onPress={handleLogout} className="bg-red-500 py-3 rounded-lg active:bg-red-600">
                <Text className="text-white text-center text-lg font-sans-semibold">Logout</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}