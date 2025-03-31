import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { TotemService } from '@/services/firebase';
import { PostService } from '@/services/firebase';
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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
      setShowLoginPrompt(true);
      return;
    }

    setIsLiking(true);
    setError(null);

    try {
      // Get current like status from the post data
      const post = await PostService.getPost(postId);
      if (!post) {
        throw new Error("Post not found");
      }

      // Find the totem and check if it's currently liked
      const answer = post.answers.find(a => 
        a.totems.some(t => t.name === totemName)
      );
      if (!answer) {
        throw new Error("Answer with totem not found");
      }

      const totem = answer.totems.find(t => t.name === totemName);
      if (!totem) {
        throw new Error("Totem not found");
      }

      const isCurrentlyLiked = totem.likeHistory?.some(
        like => like.userId === user.uid && like.isActive
      ) || false;

      // Server update with correct toggle state
      await TotemService.handleTotemLike(postId, totemName, user.uid, isCurrentlyLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
      setError(error instanceof Error ? error.message : "Failed to update like status");
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