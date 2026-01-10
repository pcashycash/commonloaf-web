import { NextResponse, NextRequest } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { gatheringFromFirestore } from "@/lib/models/Gathering";

// Server-side API route to fetch gathering data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Initialize Firebase app if not already initialized
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);

    // Fetch gathering from Firestore
    const gatheringDoc = await getDoc(doc(db, "gatherings", id));
    
    if (!gatheringDoc.exists()) {
      return NextResponse.json({ error: "Gathering not found" }, { status: 404 });
    }

    const data = { id: gatheringDoc.id, ...gatheringDoc.data() };
    const gathering = gatheringFromFirestore(data as any);
    
    // Convert to JSON-serializable format
    const gatheringJSON = {
      id: gathering.id,
      title: gathering.title,
      start: gathering.start.toISOString(),
      end: gathering.end?.toISOString() || null,
      imageURL: gathering.imageURL,
      description: gathering.description,
      locationId: gathering.locationId,
      attendeeUserIds: gathering.attendeeUserIds || [],
      maxAttendees: gathering.maxAttendees,
      isPublic: gathering.isPublic ?? true,
    };

    return NextResponse.json(gatheringJSON);
  } catch (error: any) {
    console.error("Error fetching gathering:", error);
    return NextResponse.json(
      { error: "Failed to fetch gathering", message: error.message },
      { status: 500 }
    );
  }
}

