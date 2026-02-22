import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { gatheringFromFirestore } from "@/lib/models/Gathering";

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

// GET /api/gatherings/by-host?hostUserId={uid}
// Returns upcoming public gatherings hosted by the given user.
// Used by the iMessage extension to show the host their upcoming dinners.
// Query uses isPublic==true so Firestore unauthenticated reads are permitted.
// NOTE: Requires a composite Firestore index on:
//   gatherings: hostUserId ASC, active ASC, isPublic ASC, start ASC
export async function GET(request: NextRequest) {
  const hostUserId = request.nextUrl.searchParams.get("hostUserId");

  if (!hostUserId || hostUserId.trim() === "") {
    return NextResponse.json({ error: "Missing hostUserId" }, { status: 400 });
  }

  try {
    const db = getFirestoreInstance();
    const now = Timestamp.now();

    const q = query(
      collection(db, "gatherings"),
      where("hostUserId", "==", hostUserId),
      where("active", "==", true),
      where("isPublic", "==", true),
      where("start", ">=", now),
      orderBy("start")
    );

    const snapshot = await getDocs(q);
    const gatherings = snapshot.docs.map((doc) => {
      const data = { id: doc.id, ...doc.data() };
      const g = gatheringFromFirestore(data as any);
      return {
        id: g.id,
        title: g.title,
        start: g.start.toISOString(),
        imageURL: g.imageURL || null,
        attendeeCount: (g.attendees || []).length,
        maxAttendees: g.maxAttendees || null,
        neighborhood: g.location?.neighborhood || null,
      };
    });

    return NextResponse.json(gatherings);
  } catch (error: any) {
    console.error("Error fetching gatherings by host:", error);
    // If Firestore returns a missing index error, the message contains a link to create it
    return NextResponse.json({ error: "Failed to fetch gatherings" }, { status: 500 });
  }
}
