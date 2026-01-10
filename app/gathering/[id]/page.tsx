import { Metadata } from "next";
import GatheringSharePage from "./GatheringSharePage";
import { gatheringFromFirestore } from "@/lib/models/Gathering";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";

// Initialize Firebase for server-side use
function getFirestoreInstance() {
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
  return getFirestore(app);
}

// Server-side function to fetch gathering data for metadata
async function getGatheringData(id: string) {
  try {
    const db = getFirestoreInstance();
    const gatheringDoc = await getDoc(doc(db, "gatherings", id));
    
    if (!gatheringDoc.exists()) {
      return null;
    }

    const data = { id: gatheringDoc.id, ...gatheringDoc.data() };
    const gathering = gatheringFromFirestore(data as any);
    
    // Return gathering in the format expected by GatheringSharePage
    return {
      id: gathering.id,
      title: gathering.title,
      start: gathering.start,
      end: gathering.end || undefined,
      imageURL: gathering.imageURL || undefined,
      description: gathering.description || undefined,
      locationId: gathering.locationId || undefined,
      attendeeUserIds: gathering.attendeeUserIds || [],
      maxAttendees: gathering.maxAttendees || undefined,
      isPublic: gathering.isPublic ?? true,
    };
  } catch (error) {
    console.error("Error fetching gathering:", error);
    return null;
  }
}

// Generate metadata for rich link previews (Open Graph, Twitter Cards, etc.)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const gathering = await getGatheringData(id);

  if (!gathering) {
    return {
      title: "Gathering Not Found",
      description: "This gathering could not be found.",
    };
  }

  // Format date for description
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dateString = dateFormatter.format(gathering.start);

  // Create description
  const description = gathering.description 
    ? `${gathering.description}\n\n📅 ${dateString}`
    : `Join us at ${gathering.title} on ${dateString}`;

  // Get image URL (use gathering image if available, otherwise fallback)
  const imageURL = gathering.imageURL || "https://the-common-loaf.web.app/commonloaf-logo.png";

  // Get current URL for Open Graph
  const baseURL = process.env.NEXT_PUBLIC_WEB_URL 
    ? process.env.NEXT_PUBLIC_WEB_URL 
    : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : "https://the-common-loaf.vercel.app"; // Fallback domain
  const currentURL = `${baseURL}/gathering/${id}`;

  return {
    title: gathering.title,
    description: description,
    openGraph: {
      title: gathering.title,
      description: description,
      images: [
        {
          url: imageURL,
          width: 1200,
          height: 630,
          alt: gathering.title,
        },
      ],
      url: currentURL,
      type: "website",
      siteName: "The Common Loaf",
    },
    twitter: {
      card: "summary_large_image",
      title: gathering.title,
      description: description,
      images: [imageURL],
    },
    // Apple / Messages meta tags
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
    },
    other: {
      "apple-itunes-app": `app-argument=thecommonloaf://gathering/${id}`,
    },
  };
}

// Server component page
export default async function GatheringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gathering = await getGatheringData(id);

  if (!gathering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Gathering Not Found</h1>
          <p className="text-gray-600">This gathering could not be found.</p>
        </div>
      </div>
    );
  }

  // Client component handles the redirect and UI
  return <GatheringSharePage gathering={gathering} gatheringId={id} />;
}

