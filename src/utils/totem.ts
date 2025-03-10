import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post } from '@/types/models';

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

export const handleTotemLike = async (
  post: Post,
  answerIdx: number,
  totemName: string,
  userId: string
) => {
  const answer = post.answers[answerIdx];
  const totem = answer.totems.find(t => t.name === totemName);
  if (!totem) return;

  if (totem.likedBy.includes(userId)) {
    throw new Error("You've already liked this totem!");
  }

  const now = new Date().toISOString();
  const updatedAnswers = post.answers.map((ans, idx) =>
    idx === answerIdx
      ? {
          ...ans,
          totems: ans.totems.map((t) =>
            t.name === totemName
              ? {
                  ...t,
                  likes: t.likes + 1,
                  likeTimes: [...(t.likeTimes || []), now],
                  likeValues: [...(t.likeValues || []), 1],
                  lastLike: now,
                  likedBy: [...t.likedBy, userId],
                  crispness: calculateCrispness(
                    [...(t.likeValues || []), 1],
                    [...(t.likeTimes || []), now]
                  )
                }
              : t
          ),
        }
      : ans
  );

  await updateDoc(doc(db, "posts", post.id), { answers: updatedAnswers });
};

export const handleTotemRefresh = async (
  post: Post,
  answerIdx: number,
  totemName: string,
  refreshCount: number
) => {
  if (refreshCount <= 0) {
    throw new Error("No refreshes left today. Upgrade to Premium for more!");
  }

  const answer = post.answers[answerIdx];
  const totem = answer.totems.find(t => t.name === totemName);
  if (!totem) return;

  const now = new Date().toISOString();
  const updatedAnswers = post.answers.map((ans, idx) =>
    idx === answerIdx
      ? {
          ...ans,
          totems: ans.totems.map((t) =>
            t.name === totemName
              ? {
                  ...t,
                  likeTimes: [...(t.likeTimes || []), now],
                  likeValues: [...(t.likeValues || []), 1],
                  lastLike: now,
                  crispness: calculateCrispness(
                    [...(t.likeValues || []), 1],
                    [...(t.likeTimes || []), now]
                  )
                }
              : t
          ),
        }
      : ans
  );

  await updateDoc(doc(db, "posts", post.id), { answers: updatedAnswers });
  return updatedAnswers;
}; 