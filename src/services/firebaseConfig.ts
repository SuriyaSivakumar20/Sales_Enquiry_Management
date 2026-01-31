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
  } else {
    console.warn("FIREBASE_CONFIG environment variable is missing. App will default to offline mode.");
  }
} catch (e) {
  console.error("Failed to parse FIREBASE_CONFIG from environment", e);
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