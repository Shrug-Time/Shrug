import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { TotemService } from '@/services/totem';
import { getPost } from '@/lib/firebase/posts';
import type { Post } from '@/types/models';
import { hasUserLikedTotem } from '@/utils/componentHelpers';

interface TotemContextType {
  user: User | null;
  isLoading: boolean;
  toggleLike: (postId: string, totemName: string) => Promise<void>;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updatePost = (post: Post) => {
    // Ensure all totems have activeLikes and likes calculated correctly
    const updatedPost = {
      ...post,
      answers: post.answers.map(answer => ({
        ...answer,
        totems: answer.totems?.map(totem => {
          // Initialize likeHistory if it doesn't exist
          const likeHistory = totem.likeHistory || [];
          
          // Calculate likes and activeLikes from likeHistory
          const activeLikes = likeHistory.filter((like: any) => like.isActive).length;
          const likes = activeLikes; // Keep likes in sync with activeLikes
          
          return {
            ...totem,
            likes,
            activeLikes,
            likeHistory,
            // Ensure timestamps are numbers
            lastInteraction: typeof totem.lastInteraction === 'string' ? new Date(totem.lastInteraction).getTime() : totem.lastInteraction,
            updatedAt: typeof totem.updatedAt === 'string' ? new Date(totem.updatedAt).getTime() : totem.updatedAt,
            createdAt: typeof totem.createdAt === 'string' ? new Date(totem.createdAt).getTime() : totem.createdAt
          };
        })
      }))
    };

    console.log('TotemContext - Updating post:', {
      id: updatedPost.id,
      question: updatedPost.question,
      answersCount: updatedPost.answers.length,
      totems: updatedPost.answers.map(answer => 
        answer.totems?.map(totem => ({
          name: totem.name,
          likes: totem.likes,
          activeLikes: totem.activeLikes,
          likeHistory: totem.likeHistory
        }))
      )
    });
    
    setPosts(prev => ({
      ...prev,
      [updatedPost.id]: updatedPost
    }));
  };

  const getPostFromState = (postId: string) => {
    return posts[postId];
  };

  const toggleLike = async (postId: string, totemName: string) => {
    if (!user) {
      throw new Error('You must be logged in to like a totem');
    }

    // Get the current post state
    let post = getPostFromState(postId);
    
    // If post is not in state, fetch it from Firestore
    if (!post) {
      console.log('ToggleLike - Post not in state, fetching from Firestore:', postId);
      const fetchedPost = await getPost(postId);
      if (!fetchedPost) {
        throw new Error('Post not found');
      }
      post = fetchedPost;
      updatePost(post);
    }

    // Find the answer containing the totem
    const answer = post.answers.find(a => 
      a.totems.some(t => t.name === totemName)
    );

    if (!answer) {
      throw new Error('Totem not found in post');
    }

    // Check if the user has already liked the totem
    const totem = answer.totems.find(t => t.name === totemName);
    if (!totem) {
      throw new Error('Totem not found');
    }

    const isLiked = hasUserLikedTotem(totem, user.uid);
    
    console.log('ToggleLike - Current state:', {
      postId,
      totemName,
      userId: user.uid,
      isLiked,
      currentLikes: totem.likes,
      likeHistory: totem.likeHistory
    });

    try {
      const answerIndex = post.answers.findIndex(a => a === answer);
      
      // Update Firestore first
      const result = await TotemService.handleTotemLike(post, answerIndex, totemName, user.uid, isLiked);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update like status');
      }
      
      // Update local state with the server response
      if (result.post) {
        console.log('ToggleLike - Updating state with server response:', {
          postId,
          totemName,
          likes: result.post.answers[answerIndex].totems.find(t => t.name === totemName)?.likes,
          likeHistory: result.post.answers[answerIndex].totems.find(t => t.name === totemName)?.likeHistory
        });
        updatePost(result.post);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  };

  return (
    <TotemContext.Provider value={{ 
      user, 
      isLoading, 
      toggleLike,
      getPost: getPostFromState,
      updatePost
    }}>
      {children}
    </TotemContext.Provider>
  );
} 