import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  Timestamp,
  updateDoc,
  runTransaction,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { Gathering, gatheringFromFirestore } from "../models/Gathering";
import { User, userFromFirestore } from "../models/User";
import { Recipe, recipeFromFirestore } from "../models/Recipe";
import { Location, locationFromFirestore } from "../models/Location";
import { normalizePhoneNumberToDigits, normalizePhoneForAuth } from "../utils/phoneNumber";

export class FirestoreService {
  async fetchUpcomingGatherings(): Promise<Gathering[]> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    const now = Timestamp.now();
    const currentUserId = auth?.currentUser?.uid;

    // Query 1: Public gatherings
    const publicQuery = query(
      collection(db, "gatherings"),
      where("active", "==", true),
      where("start", ">=", now),
      where("isPublic", "==", true),
      orderBy("start")
    );
    
    const publicSnapshot = await getDocs(publicQuery);
    const publicGatherings: Gathering[] = [];
    
    for (const document of publicSnapshot.docs) {
      try {
        const data = { id: document.id, ...document.data() };
        publicGatherings.push(gatheringFromFirestore(data as any));
      } catch (error) {
        console.warn(`Failed to decode public gathering ${document.id}:`, error);
      }
    }

    // Query 2: Private gatherings where user is attendee
    let attendeeGatherings: Gathering[] = [];
    if (currentUserId) {
      try {
        const attendeeQuery = query(
          collection(db, "gatherings"),
          where("active", "==", true),
          where("start", ">=", now),
          where("attendeeUserIds", "array-contains", currentUserId)
        );
        
        const attendeeSnapshot = await getDocs(attendeeQuery);
        
        for (const document of attendeeSnapshot.docs) {
          try {
            const data = { id: document.id, ...document.data() };
            const gathering = gatheringFromFirestore(data as any);
            // Only include non-public gatherings (public ones already in first query)
            if (!gathering.isPublic) {
              attendeeGatherings.push(gathering);
            }
          } catch (error) {
            console.warn(`Failed to decode attendee gathering ${document.id}:`, error);
          }
        }
      } catch (error) {
        console.warn("Failed to query attendee gatherings:", error);
      }
    }

    // Combine and deduplicate
    const allGatherings = [...publicGatherings, ...attendeeGatherings];
    const seenIds = new Set<string>();
    const uniqueGatherings: Gathering[] = [];

    for (const gathering of allGatherings) {
      if (gathering.id && !seenIds.has(gathering.id)) {
        uniqueGatherings.push(gathering);
        seenIds.add(gathering.id);
      }
    }

    // Sort by start date
    return uniqueGatherings.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  async fetchPastGatheringsForUser(userId: string): Promise<Gathering[]> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    const now = Timestamp.now();
    
