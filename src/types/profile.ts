export interface ProfileSection {
  id: string;
  userId: string;
  title: string;
  type: 'featured-answers' | 'about' | 'custom';
  contentIds: string[];
  order: number;
  createdAt: string | number;
  updatedAt: string | number;
} 