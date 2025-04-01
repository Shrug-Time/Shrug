import { db } from './firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';
import { Post, TotemLike, Answer, Totem } from '@/types/models';
import { auth } from './firebase';
import { TotemService } from '@/services/totem';

function convertTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return obj.toMillis();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertTimestamps(obj[key]);
    }
    return converted;
  }

  return obj;
}

export async function getPostsForTotem(totemName: string): Promise<Post[]> {
  const postsRef = collection(db, 'posts');
  const q = query(postsRef);

  const querySnapshot = await getDocs(q);
  const posts = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Post[];

  // Filter posts that have answers with the specified totem and convert timestamps
  return posts
    .filter(post => 
      post.answers.some(answer => 
        answer.totems?.some(totem => totem.name === totemName)
      )
    )
    .map(post => convertTimestamps(post));
}

/**
 * Update the likes for a totem in a post
 */
export async function updateTotemLikes(
  postId: string, 
  totemName: string,
  isUnlike: boolean = false
) {
  try {
    console.log(`updateTotemLikes - Starting ${isUnlike ? 'unlike' : 'like'} operation with postId:`, postId, 'totemName:', totemName);
    
    // Get the post document
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) {
      console.error('updateTotemLikes - Post not found');
      throw new Error('Post not found');
    }
    
    const post = { id: postId, ...postDoc.data() } as Post;
    console.log('updateTotemLikes - Post retrieved:', JSON.stringify({
      id: post.id,
      question: post.question,
      answersCount: post.answers.length
    }));
    
    // Ensure user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('updateTotemLikes - User not logged in');
      throw new Error('You must be logged in to like a totem');
    }
    
    // Find the answer containing the totem
    const answerIndex = post.answers.findIndex(answer => 
      answer.totems?.some(totem => totem.name === totemName)
    );
    
    if (answerIndex === -1) {
      console.error('updateTotemLikes - Totem not found in any answer');
      throw new Error('Totem not found in post');
    }
    
    console.log('updateTotemLikes - Found totem in answer index:', answerIndex);
    
    // Find the totem in the answer
    const answer = post.answers[answerIndex];
    const totem = answer.totems.find(totem => totem.name === totemName);
    
    console.log('updateTotemLikes - Totem before update:', JSON.stringify(totem));
    
    // Call the TotemService to handle the like/unlike
    const result = await TotemService.handleTotemLike(post, answerIndex, totemName, currentUser.uid, isUnlike);
    console.log(`updateTotemLikes - Successfully ${isUnlike ? 'unliked' : 'liked'} totem`);
    
    return result;
    
  } catch (error) {
    console.error('Error updating totem likes:', error);
    throw error;
  }
}

/**
 * Unlike a totem in a post
 */
export async function unlikeTotem(postId: string, totemName: string) {
  return updateTotemLikes(postId, totemName, true);
}

/**
 * Refresh a user's like on a totem
 */
export async function refreshUserLike(postId: string, totemName: string) {
  try {
    console.log('refreshUserLike - Starting with postId:', postId, 'totemName:', totemName);
    
    // Get the post document
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) {
      console.error('refreshUserLike - Post not found');
      throw new Error('Post not found');
    }
    
    const post = { id: postId, ...postDoc.data() } as Post;
    
    // Ensure user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('refreshUserLike - User not logged in');
      throw new Error('You must be logged in to refresh a like');
    }
    
    // Find the answer containing the totem
    const answerIndex = post.answers.findIndex(answer => 
      answer.totems?.some(totem => totem.name === totemName)
    );
    
    if (answerIndex === -1) {
      console.error('refreshUserLike - Totem not found in any answer');
      throw new Error('Totem not found in post');
    }
    
    // Call the TotemService to handle the refresh
    const result = await TotemService.refreshUserLike(post, answerIndex, totemName, currentUser.uid);
    console.log('refreshUserLike - Successfully refreshed like');
    
    return result;
  } catch (error) {
    console.error('Error refreshing user like:', error);
    throw error;
  }
}

/**
 * Refresh a totem's crispness based on all its likes
 */
