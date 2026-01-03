import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
  deleteUser,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, query, where, getDocs, collection, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { User, userFromFirestore, userToFirestore } from "../models/User";
import { normalizePhoneForAuth, normalizePhoneNumberToDigits } from "../utils/phoneNumber";

export class AuthService {
  private authStateListeners: Set<(authenticated: boolean) => void> = new Set();

  constructor() {
    // Set up auth state listener
    if (typeof window !== "undefined") {
      onAuthStateChanged(auth, (user) => {
        const isAuthenticated = !!user;
        this.notifyAuthStateListeners(isAuthenticated);
      });
    }
  }

  get currentUserId(): string | null {
    return auth.currentUser?.uid || null;
  }

  get isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  onAuthStateChange(callback: (authenticated: boolean) => void): () => void {
    this.authStateListeners.add(callback);
    // Return unsubscribe function
    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  private notifyAuthStateListeners(authenticated: boolean) {
    console.log("🔵 [AuthService v2.1] notifyAuthStateListeners called, authenticated:", authenticated);
    console.log("🔵 Number of listeners:", this.authStateListeners.size);
    // Notify all registered listeners about auth state change
    this.authStateListeners.forEach((callback) => {
      try {
        console.log("🔵 Calling listener callback with:", authenticated);
        callback(authenticated);
      } catch (error) {
        console.error("❌ Error in auth state listener:", error);
      }
    });
  }

  // Manually trigger auth state check (useful after sign-in to ensure UI updates)
  async checkAuthState(): Promise<void> {
    console.log("🔵 [AuthService v2.1] checkAuthState called");
    console.log("🔵 Current auth.currentUser:", auth.currentUser?.uid);
    // Wait a moment for Firebase to update the auth state
    await new Promise(resolve => setTimeout(resolve, 200));
    // Manually notify listeners with the current auth state
    // This ensures the UI updates even if onAuthStateChanged hasn't fired yet
    const isAuth = !!auth.currentUser;
    console.log("🔵 After wait, isAuth:", isAuth);
    console.log("🔵 Number of listeners:", this.authStateListeners.size);
    this.notifyAuthStateListeners(isAuth);
    console.log("✅ Notified listeners");
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<void> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Sign-in successful - trigger auth state check to update UI
      await this.checkAuthState();
      return;
    } catch (error: any) {
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        throw new Error("Invalid email or password");
      }
      if (error.code === "auth/user-not-found") {
        throw new Error("No account found with this email");
      }
      if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address");
      }
      throw error;
    }
  }

  // Keep old method for backward compatibility, but redirect to email-based
  async signInWithPhoneAndPassword(phoneNumber: string, password: string): Promise<void> {
    // For backward compatibility, try to find user by phone and use their email
    const normalizedInputDigits = normalizePhoneNumberToDigits(phoneNumber);
    
    try {
      const allUsersSnapshot = await getDocs(collection(db, "users"));
      const foundUser = allUsersSnapshot.docs.find((doc) => {
        const userData = doc.data();
        const storedPhone = userData.phoneNumber;
        if (!storedPhone) return false;
        const storedDigits = normalizePhoneNumberToDigits(storedPhone);
        return storedDigits === normalizedInputDigits;
      });
      
      if (foundUser) {
        const userData = foundUser.data();
        const userEmail = userData.email;
        if (userEmail) {
          // Use the user's email to sign in
          return await this.signInWithEmailAndPassword(userEmail, password);
        }
      }
      
      throw new Error("No account found with this phone number");
    } catch (error: any) {
      if (error.message.includes("No account found")) {
        throw error;
      }
      throw new Error("Unable to sign in. Please use your email address instead.");
    }
  }

  async createAccountWithEmailAndPassword(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phoneNumber: string
  ): Promise<void> {
    // Check if email already exists
    const emailQuery = query(
      collection(db, "users"),
      where("email", "==", email)
    );
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      throw new Error("An account with this email already exists");
    }

    // Normalize phone number for consistent storage
    const normalizedPhone = normalizePhoneForAuth(phoneNumber);
    
    // Check if phone number already exists (normalized comparison)
    const normalizedInputDigits = normalizePhoneNumberToDigits(phoneNumber);
    const allUsersSnapshot = await getDocs(collection(db, "users"));
    const existingUser = allUsersSnapshot.docs.find((doc) => {
      const userData = doc.data();
      const storedPhone = userData.phoneNumber;
      if (!storedPhone) return false;
      const storedDigits = normalizePhoneNumberToDigits(storedPhone);
      return storedDigits === normalizedInputDigits;
    });
    
    if (existingUser) {
      throw new Error("An account with this phone number already exists");
    }

    // Create account with email
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user record in Firestore
      const user: User = {
        id: result.user.uid,
        email: email,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: normalizedPhone, // Store normalized format
        createdAt: new Date(),
      };
      
      await setDoc(doc(db, "users", result.user.uid), userToFirestore(user));
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        throw new Error("An account with this email already exists");
      }
      if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address");
      }
      throw error;
    }
  }

  // Keep old method for backward compatibility
  async createAccountWithPhoneAndPassword(
    phoneNumber: string,
    password: string,
    firstName: string,
    lastName: string,
    email: string
  ): Promise<void> {
    // Redirect to email-based account creation
    return await this.createAccountWithEmailAndPassword(email, password, firstName, lastName, phoneNumber);
  }

  async resetPasswordWithEmail(email: string): Promise<void> {
    // Look up user by email in Firestore
    const emailQuery = query(
      collection(db, "users"),
      where("email", "==", email)
    );
    const emailSnapshot = await getDocs(emailQuery);
    
    if (emailSnapshot.empty) {
      throw new Error("No account found with this email address");
    }

    const userDoc = emailSnapshot.docs[0];
    const userData = userDoc.data();
    const phoneNumber = userData.phoneNumber;
    
    if (!phoneNumber) {
      throw new Error("Unable to retrieve account information");
    }

    // Try multiple formats for password reset
    const normalizedPhone = normalizePhoneForAuth(phoneNumber);
    const normalizedDigits = normalizePhoneNumberToDigits(phoneNumber);
    // Remove + from email format (emails can't start with +)
    const phoneForEmail = normalizedPhone.replace(/^\+/, ""); // Remove leading +
    const emailFormats = [
      `${phoneForEmail}@phoneauth.com`,
      `${normalizedDigits}@phoneauth.com`,
      `${phoneNumber.replace(/\D/g, "")}@phoneauth.com`,
    ];
    
    let lastError: any = null;
    for (const authEmail of emailFormats) {
      try {
        await sendPasswordResetEmail(auth, authEmail);
        return; // Success
      } catch (error: any) {
        lastError = error;
        if (error.code === "auth/user-not-found") {
          continue; // Try next format
        }
        // For other errors, break
        break;
      }
    }
    
    if (lastError) {
      if (lastError.code === "auth/user-not-found") {
        throw new Error("No account found with this email address");
      }
      throw lastError;
    }
    
    throw new Error("No account found with this email address");
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  async deleteAccount(password: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error("No user is currently signed in");
    }

    // Re-authenticate
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    const userId = user.uid;

    // Mark user as deleted in Firestore
    await updateDoc(doc(db, "users", userId), {
      isDeleted: true,
      phoneNumber: "",
    });

    // Remove user from all future gatherings
    const now = Timestamp.now();
    const futureGatheringsQuery = query(
      collection(db, "gatherings"),
      where("active", "==", true),
      where("start", ">", now),
      where("attendeeUserIds", "array-contains", userId)
    );
    
    const snapshot = await getDocs(futureGatheringsQuery);
    const batch = snapshot.docs.map((docRef) => {
      const data = docRef.data();
      const updatedAttendees = (data.attendeeUserIds || []).filter((id: string) => id !== userId);
      return updateDoc(docRef.ref, { attendeeUserIds: updatedAttendees });
    });
    
    await Promise.all(batch);

    // Delete from Firebase Auth
    await deleteUser(user);
  }
}

export const authService = new AuthService();

