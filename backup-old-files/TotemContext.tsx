import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { TotemService } from '@/services/totem';
import { getPost } from '@/lib/firebase/posts';
import type { Post } from '@/types/models';
import { hasUserLikedTotem } from '@/utils/componentHelpers';
import { doc, onSnapshot } from 'firebase/firestore';

interface TotemContextType {
  user: User | null;
  isLoading: boolean;
  toggleLike: (postId: string, totemName: string) => Promise<{
    success: boolean;
    isLiked: boolean;
    post: Post;
  }>;
  getPost: (postId: string) => Post | undefined;
  updatePost: (post: Post) => void;
}

const TotemContext = createContext<TotemContextType | undefined>(undefined);

export function useTotem() {
  const context = useContext(TotemContext);
  if (context === undefined) {
    throw new Error('useTotem must be used within a TotemProvider');
  }
  return context;
}

export function TotemProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<Record<string, Post>>({});
  const [activeListeners, setActiveListeners] = useState<Record<string, () => void>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Cleanup listeners when component unmounts
  useEffect(() => {
    return () => {
      Object.values(activeListeners).forEach(unsubscribe => unsubscribe());
    };
  }, [activeListeners]);

  // TEMPORARY SOLUTION: Real-time listener for posts
  // TODO: Replace with scalable solution when implementing denormalized data structure
  const setupPostListener = (postId: string) => {
    // If we already have a listener for this post, don't create another one
    if (activeListeners[postId]) {
      console.log(`Listener already exists for post: ${postId}`);
      return;
    }

    console.log(`Setting up real-time listener for post: ${postId}`);
    const postRef = doc(db, "posts", postId);
    
    const unsubscribe = onSnapshot(postRef, (doc) => {
      console.log(`Received Firestore update for post: ${postId}`);
      console.log('Document exists:', doc.exists());
      if (doc.exists()) {
        const postData = doc.data() as Post;
        console.log('Post data:', postData);
        setPosts(prev => {
          const newPosts = { ...prev, [postId]: { ...postData, id: postId } };
          console.log('Updated posts state:', newPosts);
          return newPosts;
        });
      }
    }, (error) => {
      console.error(`Error in listener for post ${postId}:`, error);
    });

    setActiveListeners(prev => ({ ...prev, [postId]: unsubscribe }));
  };

  const toggleLike = async (postId: string, totemName: string) => {
    if (!user) {
      throw new Error("User must be logged in to like totems");
    }

    try {
      console.log("Starting toggleLike for post", postId, "totem", totemName);
      
      // Ensure we have a listener for this post
      setupPostListener(postId);
      
      // Get current like state from posts
      const currentPost = posts[postId];
      const answer = currentPost?.answers.find(a => 
        a.totems.some(t => t.name === totemName)
      );
      const totem = answer?.totems.find(t => t.name === totemName);
      const isCurrentlyLiked = totem?.likeHistory?.some(
        like => like.userId === user.uid && like.isActive
      );

      // Call handleTotemLike and get immediate result
      const result = await TotemService.handleTotemLike(
        postId,
        totemName,
        user.uid,
        isCurrentlyLiked
      );

      // Update posts state immediately with the result
      setPosts(prev => ({
        ...prev,
        [postId]: result
      }));

      // Find the updated like state
      const updatedAnswer = result.answers.find(a => 
        a.totems.some(t => t.name === totemName)
      );
      const updatedTotem = updatedAnswer?.totems.find(t => t.name === totemName);
      const isLiked = updatedTotem?.likeHistory?.some(
        like => like.userId === user.uid && like.isActive
      );

      return {
        success: true,
        isLiked: isLiked || false,
        post: result
      };
    } catch (error) {
      console.error("Error toggling like:", error);
      throw error;
    }
  };

  const updatePost = (post: Post) => {
    setPosts(prev => ({ ...prev, [post.id]: post }));
  };

  const value = {
    user,
    isLoading,
    toggleLike,
    getPost: (postId: string) => posts[postId],
    updatePost
  };

  return (
    <TotemContext.Provider value={value}>
      {children}
    </TotemContext.Provider>
  );
} 