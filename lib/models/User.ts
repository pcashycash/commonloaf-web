export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  createdAt: Date;
  isDeleted?: boolean;
}

export interface UserData {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  createdAt: any; // Firestore Timestamp
  isDeleted?: boolean;
}

export function userFromFirestore(data: UserData): User {
  return {
    id: data.id,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    createdAt: data.createdAt?.toDate() || new Date(),
    isDeleted: data.isDeleted,
  };
}

export function userToFirestore(user: User): UserData {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    createdAt: user.createdAt,
    isDeleted: user.isDeleted,
  };
}

