import { db } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, startAfter, collectionGroup, Timestamp } from 'firebase/firestore';
import type { Post, Answer } from '@/types/models';

export class PostService {
  static async fetchUserPosts(userID: string, pageSize = 10, lastDoc?: any): Promise<{ items: Post[]; lastDoc: any }> {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(
        postsRef,
        where('authorId', '==', userID),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];

      return {
        items: posts,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
      };
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw error;
    }
  }

  static async getPostsByTotem(totemName: string, pageSize = 10, lastDoc?: any): Promise<{ items: Post[]; lastDoc: any }> {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(
        postsRef,
        where('totems', 'array-contains', totemName),
        orderBy('likes', 'desc'),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];

      return {
        items: posts,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
      };
    } catch (error) {
      console.error('Error fetching posts by totem:', error);
      throw error;
    }
  }

  static async getPostById(postId: string): Promise<Post | null> {
    try {
      const postDoc = await getDoc(doc(db, 'posts', postId));
      if (!postDoc.exists()) return null;
      return { id: postDoc.id, ...postDoc.data() } as Post;
    } catch (error) {
      console.error('Error fetching post by ID:', error);
      throw error;
    }
  }

  static async getUserAnswers(userID: string, pageSize = 10, lastDoc?: any): Promise<{ items: Post[]; lastDoc: any }> {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(
        postsRef,
        where(`answers.${userID}`, '!=', null),
        limit(100) // Fetch more to sort client-side
      );

      const snapshot = await getDocs(q);
      let posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];

      // Sort by createdAt on client side
      posts.sort((a, b) => {
        const aAnswer = (a.answers || []).find(ans => ans.userId === userID);
        const bAnswer = (b.answers || []).find(ans => ans.userId === userID);
        const aTime = aAnswer?.createdAt instanceof Timestamp ? aAnswer.createdAt.toMillis() : 0;
        const bTime = bAnswer?.createdAt instanceof Timestamp ? bAnswer.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      // Apply pagination client-side
      const startIndex = lastDoc ? posts.findIndex(p => p.id === lastDoc.id) + 1 : 0;
      posts = posts.slice(startIndex, startIndex + pageSize);

      return {
        items: posts,
        lastDoc: posts[posts.length - 1] || null
      };
    } catch (error) {
      console.error('Error fetching user answers:', error);
      throw error;
    }
  }
} 