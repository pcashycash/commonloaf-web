"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils/dateFormatter";
import type { FoodItem, EmbeddedAttendee, EmbeddedLocation } from "@/lib/models/Gathering";
import type { User } from "@/lib/models/User";
import BookingModal from "@/app/components/gatherings/BookingModal";
import { firestoreService } from "@/lib/services/FirestoreService";

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
}

export default function GatheringSharePage({ gathering, gatheringId, hostFirstName }: GatheringSharePageProps) {
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

  const handleForgetUser = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStoredUser(null);
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
    <div className="min-h-screen bg-[var(--color-secondary-background)] flex flex-col">
      {/* Hero image */}
      {gathering.imageURL && (
        <div className="w-full aspect-video">
          <img
            src={gathering.imageURL}
            alt={gathering.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Scrollable content with padding for sticky bar */}
      <div className="flex-1 pb-28">
        <div className="p-5 space-y-5">
          {/* Title */}
          <h1 className="text-3xl font-bold text-white leading-tight">{gathering.title}</h1>

          {/* Date */}
          <div className="flex items-center gap-3 text-gray-300">
            <span className="text-xl">📅</span>
            <span className="text-base">{formatDate(startDate)}</span>
          </div>

          {/* Location — neighborhood only for privacy */}
          {gathering.location?.neighborhood && (
            <div className="flex items-center gap-3 text-gray-300">
              <span className="text-xl">📍</span>
              <span className="text-base">{gathering.location.neighborhood}</span>
            </div>
          )}

          {/* Spots + cost pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {spotsLeft !== null && (
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  isFull ? "bg-red-900/60 text-red-200" : "bg-green-900/60 text-green-200"
                }`}
              >
                {isFull ? "Full" : `${spotsLeft} seats left`}
              </span>
            )}
            {gathering.maxAttendees == null && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-900/60 text-green-200">
                Open seats
              </span>
            )}
            {gathering.costPerSeat != null && gathering.costPerSeat > 0 && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-700/60 text-gray-200">
                ${gathering.costPerSeat.toFixed(2)} per seat
              </span>
            )}
            {gathering.costPerSeat === 0 && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-700/60 text-gray-200">
                Free
              </span>
            )}
          </div>

          {/* Description */}
          {gathering.description && (
            <p className="text-gray-300 text-base leading-relaxed">{gathering.description}</p>
          )}

          <div className="h-px bg-white/10" />

          {/* Menu */}
          {sortedFood.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <div className="space-y-2">
                {sortedFood.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700/70 text-gray-300 shrink-0">
                      {item.type}
                    </span>
                    <span className="text-gray-200 text-base">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedFood.length > 0 && localAttendees.length > 0 && (
            <div className="h-px bg-white/10" />
          )}

          {/* Attendees */}
          {localAttendees.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                {localAttendees.length}{" "}
                {localAttendees.length === 1 ? "Guest" : "Guests"}
              </h2>
              <div className="flex gap-2 flex-wrap">
                {localAttendees.map((attendee) => {
                  const initials =
                    `${attendee.firstName[0] || ""}${attendee.lastName[0] || ""}`.toUpperCase() ||
                    "?";
                  return (
                    <div
                      key={attendee.id}
                      className="w-11 h-11 rounded-full bg-slate-700/70 flex items-center justify-center text-[var(--color-warm-apricot)] text-sm font-semibold"
                      title={`${attendee.firstName} ${attendee.lastName}`}
                    >
                      {initials}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-secondary-background)] border-t border-white/10">
        {!gathering.isPublic ? (
          <p className="w-full py-3 text-center text-gray-400 text-sm">
            This is a private event.
          </p>
        ) : bookedUser ? (
          <div className="space-y-1">
            <p className="w-full py-2 text-center text-[var(--color-warm-apricot)] font-medium">
              You're registered, {bookedUser.firstName}!
            </p>
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              className="w-full py-1 text-sm text-center text-gray-500 disabled:opacity-40"
            >
              {cancelLoading ? "Cancelling…" : "Cancel my spot"}
            </button>
          </div>
        ) : isFull ? (
          <button
            disabled
            className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-primary)] opacity-40 cursor-not-allowed"
          >
            Event is Full
          </button>
        ) : storedUser ? (
          <div className="space-y-2">
            <button
              onClick={handleAutoBook}
              disabled={autoBookLoading}
              className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-primary)] disabled:opacity-50"
            >
              {autoBookLoading ? "Booking…" : `Book as ${storedUser.firstName} →`}
            </button>
            <button
              onClick={handleForgetUser}
              className="w-full py-1 text-sm text-center text-gray-500"
            >
              Not you?
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-primary)]"
          >
            Book a Seat
          </button>
        )}
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
