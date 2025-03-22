import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post, Answer } from '@/types/models';
import { TotemService } from '@/services/totem';
import { unlikeTotem, updateTotemLikes } from "@/lib/firebase/posts";

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

export async function handleTotemLike(
  post: Post,
  answerIdx: number,
  totemName: string,
  userId: string,
  isUnlike: boolean = false
) {
  console.log(`handleTotemLike - Operation type: ${isUnlike ? 'Unlike' : 'Like'}`);
  
  if (isUnlike) {
    // If we're unliking, use the unlikeTotem function which sets isUnlike=true
    console.log(`handleTotemLike - Calling unlikeTotem for post ID: ${post.id}, totem: ${totemName}`);
    await unlikeTotem(post.id, totemName);
  } else {
    // For regular like operations
    console.log(`handleTotemLike - Calling updateTotemLikes for post ID: ${post.id}, totem: ${totemName}`);
    await updateTotemLikes(post.id, totemName, false); // Explicitly set isUnlike=false
  }
}

export async function handleTotemRefresh(
  post: Post,
  answerIdx: number,
  totemName: string,
  refreshCount: number
): Promise<boolean> {
  if (refreshCount <= 0) return false;
  try {
    // For refresh operations, we need to directly call TotemService methods
    // This is a different operation than like/unlike, so we keep it separate
    const timestamp = Date.now(); // Use number timestamp instead of string
    
    // @ts-ignore - We need to use the private method for this special case
    const updatedAnswers = await TotemService.updateTotemStats(post.answers, answerIdx, totemName, post.answers[answerIdx].userId, timestamp);
    await updateDoc(doc(db, "posts", post.id), { answers: updatedAnswers });
    return true;
  } catch (error) {
    console.error('Error refreshing totem:', error);
    return false;
  }
} 