// File: app/editProfile.tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, Alert,
  ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestoreDB, storage } from '../firebaseConfig'; // Ensure storage is exported
import { useAuth } from './_layout'; // Path to root _layout
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // deleteObject not strictly needed for overwrite

// Assuming UserProfile type is in types/index.ts and includes photoStoragePath
// import { UserProfile } from '../../types'; // Adjust path if necessary

export default function EditProfileScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null); // For current display
  // const [currentStoragePath, setCurrentStoragePath] = useState<string | null>(null); // Less critical if always overwriting 'profile.jpg'
  const [newImageUri, setNewImageUri] = useState<string | null>(null); // Local URI of newly picked image
  const [email, setEmail] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (authUser) {
      setIsLoading(true);
      setDisplayName(authUser.displayName || '');
      setCurrentPhotoURL(authUser.photoURL || null);
      setEmail(authUser.email || 'No email provided');

      const fetchFirestoreData = async () => {
        try {
          const userDocRef = doc(firestoreDB, "users", authUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const firestoreData = userDocSnap.data(); // as UserProfile
            setDisplayName(firestoreData.displayName || authUser.displayName || '');
            setCurrentPhotoURL(firestoreData.photoURL || authUser.photoURL || null);
            // setCurrentStoragePath(firestoreData.photoStoragePath || null); // Still good to have if you ever need the path
          }
        } catch (error) {
          console.error("Error fetching user data for edit:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchFirestoreData();
    } else {
      setIsLoading(false);
      Alert.alert("Error", "No authenticated user found.");
      if (router.canGoBack()) router.back(); else router.replace('/(auth)/login');
    }
  }, [authUser, router]); // Added router to dependency array

  const handleChoosePhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access photos is needed to change your profile picture.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewImageUri(result.assets[0].uri);
      // setCurrentPhotoURL(result.assets[0].uri); // Optimistic display handled by Image source logic
    }
  };

  const uploadImageAsync = async (uri: string): Promise<{ downloadURL: string; storagePath: string } | null> => {
    if (!authUser) return null;
    setIsUploading(true);

    const fileName = `profile.jpg`; // Consistent filename for overwriting
    const newStoragePath = `profilePictures/${authUser.uid}/${fileName}`;
    const imageRef = ref(storage, newStoragePath);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadTask = uploadBytesResumable(imageRef, blob);

      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
          },
          (error) => {
            console.error("Upload failed:", error);
            setIsUploading(false);
            reject(error);
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              console.log('File available at', downloadURL);
              setIsUploading(false);
              resolve({ downloadURL, storagePath: newStoragePath });
            }).catch((err) => {
                console.error("Error getting download URL:", err);
                setIsUploading(false);
                reject(err);
            });
          }
        );
      });
    } catch (e) {
      console.error("Error in uploadImageAsync preparing upload:", e);
      Alert.alert("Upload Error", "Could not prepare image for upload.");
      setIsUploading(false);
      return null;
    }
  };

  const handleSaveChanges = async () => {
    if (!authUser) { Alert.alert("Error", "Authentication error."); return; }
    if (!displayName.trim()) { Alert.alert("Validation Error", "Display name cannot be empty."); return; }

    setIsSaving(true);
    // Get the photoURL that Auth currently has. If new image picked, this will be replaced.
    let finalPhotoURL = authUser.photoURL;
    // The storage path will always be the consistent one if an image is set.
    let finalStoragePath: string | null = `profilePictures/${authUser.uid}/profile.jpg`;

    try {
      if (newImageUri) {
        const uploadResult = await uploadImageAsync(newImageUri);
        if (uploadResult) {
          finalPhotoURL = uploadResult.downloadURL;
          finalStoragePath = uploadResult.storagePath; // This will be the consistent path
        } else {
          // If upload failed, we don't update photoURL or photoStoragePath
          // User can try saving other changes or try image upload again.
          Alert.alert("Image Upload Failed", "Profile name changes will be saved, but the image could not be uploaded.");
          finalPhotoURL = currentPhotoURL; // Revert to initially loaded or authUser's photoURL
          // finalStoragePath will remain the consistent path, or null if no image before
          const userDocForPath = doc(firestoreDB, "users", authUser.uid);
          const userSnapForPath = await getDoc(userDocForPath);
          finalStoragePath = userSnapForPath.data()?.photoStoragePath || null;
        }
      } else if (!currentPhotoURL && authUser.photoURL) {
        // This case is if the user had a photo, cleared it (not implemented), and we want to remove it.
        // For now, if no new image, we keep the existing photoURL from authUser.
        // If you implement a "remove photo" feature, you'd set finalPhotoURL and finalStoragePath to null here.
        // And also call deleteObject for finalStoragePath.
      }
      if(!finalPhotoURL) finalStoragePath = null; // If no photoURL, no storage path.


      await updateProfile(authUser, {
        displayName: displayName.trim(),
        photoURL: finalPhotoURL,
      });

      const userDocRef = doc(firestoreDB, "users", authUser.uid);
      await updateDoc(userDocRef, {
        displayName: displayName.trim(),
        photoURL: finalPhotoURL,
        photoStoragePath: finalStoragePath,
      });

      Alert.alert("Profile Updated", "Your profile has been successfully updated.");
      setNewImageUri(null);
      setCurrentPhotoURL(finalPhotoURL); // Update displayed photoURL
      router.back();

    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Update Error", error.message || "Could not update profile.");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="bg-primary px-5 py-4 flex-row items-center shadow-md">
          <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
            <FontAwesome5 name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-xl text-white font-sans-bold">Edit Profile</Text>
        </View>

        <View className="p-6 flex-1">
          <View className="items-center mb-8">
            <View className="relative">
              <Image
                source={newImageUri ? { uri: newImageUri } : (currentPhotoURL ? { uri: currentPhotoURL } : require('../assets/images/default-avatar.jpg'))}
                className="w-32 h-32 rounded-full border-4 border-primary mb-2"
              />
              <TouchableOpacity
                onPress={handleChoosePhoto}
                disabled={isSaving || isUploading}
                className="absolute bottom-1 right-1 bg-primary p-3 rounded-full border-2 border-white active:bg-indigo-700"
              >
                {isUploading ? <ActivityIndicator size="small" color="white" /> : <FontAwesome5 name="camera" size={16} color="white" />}
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-sans-medium text-text/80 mb-1 ml-1">Display Name</Text>
            <TextInput
              className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-4 focus:border-primary"
              placeholder="Enter your display name"
              value={displayName}
              onChangeText={setDisplayName}
              editable={!isSaving && !isUploading}
            />
          </View>

          <View className="mb-8">
            <Text className="text-sm font-sans-medium text-text/80 mb-1 ml-1">Email (cannot be changed here)</Text>
            <TextInput
              className="bg-light-200 border border-light-300 text-text/70 text-base rounded-lg p-4"
              value={email}
              editable={false}
            />
          </View>
        </View>
      </ScrollView>

      <View className="px-6 pb-6 border-t border-light-200 pt-4 bg-background">
        <TouchableOpacity
          className={`py-4 rounded-lg ${(isSaving || isUploading) ? 'bg-primary/50' : 'bg-primary active:bg-indigo-700'}`}
          onPress={handleSaveChanges}
          disabled={isSaving || isUploading}
        >
          {(isSaving || isUploading) ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-center text-lg font-sans-semibold">Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}