import React, { createContext, useContext, ReactNode, useState } from 'react';
import { ContentGatingService, GatedContent, ContentPurchase } from '@/services/contentGatingService';
import { useAuth } from './AuthContext';

// Types for content gating
export interface ContentGatingStatus {
  contentId: string;
  creatorId: string;
  isGated: boolean;
  updatedAt: Date;
}

export interface ContentGatingContextType {
  setContentGatingStatus: (contentId: string, creatorId: string, isGated: boolean) => Promise<boolean>;
  checkContentGatingStatus: (contentId: string) => Promise<boolean>;
  isCreatorEligibleForGating: (creatorId: string) => Promise<boolean>;
  getGatedContentByCreator: (creatorId: string) => Promise<ContentGatingStatus[]>;
}

// Create the context with a default value
const ContentGatingContext = createContext<ContentGatingContextType>({
  setContentGatingStatus: async () => false,
  checkContentGatingStatus: async () => false,
  isCreatorEligibleForGating: async () => false,
  getGatedContentByCreator: async () => [],
});

// Hook for using the context
export const useContentGating = () => useContext(ContentGatingContext);

// Mock data for development purposes
const mockGatedContent: ContentGatingStatus[] = [
  {
    contentId: 'content-1',
    creatorId: 'creator-1',
    isGated: true,
    updatedAt: new Date()
  },
  {
    contentId: 'content-2',
    creatorId: 'creator-1',
    isGated: false,
    updatedAt: new Date()
  },
  {
    contentId: 'content-3',
    creatorId: 'creator-2',
    isGated: true,
    updatedAt: new Date()
  }
];

// Mock eligible creators
const eligibleCreatorIds = ['creator-1', 'creator-2', 'creator-3'];

// Provider component
export const ContentGatingProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [gatedContent, setGatedContent] = useState<ContentGatingStatus[]>(mockGatedContent);

  // Set content gating status
  const setContentGatingStatus = async (
    contentId: string,
    creatorId: string,
    isGated: boolean
  ): Promise<boolean> => {
    try {
      // In a real implementation, this would call an API
      // For now, we'll update our local state
      const updatedContent = [...gatedContent];
      const existingIndex = updatedContent.findIndex(
        content => content.contentId === contentId
      );

      if (existingIndex >= 0) {
        updatedContent[existingIndex] = {
          ...updatedContent[existingIndex],
          isGated,
          updatedAt: new Date()
        };
      } else {
        updatedContent.push({
          contentId,
          creatorId,
          isGated,
          updatedAt: new Date()
        });
      }

      setGatedContent(updatedContent);
      return true;
    } catch (error) {
      console.error('Error setting content gating status:', error);
      return false;
    }
  };

  // Check if content is gated
  const checkContentGatingStatus = async (contentId: string): Promise<boolean> => {
    try {
      // In a real implementation, this would call an API
      const content = gatedContent.find(c => c.contentId === contentId);
      return content ? content.isGated : false;
    } catch (error) {
      console.error('Error checking content gating status:', error);
      return false;
    }
  };

  // Check if creator is eligible for gating
  const isCreatorEligibleForGating = async (creatorId: string): Promise<boolean> => {
    try {
      // LAUNCH PHASE IMPLEMENTATION: 
      // During initial launch, we'll use very simple criteria:
      // - User must be authenticated
      // - Email must be verified
      // 
      // In the future, this will be enhanced to include:
      // - Minimum follower count
      // - Account age requirements
      // - Manual verification by admins
      // - ID verification
      
      // For now, we'll consider all authenticated users with verified emails eligible
      if (!user) return false;
      
      // Check if email is verified
      return user.emailVerified;
      
      // Eventually this will be replaced with more robust checks:
      // const userProfile = await UserService.getUserByFirebaseUid(creatorId);
      // return userProfile.verificationStatus === 'identity_verified' && 
      //        userProfile.followers.length >= MINIMUM_FOLLOWERS;
    } catch (error) {
      console.error('Error checking creator eligibility:', error);
      return false;
    }
  };

  // Get all gated content for a creator
  const getGatedContentByCreator = async (creatorId: string): Promise<ContentGatingStatus[]> => {
    try {
      // In a real implementation, this would call an API
      return gatedContent.filter(content => content.creatorId === creatorId);
    } catch (error) {
      console.error('Error fetching gated content:', error);
      return [];
    }
  };

  const value = {
    setContentGatingStatus,
    checkContentGatingStatus,
    isCreatorEligibleForGating,
    getGatedContentByCreator
  };

  return (
    <ContentGatingContext.Provider value={value}>
      {children}
    </ContentGatingContext.Provider>
  );
}; 