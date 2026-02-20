"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/AuthService";
import GatheringView from "@/app/components/gatherings/GatheringView";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initialAuth = authService.isAuthenticated;
    setIsAuthenticated(initialAuth);
    setIsLoading(false);

    const unsubscribe = authService.onAuthStateChange((authenticated) => {
      setIsAuthenticated(authenticated);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/gatherings");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return <GatheringView />;
}
