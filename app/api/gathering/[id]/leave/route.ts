import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  runTransaction,
  arrayRemove,
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

// POST /api/gathering/[id]/leave
// Body: { userId: string }
// Removes the user from the gathering's attendeeUserIds and attendees arrays.
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

    const gatheringRef = doc(db, "gatherings", id);
    const gatheringSnap = await getDoc(gatheringRef);

    if (!gatheringSnap.exists()) {
      return NextResponse.json({ error: "Gathering not found" }, { status: 404 });
    }

    const data = gatheringSnap.data();
    const currentIds: string[] = data.attendeeUserIds || [];

    if (!currentIds.includes(userId)) {
      return NextResponse.json({ success: true, message: "Not attending" });
    }

    // Find the attendee entry to remove (arrayRemove requires exact object match)
    const attendees: any[] = data.attendees || [];
    const attendeeEntry = attendees.find((a) => a.id === userId);

    await runTransaction(db, async (transaction) => {
      const freshSnap = await transaction.get(gatheringRef);
      if (!freshSnap.exists()) throw new Error("Gathering not found");

      transaction.update(gatheringRef, {
        attendeeUserIds: arrayRemove(userId),
        ...(attendeeEntry ? { attendees: arrayRemove(attendeeEntry) } : {}),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error leaving gathering:", error);
    return NextResponse.json({ error: "Failed to leave gathering" }, { status: 500 });
  }
}
