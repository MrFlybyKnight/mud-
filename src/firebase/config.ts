import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web config values are publishable and safe to expose in client code.
// Replace these with the values from your Firebase console (Project settings → General → Your apps).
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "your-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "your-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "your-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "your-app-id",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
