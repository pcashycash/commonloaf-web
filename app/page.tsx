"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/AuthService";
import SignInView from "@/app/components/auth/SignInView";
import GatheringView from "@/app/components/gatherings/GatheringView";

export default function Home() {
  console.log("🔵 [Home v2.0] Component render, isAuthenticated:", false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("🔵 [Home v2.0] Setting up auth state listener");
    // Check initial auth state
    const initialAuth = authService.isAuthenticated;
    console.log("🔵 Initial auth state:", initialAuth);
    setIsAuthenticated(initialAuth);
    setIsLoading(false);

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((authenticated) => {
      console.log("🔵 [Home v2.0] Auth state changed to:", authenticated);
      setIsAuthenticated(authenticated);
    });

    return () => {
      console.log("🔵 [Home v2.0] Cleaning up auth state listener");
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-secondary-text)]">Loading...</p>
        </div>
      </div>
    );
  }

  console.log("🔵 [Home v2.0] Render check - isAuthenticated:", isAuthenticated, "isLoading:", isLoading);

  if (!isAuthenticated) {
    console.log("🔵 [Home v2.0] Rendering SignInView");
    return <SignInView />;
  }

  console.log("🔵 [Home v2.0] Rendering GatheringView");
  return <GatheringView />;
}
