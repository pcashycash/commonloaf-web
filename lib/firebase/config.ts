import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";

// Firebase configuration - loaded from environment variables
// Note: Firebase client-side API keys are safe to expose in the browser.
// They are protected by Firebase Security Rules and Authentication, not by keeping them secret.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      
      // Initialize Analytics only in browser and if measurementId is provided
      if (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
        try {
          analytics = getAnalytics(app);
        } catch (error) {
          // Analytics might fail in development or if not properly configured
          console.warn("Firebase Analytics initialization failed:", error);
        }
      }
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    throw error;
  }
}

export { app, auth, db, analytics };