    try {
      const pastQuery = query(
        collection(db, "gatherings"),
        where("active", "==", true),
        where("start", "<=", now),
        orderBy("start", "desc")
      );
      
      const snapshot = await getDocs(pastQuery);
      const userGatherings: Gathering[] = [];
      
      for (const document of snapshot.docs) {
        try {
          const data = { id: document.id, ...document.data() };
          const gathering = gatheringFromFirestore(data as any);
          
          if (gathering.attendeeUserIds.includes(userId)) {
            userGatherings.push(gathering);
          }
        } catch (error) {
          console.warn(`Failed to decode gathering ${document.id}:`, error);
        }
      }
      
      return userGatherings;
    } catch (error) {
      console.warn("Failed to query past gatherings, using fallback:", error);
      // Fallback: fetch all active gatherings and filter in memory
      const allQuery = query(
        collection(db, "gatherings"),
        where("active", "==", true)
      );
      
      const snapshot = await getDocs(allQuery);
      const userGatherings: Gathering[] = [];
      
      for (const document of snapshot.docs) {
        try {
          const data = { id: document.id, ...document.data() };
          const gathering = gatheringFromFirestore(data as any);
          
          if (gathering.start <= new Date() && gathering.attendeeUserIds.includes(userId)) {
            userGatherings.push(gathering);
          }
        } catch (error) {
          console.warn(`Failed to decode gathering ${document.id}:`, error);
        }
      }
      
      return userGatherings.sort((a, b) => b.start.getTime() - a.start.getTime());
    }
  }

  async fetchGathering(id: string): Promise<Gathering | null> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    const document = await getDoc(doc(db, "gatherings", id));
    if (!document.exists()) {
      return null;
    }
    const data = { id: document.id, ...document.data() };
    return gatheringFromFirestore(data as any);
  }

  async registerForGathering(gatheringId: string, userId: string): Promise<void> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    const gatheringRef = doc(db, "gatherings", gatheringId);
    
    await runTransaction(db, async (transaction) => {
      const gatheringDoc = await transaction.get(gatheringRef);
      if (!gatheringDoc.exists()) {
        throw new Error("Gathering not found");
      }
      
      const data = gatheringDoc.data();
      const gathering = gatheringFromFirestore({ id: gatheringDoc.id, ...data } as any);
      
      if (gathering.attendeeUserIds.includes(userId)) {
        throw new Error("Already registered");
      }
      
      if (gathering.maxAttendees && gathering.attendeeUserIds.length >= gathering.maxAttendees) {
        throw new Error("Gathering is full");
      }
      
      const updatedAttendees = [...gathering.attendeeUserIds, userId];
      transaction.update(gatheringRef, { attendeeUserIds: updatedAttendees });
    });
  }

  async unregisterFromGathering(gatheringId: string, userId: string): Promise<void> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    const gatheringRef = doc(db, "gatherings", gatheringId);
    const gatheringDoc = await getDoc(gatheringRef);
    
    if (!gatheringDoc.exists()) {
      throw new Error("Gathering not found");
    }
    
    const data = gatheringDoc.data();
    const gathering = gatheringFromFirestore({ id: gatheringDoc.id, ...data } as any);
    const updatedAttendees = gathering.attendeeUserIds.filter((id) => id !== userId);
    
    await updateDoc(gatheringRef, { attendeeUserIds: updatedAttendees });
  }

  async fetchUsers(ids: string[]): Promise<User[]> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    if (ids.length === 0) return [];
    
    // Fetch documents directly by ID
    const allUsers: User[] = [];
    
    for (const id of ids) {
      try {
        const document = await getDoc(doc(db, "users", id));
        if (document.exists()) {
          const data = { id: document.id, ...document.data() };
          allUsers.push(userFromFirestore(data as any));
        }
      } catch (error) {
        console.warn(`Failed to fetch user ${id}:`, error);
      }
    }
    
    return allUsers;
  }

  async fetchRecipes(ids: string[]): Promise<Recipe[]> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    if (ids.length === 0) return [];
    
    // Fetch documents directly by ID
    const allRecipes: Recipe[] = [];
    
    for (const id of ids) {
      try {
        const document = await getDoc(doc(db, "recipes", id));
        if (document.exists()) {
          const data = { id: document.id, ...document.data() };
          allRecipes.push(recipeFromFirestore(data));
        }
      } catch (error) {
        console.warn(`Failed to fetch recipe ${id}:`, error);
      }
    }
    
    return allRecipes;
  }

  async fetchLocations(ids: string[]): Promise<Location[]> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    if (ids.length === 0) return [];

    // Fetch documents directly by ID
    const allLocations: Location[] = [];

    for (const id of ids) {
      try {
        const document = await getDoc(doc(db, "locations", id));
        if (document.exists()) {
          const data = { id: document.id, ...document.data() };
          allLocations.push(locationFromFirestore(data));
        }
      } catch (error) {
        console.warn(`Failed to fetch location ${id}:`, error);
      }
    }

    return allLocations;
  }

  async findUserByPhone(phoneNumber: string): Promise<User | null> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    // Normalize input to E.164 (+18473452436) to match how numbers are stored
    const normalizedInput = normalizePhoneForAuth(phoneNumber);
    const inputDigits = normalizePhoneNumberToDigits(normalizedInput);
    const snapshot = await getDocs(collection(db, "users"));
    const match = snapshot.docs.find((d) => {
      const stored = d.data().phoneNumber;
      if (!stored) return false;
      const normalizedStored = normalizePhoneForAuth(stored);
      // Primary: exact E.164 match
      if (normalizedStored === normalizedInput) return true;
      // Fallback: compare last 10 digits (handles country code mismatches)
      const storedDigits = normalizePhoneNumberToDigits(normalizedStored);
      return inputDigits.length >= 10 && inputDigits.slice(-10) === storedDigits.slice(-10);
    });
    if (!match) return null;
    return userFromFirestore({ id: match.id, ...match.data() } as any);
  }

  async createGuestUser(firstName: string, lastName: string, phoneNumber: string): Promise<User> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    const normalizedPhone = normalizePhoneForAuth(phoneNumber);
    const newDocRef = doc(collection(db, "users"));
    const user: User = {
      id: newDocRef.id,
      firstName,
      lastName,
      phoneNumber: normalizedPhone,
      createdAt: new Date(),
    };
    await setDoc(newDocRef, {
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt,
    });
    return user;
  }

  async registerGuestForGathering(gatheringId: string, user: User): Promise<void> {
    if (!db) {
      throw new Error("Firebase is not initialized. Please check your environment variables.");
    }
    if (!user.id) throw new Error("User has no ID");

    const gatheringRef = doc(db, "gatherings", gatheringId);

    await runTransaction(db, async (transaction) => {
      const gatheringDoc = await transaction.get(gatheringRef);
      if (!gatheringDoc.exists()) throw new Error("Gathering not found");

      const data = gatheringDoc.data();
      const gathering = gatheringFromFirestore({ id: gatheringDoc.id, ...data } as any);

      if (gathering.attendeeUserIds.includes(user.id!)) {
        throw new Error("Already registered");
      }

      if (gathering.maxAttendees && gathering.attendeeUserIds.length >= gathering.maxAttendees) {
        throw new Error("Gathering is full");
      }

      const updatedAttendeeIds = [...gathering.attendeeUserIds, user.id!];
      const updatedAttendees = [
        ...(gathering.attendees || []),
        {
          id: user.id!,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber || "",
        },
      ];

      transaction.update(gatheringRef, {
        attendeeUserIds: updatedAttendeeIds,
        attendees: updatedAttendees,
      });
    });
  }
}

export const firestoreService = new FirestoreService();