export async function refreshTotem(postId: string, totemName: string): Promise<{ crispness: number } | null> {
  try {
    console.log('refreshTotem - Starting with postId:', postId, 'totemName:', totemName);
    
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    if (!postDoc.exists()) {
      console.error('refreshTotem - Post not found');
      return null;
    }

    const post = postDoc.data() as Post;
    console.log('refreshTotem - Post retrieved:', {
      id: post.id,
      question: post.question,
      answersCount: post.answers.length
    });
    
    // Find the answer that contains the totem
    const answerIdx = post.answers.findIndex(answer => 
      answer.totems?.some(totem => totem.name === totemName)
    );
    
    if (answerIdx === -1) {
      console.error('refreshTotem - Totem not found in any answer');
      throw new Error("Totem not found in this post");
    }
    console.log('refreshTotem - Found totem in answer index:', answerIdx);
    
    const answer = post.answers[answerIdx];
    const totem = answer.totems.find(t => t.name === totemName);
    
    if (!totem) {
      console.error('refreshTotem - Totem not found in the answer');
      throw new Error("Totem not found");
    }
    
    console.log('refreshTotem - Totem before refresh:', {
      name: totem.name,
      likes: totem.likes,
      likeHistory: totem.likeHistory?.length || 0,
      crispness: totem.crispness
    });
    
    // Recalculate crispness based on like history
    let newCrispness = 0;
    
    if (totem.likeHistory && totem.likeHistory.length > 0) {
      // If totem has the new likeHistory array, use it to calculate crispness
      // This will be calculated by filtering active likes and using their original timestamps
      const activeLikes = totem.likeHistory.filter((like: TotemLike) => like.isActive);
      if (activeLikes.length > 0) {
        // Calculate based on original timestamps of active likes
        const now = Date.now();
        const decayPeriod = 7 * 24 * 60 * 60 * 1000; // 1 week (FAST)
        
        // Calculate individual crispness values
        const individualCrispnessValues = activeLikes.map(like => {
          const timeSinceLike = now - like.originalTimestamp;
          return Math.max(0, 100 * (1 - (timeSinceLike / decayPeriod)));
        });
        
        // Calculate average crispness
        const totalCrispness = individualCrispnessValues.reduce((sum: number, val: number) => sum + val, 0);
        newCrispness = parseFloat((totalCrispness / activeLikes.length).toFixed(2));
      }
    }
    
    console.log('refreshTotem - New crispness calculated:', newCrispness);
    
    // Update the totem with the new crispness
    const updatedAnswers = post.answers.map((ans, idx) =>
      idx === answerIdx
        ? {
            ...ans,
            totems: ans.totems.map((t) =>
              t.name === totemName
                ? { 
                    ...t, 
                    crispness: newCrispness
                  }
                : t
            ),
          }
        : ans
    );

    await updateDoc(postRef, { answers: updatedAnswers });
    console.log('refreshTotem - Successfully updated totem crispness');
    
    return { crispness: newCrispness };
  } catch (error) {
    console.error('Error refreshing totem:', error);
    throw error;
  }
}

export async function getPost(postId: string): Promise<Post | null> {
  try {
    console.log('getPost - Fetching post with ID:', postId);
    
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      console.error('getPost - Post not found');
      return null;
    }

    const data = postSnap.data() as Record<string, any>;
    console.log('getPost - Raw post data retrieved:', {
      id: postSnap.id,
      question: data.question,
      answersCount: data.answers?.length || 0
    });
    
    // Ensure all totems have likeHistory initialized and calculate likes
    if (data.answers) {
      data.answers = data.answers.map((answer: Record<string, any>) => {
        // Convert timestamps in the answer
        const convertedAnswer = {
          ...answer,
          createdAt: answer.createdAt instanceof Timestamp ? answer.createdAt.toMillis() : answer.createdAt,
          updatedAt: answer.updatedAt instanceof Timestamp ? answer.updatedAt.toMillis() : answer.updatedAt,
          lastInteraction: answer.lastInteraction instanceof Timestamp ? answer.lastInteraction.toMillis() : answer.lastInteraction,
          totems: answer.totems?.map((totem: Record<string, any>) => {
            // Initialize likeHistory if it doesn't exist
            if (!totem.likeHistory) {
              totem.likeHistory = [];
            }
            
            // Calculate likes from likeHistory
            const activeLikes = totem.likeHistory.filter((like: Record<string, any>) => like.isActive);
            const totalLikes = activeLikes.length;
            
            // Update likes and activeLikes counts
            totem.likes = totalLikes;
            totem.activeLikes = totalLikes;
            
            // Convert timestamps in the totem
            return {
              ...totem,
              createdAt: totem.createdAt instanceof Timestamp ? totem.createdAt.toMillis() : totem.createdAt,
              updatedAt: totem.updatedAt instanceof Timestamp ? totem.updatedAt.toMillis() : totem.updatedAt,
              lastInteraction: totem.lastInteraction instanceof Timestamp ? totem.lastInteraction.toMillis() : totem.lastInteraction,
              likeHistory: totem.likeHistory.map((like: Record<string, any>) => ({
                ...like,
                originalTimestamp: like.originalTimestamp instanceof Timestamp ? like.originalTimestamp.toMillis() : like.originalTimestamp,
                lastUpdatedAt: like.lastUpdatedAt instanceof Timestamp ? like.lastUpdatedAt.toMillis() : like.lastUpdatedAt
              }))
            };
          })
        };
        
        return convertedAnswer;
      });
    }
    
    // Convert remaining timestamps in the post
    const convertedPost = {
      id: postSnap.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
      lastInteraction: data.lastInteraction instanceof Timestamp ? data.lastInteraction.toMillis() : data.lastInteraction
    } as Post;
    
    console.log('getPost - Converted post data:', {
      id: convertedPost.id,
      question: convertedPost.question,
      answersCount: convertedPost.answers?.length || 0,
      answers: convertedPost.answers?.map(answer => ({
        text: answer.text,
        totems: answer.totems?.map(totem => ({
          name: totem.name,
          likes: totem.likes,
          activeLikes: totem.activeLikes,
          likeHistory: totem.likeHistory
        }))
      }))
    });
    
    return convertedPost;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
} 