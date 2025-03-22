import { useEffect, useState } from 'react';

// Key for localStorage
const LIKED_TOTEMS_KEY = 'shrug_liked_totems';

// Helper to get unique key for a totem
export const getTotemKey = (postId: string, totemName: string) => `${postId}-${totemName}`;

/**
 * Load liked totems from localStorage
 */
export const loadLikedTotems = (userId: string): Record<string, boolean> => {
  try {
    const storageData = localStorage.getItem(`${LIKED_TOTEMS_KEY}_${userId}`);
    if (storageData) {
      return JSON.parse(storageData);
    }
  } catch (error) {
    console.error('Error loading liked totems from localStorage:', error);
  }
  return {};
};

/**
 * Save liked totems to localStorage
 */
export const saveLikedTotems = (userId: string, likedTotems: Record<string, boolean>): void => {
  try {
    localStorage.setItem(
      `${LIKED_TOTEMS_KEY}_${userId}`, 
      JSON.stringify(likedTotems)
    );
  } catch (error) {
    console.error('Error saving liked totems to localStorage:', error);
  }
};

/**
 * Add a liked totem to the store
 */
export const addLikedTotem = (userId: string, postId: string, totemName: string): void => {
  const key = getTotemKey(postId, totemName);
  const likedTotems = loadLikedTotems(userId);
  likedTotems[key] = true;
  saveLikedTotems(userId, likedTotems);
};

/**
 * Remove a liked totem from the store
 */
export const removeLikedTotem = (userId: string, postId: string, totemName: string): void => {
  const key = getTotemKey(postId, totemName);
  const likedTotems = loadLikedTotems(userId);
  delete likedTotems[key];
  saveLikedTotems(userId, likedTotems);
};

/**
 * Check if a totem is liked
 */
export const isTotemLiked = (userId: string, postId: string, totemName: string): boolean => {
  if (!userId) return false;
  
  const key = getTotemKey(postId, totemName);
  const likedTotems = loadLikedTotems(userId);
  return likedTotems[key] === true;
};

/**
 * Custom hook to use liked totems state with localStorage persistence
 */
export const useLikedTotems = (userId: string | null) => {
  const [likedTotems, setLikedTotemsState] = useState<Record<string, boolean>>({});
  
  // Load liked totems from localStorage on mount and when userId changes
  useEffect(() => {
    if (userId) {
      const storedLikes = loadLikedTotems(userId);
      setLikedTotemsState(storedLikes);
    } else {
      setLikedTotemsState({});
    }
  }, [userId]);
  
  // Wrapper for setLikedTotems that also updates localStorage
  const setLikedTotems = (newValue: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    setLikedTotemsState(prev => {
      // Handle function updates
      const updatedValue = typeof newValue === 'function' ? newValue(prev) : newValue;
      
      // Save to localStorage if we have a userId
      if (userId) {
        saveLikedTotems(userId, updatedValue);
      }
      
      return updatedValue;
    });
  };
  
  return { likedTotems, setLikedTotems };
}; 