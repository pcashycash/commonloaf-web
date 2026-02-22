"use client";

import { useRouter } from "next/navigation";
import { dayLabel, timeLabel } from "@/lib/utils/dateFormatter";

interface AttendeePreview {
  id: string;
  firstName: string;
  lastName: string;
}

interface GatheringPreview {
  id: string;
  title: string;
  start: string; // ISO string
  imageURL: string | null;
  attendeeCount: number;
  maxAttendees: number | null;
  neighborhood: string | null;
  attendees: AttendeePreview[];
}

export default function GatheringsListView({ gatherings }: { gatherings: GatheringPreview[] }) {
  const router = useRouter();

  if (gatherings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">🍞</div>
        <p className="text-gray-300 text-lg font-medium">No upcoming dinners</p>
        <p className="text-gray-500 text-sm mt-2">Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {gatherings.map((g) => {
        const startDate = new Date(g.start);
        const spotsLeft =
          g.maxAttendees != null ? Math.max(0, g.maxAttendees - g.attendeeCount) : null;
        const isFull = g.maxAttendees != null ? g.attendeeCount >= g.maxAttendees : false;

        return (
          <div
            key={g.id}
            onClick={() => router.push(`/gathering/${g.id}`)}
            className="rounded-xl overflow-hidden bg-slate-900 shadow-md cursor-pointer active:opacity-80"
          >
            {g.imageURL && (
              <div className="relative w-full aspect-video">
                <img
                  src={g.imageURL}
                  alt={g.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-white/90 rounded-full text-xs font-medium text-black">
                    {dayLabel(startDate)} · {timeLabel(startDate)}
                  </span>
                </div>
              </div>
            )}
            <div className="p-4 space-y-2">
              <h3 className="text-lg font-bold text-white leading-tight">{g.title}</h3>

              {!g.imageURL && (
                <p className="text-sm text-gray-400">
                  {dayLabel(startDate)} · {timeLabel(startDate)}
                </p>
              )}

              {g.neighborhood && (
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <span>📍</span>
                  {g.neighborhood}
                </p>
              )}

              <p
                className={`text-sm font-medium ${
                  isFull ? "text-red-400" : "text-green-400"
                }`}
              >
                {isFull
                  ? "Full"
                  : spotsLeft !== null
                  ? `${spotsLeft} seats left`
                  : "Open seats"}
              </p>
              {g.attendees.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {[...g.attendees]
                    .sort((a, b) =>
                      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
                    )
                    .map((attendee) => (
                      <span
                        key={attendee.id}
                        className="px-3 py-1.5 rounded-full bg-slate-700/60 text-gray-200 text-sm"
                      >
                        {attendee.firstName} {attendee.lastName[0]?.toUpperCase()}.
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
