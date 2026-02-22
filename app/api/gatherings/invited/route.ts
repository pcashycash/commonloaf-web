import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
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

// GET /api/gatherings/invited?userId={uid}
// Returns upcoming gatherings where the user is in the invitedUsers array.
// Used by the iOS app for the "All Upcoming" section.
// NOTE: Requires a composite Firestore index on:
//   gatherings: invitedUsers ASC, active ASC, start ASC
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId || userId.trim() === "") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const db = getFirestoreInstance();
    const now = Timestamp.now();

    const snap = await getDocs(
      query(
        collection(db, "gatherings"),
        where("invitedUsers", "array-contains", userId),
        where("active", "==", true),
        where("start", ">=", now),
        orderBy("start")
      )
    );

    const gatherings = snap.docs.map((docSnap) => {
      const g = gatheringFromFirestore({ id: docSnap.id, ...docSnap.data() } as any);
      return {
        id: g.id,
        title: g.title,
        start: g.start.toISOString(),
        end: g.end?.toISOString() || null,
        imageURL: g.imageURL || null,
        location: g.location || null,
        attendeeUserIds: g.attendeeUserIds || [],
        attendees: (g.attendees || []).map((a) => ({
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          phoneNumber: a.phoneNumber || null,
        })),
        food: (g.food || []).sort((a, b) => a.order - b.order),
        games: (g.games || []).sort((a, b) => a.order - b.order),
        maxAttendees: g.maxAttendees || null,
        hostUserId: g.hostUserId || null,
        invitedUsers: g.invitedUsers || [],
        allowGatheringShare: g.allowGatheringShare ?? true,
      };
    });

    return NextResponse.json(gatherings);
  } catch (error: any) {
    console.error("Error fetching invited gatherings:", error);
    return NextResponse.json({ error: "Failed to fetch gatherings" }, { status: 500 });
  }
}
