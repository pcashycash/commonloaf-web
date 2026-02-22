"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils/dateFormatter";
import type { FoodItem, EmbeddedAttendee, EmbeddedLocation } from "@/lib/models/Gathering";
import type { User } from "@/lib/models/User";
import BookingModal from "@/app/components/gatherings/BookingModal";
import { firestoreService } from "@/lib/services/FirestoreService";
import type { RecipeInfo } from "./page";

const STORAGE_KEY = "commonloaf_user";

interface GatheringSharePageProps {
  gathering: {
    id?: string;
    title: string;
    start: string; // ISO string
    end?: string | null;
    imageURL?: string | null;
    description?: string | null;
    attendeeUserIds: string[];
    maxAttendees?: number | null;
    isPublic: boolean;
    costPerSeat?: number | null;
    location?: EmbeddedLocation | null;
    attendees?: EmbeddedAttendee[];
    food?: FoodItem[];
    hostUserId?: string | null;
  };
  gatheringId: string;
  hostFirstName?: string;
  recipes?: Record<string, RecipeInfo>;
}

export default function GatheringSharePage({ gathering, gatheringId, hostFirstName, recipes = {} }: GatheringSharePageProps) {
  const startDate = new Date(gathering.start);
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [bookedUser, setBookedUser] = useState<User | null>(null);
  const [localAttendeeIds, setLocalAttendeeIds] = useState<string[]>(gathering.attendeeUserIds);
  const [localAttendees, setLocalAttendees] = useState<EmbeddedAttendee[]>(gathering.attendees ?? []);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successFading, setSuccessFading] = useState(false);
  const [storedUser, setStoredUser] = useState<User | null>(null);
  const [autoBookLoading, setAutoBookLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showGoodbye, setShowGoodbye] = useState(false);

  // On mount — check localStorage for a returning user
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const user = JSON.parse(raw) as User;
      if (user.id && gathering.attendeeUserIds.includes(user.id)) {
        // Already booked — restore their confirmed state silently
        setBookedUser(user);
      } else {
        // Known user, not yet booked for this gathering
        setStoredUser(user);
      }
    } catch {
      // Ignore malformed storage
    }
  }, []);

  const [confettiPieces] = useState(() =>
    Array.from({ length: 65 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: ["#FFB74D", "#FF7043", "#4CAF50", "#42A5F5", "#AB47BC", "#EF5350", "#FFCA28", "#26C6DA", "#FF8A65", "#66BB6A"][Math.floor(Math.random() * 10)],
      size: Math.random() * 8 + 6,
      duration: Math.random() * 1.2 + 1.8,
      delay: Math.random() * 1.8,
      isRect: Math.random() > 0.5,
    }))
  );

  useEffect(() => {
    if (!showSuccess) return;
    const fadeTimer = setTimeout(() => setSuccessFading(true), 2500);
    const hideTimer = setTimeout(() => setShowSuccess(false), 3000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [showSuccess]);

  const spotsLeft =
    gathering.maxAttendees
      ? Math.max(0, gathering.maxAttendees - localAttendeeIds.length)
      : null;
  const isFull =
    gathering.maxAttendees != null
      ? localAttendeeIds.length >= gathering.maxAttendees
      : false;

  const sortedFood = [...(gathering.food || [])].sort((a, b) => a.order - b.order);

  const handleSuccess = (user: User) => {
    setBookedUser(user);
    setStoredUser(null);
    setShowSuccess(true);
    setSuccessFading(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {}
    if (user.id && !localAttendeeIds.includes(user.id)) {
      setLocalAttendeeIds((prev) => [...prev, user.id!]);
      setLocalAttendees((prev) => [
        ...prev,
        {
          id: user.id!,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber || "",
        },
      ]);
    }
  };

  const handleAutoBook = async () => {
    if (!storedUser || autoBookLoading) return;
    setAutoBookLoading(true);
    try {
      await firestoreService.registerGuestForGathering(gatheringId, storedUser);
    } catch (err: any) {
      if (err.message !== "Already registered") {
        // Fall back to normal modal on unexpected errors
        setAutoBookLoading(false);
        setShowModal(true);
        return;
      }
    }
    handleSuccess(storedUser);
    setAutoBookLoading(false);
  };

  const handleCancel = async () => {
    if (!bookedUser?.id || cancelLoading) return;
    setCancelLoading(true);
    try {
      await firestoreService.unregisterFromGathering(gatheringId, bookedUser.id);
    } catch {
      // Proceed with the local update even if Firestore call fails
    }
    // Update local UI state
    setLocalAttendeeIds((prev) => prev.filter((id) => id !== bookedUser.id));
    setLocalAttendees((prev) => prev.filter((a) => a.id !== bookedUser.id));
    setBookedUser(null);
    setCancelLoading(false);
    setShowGoodbye(true);
  };

  // After goodbye overlay: navigate to gatherings list
  useEffect(() => {
    if (!showGoodbye) return;
    const timer = setTimeout(() => router.push("/gatherings"), 3000);
    return () => clearTimeout(timer);
  }, [showGoodbye]);

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-white/10">
        {/* See Other Events */}
        <button
          onClick={() => router.push("/gatherings")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors shrink-0"
        >
          ← Events
        </button>

        {/* Open in App */}
        <a
          href={`commonloaf://gathering/${gatheringId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors shrink-0"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Open in App
        </a>

        {/* Dynamic action button */}
        <div className="ml-auto shrink-0">
          {bookedUser ? (
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 disabled:opacity-40 transition-colors"
            >
              {cancelLoading ? "Cancelling…" : "Cancel Reservation"}
            </button>
          ) : storedUser ? (
            <button
              onClick={handleAutoBook}
              disabled={autoBookLoading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[var(--color-primary)] disabled:opacity-50 transition-opacity"
            >
              {autoBookLoading ? "Booking…" : "Book a Seat"}
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[var(--color-primary)]"
            >
              Login
            </button>
          )}
        </div>
      </div>


      {/* Scrollable content — extra bottom padding only when sticky bar is visible */}
      <div className="flex-1 pb-10">
        <div className="p-5 space-y-5">
          {/* Title */}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{gathering.title}</h1>

          {/* Date */}
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            {/* Dynamic calendar badge */}
            <div className="flex flex-col items-center w-5 rounded overflow-hidden border border-gray-300 dark:border-white/15 shrink-0">
              <div className="w-full bg-red-600 text-center py-px">
                <span className="text-[5px] font-bold text-white tracking-wider">
                  {startDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                </span>
              </div>
              <div className="bg-gray-100 dark:bg-white/10 w-full text-center py-0.5">
                <span className="text-[9px] font-bold text-gray-900 dark:text-white leading-none">
                  {startDate.getDate()}
                </span>
              </div>
            </div>
            <span className="text-base">{formatDate(startDate)}</span>
          </div>

          {/* Location — full address for confirmed attendees, neighborhood for others */}
          {(gathering.location?.address || gathering.location?.neighborhood) && (
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <span className="text-xl">📍</span>
              <span className="text-base">
                {bookedUser && gathering.location?.address
                  ? gathering.location.address
                  : gathering.location?.neighborhood}
              </span>
            </div>
          )}


          {/* Description */}
          {gathering.description && (
            <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">{gathering.description}</p>
          )}

          <div className="h-px bg-gray-200 dark:bg-white/10" />

          {/* Guests */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {localAttendees.length}{" "}
                {localAttendees.length === 1 ? "Guest" : "Guests"}
              </h2>
              {spotsLeft !== null && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    isFull
                      ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200"
                      : "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-200"
                  }`}
                >
                  {isFull ? "Full" : `${spotsLeft} seats left`}
                </span>
              )}
              {gathering.maxAttendees == null && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-200">
                  Open seats
                </span>
              )}
            </div>
            {localAttendees.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {[...localAttendees]
                  .sort((a, b) =>
                    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
                  )
                  .map((attendee) => (
                    <span
                      key={attendee.id}
                      className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-700/60 text-gray-700 dark:text-gray-200 text-sm"
                    >
                      {attendee.firstName} {attendee.lastName[0]?.toUpperCase()}.
                    </span>
                  ))}
              </div>
            )}
          </div>

          {localAttendees.length > 0 && sortedFood.length > 0 && (
            <div className="h-px bg-gray-200 dark:bg-white/10" />
          )}

          {/* Menu */}
          {sortedFood.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
              <div className="space-y-5">
                {sortedFood.map((item, i) => {
                  const recipe = recipes[item.recipeId];
                  return (
                    <div key={i} className="space-y-2">
                      {recipe?.imageURL && (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden">
                          <img
                            src={recipe.imageURL}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold text-base">{item.name}</p>
                        {recipe?.description && (
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 leading-relaxed">{recipe.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>


      {/* Booking modal */}
      {showModal && (
        <BookingModal
          gatheringId={gatheringId}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Success celebration overlay */}
      {showSuccess && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "rgba(12, 12, 12, 0.96)",
            opacity: successFading ? 0 : 1,
            transition: "opacity 500ms ease",
          }}
        >
          <style>{`
            @keyframes confettiFall {
              0%   { transform: translateY(-16px) rotate(0deg); opacity: 1; }
              85%  { opacity: 1; }
              100% { transform: translateY(105vh) rotate(600deg); opacity: 0; }
            }
            @keyframes celebrationPop {
              0%   { transform: scale(0.3); opacity: 0; }
              55%  { transform: scale(1.45); opacity: 1; }
              75%  { transform: scale(0.88); }
              90%  { transform: scale(1.06); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes celebrationFadeUp {
              0%   { transform: translateY(22px); opacity: 0; }
              100% { transform: translateY(0);    opacity: 1; }
            }
            @keyframes pulseGlow {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.65; }
            }
          `}</style>

          {/* Confetti */}
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              style={{
                position: "absolute",
                left: `${piece.left}%`,
                top: 0,
                width: piece.isRect ? `${piece.size * 0.55}px` : `${piece.size}px`,
                height: `${piece.size}px`,
                borderRadius: piece.isRect ? "2px" : "50%",
                backgroundColor: piece.color,
                animation: `confettiFall ${piece.duration}s ${piece.delay}s ease-in forwards`,
              }}
            />
          ))}

          {/* Center content */}
          <div className="relative z-10 text-center px-8 space-y-5">
            <div
              className="text-8xl select-none"
              style={{ animation: "celebrationPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" }}
            >
              🍽️
            </div>

            <div style={{ animation: "celebrationFadeUp 0.55s ease 0.4s both" }}>
              <h2 className="text-3xl font-bold text-white leading-snug">
                {hostFirstName
                  ? `${hostFirstName} looks forward to seeing you!`
                  : bookedUser?.firstName
                  ? `You're in, ${bookedUser.firstName}!`
                  : "You're in!"}
              </h2>
            </div>

            <div style={{ animation: "celebrationFadeUp 0.55s ease 0.65s both" }}>
              <p
                className="text-lg font-semibold"
                style={{
                  color: "var(--color-warm-apricot)",
                  animation: "pulseGlow 1.8s ease 1.2s infinite",
                }}
              >
                Your seat is reserved ✓
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Goodbye overlay */}
      {showGoodbye && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8">
          <style>{`
            @keyframes goodbyeFadeIn {
              0%   { opacity: 0; transform: scale(0.92); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes goodbyeFadeUp {
              0%   { transform: translateY(18px); opacity: 0; }
              100% { transform: translateY(0);    opacity: 1; }
            }
            @keyframes slideToGatherings {
              0%   { opacity: 1; transform: translateY(0); }
              80%  { opacity: 1; }
              100% { opacity: 0; transform: translateY(-24px); }
            }
          `}</style>

          <div
            className="text-center space-y-5"
            style={{ animation: "goodbyeFadeIn 0.5s ease forwards" }}
          >
            <div className="text-7xl select-none">🥺</div>

            <div style={{ animation: "goodbyeFadeUp 0.5s ease 0.3s both" }}>
              <h2 className="text-2xl font-bold text-white leading-snug">
                {hostFirstName ? `${hostFirstName} is sad to see you go.` : "We're sad to see you go."}
              </h2>
            </div>

            <div style={{ animation: "goodbyeFadeUp 0.5s ease 0.55s both" }}>
              <p className="text-base text-gray-400 leading-relaxed">
                Please check out some of the other gatherings.
              </p>
            </div>

            <div
              className="text-sm text-[var(--color-warm-apricot)]"
              style={{ animation: "goodbyeFadeUp 0.5s ease 0.8s both" }}
            >
              Taking you there now…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
