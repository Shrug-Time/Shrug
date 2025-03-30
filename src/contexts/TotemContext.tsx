import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { TotemService } from '@/services/totem';
import { PostService } from '@/services/PostService';
import type { Post } from '@/types/models';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

interface LikeContextType {
  likedTotems: Set<string>;
  toggleLike: (postId: string, totemName: string) => Promise<void>;
  isLiking: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  isLoading: true 
});

const LikeContext = createContext<LikeContextType>({ 
  likedTotems: new Set(), 
  toggleLike: async () => {}, 
  isLiking: false,
  error: null
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useLike() {
  return useContext(LikeContext);
}

interface TotemProviderProps {
  children: ReactNode;
}

export function TotemProvider({ children }: TotemProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [likedTotems, setLikedTotems] = useState<Set<string>>(new Set());
  const [isLiking, setIsLiking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth state management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Toggle like with optimistic update
  const toggleLike = async (postId: string, totemName: string) => {
    if (!user) {
      setError("You must be logged in to like a totem");
      return;
    }

    if (isLiking) {
      setError("Please wait while we process your previous action");
      return;
    }

    const key = `${postId}-${totemName}`;
    const currentlyLiked = likedTotems.has(key);

    // Optimistic update
    setLikedTotems(prev => {
      const newSet = new Set(prev);
      if (currentlyLiked) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });

    setIsLiking(true);
    setError(null);

    try {
      // Get the post
      const post = await PostService.getPost(postId);
      if (!post) {
        throw new Error("Post not found");
      }

      // Find the answer containing the totem
      const answerIndex = post.answers.findIndex(answer => 
        answer.totems.some(totem => totem.name === totemName)
      );

      if (answerIndex === -1) {
        throw new Error("Totem not found in post");
      }

      // Server update
      const result = await TotemService.handleTotemLike(
        post,
        answerIndex,
        totemName,
        user.uid,
        currentlyLiked
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to update like status");
      }

      // If the server state doesn't match our optimistic update,
      // revert the optimistic update
      if (result.isLiked !== !currentlyLiked) {
        setLikedTotems(prev => {
          const newSet = new Set(prev);
          if (currentlyLiked) {
            newSet.add(key);
          } else {
            newSet.delete(key);
          }
          return newSet;
        });
      }

    } catch (err) {
      console.error("Error toggling like:", err);
      setError(err instanceof Error ? err.message : "Failed to update like status");
      
      // Revert optimistic update on error
      setLikedTotems(prev => {
        const newSet = new Set(prev);
        if (currentlyLiked) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
        return newSet;
      });
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      <LikeContext.Provider value={{ likedTotems, toggleLike, isLiking, error }}>
        {children}
      </LikeContext.Provider>
    </AuthContext.Provider>
  );
} 