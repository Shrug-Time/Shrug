import { db } from './firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { Post } from '@/types/models';

export async function getPostsForTotem(totemName: string): Promise<Post[]> {
  const postsRef = collection(db, 'posts');
  const q = query(
    postsRef,
    where('answers', 'array-contains', { totems: [{ name: totemName }] })
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Post[];
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