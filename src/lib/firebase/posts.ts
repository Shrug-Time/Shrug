import { db } from './firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';
import { Post } from '@/types/models';
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
export async function updateTotemLikes(postId: string, totemName: string) {
  try {
    console.log('updateTotemLikes - Starting with postId:', postId, 'totemName:', totemName);
    
    // Get the post document
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) {
      console.error('updateTotemLikes - Post not found');
      throw new Error('Post not found');
    }
    
    const post = postDoc.data() as Post;
    console.log('updateTotemLikes - Post retrieved:', JSON.stringify({
      id: post.id,
      question: post.question,
      answersCount: post.answers.length
    }));
    
    // Get the current user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('updateTotemLikes - User not logged in');
      throw new Error('You must be logged in to like a totem');
    }
    console.log('updateTotemLikes - Current user:', currentUser.uid);
    
    // Find the answer with the totem
    const answerIndex = post.answers.findIndex(answer => 
      answer.totems.some(totem => totem.name === totemName)
    );
    
    if (answerIndex === -1) {
      console.error('updateTotemLikes - Totem not found in any answer');
      throw new Error('Totem not found in any answer');
    }
    console.log('updateTotemLikes - Found totem in answer index:', answerIndex);
    
    // Check if the totem exists in the answer
    const totem = post.answers[answerIndex].totems.find(t => t.name === totemName);
    console.log('updateTotemLikes - Totem before update:', JSON.stringify(totem));
    
    // Update the totem likes
    await TotemService.handleTotemLike(post, answerIndex, totemName, currentUser.uid);
    console.log('updateTotemLikes - Successfully updated totem likes');
    
    return { success: true };
  } catch (error) {
    console.error('Error updating totem likes:', error);
    throw error;
  }
}

export async function refreshTotem(postId: string, totemName: string): Promise<{ crispness: number } | null> {
  const postRef = doc(db, 'posts', postId);
  const postDoc = await getDoc(postRef);
  if (!postDoc.exists()) return null;

  const post = postDoc.data() as Post;
  
  // Find the answer that contains the totem
  const answerIdx = post.answers.findIndex(answer => 
    answer.totems?.some(totem => totem.name === totemName)
  );
  
  if (answerIdx === -1) {
    throw new Error("Totem not found in this post");
  }
  
  const answer = post.answers[answerIdx];
  const totem = answer.totems.find(t => t.name === totemName);
  
  if (!totem) {
    throw new Error("Totem not found");
  }
  
  // Recalculate crispness based on like history
  const newCrispness = TotemService.calculateCrispness(
    totem.likeValues || [],
    totem.likeTimes || [],
    totem.decayModel
  );
  
  // Update the totem with the new crispness
  const updatedAnswers = post.answers.map((ans, idx) =>
    idx === answerIdx
      ? {
          ...ans,
          totems: ans.totems.map((t) =>
            t.name === totemName
              ? { ...t, crispness: newCrispness }
              : t
          ),
        }
      : ans
  );

  await updateDoc(postRef, { answers: updatedAnswers });
  return { crispness: newCrispness };
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

    const data = postSnap.data();
    console.log('getPost - Raw post data retrieved:', {
      id: postSnap.id,
      question: data.question,
      answersCount: data.answers?.length || 0
    });
    
    // Check if any totems have undefined likedBy arrays
    const totemsWithUndefinedLikedBy = [];
    if (data.answers) {
      for (const answer of data.answers) {
        if (answer.totems) {
          for (const totem of answer.totems) {
            if (!totem.likedBy) {
              totemsWithUndefinedLikedBy.push({
                totemName: totem.name,
                answerText: answer.text.substring(0, 30) + '...'
              });
            }
          }
        }
      }
    }
    
    if (totemsWithUndefinedLikedBy.length > 0) {
      console.error('getPost - Found totems with undefined likedBy:', totemsWithUndefinedLikedBy);
    }
    
    const convertedPost = convertTimestamps({
      id: postSnap.id,
      ...data,
    }) as Post;
    
    console.log('getPost - Converted post data');
    
    return convertedPost;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
} 