import { collection, query, where, getDocs, orderBy, limit, getFirestore, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types/models';

/**
 * Get all answers by a specific user
 */
export const getUserAnswers = async (userId: string, limitCount = 50): Promise<Post[]> => {
  try {
    console.log(`Fetching answers for user: ${userId} with limit: ${limitCount}`);
    
    const answersQuery = query(
      collection(db, 'posts'),
      where('firebaseUid', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    console.log('Executing Firestore query for answers...');
    const snapshot = await getDocs(answersQuery);
    console.log(`Query returned ${snapshot.docs.length} documents`);
    
    const result = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        question: data.question || '',
        answers: data.answers || [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        lastInteraction: data.lastInteraction,
        firebaseUid: data.firebaseUid || userId,
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
    
    console.log(`Processed ${result.length} answers`);
    
    // If no results, try the alternative method
    if (result.length === 0) {
      console.log('No results from primary method, trying alternative approach...');
      const altResults = await getUserAnswersAlternative(userId, limitCount);
      return altResults;
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching user answers:', error);
    // Try the alternative method if primary method fails
    try {
      console.log('Primary method failed, trying alternative approach...');
      return await getUserAnswersAlternative(userId, limitCount);
    } catch (altError) {
      console.error('Alternative method also failed:', altError);
      return [];
    }
  }
}; 

/**
 * Alternative method to get user answers if standard method fails
 * This uses a different approach that might work better in some scenarios
 */
export const getUserAnswersAlternative = async (userId: string, limitCount = 50): Promise<Post[]> => {
  try {
    console.log(`Using alternative method to fetch answers for user: ${userId}`);
    
    // First get all posts
    const postsQuery = query(
      collection(db, 'posts'),
      limit(200) // Get a larger set and filter client-side
    );
    
    const snapshot = await getDocs(postsQuery);
    console.log(`Alternative query returned ${snapshot.docs.length} documents`);
    
    // Filter for user's answers client-side
    const filteredDocs = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.firebaseUid === userId;
    }).slice(0, limitCount);
    
    console.log(`Found ${filteredDocs.length} answers after client-side filtering`);
    
    // Map to Post objects
    const result = filteredDocs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        question: data.question || '',
        answers: data.answers || [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        lastInteraction: data.lastInteraction,
        firebaseUid: data.firebaseUid || userId,
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
    
    return result;
  } catch (error) {
    console.error('Error in alternative method:', error);
    return [];
  }
};

/**
 * Get answers by a user filtered by a specific totem
 */
export const getUserAnswersByTotem = async (userId: string, totemName: string, limitCount = 50): Promise<Post[]> => {
  try {
    // First get all the user's posts
    const userPosts = await getUserAnswers(userId, limitCount);
    
    // Filter to only include posts that have answers (are answers themselves)
    const answers = userPosts.filter(post => Array.isArray(post.answers) && post.answers.length > 0);
    
    // Then filter them by totem
    return answers.filter(post => {
      // Check if the post has the totem in its associations
      const hasTotemInPost = post.totemAssociations?.some(
        association => association.totemName === totemName
      );
      
      // Check if any of the post's answers have the totem
      const hasTotemInAnswers = post.answers?.some(answer => 
        answer.totems?.some(totem => totem.name === totemName)
      );
      
      return hasTotemInPost || hasTotemInAnswers;
    });
  } catch (error) {
    console.error('Error fetching user answers by totem:', error);
    return [];
  }
}; 