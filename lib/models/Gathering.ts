export interface MenuItem {
  type: string;
  recipeId: string;
}

export interface FoodItem {
  name: string;
  order: number;
  recipeId: string;
  type: string;
  country?: string;
}

export interface GameItem {
  id: string;
  name: string;
  order: number;
}

export interface EmbeddedAttendee {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface EmbeddedLocation {
  address: string;
  name: string;
  neighborhood: string;
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
  location?: EmbeddedLocation;
  description?: string;
  attendeeUserIds: string[];
  attendees?: EmbeddedAttendee[];
  food?: FoodItem[];
  games?: GameItem[];
  waitlist: WaitlistUser[];
  maxAttendees?: number;
  active: boolean;
  isPublic: boolean;
  menu: MenuItem[];
  imageURL?: string;
  costPerSeat?: number;
  hostUserId?: string;
  invitedUsers?: string[];
  groupIds?: string[];
  allowGatheringShare?: boolean;
  allowMenuItemAdding?: boolean;
}

export interface GatheringData {
  id?: string;
  title: string;
  start: any; // Firestore Timestamp
  end?: any; // Firestore Timestamp
  locationId?: string;
  location?: EmbeddedLocation;
  description?: string;
  attendeeUserIds: string[];
  attendees?: EmbeddedAttendee[];
  food?: FoodItem[];
  games?: GameItem[];
  waitlist: WaitlistUserData[];
  maxAttendees?: number;
  active: boolean;
  isPublic: boolean;
  menu: MenuItem[];
  imageURL?: string;
  costPerSeat?: number;
  hostUserId?: string;
  invitedUsers?: string[];
  groupIds?: string[];
  allowGatheringShare?: boolean;
  allowMenuItemAdding?: boolean;
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
    location: data.location,
    description: data.description,
    attendeeUserIds: data.attendeeUserIds || [],
    attendees: data.attendees || [],
    food: data.food || [],
    games: data.games || [],
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
    invitedUsers: data.invitedUsers || [],
    groupIds: data.groupIds || [],
    allowGatheringShare: data.allowGatheringShare,
    allowMenuItemAdding: data.allowMenuItemAdding,
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
    invitedUsers: gathering.invitedUsers,
    groupIds: gathering.groupIds,
    allowGatheringShare: gathering.allowGatheringShare,
    allowMenuItemAdding: gathering.allowMenuItemAdding,
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

