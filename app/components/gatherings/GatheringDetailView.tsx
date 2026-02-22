"use client";

import { useState, useEffect } from "react";
import { firestoreService } from "@/lib/services/FirestoreService";
import { authService } from "@/lib/services/AuthService";
import { Gathering } from "@/lib/models/Gathering";
import { Location } from "@/lib/models/Location";
import { Recipe } from "@/lib/models/Recipe";
import { User } from "@/lib/models/User";
import { formatDate, dayLabel, timeLabel } from "@/lib/utils/dateFormatter";
import { isUnlimited, spotsRemaining } from "@/lib/models/Gathering";
import { displayAddress } from "@/lib/models/Location";

interface MenuItemDetail {
  id: string;
  type: string;
  recipe: Recipe;
}

export default function GatheringDetailView({
  gathering: initialGathering,
  recipes,
  location,
  usersById,
  onBack,
  onBookingChanged,
}: {
  gathering: Gathering;
  recipes: Record<string, Recipe>;
  location?: Location;
  usersById: Record<string, User>;
  onBack: () => void;
  onBookingChanged: (gathering: Gathering) => void;
}) {
  const [gathering, setGathering] = useState(initialGathering);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showBookConfirmation, setShowBookConfirmation] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemDetail[]>([]);
  const [attendeeUsers, setAttendeeUsers] = useState<User[]>([]);

  useEffect(() => {
    loadData();
  }, [gathering.id]);

  const loadData = async () => {
    const userId = authService.currentUserId;
    if (userId) {
      setIsRegistered((gathering.attendees || []).some((a) => a.id === userId));
    }

    // Build menu items
    const items: MenuItemDetail[] = gathering.menu
      .map((menuItem) => {
        const recipe = recipes[menuItem.recipeId];
        if (!recipe) return null;
        return {
          id: menuItem.recipeId,
          type: menuItem.type,
          recipe,
        };
      })
      .filter((item): item is MenuItemDetail => item !== null);
    setMenuItems(items);

    // Get attendee users from embedded attendees data
    const attendees = (gathering.attendees || [])
      .map((a) => usersById[a.id])
      .filter((user): user is User => user !== undefined);
    setAttendeeUsers(attendees.sort((a, b) => a.firstName.localeCompare(b.firstName)));
  };

  const handleRegister = async () => {
    const gatheringId = gathering.id;
    const userId = authService.currentUserId;
    if (!gatheringId || !userId) {
      setErrorMessage("Please sign in to reserve a seat.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Check availability
      const currentGathering = await firestoreService.fetchGathering(gatheringId);
      if (!currentGathering) {
        setErrorMessage("Gathering not found.");
        return;
      }

      if ((currentGathering.attendees || []).some((a) => a.id === userId)) {
        setErrorMessage("You are already registered for this gathering.");
        return;
      }

      if (currentGathering.maxAttendees && (currentGathering.attendees || []).length >= currentGathering.maxAttendees) {
        setErrorMessage("This gathering is now full.");
        setGathering(currentGathering);
        await loadData();
        return;
      }

      await firestoreService.registerForGathering(gatheringId, userId);
      const updated = await firestoreService.fetchGathering(gatheringId);
      if (updated) {
        setGathering(updated);
        await loadData();
        onBookingChanged(updated);
      }
      setShowBookConfirmation(false);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to register");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    const gatheringId = gathering.id;
    const userId = authService.currentUserId;
    if (!gatheringId || !userId) {
      setErrorMessage("Unable to cancel your reservation.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await firestoreService.unregisterFromGathering(gatheringId, userId);
      const updated = await firestoreService.fetchGathering(gatheringId);
      if (updated) {
        setGathering(updated);
        await loadData();
        onBookingChanged(updated);
      }
      setShowCancelConfirmation(false);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to cancel reservation");
    } finally {
      setIsLoading(false);
    }
  };

  const canRegister = authService.isAuthenticated && !isUnlimited(gathering) && spotsRemaining(gathering) > 0 && !isRegistered;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-secondary-background)]">
      <header className="sticky top-0 z-10 bg-[var(--color-secondary-background)] border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">{gathering.title}</h1>
        <div className="w-10">
          {isRegistered ? (
            <button
              onClick={() => setShowCancelConfirmation(true)}
              className="p-2 text-red-500"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
          ) : canRegister ? (
            <button
              onClick={() => setShowBookConfirmation(true)}
              className="p-2 text-green-500"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Details Section */}
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Details</h2>
            <div className="bg-slate-900 rounded-xl p-4 space-y-3 shadow-md">
              <InfoRow icon="📅" value={formatDate(gathering.start)} />
              <div className="h-px w-full bg-gray-600"></div>
              <InfoRow
                icon="📍"
                value={location && displayAddress(location) ? displayAddress(location) : "Location to be announced"}
              />
              <div className="h-px w-full bg-gray-600"></div>
              <InfoRow icon="👨‍🍳" value="Chef Patrick" />
              <div className="h-px w-full bg-gray-600"></div>
              <InfoRow
                icon="🪑"
                value={
                  isUnlimited(gathering)
                    ? "Unlimited seats"
                    : `${spotsRemaining(gathering)} seats remaining`
                }
              />
            </div>
          </div>

          {/* Attendees Section */}
          {(gathering.attendees || []).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                Attendees ({(gathering.attendees || []).length})
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {attendeeUsers.map((user) => {
                  const initials = `${user.firstName[0] || ""}${user.lastName[0] || ""}`.toUpperCase() || "?";
                  return (
                    <div key={user.id} className="flex-shrink-0 text-center">
                      <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-[var(--color-warm-apricot)] text-sm font-medium mb-1 mx-auto">
                        {initials}
                      </div>
                      <div className="text-xs text-[var(--color-secondary-text)] w-15">
                        <p className="truncate">{user.firstName}</p>
                        <p>{user.lastName[0] || ""}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu Section */}
          {menuItems.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Menu</h2>
              <div className="space-y-4">
                {menuItems.map((menuItem) => (
                  <div key={menuItem.id} className="bg-slate-900 rounded-xl overflow-hidden shadow-md">
                    {menuItem.recipe.imageURL && (
                      <div className="relative w-full aspect-video">
                        <img
                          src={menuItem.recipe.imageURL}
                          alt={menuItem.recipe.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4">
                          <div className="px-3 py-1 bg-white rounded-full text-xs font-medium text-black">
                            {menuItem.type.charAt(0).toUpperCase() + menuItem.type.slice(1)}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                        {menuItem.recipe.name}
                      </h3>
                      {menuItem.recipe.description && (
                        <p className="text-sm text-[var(--color-secondary-text)] line-clamp-6">
                          {menuItem.recipe.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      {showCancelConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end">
          <div className="bg-slate-900 rounded-t-2xl p-6 w-full max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2 text-white">Cancel Reservation</h3>
            <p className="text-sm text-gray-300 mb-4">
              Are you sure you want to cancel your reservation?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirmation(false)}
                className="flex-1 py-2 px-4 rounded-xl border border-gray-300 text-[var(--color-text)]"
              >
                No
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 py-2 px-4 rounded-xl bg-red-500 text-white"
              >
                {isLoading ? "Canceling..." : "Cancel Reservation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBookConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end">
          <div className="bg-slate-900 rounded-t-2xl p-6 w-full max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2 text-white">Book Reservation</h3>
            <p className="text-sm text-gray-300 mb-4">
              Book a seat for {gathering.title}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBookConfirmation(false)}
                className="flex-1 py-2 px-4 rounded-xl border border-gray-300 text-[var(--color-text)]"
              >
                No
              </button>
              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="flex-1 py-2 px-4 rounded-xl bg-[var(--color-primary)] text-white"
              >
                {isLoading ? "Booking..." : "Book Reservation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-4 left-4 right-4 p-3 rounded-xl bg-[var(--color-accent)] bg-opacity-90 text-white text-sm">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-[var(--color-text)] flex-1">{value}</span>
    </div>
  );
}

