"use client";

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';
import { QuestionList } from '@/components/questions/QuestionList';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { PostService } from '@/services/firebase';
import { UserService } from '@/services/userService';
import { handleTotemLike as utilHandleTotemLike, handleTotemRefresh as utilHandleTotemRefresh } from '@/utils/totem';
import { useRouter } from 'next/navigation';
import type { Post, UserProfile } from '@/types/models';
import { useState } from 'react';
import { USER_FIELDS } from '@/constants/fields';
import { detectUserIdentifierType, extractUserIdentifier } from '@/utils/userIdHelpers';

interface PageProps {
  params: { userID: string };
}

// Create a client with configuration for better UX
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function ProfileContent({ userID }: { userID: string }) {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Determine identifier type (username, firebaseUid, or legacy userId)
  const idType = detectUserIdentifierType(userID);
  console.log(`Profile - Identified user ID type: ${idType} for value: ${userID}`);

  // Fetch user profile using standardized methods
  const { 
    data: userData,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser
  } = useQuery({
    queryKey: ['user', userID, idType],
    queryFn: async () => {
      try {
        let profile = null;

        // Handle different ID types appropriately
        if (idType === 'firebaseUid') {
          profile = await UserService.getUserByFirebaseUid(userID);
        } else if (idType === 'username') {
          profile = await UserService.getUserByUsername(userID);
        } else {
          // For legacy IDs, try both methods
          profile = await UserService.getUserByFirebaseUid(userID) || 
                    await UserService.getUserByUsername(userID);
        }
        
        // If we didn't find a profile, throw an error
        if (!profile) {
          throw new Error(`User profile not found for ID: ${userID}`);
        }
        
        return profile;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }
    },
  });

  // Fetch user posts with better error handling
  const {
    data: userPosts,
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts
  } = useQuery({
    queryKey: ['userPosts', userID, idType],
    queryFn: async () => {
      console.log('Fetching posts for user:', userID);
      try {
        let userIdentifier = userID;
        
        // If we have user data, prefer firebaseUid for consistency
        if (userData) {
          userIdentifier = userData.firebaseUid || userID;
        }
        
        const posts = await PostService.getUserPosts(userIdentifier);
        console.log(`Fetched ${posts.length} posts for user ${userIdentifier}`);
        return posts;
      } catch (error) {
        console.error('Error fetching user posts:', error);
        setToastMessage({ 
          message: 'Failed to load posts. Please try again.', 
          type: 'error' 
        });
        throw error;
      }
    },
    // Don't refetch on window focus to avoid unnecessary requests
    refetchOnWindowFocus: false,
    // Retry failed requests
    retry: 2,
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
  });

  const handleSelectQuestion = (post: Post) => {
    router.push(`/post/${post.id}`);
  };

  const handleTotemLike = async (post: Post, answerIdx: number, totemName: string) => {
    if (!userData) return;
    
    try {
      // Use firebaseUid as the standard identifier for likes
      const userId = userData.firebaseUid;
      await utilHandleTotemLike(post, answerIdx, totemName, userId);
      // Refetch posts to update the UI
      refetchPosts();
    } catch (error) {
      console.error('Error liking totem:', error);
      setToastMessage({ 
        message: 'Failed to like totem. Please try again.', 
        type: 'error' 
      });
    }
  };

  const handleTotemRefresh = async (post: Post, answerIdx: number, totemName: string) => {
    if (!userData) return;
    
    try {
      await utilHandleTotemRefresh(post, answerIdx, totemName, userData.refreshesRemaining || 0);
      // Refetch posts to update the UI
      refetchPosts();
      // Also refetch user to update refreshes remaining
      refetchUser();
    } catch (error) {
      console.error('Error refreshing totem:', error);
      setToastMessage({ 
        message: 'Failed to refresh totem. Please try again.', 
        type: 'error' 
      });
    }
  };

  // Handle retry for both user and posts
  const handleRetry = () => {
    if (userError) refetchUser();
    if (postsError) refetchPosts();
    setToastMessage(null);
  };

  // Show loading state
  if (userLoading || postsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Loading profile data...</p>
        </div>
      </div>
    );
  }

  // Show error state with retry button
  if (userError || postsError) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-gray-700 mb-4">
            {(userError as Error)?.message || (postsError as Error)?.message || 'An error occurred while loading the profile.'}
          </p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!userData) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">User Not Found</h2>
          <p className="text-gray-600 mb-4">
            The user you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Show toast messages */}
      {toastMessage && (
        <Toast 
          message={toastMessage.message} 
          type={toastMessage.type}
        />
      )}
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{userData.name || 'User'}</h1>
        <p className="text-gray-600">@{userData.username}</p>
        <p className="text-gray-600 mt-2">{userData.bio || 'No bio provided'}</p>
      </div>
      
      {userPosts && userPosts.length > 0 ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Posts and Answers</h2>
            <QuestionList 
              posts={userPosts}
              onWantToAnswer={(post) => router.push(`/post/${post.id}`)}
              hasNextPage={false}
              isLoading={false}
              onLoadMore={() => {}}
              showAllTotems={false}
            />
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-500">No posts or answers yet</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Explore Questions
          </button>
        </div>
      )}
    </div>
  );
}

export default function UserProfilePage({ params }: PageProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ProfileContent userID={params.userID} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
} 