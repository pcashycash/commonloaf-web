import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";

// Firebase configuration
// Note: Firebase client-side API keys are safe to expose in the browser.
// They are protected by Firebase Security Rules and Authentication, not by keeping them secret.
const firebaseConfig = {
  apiKey: "AIzaSyCAdK8kpzyEIr_er5oAcmmNROxX_jOETDQ",
  authDomain: "the-common-loaf.firebaseapp.com",
  projectId: "the-common-loaf",
  storageBucket: "the-common-loaf.firebasestorage.app",
  messagingSenderId: "108770179795",
  appId: "1:108770179795:web:c0ef83fc4f8429fa743226",
  measurementId: "G-QVX4BGRB9S",
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
      if (firebaseConfig.measurementId) {
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

