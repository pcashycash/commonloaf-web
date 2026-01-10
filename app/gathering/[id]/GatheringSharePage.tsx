"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils/dateFormatter";

interface GatheringSharePageProps {
  gathering: {
    id?: string;
    title: string;
    start: Date;
    end?: Date;
    imageURL?: string;
    description?: string;
    locationId?: string;
    attendeeUserIds: string[];
    maxAttendees?: number;
    isPublic: boolean;
  };
  gatheringId: string;
}

export default function GatheringSharePage({ gathering, gatheringId }: GatheringSharePageProps) {
  const [redirecting, setRedirecting] = useState(true);
  const deepLinkURL = `thecommonloaf://gathering/${gatheringId}`;

  useEffect(() => {
    // Detect if user is on iOS
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // On iOS, try to redirect to deep link immediately
    if (isIOS) {
      // Try to open the app
      window.location.href = deepLinkURL;
      
      // Fallback: if app doesn't open within 1 second, show the page
      const timer = setTimeout(() => {
        setRedirecting(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      // On other platforms, show the page with a link
      setRedirecting(false);
    }
  }, [deepLinkURL]);

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Opening in Common Loaf app...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Image */}
        {gathering.imageURL && (
          <div className="w-full aspect-video relative">
            <img
              src={gathering.imageURL}
              alt={gathering.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">{gathering.title}</h1>
          
          {gathering.description && (
            <p className="text-gray-600">{gathering.description}</p>
          )}
          
          <div className="flex items-center gap-2 text-gray-600">
            <span>📅</span>
            <span>{formatDate(gathering.start)}</span>
          </div>
          
          {/* Open in App Button */}
          <a
            href={deepLinkURL}
            className="block w-full mt-6 py-3 px-6 bg-blue-600 text-white text-center rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Open in Common Loaf App
          </a>
          
          {/* Fallback message */}
          <p className="text-sm text-gray-500 text-center mt-4">
            Don't have the app?{" "}
            <a href="https://apps.apple.com/app/the-common-loaf" className="text-blue-600 underline">
              Download from the App Store
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

