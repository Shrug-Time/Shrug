export interface TotemLike {
  userId: string;
  originalTimestamp: number;
  lastUpdatedAt: number;
  isActive: boolean;
  value: number;
}

export interface Totem {
  name: string;
  crispness: number;
  likeHistory: TotemLike[];
}

export interface Answer {
  text: string;
  totems: Totem[];
  firebaseUid: string;
  username: string;
  name: string;
}

export interface Post {
  id: string;
  question: string;
  answers: Answer[];
  createdAt: number;
  updatedAt: number;
} 