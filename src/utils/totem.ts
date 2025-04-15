import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post, Answer } from '@/types/models';
import { TotemService } from '@/services/totem';

export const calculateCrispness = (likes: number[], timestamps: string[]) => {
  if (!likes.length || !timestamps.length) return 0;

  const now = new Date().getTime();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  
  // Calculate weighted average based on time decay
  let totalWeight = 0;
  let weightedSum = 0;

  timestamps.forEach((timestamp, index) => {
    const likeTime = new Date(timestamp).getTime();
    const timeSinceLike = now - likeTime;
    const weight = Math.max(0, 1 - (timeSinceLike / ONE_WEEK_MS));
    
    weightedSum += weight * likes[index];
    totalWeight += weight;
  });

  return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
};

/**
 * Legacy totem handler - This function is replaced by standardized TotemService
 * and kept for reference only
 */
export async function handleTotemLike(
  post: Post,
  answerIdx: number,
  totemName: string,
  userId: string
) {
  console.warn('handleTotemLike is a legacy function and should not be used');
  return;
}

export async function handleTotemRefresh(
  post: Post,
  answerIdx: number,
  totemName: string,
  refreshCount: number
): Promise<boolean> {
  console.warn('handleTotemRefresh is a legacy function and should not be used');
  return false;
} 