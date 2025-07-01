// File: app/editProfile.tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, Alert,
  ActivityIndicator, ScrollView, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { updateProfile, updatePassword } from 'firebase/auth'; 
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestoreDB, storage } from '../firebaseConfig';
import { useAuth } from './_layout';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";


export default function EditProfileScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();


  const [displayName, setDisplayName] = useState('');
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

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
            const firestoreData = userDocSnap.data();
            setDisplayName(firestoreData.displayName || authUser.displayName || '');
            setCurrentPhotoURL(firestoreData.photoURL || authUser.photoURL || null);
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
  }, [authUser, router]);
  
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
    }
  };

  const uploadImageAsync = async (uri: string): Promise<{ downloadURL: string; storagePath: string } | null> => {
     if (!authUser) return null;
     setIsUploading(true);
     const fileName = `profile.jpg`; 
     const newStoragePath = `profilePictures/${authUser.uid}/${fileName}`;
     const imageRef = ref(storage, newStoragePath);
     try {
       const response = await fetch(uri);
       const blob = await response.blob();
       const uploadTask = uploadBytesResumable(imageRef, blob);
       return new Promise((resolve, reject) => {
         uploadTask.on('state_changed',
           (snapshot) => console.log('Upload is ' + (snapshot.bytesTransferred / snapshot.totalBytes) * 100 + '% done'),
           (error) => { setIsUploading(false); reject(error); },
           () => {
             getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
               setIsUploading(false);
               resolve({ downloadURL, storagePath: newStoragePath });
             }).catch((err) => { setIsUploading(false); reject(err); });
           }
         );
       });
     } catch {
       Alert.alert("Upload Error", "Could not prepare image for upload.");
       setIsUploading(false);
       return null;
     }
  };


  const handleSaveChanges = async () => {
    if (!authUser) { Alert.alert("Error", "Authentication error."); return; }
    if (!displayName.trim()) { Alert.alert("Validation Error", "Display name cannot be empty."); return; }
    
    const isChangingPassword = newPassword.trim() !== '';

    if (isChangingPassword) {
      if (newPassword.length < 6) {
        Alert.alert("Password Too Weak", "New password must be at least 6 characters long.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        Alert.alert("Passwords Do Not Match", "The new password and confirmation password do not match.");
        return;
      }

      Alert.alert(
        "Confirm Password Change",
        "Are you sure you want to change your password? This action is irreversible.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Change It", style: 'destructive', onPress: () => proceedWithSave(true) }
        ]
      );
    } else {
      proceedWithSave(false);
    }
  };

  const proceedWithSave = async (isChangingPassword: boolean) => {
    if (!authUser) return;

    setIsSaving(true);
    let finalPhotoURL = currentPhotoURL;

    try {
      if (newImageUri) {
        const uploadResult = await uploadImageAsync(newImageUri);
        if (uploadResult) {
          finalPhotoURL = uploadResult.downloadURL;
        } else {
          Alert.alert("Image Upload Failed", "Profile name changes will be saved, but the image could not be uploaded.");
        }
      }

      if (isChangingPassword) {
        await updatePassword(authUser, newPassword);

      }
      
      await updateProfile(authUser, {
        displayName: displayName.trim(),
        photoURL: finalPhotoURL,
      });

      const userDocRef = doc(firestoreDB, "users", authUser.uid);
      await updateDoc(userDocRef, {
        displayName: displayName.trim(),
        photoURL: finalPhotoURL,
      });

      const successMessage = isChangingPassword 
        ? "Your profile and password have been updated." 
        : "Your profile has been successfully updated.";
      
      Alert.alert("Success", successMessage, [
        { text: "OK", onPress: () => router.back() }
      ]);
      
      setNewImageUri(null);
      setCurrentPhotoURL(finalPhotoURL);
      
    } catch (error: any) {
      console.error("Error updating profile:", error);
      let errorMessage = "Could not update profile.";
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = "This is a sensitive action. Please log out and log back in before changing your password.";
      }
      Alert.alert("Update Error", errorMessage);
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
            <Text className="text-sm font-sans-medium text-text/80 mb-1 ml-1">Email (cannot be changed)</Text>
            <TextInput
              className="bg-light-200 border border-light-300 text-text/70 text-base rounded-lg p-4"
              value={email}
              editable={false}
            />
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Change Password (Optional)</Text>
            <View style={styles.divider} />
          </View>

          <View className="mb-5">
            <Text className="text-sm font-sans-medium text-text/80 mb-1 ml-1">New Password</Text>
            <TextInput
              className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-4 focus:border-primary"
              placeholder="Enter new password (min. 6 characters)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!isSaving && !isUploading}
            />
          </View>
          <View className="mb-8">
            <Text className="text-sm font-sans-medium text-text/80 mb-1 ml-1">Confirm New Password</Text>
            <TextInput
              className="bg-light-100 border border-light-300 text-text text-base rounded-lg p-4 focus:border-primary"
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
              editable={!isSaving && !isUploading}
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


const styles = StyleSheet.create({
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        marginHorizontal: 10,
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
});