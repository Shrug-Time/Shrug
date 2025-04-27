import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types/models';

/**
 * Get all answers by a specific user
 */
export const getUserAnswers = async (userId: string, limitCount = 50): Promise<Post[]> => {
  try {
    const answersQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      where('type', '==', 'answer'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(answersQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        question: data.question || '',
        answers: data.answers || [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        lastInteraction: data.lastInteraction,
        firebaseUid: data.authorId || userId,
        username: data.username,
        name: data.name,
        categories: data.categories || [],
        totemAssociations: data.totemAssociations || [],
        score: data.score || 0,
        answerFirebaseUids: data.answerFirebaseUids || [],
        answerUsernames: data.answerUsernames || [],
        answerUserIds: data.answerUserIds || [],
        answerCount: data.answerCount || 0
      } as Post;
    });
  } catch (error) {
    console.error('Error fetching user answers:', error);
    return [];
  }
}; 