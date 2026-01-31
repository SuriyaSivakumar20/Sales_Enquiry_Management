/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

let firebaseConfig = {};

try {
  // @ts-ignore
  const envConfig = process.env.FIREBASE_CONFIG;
  if (envConfig) {
    firebaseConfig = typeof envConfig === 'string' ? JSON.parse(envConfig) : envConfig;
    console.log("Firebase Config loaded from environment.");
  }

  // Fallback: Check for VITE_ env vars
  if (Object.keys(firebaseConfig).length === 0 && import.meta.env.VITE_FIREBASE_API_KEY) {
    firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
    console.log("Firebase Config loaded from VITE_ environment variables.");
  }

  if (Object.keys(firebaseConfig).length === 0) {
    console.warn("FIREBASE_CONFIG and VITE_FIREBASE_* environment variables are missing. App will default to offline mode.");
  }
} catch (e) {
  console.error("Failed to parse Firebase Configuration", e);
}

let app;
let db: any;
let auth: any;
let storage: any;

try {
  if (Object.keys(firebaseConfig).length > 0) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  } else {
    // Fallback for purely offline scenarios if config is missing
    db = {};
    auth = {};
    storage = {};
  }
} catch (e) {
  console.error("Firebase Initialization Error:", e);
  db = {};
  auth = {};
  storage = {};
}

export { db, auth, storage, firebaseConfig };