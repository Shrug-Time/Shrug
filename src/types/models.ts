import { Timestamp } from 'firebase/firestore';

export interface Totem {
  name: string;
  likes: number;
  crispness?: number;
  lastRefreshed?: number | Timestamp;
  lastLike?: number | Timestamp | null;
  likedBy?: string[];
}

export interface Answer {
  text: string;
  userId: string;
  createdAt: number | Timestamp;
  totems: Totem[];
}

export interface Post {
  id: string;
  question: string;
  userId: string;
  createdAt: number | Timestamp;
  answers: Answer[];
} 