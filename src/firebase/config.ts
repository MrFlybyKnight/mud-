import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web config values are publishable and safe to expose in client code.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDuCJqGwCsgIdivPbBQniVgeSlecxO4KKw",
  authDomain: "mudring-da8f5.firebaseapp.com",
  projectId: "mudring-da8f5",
  storageBucket: "mudring-da8f5.firebasestorage.app",
  messagingSenderId: "320164124777",
  appId: "1:320164124777:web:1523383de4e5287aceaaf8",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
