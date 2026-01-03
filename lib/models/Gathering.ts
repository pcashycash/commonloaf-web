export interface MenuItem {
  type: string;
  recipeId: string;
}

export interface WaitlistUser {
  id: string;
  userId: string;
  numberOfSeats: number;
  addedAt: Date;
}

export interface Gathering {
  id?: string;
  title: string;
  start: Date;
  end?: Date;
  locationId?: string;
  description?: string;
  attendeeUserIds: string[];
  waitlist: WaitlistUser[];
  maxAttendees?: number;
  active: boolean;
  isPublic: boolean;
  menu: MenuItem[];
  imageURL?: string;
  costPerSeat?: number;
  hostUserId?: string;
}

export interface GatheringData {
  id?: string;
  title: string;
  start: any; // Firestore Timestamp
  end?: any; // Firestore Timestamp
  locationId?: string;
  description?: string;
  attendeeUserIds: string[];
  waitlist: WaitlistUserData[];
  maxAttendees?: number;
  active: boolean;
  isPublic: boolean;
  menu: MenuItem[];
  imageURL?: string;
  costPerSeat?: number;
  hostUserId?: string;
}

export interface WaitlistUserData {
  id: string;
  userId: string;
  numberOfSeats: number;
  addedAt: any; // Firestore Timestamp
}

export function gatheringFromFirestore(data: GatheringData): Gathering {
  return {
    id: data.id,
    title: data.title,
    start: data.start?.toDate() || new Date(),
    end: data.end?.toDate(),
    locationId: data.locationId,
    description: data.description,
    attendeeUserIds: data.attendeeUserIds || [],
    waitlist: (data.waitlist || []).map((w) => ({
      id: w.id,
      userId: w.userId,
      numberOfSeats: w.numberOfSeats,
      addedAt: w.addedAt?.toDate() || new Date(),
    })),
    maxAttendees: data.maxAttendees,
    active: data.active ?? true,
    isPublic: data.isPublic ?? true,
    menu: data.menu || [],
    imageURL: data.imageURL,
    costPerSeat: data.costPerSeat,
    hostUserId: data.hostUserId,
  };
}

export function gatheringToFirestore(gathering: Gathering): GatheringData {
  return {
    id: gathering.id,
    title: gathering.title,
    start: gathering.start,
    end: gathering.end,
    locationId: gathering.locationId,
    description: gathering.description,
    attendeeUserIds: gathering.attendeeUserIds,
    waitlist: gathering.waitlist.map((w) => ({
      id: w.id,
      userId: w.userId,
      numberOfSeats: w.numberOfSeats,
      addedAt: w.addedAt,
    })),
    maxAttendees: gathering.maxAttendees,
    active: gathering.active,
    isPublic: gathering.isPublic,
    menu: gathering.menu,
    imageURL: gathering.imageURL,
    costPerSeat: gathering.costPerSeat,
    hostUserId: gathering.hostUserId,
  };
}

export function isUnlimited(gathering: Gathering): boolean {
  return !gathering.maxAttendees || gathering.maxAttendees === 0;
}

export function spotsRemaining(gathering: Gathering): number {
  if (isUnlimited(gathering)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.max(0, (gathering.maxAttendees || 0) - gathering.attendeeUserIds.length);
}

export function isFull(gathering: Gathering): boolean {
  if (isUnlimited(gathering)) {
    return false;
  }
  return gathering.attendeeUserIds.length >= (gathering.maxAttendees || 0);
}

