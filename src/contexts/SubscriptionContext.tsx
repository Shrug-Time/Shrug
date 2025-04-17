import React, { createContext, useContext, useEffect, useState } from 'react';
import { SubscriptionService } from '@/services/subscriptionService';
import { useAuth } from './AuthContext';
import { MembershipTier } from '@/types/models';

interface SubscriptionContextType {
  isPremium: boolean;
  membershipTier: MembershipTier;
  refreshesRemaining: number;
  loadingSubscription: boolean;
  updateMembership: (tier: MembershipTier) => Promise<void>;
  refreshSubscriptionState: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('free');
  const [refreshesRemaining, setRefreshesRemaining] = useState(0);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Load subscription data when user changes
  useEffect(() => {
    if (user && userProfile) {
      setMembershipTier(userProfile.membershipTier);
      setIsPremium(userProfile.membershipTier === 'premium');
      loadRefreshesRemaining();
    } else {
      setIsPremium(false);
      setMembershipTier('free');
      setRefreshesRemaining(0);
    }
    setLoadingSubscription(false);
  }, [user, userProfile]);

  const loadRefreshesRemaining = async () => {
    if (!user) return;
    
    try {
      const refreshes = await SubscriptionService.getRemainingRefreshes(user.uid);
      setRefreshesRemaining(refreshes);
    } catch (error) {
      console.error('Error loading refreshes:', error);
    }
  };

  const updateMembership = async (tier: MembershipTier) => {
    if (!user) return;
    
    try {
      setLoadingSubscription(true);
      const updatedProfile = await SubscriptionService.updateMembershipTier(user.uid, tier);
      
      if (updatedProfile) {
        setMembershipTier(updatedProfile.membershipTier);
        setIsPremium(updatedProfile.membershipTier === 'premium');
        setRefreshesRemaining(updatedProfile.refreshesRemaining);
      }
    } catch (error) {
      console.error('Error updating membership:', error);
      throw error;
    } finally {
      setLoadingSubscription(false);
    }
  };
  
  const refreshSubscriptionState = async () => {
    if (!user) return;
    
    try {
      setLoadingSubscription(true);
      await loadRefreshesRemaining();
    } catch (error) {
      console.error('Error refreshing subscription state:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const value = {
    isPremium,
    membershipTier,
    refreshesRemaining,
    loadingSubscription,
    updateMembership,
    refreshSubscriptionState
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  
  return context;
} 