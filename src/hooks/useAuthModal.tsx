import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useAuthModal() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, isVerified } = useAuth();
  
  // This callback checks if user is authenticated and verified before allowing an action
  const handleAuthRequired = useCallback((callback?: () => void, requireVerification = true) => {
    if (!user) {
      // If no user, open auth modal
      setIsAuthModalOpen(true);
      return false;
    }
    
    if (requireVerification && !isVerified) {
      // User is logged in but not verified
      // This will be handled by the verification banner
      return false;
    }
    
    // User is authenticated (and verified if required), proceed with callback
    if (callback) {
      callback();
    }
    return true;
  }, [user, isVerified]);

  return {
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleAuthRequired
  };
} 