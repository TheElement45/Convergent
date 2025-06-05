// File: firebaseConfig.ts

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'; 
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence, 
  Auth
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let firestoreDB: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);

    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) 
    });

  } catch (error) {
    console.error("Error initializing Firebase app or Auth: ", error);
    app = getApp();
    auth = getAuth(app);
  }
} else {
  app = getApp();
  auth = getAuth(app);
}

firestoreDB = getFirestore(app);
storage = getStorage(app);

export { app, auth, firestoreDB, storage };

