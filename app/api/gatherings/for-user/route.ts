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

// GET /api/gatherings/for-user?userId={uid}
// Returns upcoming gatherings where the user is either the host or an attendee.
// Used by the iOS app for the "My Schedule" section.
// Performs two Firestore queries (host + attendee) and merges/deduplicates.
// NOTE: Requires composite Firestore indexes on:
//   gatherings: hostUserId ASC, active ASC, start ASC
//   gatherings: attendeeUserIds ASC, active ASC, start ASC
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId || userId.trim() === "") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const db = getFirestoreInstance();
    const now = Timestamp.now();

    const [hostSnap, attendeeSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "gatherings"),
          where("hostUserId", "==", userId),
          where("active", "==", true),
          where("start", ">=", now),
          orderBy("start")
        )
      ),
      getDocs(
        query(
          collection(db, "gatherings"),
          where("attendeeUserIds", "array-contains", userId),
          where("active", "==", true),
          where("start", ">=", now),
          orderBy("start")
        )
      ),
    ]);

    const seen = new Set<string>();
    const results: ReturnType<typeof toPreview>[] = [];

    for (const snap of [hostSnap, attendeeSnap]) {
      for (const doc of snap.docs) {
        if (seen.has(doc.id)) continue;
        seen.add(doc.id);
        const g = gatheringFromFirestore({ id: doc.id, ...doc.data() } as any);
        results.push(toPreview(g));
      }
    }

    results.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error fetching gatherings for user:", error);
    return NextResponse.json({ error: "Failed to fetch gatherings" }, { status: 500 });
  }
}

function toPreview(g: ReturnType<typeof gatheringFromFirestore>) {
  return {
    id: g.id,
    title: g.title,
    start: g.start.toISOString(),
    imageURL: g.imageURL || null,
    attendeeCount: g.attendeeUserIds.length,
    maxAttendees: g.maxAttendees || null,
    neighborhood: g.location?.neighborhood || null,
  };
}
