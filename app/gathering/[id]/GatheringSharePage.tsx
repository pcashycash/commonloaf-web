"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils/dateFormatter";
import type { FoodItem, EmbeddedAttendee, EmbeddedLocation } from "@/lib/models/Gathering";
import type { User } from "@/lib/models/User";
import BookingModal from "@/app/components/gatherings/BookingModal";

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
  };
  gatheringId: string;
}

export default function GatheringSharePage({ gathering, gatheringId }: GatheringSharePageProps) {
  const startDate = new Date(gathering.start);

  const [showModal, setShowModal] = useState(false);
  const [bookedUser, setBookedUser] = useState<User | null>(null);
  const [localAttendeeIds, setLocalAttendeeIds] = useState<string[]>(gathering.attendeeUserIds);
  const [localAttendees, setLocalAttendees] = useState<EmbeddedAttendee[]>(gathering.attendees ?? []);

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
          <p className="w-full py-3 text-center text-[var(--color-warm-apricot)] font-medium">
            You're registered, {bookedUser.firstName}!
          </p>
        ) : isFull ? (
          <button
            disabled
            className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-primary)] opacity-40 cursor-not-allowed"
          >
            Event is Full
          </button>
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
    </div>
  );
}
