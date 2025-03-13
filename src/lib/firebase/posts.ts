import { db } from './firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';
import { Post } from '@/types/models';

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

export async function updateTotemLikes(postId: string, totemName: string): Promise<void> {
  const postRef = doc(db, 'posts', postId);
  const postDoc = await getDoc(postRef);
  if (!postDoc.exists()) return;

  const post = postDoc.data() as Post;
  const updatedAnswers = post.answers.map(answer => ({
    ...answer,
    totems: answer.totems?.map(totem => 
      totem.name === totemName 
        ? { ...totem, likes: totem.likes + 1 }
        : totem
    )
  }));

  await updateDoc(postRef, { answers: updatedAnswers });
}

export async function refreshTotem(postId: string, totemName: string): Promise<{ crispness: number } | null> {
  const postRef = doc(db, 'posts', postId);
  const postDoc = await getDoc(postRef);
  if (!postDoc.exists()) return null;

  const post = postDoc.data() as Post;
  const newCrispness = Math.random(); // Generate a new random crispness value

  const updatedAnswers = post.answers.map(answer => ({
    ...answer,
    totems: answer.totems?.map(totem => 
      totem.name === totemName 
        ? { ...totem, crispness: newCrispness }
        : totem
    )
  }));

  await updateDoc(postRef, { answers: updatedAnswers });
  return { crispness: newCrispness };
}

export async function getPost(postId: string): Promise<Post | null> {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return null;
    }

    const data = postSnap.data();
    return convertTimestamps({
      id: postSnap.id,
      ...data,
    }) as Post;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
} 