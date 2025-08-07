"use client";

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';
import { FollowButton } from '@/components/common/FollowButton';
import { QuestionList } from '@/components/questions/QuestionList';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { PostService } from '@/services/standardized';
import { UserService } from '@/services/userService';
import { ProfileSectionService } from '@/services/profileSectionService';
import { SectionManager } from '@/components/profile/SectionManager';
import { Sidebar } from '@/components/layout/Sidebar';
import { OtherUserProfileSidebar } from '@/components/profile/OtherUserProfileSidebar';
import { handleTotemLike as utilHandleTotemLike, handleTotemRefresh as utilHandleTotemRefresh } from '@/utils/totem';
import { useRouter, useParams } from 'next/navigation';
import type { Post, UserProfile, ProfileSection } from '@/types/models';
import { useState, useEffect } from 'react';
import { USER_FIELDS } from '@/constants/fields';
import { detectUserIdentifierType } from '@/utils/userIdHelpers';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

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
  const { user: currentUser } = useAuth();
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('home');
  const [isEditingSections, setIsEditingSections] = useState<boolean>(false);
  const [isCurrentUserProfile, setIsCurrentUserProfile] = useState<boolean>(false);
  const [sectionStartIndex, setSectionStartIndex] = useState<Map<string, number>>(new Map());
  const [fallbackStartIndex, setFallbackStartIndex] = useState(0);

  // Determine identifier type (username, firebaseUid, or legacy userId)
  const idType = detectUserIdentifierType(userID);

  const navigateSection = (sectionId: string, direction: 'left' | 'right', totalItems: number) => {
    const currentStart = sectionStartIndex.get(sectionId) || 0;
    let newStart;
    
    if (direction === 'right') {
      newStart = Math.min(currentStart + 3, Math.max(0, totalItems - 3));
    } else {
      newStart = Math.max(0, currentStart - 3);
    }
    
    setSectionStartIndex(prev => new Map(prev.set(sectionId, newStart)));
  };

  const navigateFallback = (direction: 'left' | 'right', totalItems: number) => {
    let newStart;
    
    if (direction === 'right') {
      newStart = Math.min(fallbackStartIndex + 3, Math.max(0, totalItems - 3));
    } else {
      newStart = Math.max(0, fallbackStartIndex - 3);
    }
    
    setFallbackStartIndex(newStart);
  };

  const getSectionSlice = (sectionId: string, items: Post[]) => {
    const start = sectionStartIndex.get(sectionId) || 0;
    return items.slice(start, start + 3);
  };

  // Use hooks to get profile data
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
        
        // Check if this is the current user's profile
        const currentUser = await UserService.getCurrentUser();
        if (currentUser && currentUser.firebaseUid === profile.firebaseUid) {
          setIsCurrentUserProfile(true);
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
      try {
        let userIdentifier = userID;
        
        // If we have user data, prefer firebaseUid for consistency
        if (userData) {
          userIdentifier = userData.firebaseUid || userID;
        }
        
        // Use standardized PostService methods
        const userPostsResult = await PostService.getUserPosts(userIdentifier);
        const userAnswersResult = await PostService.getUserAnswers(userIdentifier);
        
        // Combine posts and answers
        const combinedPosts = [
          ...(userPostsResult.posts || []),
          ...(userAnswersResult.posts || [])
        ];
        
        // Remove duplicates
        const uniquePostIds = new Set<string>();
        const uniquePosts = combinedPosts.filter(post => {
          if (uniquePostIds.has(post.id)) return false;
          uniquePostIds.add(post.id);
          return true;
        });
        
        return uniquePosts;
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
  
  // Fetch profile sections
  const {
    data: sections,
    isLoading: sectionsLoading,
    error: sectionsError,
    refetch: refetchSections
  } = useQuery({
    queryKey: ['profileSections', userID],
    queryFn: async () => {
      try {
        if (!userData) return [];
        
        const userSections = await ProfileSectionService.getSections(userData.firebaseUid);
        return userSections;
      } catch (error) {
        console.error('Error fetching profile sections:', error);
        setToastMessage({
          message: 'Failed to load profile sections. Please try again.',
          type: 'error'
        });
        throw error;
      }
    },
    enabled: !!userData,
  });
  
  // Fetch section content
  const getSectionContent = async (section: ProfileSection) => {
    try {
      if (!userData) return [];
      
      const sectionContent = await ProfileSectionService.getSectionContent(
        userData.firebaseUid,
        section
      );
      
      return sectionContent;
    } catch (error) {
      console.error(`Error fetching content for section ${section.title}:`, error);
      return [];
    }
  };
  
  // State for section content
  const [sectionContent, setSectionContent] = useState<Map<string, Post[]>>(new Map());
  
  // Load content for all sections when they change
  const loadAllSectionContent = async () => {
    if (!sections || sections.length === 0 || !userData) return;
    
    const contentMap = new Map<string, Post[]>();
    
    for (const section of sections) {
      const content = await getSectionContent(section);
      contentMap.set(section.id, content);
    }
    
    setSectionContent(contentMap);
  };
  
  // Load section content when sections are loaded
  useEffect(() => {
    if (sections) {
      loadAllSectionContent();
    }
  }, [sections]);

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
    if (sectionsError) refetchSections();
    setToastMessage(null);
  };
  
  // Handle section editing
  const handleSaveSections = () => {
    setIsEditingSections(false);
    refetchSections();
    // Reload section content
    loadAllSectionContent();
  };

  // If we're editing sections, show the section manager
  if (isEditingSections && userData) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activePage="content" />
        <div className="flex-1 p-4">
          <SectionManager 
            userId={userData.firebaseUid}
            onSave={handleSaveSections}
            onCancel={() => setIsEditingSections(false)}
          />
        </div>
      </div>
    );
  }
  
  // Show loading state
  if (userLoading || (postsLoading && !userPosts)) {
    return (
      <div className="flex min-h-screen">
        {isCurrentUserProfile ? (
          <Sidebar activePage="content" />
        ) : (
          userData && <OtherUserProfileSidebar profileUser={userData} />
        )}
        <div className="flex-1 p-4 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }
  
  // Show error state with retry button
  if (userError || postsError) {
    return (
      <div className="flex min-h-screen">
        {isCurrentUserProfile ? (
          <Sidebar activePage="content" />
        ) : (
          userData && <OtherUserProfileSidebar profileUser={userData} />
        )}
        <div className="flex-1 p-4">
          <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-center">
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
      </div>
    );
  }
  
  // Show not found state
  if (!userData) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activePage="content" />
        <div className="flex-1 p-4">
          <div className="max-w-4xl mx-auto bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
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
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen">
      {/* Use different sidebars based on whether it's the current user's profile */}
      {isCurrentUserProfile ? (
        <Sidebar activePage="content" />
      ) : (
        <OtherUserProfileSidebar profileUser={userData} />
      )}
      
      <div className="flex-1">
        {/* Show toast messages */}
        {toastMessage && (
          <Toast 
            message={toastMessage.message} 
            type={toastMessage.type}
          />
        )}
        
        <div className="max-w-4xl mx-auto p-4">
          {/* Profile Header */}
          <div className="flex items-start mb-8">
            {/* Profile Image */}
            <div className="mr-6 relative">
              <div className="w-24 h-24 rounded-full overflow-hidden">
                {userData.photoURL ? (
                  <Image 
                    src={userData.photoURL} 
                    alt={`${userData.name}'s profile`}
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-500 text-2xl font-bold">
                    {userData.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            {/* Profile Info */}
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">{userData.name || 'User'}</h1>
                  <p className="text-gray-600">@{userData.username}</p>
                  <p className="text-gray-600 mt-2">{userData.bio || 'No bio provided'}</p>
                  
                  {/* Follower/Following counts */}
                  <div className="flex space-x-4 mt-3 text-sm text-gray-500">
                    <Link 
                      href={`/profile/${userData.firebaseUid}/followers`}
                      className="hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {userData.followers?.length || 0} followers
                    </Link>
                    <Link 
                      href={`/profile/${userData.firebaseUid}/following`}
                      className="hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {userData.following?.length || 0} following
                    </Link>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {/* Follow Button - Only show if not current user */}
                  {!isCurrentUserProfile && currentUser && (
                    <FollowButton
                      currentUserId={currentUser.uid}
                      targetUserId={userData.firebaseUid}
                      onError={(message) => setToastMessage({ message, type: 'error' })}
                      onFollowChange={() => {
                        // Refetch user data to update follower counts
                        refetchUser();
                      }}
                    />
                  )}
                  
                  {/* Profile Management Buttons - Only show for current user */}
                  {isCurrentUserProfile && (
                    <>
                      <button
                        onClick={() => setIsEditingSections(true)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Customize Page
                      </button>
                      <button
                        onClick={() => router.push('/profile/customize')}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Manage Posts
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex flex-wrap -mb-px">
              <button
                onClick={() => setSelectedTab('home')}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'home'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setSelectedTab('about')}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'about'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                About
              </button>
              <button
                onClick={() => setSelectedTab('comments')}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'comments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Comments
              </button>
              <button
                onClick={() => setSelectedTab('activity')}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Activity
              </button>
            </div>
          </div>
          
          {/* Home Tab Content with Sections */}
          {selectedTab === 'home' && (
            <div className="space-y-8">
              {sectionsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : sections && sections.length > 0 ? (
                <div className="space-y-8">
                  {sections
                    .filter(section => section.isVisible)
                    .map(section => {
                      const sectionPosts = sectionContent.get(section.id) || [];
                      
                      if (sectionPosts.length === 0 && !sectionsLoading) {
                        return (
                          <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center space-x-3">
                                <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  {section.type === 'custom' ? 'Custom' : 'Auto'}
                                </span>
                                {section.organizationMethod === 'series' && (
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                    📚 Curriculum
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-center py-12">
                              <div className="text-center text-gray-400">
                                <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </div>
                                <p className="text-sm">No content yet</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                              <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {section.type === 'custom' ? 'Custom' : 'Auto'}
                              </span>
                              {section.organizationMethod === 'series' && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                  📚 Curriculum
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <span>{sectionPosts.length} item{sectionPosts.length === 1 ? '' : 's'}</span>
                            </div>
                          </div>
                          
                          {/* Grid layout with 3 cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getSectionSlice(section.id, sectionPosts).map((post, index) => {
                              // Get the first answer for preview
                              const firstAnswer = post.answers && post.answers.length > 0 ? post.answers[0] : null;
                              const firstParagraph = firstAnswer?.text?.split('\n')[0] || '';
                              
                              // Get the top totem for this post
                              const topTotem = firstAnswer?.totems?.reduce((top, current) => {
                                const topLikes = current.likeHistory?.length || 0;
                                const currentLikes = current.likeHistory?.length || 0;
                                return currentLikes > topLikes ? current : top;
                              }, firstAnswer.totems[0]);

                              return (
                                <div key={post.id} className="bg-white rounded-lg shadow p-3 hover:bg-gray-50 transition-colors">
                                  <div className="mb-2">
                                    <p className="text-sm text-gray-600">
                                      Posted by <span className="text-blue-600 font-medium">{post.username || 'Unknown'}</span>
                                    </p>
                                  </div>
                                  
                                  <div className="mb-3">
                                    <Link 
                                      href={`/post/${post.id}`}
                                      className="block text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                                    >
                                      {post.question}
                                    </Link>
                                  </div>
                                  
                                  {firstParagraph && (
                                    <div className="mb-3">
                                      <p className="text-gray-600 text-sm line-clamp-2">
                                        {firstParagraph}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      {topTotem && (
                                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                          {topTotem.name}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-500">
                                        {post.answers?.length || 0} answers
                                      </span>
                                    </div>
                                    <Link 
                                      href={`/post/${post.id}`}
                                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                    >
                                      +
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Navigation arrows */}
                          {sectionPosts.length > 3 && (
                            <div className="flex justify-between items-center mt-4">
                              <button 
                                onClick={() => navigateSection(section.id, 'left', sectionPosts.length)}
                                disabled={(sectionStartIndex.get(section.id) || 0) === 0}
                                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                              >
                                ← Previous
                              </button>
                              
                              <span className="text-sm text-gray-500">
                                {Math.floor(((sectionStartIndex.get(section.id) || 0) / 3) + 1)} of {Math.ceil(sectionPosts.length / 3)}
                              </span>
                              
                              <button 
                                onClick={() => navigateSection(section.id, 'right', sectionPosts.length)}
                                disabled={(sectionStartIndex.get(section.id) || 0) + 3 >= sectionPosts.length}
                                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                              >
                                Next →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }).filter(Boolean)
                }
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900">Posts and Answers</h2>
                  {sectionsLoading ? (
                    <p className="text-gray-600">Loading content...</p>
                  ) : userPosts && userPosts.length > 0 ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(() => {
                          // Use only userPosts since userAnswers isn't available in this component
                          const uniquePostsMap = new Map<string, Post>();
                          userPosts.forEach(post => {
                            uniquePostsMap.set(post.id, post);
                          });
                          const displayPosts = Array.from(uniquePostsMap.values()).slice(fallbackStartIndex, fallbackStartIndex + 3);
                          
                          return displayPosts.map(post => {
                            // Get the first answer for preview
                            const firstAnswer = post.answers && post.answers.length > 0 ? post.answers[0] : null;
                            const firstParagraph = firstAnswer?.text?.split('\n')[0] || '';
                            
                            // Get the top totem for this post
                            const topTotem = firstAnswer?.totems?.reduce((top, current) => {
                              const topLikes = current.likeHistory?.length || 0;
                              const currentLikes = current.likeHistory?.length || 0;
                              return currentLikes > topLikes ? current : top;
                            }, firstAnswer.totems[0]);

                            return (
                              <div key={post.id} className="bg-white rounded-lg shadow p-3 hover:bg-gray-50 transition-colors">
                                <div className="mb-2">
                                  <p className="text-sm text-gray-600">
                                    Posted by <span className="text-blue-600 font-medium">{post.username || 'Unknown'}</span>
                                  </p>
                                </div>
                                
                                <div className="mb-3">
                                  <Link 
                                    href={`/post/${post.id}`}
                                    className="block text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                                  >
                                    {post.question}
                                  </Link>
                                </div>
                                
                                {firstParagraph && (
                                  <div className="mb-3">
                                    <p className="text-gray-600 text-sm line-clamp-2">
                                      {firstParagraph}
                                    </p>
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    {topTotem && (
                                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                        {topTotem.name}
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      {post.answers?.length || 0} answers
                                    </span>
                                  </div>
                                  <Link 
                                    href={`/post/${post.id}`}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                  >
                                    +
                                  </Link>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      
                      {/* Navigation arrows for fallback section */}
                      {userPosts.length > 3 && (
                        <div className="flex justify-between items-center mt-4">
                          <button 
                            onClick={() => navigateFallback('left', userPosts.length)}
                            disabled={fallbackStartIndex === 0}
                            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            ← Previous
                          </button>
                          
                          <span className="text-sm text-gray-500">
                            {Math.floor((fallbackStartIndex / 3) + 1)} of {Math.ceil(userPosts.length / 3)}
                          </span>
                          
                          <button 
                            onClick={() => navigateFallback('right', userPosts.length)}
                            disabled={fallbackStartIndex + 3 >= userPosts.length}
                            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-600">No posts or answers yet</p>
                  )}
                </div>
              )}
              
              {/* If no visible sections or posts */}
              {sections && sections.filter(s => s.isVisible).length === 0 && (!userPosts || userPosts.length === 0) && (
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
          )}
          
          {/* About Tab Content */}
          {selectedTab === 'about' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p>{userData.bio || 'No bio provided'}</p>
            </div>
          )}
          
          {/* Comments Tab Content */}
          {selectedTab === 'comments' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Comments</h2>
              <p className="text-gray-500">No comments yet</p>
            </div>
          )}
          
          {/* Activity Tab Content */}
          {selectedTab === 'activity' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Activity</h2>
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const userID = params?.userID as string;

  if (!userID) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activePage="content" />
        <div className="flex-1 p-4">
          <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Invalid Profile</h2>
            <p className="text-gray-700 mb-4">No user ID provided.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ProfileContent userID={userID} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
} 