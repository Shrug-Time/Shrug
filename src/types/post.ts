export interface Post {
  id: string;
  type: 'question' | 'answer';
  content: string;
  title?: string;
  questionId?: string;
  questionTitle?: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  upvotes: number;
  downvotes: number;
  views: number;
  commentCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  imageUrls?: string[];
} 