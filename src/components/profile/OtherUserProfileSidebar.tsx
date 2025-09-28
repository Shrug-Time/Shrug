'use client';

import { useState, useEffect } from 'react';
import { UserService } from '@/services/userService';
import { ProfileSectionService } from '@/services/profileSectionService';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { FollowButton } from '@/components/common/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { UserProfile, ProfileSection } from '@/types/models';
import Image from 'next/image';
import Link from 'next/link';

interface OtherUserProfileSidebarProps {
  profileUser: UserProfile;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function OtherUserProfileSidebar({ profileUser, isExpanded = true, onToggle }: OtherUserProfileSidebarProps) {
  const { user: currentUser } = useAuth();
  const { isPremium } = useSubscription();
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [isSubscribedToUser, setIsSubscribedToUser] = useState(false);

  // Load profile sections and subscription info
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load profile sections
        const userSections = await ProfileSectionService.getSections(profileUser.firebaseUid);
        setSections(userSections.filter(section => section.isVisible));

        // Load subscription counts (using followers/following for now)
        setSubscriberCount(profileUser.followers?.length || 0);
        setSubscriptionCount(profileUser.following?.length || 0);

        // For now, set subscription status to false (we can implement proper subscription logic later)
        setIsSubscribedToUser(false);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setSectionsLoading(false);
      }
    };

    loadUserData();
  }, [profileUser.firebaseUid, currentUser]);

  if (!isExpanded && onToggle) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-20 p-2 bg-white hover:bg-gray-100 transition-colors rounded-r-lg shadow-md z-40"
        title="Expand sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] bg-gray-50 border-r border-gray-200 z-40 w-64 shadow-lg transition-transform duration-300" style={{ transform: `translateX(${isExpanded ? '0' : '-100%'})` }}>
      {/* Header with close button */}
      {onToggle && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">{profileUser.name}</h2>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-6 overflow-y-auto h-full">

      {/* Bio */}
      {profileUser.bio && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">About</h3>
          <p className="text-gray-600 text-sm">{profileUser.bio}</p>
        </div>
      )}


      {/* Content Sections */}
      {sectionsLoading ? (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Content</h3>
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        </div>
      ) : sections.length > 0 ? (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Content Sections</h3>
          <div className="space-y-2">
            {sections.map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => {
                  // Scroll to section on main page
                  const sectionElement = document.getElementById(`section-${section.id}`);
                  if (sectionElement) {
                    sectionElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">{section.title}</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Premium Badge */}
      {profileUser.membershipTier === 'premium' && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-2 rounded-lg text-center">
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-sm">Premium Creator</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">

        {/* View all posts */}
        <Link
          href={`/profile/${profileUser.username}?tab=activity`}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium text-center block"
        >
          View All Activity
        </Link>
      </div>

      {/* Navigation back to main feed */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <Link
          href="/"
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          <span className="text-sm">Back to Feed</span>
        </Link>
      </div>
      </div>
    </div>
  );
} 