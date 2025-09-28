"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile, Post, ProfileSection } from '@/types/models';
import { QuestionList } from '@/components/questions/QuestionList';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';
import { FollowButton } from '@/components/common/FollowButton';
import { useUser } from '@/hooks/useUser';
import { PostService } from '@/services/standardized';
import { UserService } from '@/services/userService';
import { ProfileSectionService } from '@/services/profileSectionService';
import { SectionManager } from '@/components/profile/SectionManager';
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { CustomSectionCreator } from '@/components/profile/CustomSectionCreator';
import Link from 'next/link';

export default function ProfilePage() {
  const { profile, isLoading: isLoadingProfile, error: profileError, updateProfile } = useUser();
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSections, setIsEditingSections] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('home');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userAnswers, setUserAnswers] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [sectionContent, setSectionContent] = useState<Map<string, Post[]>>(new Map());
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [sectionStartIndex, setSectionStartIndex] = useState<Map<string, number>>(new Map());
  const [fallbackStartIndex, setFallbackStartIndex] = useState(0);
  const router = useRouter();

  // Load user's posts using the standardized PostService
  const loadUserPosts = useCallback(async () => {
    if (!profile?.firebaseUid) return;
    
    setIsLoadingPosts(true);
    try {
      const result = await PostService.getUserPosts(profile.firebaseUid, 10);
      setUserPosts(result.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [profile?.firebaseUid]);

  // Load posts where user has answered using the standardized PostService
  const loadUserAnswers = useCallback(async () => {
    if (!profile?.firebaseUid) return;

    setIsLoadingPosts(true);
    try {
      const result = await PostService.getUserAnswers(profile.firebaseUid, 10);
      setUserAnswers(result.posts || []);
    } catch (error) {
      console.error('Error loading answers:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [profile?.firebaseUid]);
  
  // Load content for all sections
  const loadAllSectionContent = useCallback(async (sectionsToLoad: ProfileSection[]) => {
    if (!profile?.firebaseUid || !sectionsToLoad.length) return;
    
    const contentMap = new Map<string, Post[]>();
    
    for (const section of sectionsToLoad) {
      try {
        const content = await ProfileSectionService.getSectionContent(
          profile.firebaseUid,
          section
        );
        
        // Deduplicate posts by ID to prevent duplicates in each section
        const uniquePostsMap = new Map<string, Post>();
        content.forEach(post => {
          uniquePostsMap.set(post.id, post);
        });
        
        const uniquePosts = Array.from(uniquePostsMap.values());
        contentMap.set(section.id, uniquePosts);
      } catch (error) {
        console.error(`Error loading content for section ${section.title}:`, error);
      }
    }
    
    setSectionContent(contentMap);
  }, [profile?.firebaseUid]);
  
  // Load user's profile sections
  const loadSections = useCallback(async () => {
    if (!profile?.firebaseUid) return;
    
    setIsLoadingSections(true);
    try {
      const userSections = await ProfileSectionService.getSections(profile.firebaseUid);
      setSections(userSections);
      
      // Preload content for sections
      await loadAllSectionContent(userSections);
    } catch (error) {
      console.error('Error loading sections:', error);
      setToastMessage({
        message: 'Failed to load profile sections',
        type: 'error'
      });
    } finally {
      setIsLoadingSections(false);
    }
  }, [profile?.firebaseUid, loadAllSectionContent]);

  // Load data when profile changes
  useEffect(() => {
    if (profile?.firebaseUid) {
      if (selectedTab === 'home') {
        loadSections();
      } else if (selectedTab === 'questions') {
        loadUserPosts();
      } else if (selectedTab === 'answers') {
        loadUserAnswers();
      }
    }
  }, [profile?.firebaseUid, selectedTab, loadSections, loadUserPosts, loadUserAnswers]);

  const handleWantToAnswer = (post: Post) => {
    router.push(`/post/${post.id}`);
  };
  
  const handleSaveSections = () => {
    setIsEditingSections(false);
    loadSections();
  };

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

  if (isLoadingProfile || !profile) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-gray-700 mb-4">{profileError}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  
  // If we're editing sections, show the section manager
  if (isEditingSections) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <SectionManager 
          userId={profile.firebaseUid}
          onSave={handleSaveSections}
          onCancel={() => setIsEditingSections(false)}
        />
      </div>
    );
  }
  


  return (
    <div className="flex min-h-screen">
      <ProfileSidebar />
      
      <div className="flex-1">
        {/* Show toast messages */}
        {toastMessage && (
          <Toast 
            message={toastMessage.message} 
            type={toastMessage.type}
          />
        )}
        
        <div className="max-w-4xl ml-0 p-4">
          {/* Profile Header */}
          <div className="flex items-start mb-8">
            {/* Profile Image */}
            <div className="mr-6 relative">
              <div className="w-24 h-24 rounded-full overflow-hidden">
                {profile.photoURL ? (
                  <Image 
                    src={profile.photoURL} 
                    alt={`${profile.name}'s profile`}
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-500 text-2xl font-bold">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            {/* Profile Info */}
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">{profile.name || 'User'}</h1>
                  <p className="text-gray-600">@{profile.username}</p>
                  <p className="text-gray-600 mt-2">{profile.bio || 'No bio provided'}</p>
                  
                  {/* Follower/Following counts */}
                  <div className="flex space-x-4 mt-3 text-sm text-gray-500">
                    <Link 
                      href="/profile/followers"
                      className="hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {profile.followers?.length || 0} followers
                    </Link>
                    <Link 
                      href="/profile/following"
                      className="hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {profile.following?.length || 0} following
                    </Link>
                  </div>
                </div>
                
                {/* Profile Management Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push('/profile/customize')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Customize Page
                  </button>
                  <button
                    onClick={() => setIsEditingSections(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Manage Sections
                  </button>
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
                onClick={() => setSelectedTab('questions')}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'questions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Questions
              </button>
              <button
                onClick={() => setSelectedTab('answers')}
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'answers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Answers
              </button>
            </div>
          </div>
          
          {/* Home Tab Content with Sections */}
          {selectedTab === 'home' && (
            <div className="space-y-8">
              {isLoadingSections ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : sections && sections.length > 0 ? (
                <div className="space-y-8">
                  {sections
                    .filter(section => section.isVisible)
                    .map(section => {
                      const sectionPosts = sectionContent.get(section.id) || [];
                      
                      if (sectionPosts.length === 0 && !isLoadingSections) {
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
                                <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                                  Add content to this section
                                </button>
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                            {getSectionSlice(section.id, sectionPosts).map((post, index) => {
                              // Get the user's answer for preview
                              const userAnswer = post.answers?.find(answer =>
                                answer.firebaseUid === profile?.firebaseUid ||
                                answer.username === profile?.username
                              );
                              const firstParagraph = userAnswer?.text?.split('\n')[0] || '';

                              // Get the top totem for this user's answer
                              const topTotem = userAnswer?.totems?.reduce((top, current) => {
                                const topLikes = current.likeHistory?.length || 0;
                                const currentLikes = current.likeHistory?.length || 0;
                                return currentLikes > topLikes ? current : top;
                              }, userAnswer.totems[0]);

                              return (
                                <div key={post.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 transition-colors h-full">
                                  <div className="flex flex-col h-full">
                                    <div className="mb-3 pb-3 border-b border-gray-100">
                                      <Link
                                        href={`/post/${post.id}`}
                                        className="block hover:bg-gray-50 hover:text-blue-600 transition-colors rounded-lg p-2 -m-2"
                                      >
                                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2">
                                          {post.question}
                                        </h3>
                                      </Link>
                                    </div>

                                    {userAnswer && firstParagraph && (
                                      <div className="mb-3 flex-grow">
                                        <Link
                                          href={`/post/${post.id}/answers/${userAnswer.id}`}
                                          className="block hover:bg-gray-50 hover:text-blue-600 transition-colors rounded-lg p-2 -m-2"
                                        >
                                          <p className="text-gray-900 text-base line-clamp-3 leading-relaxed">
                                            {firstParagraph}
                                          </p>
                                        </Link>
                                      </div>
                                    )}

                                    <div className="mt-auto pt-2 border-t border-gray-100">
                                      {topTotem && (
                                        <div className="flex items-center space-x-1">
                                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                                            {topTotem.name}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {topTotem.likeHistory?.length || 0} likes
                                          </span>
                                        </div>
                                      )}
                                    </div>
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
                  <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Answers</h2>
                  {isLoadingPosts ? (
                    <p className="text-gray-600">Loading content...</p>
                  ) : userAnswers.length > 0 ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                        {(() => {
                          // For home sections, only show posts where user has written answers
                          const displayPosts = userAnswers.slice(fallbackStartIndex, fallbackStartIndex + 3);
                          
                          return displayPosts.map(post => {
                            // Get the user's answer for preview (not just any answer)
                            const userAnswer = post.answers?.find(answer =>
                              answer.firebaseUid === profile?.firebaseUid ||
                              answer.username === profile?.username
                            );
                            const firstParagraph = userAnswer?.text?.split('\n')[0] || '';

                            // Get the top totem for this user's answer
                            const topTotem = userAnswer?.totems?.reduce((top, current) => {
                              const topLikes = current.likeHistory?.length || 0;
                              const currentLikes = current.likeHistory?.length || 0;
                              return currentLikes > topLikes ? current : top;
                            }, userAnswer.totems[0]);

                            return (
                              <div key={post.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 transition-colors h-full">
                                <div className="flex flex-col h-full">
                                  <div className="mb-3 pb-3 border-b border-gray-100">
                                    <Link
                                      href={`/post/${post.id}`}
                                      className="block hover:bg-gray-50 hover:text-blue-600 transition-colors rounded-lg p-2 -m-2"
                                    >
                                      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2">
                                        {post.question}
                                      </h3>
                                    </Link>
                                  </div>

                                  {userAnswer && firstParagraph && (
                                    <div className="mb-3 flex-grow">
                                      <Link
                                        href={`/post/${post.id}/answers/${userAnswer.id}`}
                                        className="block hover:bg-gray-50 hover:text-blue-600 transition-colors rounded-lg p-2 -m-2"
                                      >
                                        <p className="text-gray-900 text-base line-clamp-3 leading-relaxed">
                                          {firstParagraph}
                                        </p>
                                      </Link>
                                    </div>
                                  )}

                                  <div className="mt-auto pt-2 border-t border-gray-100">
                                    {topTotem && (
                                      <div className="flex items-center space-x-1">
                                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                                          {topTotem.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {topTotem.likeHistory?.length || 0} likes
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      
                      {/* Navigation arrows for fallback section */}
                      {(() => {
                        // For home sections, only count posts where user has written answers
                        const totalPosts = userAnswers.length;

                        return totalPosts > 3 ? (
                          <div className="flex justify-between items-center mt-4">
                            <button 
                              onClick={() => navigateFallback('left', totalPosts)}
                              disabled={fallbackStartIndex === 0}
                              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                              ← Previous
                            </button>
                            
                            <span className="text-sm text-gray-500">
                              {Math.floor((fallbackStartIndex / 3) + 1)} of {Math.ceil(totalPosts / 3)}
                            </span>
                            
                            <button 
                              onClick={() => navigateFallback('right', totalPosts)}
                              disabled={fallbackStartIndex + 3 >= totalPosts}
                              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                              Next →
                            </button>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-600">No answers yet</p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* About Tab Content */}
          {selectedTab === 'about' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p>{profile.bio || 'No bio provided'}</p>
            </div>
          )}
          
          {/* Questions Tab Content */}
          {selectedTab === 'questions' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Your Questions</h2>
              {isLoadingPosts ? (
                <p className="text-gray-600">Loading questions...</p>
              ) : userPosts.length > 0 ? (
                <QuestionList
                  posts={userPosts}
                  onWantToAnswer={handleWantToAnswer}
                  hasNextPage={false}
                  isLoading={false}
                  onLoadMore={() => {}}
                  showAllTotems={false}
                  sectionId="questions-tab"
                  showDeleteButtons={true}
                />
              ) : (
                <p className="text-gray-600">No questions yet</p>
              )}
            </div>
          )}
          
          {/* Answers Tab Content */}
          {selectedTab === 'answers' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Your Answers</h2>
              {isLoadingPosts ? (
                <p className="text-gray-600">Loading answers...</p>
              ) : userAnswers.length > 0 ? (
                <QuestionList
                  posts={userAnswers}
                  onWantToAnswer={handleWantToAnswer}
                  hasNextPage={false}
                  isLoading={false}
                  onLoadMore={() => {}}
                  showAllTotems={false}
                  showUserAnswers={true}
                  sectionId="answers-tab"
                  showDeleteButtons={true}
                />
              ) : (
                <p className="text-gray-600">No answers yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 