import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post, Answer } from '@/types/models';
import { TotemService } from '@/services/totem';

export const calculateCrispness = (likes: number[], timestamps: string[]) => {
  if (!likes.length || !timestamps.length) return 0;

  const now = new Date().getTime();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  
  // Calculate individual crispness for each like
  const individualCrispnessValues = timestamps.map((timestamp, index) => {
    const likeTime = new Date(timestamp).getTime();
    const timeSinceLike = now - likeTime;
    const likeCrispness = Math.max(0, 100 * (1 - (timeSinceLike / ONE_WEEK_MS)));
    return likeCrispness;
  });

  // Calculate average crispness
  const totalCrispness = individualCrispnessValues.reduce((sum, val) => sum + val, 0);
  const averageCrispness = individualCrispnessValues.length > 0 
    ? totalCrispness / individualCrispnessValues.length 
    : 0;
  
  return parseFloat(averageCrispness.toFixed(2));
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