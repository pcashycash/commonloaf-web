import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import {
  normalizePhoneNumber,
  normalizePhoneNumberToDigits,
} from "@/lib/utils/phoneNumber";

function getFirestoreInstance() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return getFirestore(app);
}

// POST /api/auth/verify-phone
// Looks up a user by phone number in Firestore.
// Returns the userId if a matching account is found.
// Body: { "phoneNumber": "+15551234567" }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = body.phoneNumber;

    if (!raw || typeof raw !== "string") {
      return NextResponse.json(
        { error: "Missing phoneNumber" },
        { status: 400 }
      );
    }

    const phoneNumber = normalizePhoneNumber(raw);
    const inputDigits = normalizePhoneNumberToDigits(phoneNumber);

    if (inputDigits.length < 10) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    const db = getFirestoreInstance();
    const snapshot = await getDocs(collection(db, "users"));
    let userId: string | null = null;

    for (const doc of snapshot.docs) {
      const stored = doc.data().phoneNumber;
      if (!stored) continue;

      const normalizedStored = normalizePhoneNumber(stored);
      if (normalizedStored === phoneNumber) {
        userId = doc.id;
        break;
      }

      const storedDigits = normalizePhoneNumberToDigits(normalizedStored);
      if (
        inputDigits.length >= 10 &&
        inputDigits.slice(-10) === storedDigits.slice(-10)
      ) {
        userId = doc.id;
        break;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No account found for this phone number." },
        { status: 404 }
      );
    }

    return NextResponse.json({ userId });
  } catch (error: any) {
    console.error("[auth/verify-phone] Error:", error?.message || error);
    return NextResponse.json(
      { error: "Could not verify phone number" },
      { status: 500 }
    );
  }
}
