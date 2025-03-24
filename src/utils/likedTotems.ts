import { useEffect, useState } from 'react';

// Key for localStorage
const LIKED_TOTEMS_KEY = 'shrug_liked_totems';

// Helper to get unique key for a totem
export const getTotemKey = (postId: string, totemName: string) => `${postId}-${totemName}`;

/**
 * Check if localStorage is available
 */
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = 'shrug_test';
    localStorage.setItem(testKey, 'test');
    const result = localStorage.getItem(testKey) === 'test';
    localStorage.removeItem(testKey);
    return result;
  } catch (e) {
    console.warn('localStorage is not available:', e);
    return false;
  }
};

/**
 * Load liked totems from localStorage
 */
export const loadLikedTotems = (userId: string): Record<string, boolean> => {
  try {
    if (!userId) {
      console.warn('loadLikedTotems: No userId provided');
      return {};
    }

    if (!isLocalStorageAvailable()) {
      return {};
    }
    
    const storageKey = `${LIKED_TOTEMS_KEY}_${userId}`;
    const storageData = localStorage.getItem(storageKey);
    
    if (storageData) {
      console.log(`Loaded ${storageData.length} bytes of liked totems data for user ${userId}`);
      const parsed = JSON.parse(storageData);
      
      // Validate the data structure
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      } else {
        console.error('Invalid like data structure in localStorage:', parsed);
        return {};
      }
    }
  } catch (error) {
    console.error('Error loading liked totems from localStorage:', error);
  }
  return {};
};

/**
 * Save liked totems to localStorage with error handling for storage limits
 */
export const saveLikedTotems = (userId: string, likedTotems: Record<string, boolean>): boolean => {
  try {
    if (!userId) {
      console.warn('saveLikedTotems: No userId provided');
      return false;
    }

    if (!isLocalStorageAvailable()) {
      return false;
    }
    
    const storageKey = `${LIKED_TOTEMS_KEY}_${userId}`;
    const serialized = JSON.stringify(likedTotems);
    
    // Log data size for debugging
    console.log(`Saving ${serialized.length} bytes of liked totems data for user ${userId}`);
    
    // Check data size (localStorage usually has ~5MB limit)
    if (serialized.length > 2000000) { // 2MB warning threshold
      console.warn('Liked totems data is very large and may hit storage limits soon');
      
      // If we're approaching limit, consider pruning very old entries in the future
      // For now just log a warning
    }
    
    localStorage.setItem(storageKey, serialized);
    return true;
  } catch (error) {
    // Handle quota exceeded errors specially
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded when saving liked totems');
      return false;
    }
    
    console.error('Error saving liked totems to localStorage:', error);
    return false;
  }
};

/**
 * Add a liked totem to the store
 */
export const addLikedTotem = (userId: string, postId: string, totemName: string): boolean => {
  if (!userId || !postId || !totemName) {
    console.warn('addLikedTotem: Missing required parameters', { userId, postId, totemName });
    return false;
  }
  
  const key = getTotemKey(postId, totemName);
  const likedTotems = loadLikedTotems(userId);
  likedTotems[key] = true;
  console.log(`Adding like for totem ${totemName} in post ${postId} for user ${userId}`);
  return saveLikedTotems(userId, likedTotems);
};

/**
 * Remove a liked totem from the store
 */
export const removeLikedTotem = (userId: string, postId: string, totemName: string): boolean => {
  if (!userId || !postId || !totemName) {
    console.warn('removeLikedTotem: Missing required parameters', { userId, postId, totemName });
    return false;
  }
  
  const key = getTotemKey(postId, totemName);
  const likedTotems = loadLikedTotems(userId);
  const wasLiked = likedTotems[key] === true;
  delete likedTotems[key];
  console.log(`Removing like for totem ${totemName} in post ${postId} for user ${userId}`);
  const saveResult = saveLikedTotems(userId, likedTotems);
  return wasLiked && saveResult;
};

/**
 * Check if a totem is liked
 */
export const isTotemLiked = (userId: string, postId: string, totemName: string): boolean => {
  if (!userId || !postId || !totemName) {
    return false;
  }
  
  const key = getTotemKey(postId, totemName);
  const likedTotems = loadLikedTotems(userId);
  const isLiked = likedTotems[key] === true;
  console.log(`Checking if totem ${totemName} in post ${postId} is liked by user ${userId}: ${isLiked}`);
  return isLiked;
};

/**
 * Custom hook to use liked totems state with localStorage persistence
 */
export const useLikedTotems = (userId: string | null) => {
  const [likedTotems, setLikedTotemsState] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Load liked totems from localStorage on mount and when userId changes
  useEffect(() => {
    if (userId) {
      console.log(`useLikedTotems: Loading likes for user ${userId}`);
      const storedLikes = loadLikedTotems(userId);
      setLikedTotemsState(storedLikes);
      setIsLoaded(true);
    } else {
      setLikedTotemsState({});
      setIsLoaded(true);
    }
  }, [userId]);
  
  // Wrapper for setLikedTotems that also updates localStorage
  const setLikedTotems = (newValue: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    setLikedTotemsState(prev => {
      // Handle function updates
      const updatedValue = typeof newValue === 'function' ? newValue(prev) : newValue;
      
      // Save to localStorage if we have a userId
      if (userId) {
        const saveResult = saveLikedTotems(userId, updatedValue);
        if (!saveResult) {
          console.warn('Failed to save liked totems to localStorage');
        }
      }
      
      return updatedValue;
    });
  };
  
  return { likedTotems, setLikedTotems, isLoaded };
}; 