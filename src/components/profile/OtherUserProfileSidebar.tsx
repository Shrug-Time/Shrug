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
}

export function OtherUserProfileSidebar({ profileUser }: OtherUserProfileSidebarProps) {
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

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
      {/* User Summary */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden mr-4">
            {profileUser.photoURL ? (
              <Image
                src={profileUser.photoURL}
                alt={`${profileUser.name}'s profile`}
                width={64}
                height={64}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-500 text-xl font-bold">
                {profileUser.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">{profileUser.name}</h2>
            <p className="text-gray-600 text-sm">@{profileUser.username}</p>
          </div>
        </div>

        {/* Follow/Subscribe Button */}
        {currentUser && currentUser.uid !== profileUser.firebaseUid && (
          <div className="mb-4">
            <FollowButton
              currentUserId={currentUser.uid}
              targetUserId={profileUser.firebaseUid}
              onError={(message) => console.error(message)}
              onFollowChange={() => {
                // Could update follower counts here
              }}
            />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{profileUser.followers?.length || 0}</div>
            <div className="text-sm text-gray-500">Followers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{profileUser.following?.length || 0}</div>
            <div className="text-sm text-gray-500">Following</div>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profileUser.bio && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">About</h3>
          <p className="text-gray-600 text-sm">{profileUser.bio}</p>
        </div>
      )}

      {/* Subscription Info */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Community</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Subscribers</span>
            <span className="font-medium">{subscriberCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Subscriptions</span>
            <span className="font-medium">{subscriptionCount}</span>
          </div>
          {isSubscribedToUser && (
            <div className="mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full text-center">
              ✓ You're subscribed
            </div>
          )}
        </div>
      </div>

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
        {/* Subscribe to their content */}
        {currentUser && currentUser.uid !== profileUser.firebaseUid && (
          <button
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            onClick={() => {
              // TODO: Implement subscription to user's content
              console.log('Subscribe to user content');
            }}
          >
            {isSubscribedToUser ? 'Manage Subscription' : 'Subscribe to Content'}
          </button>
        )}

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
  );
} 