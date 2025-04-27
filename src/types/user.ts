export interface User {
  id?: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  featuredAnswers?: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
} 