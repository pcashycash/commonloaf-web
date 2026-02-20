import { Metadata } from "next";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { gatheringFromFirestore } from "@/lib/models/Gathering";
import GatheringsListView from "./GatheringsListView";

export const metadata: Metadata = {
  title: "Upcoming Dinners – The Common Loaf",
  description: "Browse upcoming home-hosted dinners and reserve your seat.",
};

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

async function getUpcomingPublicGatherings() {
  try {
    const db = getFirestoreInstance();
    const now = Timestamp.now();
    const q = query(
      collection(db, "gatherings"),
      where("active", "==", true),
      where("isPublic", "==", true),
      where("start", ">=", now),
      orderBy("start")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = { id: doc.id, ...doc.data() };
      const g = gatheringFromFirestore(data as any);
      return {
        id: g.id!,
        title: g.title,
        start: g.start.toISOString(),
        imageURL: g.imageURL || null,
        attendeeCount: g.attendeeUserIds.length,
        maxAttendees: g.maxAttendees || null,
        neighborhood: g.location?.neighborhood || null,
      };
    });
  } catch (error) {
    console.error("Error fetching gatherings:", error);
    return [];
  }
}

export default async function GatheringsPage() {
  const gatherings = await getUpcomingPublicGatherings();

  return (
    <div className="min-h-screen bg-[var(--color-secondary-background)]">
      <header className="sticky top-0 z-10 bg-[var(--color-secondary-background)] border-b border-white/10 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-abril), serif" }}
          >
            Common Loaf
          </h1>
          <a
            href="/"
            className="text-sm text-[var(--color-warm-apricot)] underline"
          >
            Sign in
          </a>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold text-white mb-5">Upcoming Dinners</h2>
        <GatheringsListView gatherings={gatherings} />
      </div>
    </div>
  );
}
