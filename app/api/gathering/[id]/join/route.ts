import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  runTransaction,
  arrayUnion,
} from "firebase/firestore";

function getFirestoreInstance() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return getFirestore(app);
}

// POST /api/gathering/[id]/join
// Body: { userId: string }
// Adds the user to the gathering's attendeeUserIds and attendees arrays.
// Uses a Firestore transaction to prevent race conditions.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let userId: string;
  try {
    const body = await request.json();
    userId = body.userId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!userId || userId.trim() === "") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const db = getFirestoreInstance();

    const [gatheringDoc, userDoc] = await Promise.all([
      getDoc(doc(db, "gatherings", id)),
      getDoc(doc(db, "users", userId)),
    ]);

    if (!gatheringDoc.exists()) {
      return NextResponse.json({ error: "Gathering not found" }, { status: 404 });
    }
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const gatheringData = gatheringDoc.data();
    const userData = userDoc.data();

    const maxAttendees: number | undefined = gatheringData.maxAttendees;
    const currentIds: string[] = gatheringData.attendeeUserIds || [];

    if (currentIds.includes(userId)) {
      return NextResponse.json({ success: true, message: "Already attending" });
    }

    if (maxAttendees && currentIds.length >= maxAttendees) {
      return NextResponse.json({ error: "Gathering is full" }, { status: 409 });
    }

    const attendeeEntry = {
      id: userId,
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      phoneNumber: userData.phoneNumber || "",
    };

    await runTransaction(db, async (transaction) => {
      const freshRef = doc(db, "gatherings", id);
      const freshSnap = await transaction.get(freshRef);
      if (!freshSnap.exists()) throw new Error("Gathering not found");

      const freshIds: string[] = freshSnap.data().attendeeUserIds || [];
      if (freshIds.includes(userId)) return; // Already added, no-op

      if (maxAttendees && freshIds.length >= maxAttendees) {
        throw new Error("Gathering is full");
      }

      transaction.update(freshRef, {
        attendeeUserIds: arrayUnion(userId),
        attendees: arrayUnion(attendeeEntry),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Gathering is full") {
      return NextResponse.json({ error: "Gathering is full" }, { status: 409 });
    }
    console.error("Error joining gathering:", error);
    return NextResponse.json({ error: "Failed to join gathering" }, { status: 500 });
  }
}
