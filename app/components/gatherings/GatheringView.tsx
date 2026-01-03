"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { firestoreService } from "@/lib/services/FirestoreService";
import { authService } from "@/lib/services/AuthService";
import { Gathering } from "@/lib/models/Gathering";
import { Location } from "@/lib/models/Location";
import { Recipe } from "@/lib/models/Recipe";
import { User } from "@/lib/models/User";
import { dayLabel, timeLabel } from "@/lib/utils/dateFormatter";
import { isUnlimited, spotsRemaining, isFull } from "@/lib/models/Gathering";
import { displayNeighborhood, displayAddress } from "@/lib/models/Location";
import { ALL_COUNTRIES } from "@/lib/models/Country";
import GatheringDetailView from "./GatheringDetailView";

export default function GatheringView() {
  const [gatherings, setGatherings] = useState<Gathering[]>([]);
  const [myGatherings, setMyGatherings] = useState<Gathering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedGathering, setSelectedGathering] = useState<Gathering | null>(null);
  const [locationsById, setLocationsById] = useState<Record<string, Location>>({});
  const [recipesById, setRecipesById] = useState<Record<string, Recipe>>({});
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [countryFlagLookup, setCountryFlagLookup] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Fetch upcoming gatherings
      const upcoming = await firestoreService.fetchUpcomingGatherings();
      setGatherings(upcoming);

      // Load locations
      const locationIds = [...new Set(upcoming.map((g) => g.locationId).filter(Boolean) as string[])];
      if (locationIds.length > 0) {
        const locations = await firestoreService.fetchLocations(locationIds);
        const locationsMap: Record<string, Location> = {};
        locations.forEach((loc) => {
          if (loc.id) locationsMap[loc.id] = loc;
        });
        setLocationsById(locationsMap);
      }

      // Load recipes
      const recipeIds = [...new Set(upcoming.flatMap((g) => g.menu.map((m) => m.recipeId)))];
      if (recipeIds.length > 0) {
        const recipes = await firestoreService.fetchRecipes(recipeIds);
        const recipesMap: Record<string, Recipe> = {};
        recipes.forEach((recipe) => {
          if (recipe.id) recipesMap[recipe.id] = recipe;
        });
        setRecipesById(recipesMap);
      }

      // Load country flags
      const flagLookup: Record<string, string> = {};
      ALL_COUNTRIES.forEach((country) => {
        flagLookup[country.id.toLowerCase()] = country.flagEmoji;
      });
      setCountryFlagLookup(flagLookup);

      // Find user's gatherings
      const userId = authService.currentUserId;
      if (userId) {
        const myGatheringsList = upcoming.filter((g) => g.attendeeUserIds.includes(userId));
        setMyGatherings(myGatheringsList);

        // Load users for attendees
        const allAttendeeIds = [...new Set(upcoming.flatMap((g) => g.attendeeUserIds))];
        if (allAttendeeIds.length > 0) {
          const users = await firestoreService.fetchUsers(allAttendeeIds);
          const usersMap: Record<string, User> = {};
          users.forEach((user) => {
            if (user.id) usersMap[user.id] = user;
          });
          setUsersById(usersMap);
        }
      } else {
        setMyGatherings([]);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to load gatherings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGatheringUpdate = (updatedGathering: Gathering) => {
    setGatherings((prev) =>
      prev.map((g) => (g.id === updatedGathering.id ? updatedGathering : g))
    );
    const userId = authService.currentUserId;
    if (userId) {
      const isRegistered = updatedGathering.attendeeUserIds.includes(userId);
      setMyGatherings((prev) => {
        if (isRegistered) {
          const exists = prev.some((g) => g.id === updatedGathering.id);
          if (exists) {
            return prev.map((g) => (g.id === updatedGathering.id ? updatedGathering : g));
          } else {
            return [...prev, updatedGathering].sort((a, b) => a.start.getTime() - b.start.getTime());
          }
        } else {
          return prev.filter((g) => g.id !== updatedGathering.id);
        }
      });
    }
  };

  if (selectedGathering) {
    return (
      <GatheringDetailView
        gathering={selectedGathering}
        recipes={recipesById}
        location={selectedGathering.locationId ? locationsById[selectedGathering.locationId] : undefined}
        usersById={usersById}
        onBack={() => setSelectedGathering(null)}
        onBookingChanged={handleGatheringUpdate}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-secondary-background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-secondary-text)]">Loading gatherings...</p>
        </div>
      </div>
    );
  }

  if (gatherings.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--color-secondary-background)]">
        <header className="sticky top-0 z-10 bg-[var(--color-secondary-background)] border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Gatherings</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              No upcoming gatherings
            </h2>
            <p className="text-[var(--color-secondary-text)]">
              Check back soon for new gatherings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-secondary-background)]">
      <header className="sticky top-0 z-10 bg-[var(--color-secondary-background)] border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Gatherings</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {myGatherings.length > 0 && (
          <div className="py-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)] px-4 mb-3">
              My Schedule
            </h2>
            <div className="flex overflow-x-auto gap-4 px-4 pb-2">
              {myGatherings.map((gathering) => (
                <GatheringCard
                  key={gathering.id}
                  gathering={gathering}
                  location={gathering.locationId ? locationsById[gathering.locationId] : undefined}
                  isCompact
                  onClick={() => setSelectedGathering(gathering)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="py-4">
          {myGatherings.length > 0 && (
            <h2 className="text-lg font-semibold text-[var(--color-text)] px-4 mb-3">
              All Upcoming
            </h2>
          )}
          <div className="space-y-4 px-4 pb-4">
            {gatherings.map((gathering) => {
              const isRegistered = myGatherings.some((g) => g.id === gathering.id);
              return (
                <GatheringCard
                  key={gathering.id}
                  gathering={gathering}
                  location={gathering.locationId ? locationsById[gathering.locationId] : undefined}
                  recipes={recipesById}
                  isRegistered={isRegistered}
                  countryFlagLookup={countryFlagLookup}
                  usersById={usersById}
                  onClick={() => setSelectedGathering(gathering)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="fixed bottom-4 left-4 right-4 p-3 rounded-xl bg-[var(--color-accent)] bg-opacity-90 text-white text-sm">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

function GatheringCard({
  gathering,
  location,
  recipes = {},
  isRegistered = false,
  isCompact = false,
  countryFlagLookup = {},
  usersById = {},
  onClick,
}: {
  gathering: Gathering;
  location?: Location;
  recipes?: Record<string, Recipe>;
  isRegistered?: boolean;
  isCompact?: boolean;
  countryFlagLookup?: Record<string, string>;
  usersById?: Record<string, User>;
  onClick: () => void;
}) {
  if (isCompact) {
    return (
      <div
        onClick={onClick}
        className="flex-shrink-0 w-[200px] rounded-xl overflow-hidden bg-black shadow-md cursor-pointer"
      >
        {gathering.imageURL && (
          <div className="relative h-32">
            <img
              src={gathering.imageURL}
              alt={gathering.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2">
              <div className="px-3 py-1 bg-white rounded-full text-xs font-medium text-black">
                {dayLabel(gathering.start)} • {timeLabel(gathering.start)}
              </div>
            </div>
          </div>
        )}
        <div className="p-3 bg-black bg-opacity-60">
          <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">{gathering.title}</h3>
          {location && displayNeighborhood(location) && (
            <p className="text-xs text-gray-300 flex items-center gap-1">
              <span>📍</span>
              {displayNeighborhood(location)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="rounded-xl overflow-hidden bg-black shadow-md cursor-pointer"
    >
      {gathering.imageURL && (
        <div className="relative w-full aspect-video">
          <img
            src={gathering.imageURL}
            alt={gathering.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="px-3 py-1 bg-white bg-opacity-90 rounded-full text-xs font-medium text-black">
              {dayLabel(gathering.start)} • {timeLabel(gathering.start)}
            </div>
            {isRegistered && (
              <div className="px-3 py-1 bg-green-500 bg-opacity-80 rounded-full text-xs font-medium text-white">
                Going
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-4 space-y-3">
        <h3 className="text-xl font-bold text-[var(--color-text)]">{gathering.title}</h3>
        
        {location && displayAddress(location) && (
          <p className="text-sm text-[var(--color-tertiary-text)] flex items-center gap-1">
            <span>📍</span>
            {displayAddress(location)}
          </p>
        )}

        <div className="h-px bg-gray-200"></div>

        {gathering.menu.length > 0 && (
          <div className="space-y-1">
            {gathering.menu.map((menuItem) => {
              const recipe = recipes[menuItem.recipeId];
              if (!recipe) return null;
              const flag = recipe.country
                ? countryFlagLookup[recipe.country.toLowerCase()]
                : null;
              return (
                <div key={menuItem.recipeId} className="flex items-center gap-2 text-sm text-[var(--color-tertiary-text)]">
                  {flag && <span>{flag}</span>}
                  <span>{recipe.name}</span>
                  {recipe.tags?.some((tag) => tag.toLowerCase().includes("dairy") && tag.toLowerCase().includes("free")) && (
                    <span className="px-1 py-0.5 bg-[var(--color-secondary-background)] text-white text-xs rounded">DF</span>
                  )}
                  {recipe.tags?.some((tag) => tag.toLowerCase().includes("gluten") && tag.toLowerCase().includes("free")) && (
                    <span className="px-1 py-0.5 bg-[var(--color-secondary-background)] text-brown-600 text-xs rounded">GF</span>
                  )}
                  {recipe.tags?.some((tag) => tag.toLowerCase().includes("vegetarian")) && (
                    <span>🌿</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {gathering.attendeeUserIds.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {gathering.attendeeUserIds.map((userId) => {
              const user = usersById[userId];
              const initials = user
                ? `${user.firstName[0] || ""}${user.lastName[0] || ""}`.toUpperCase() || "?"
                : "?";
              return (
                <div
                  key={userId}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-secondary-background)] flex items-center justify-center text-[var(--color-warm-apricot)] text-xs font-medium"
                >
                  {initials}
                </div>
              );
            })}
          </div>
        )}

        {gathering.costPerSeat !== undefined && gathering.costPerSeat >= 0 && (
          <p className="text-sm text-[var(--color-tertiary-text)]">
            ${gathering.costPerSeat.toFixed(2)} per seat
          </p>
        )}

        {isUnlimited(gathering) ? (
          <p className="text-sm text-[var(--color-secondary)]">Unlimited seats</p>
        ) : (
          <p
            className={`text-sm ${
              isFull(gathering) ? "text-[var(--color-accent)]" : "text-[var(--color-secondary)]"
            }`}
          >
            {spotsRemaining(gathering)} seats remaining
          </p>
        )}
      </div>
    </div>
  );
}

