"use client";

import { useState, useEffect } from 'react';
import { auth, db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types/models';
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'management'>('public');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setProfile(userDoc.data() as UserProfile);
      } else {
        // Initialize default profile
        const defaultProfile: UserProfile = {
          displayName: user.email?.split('@')[0] || '',
          bio: '',
          verificationStatus: user.emailVerified ? 'email_verified' : 'unverified',
          membershipTier: 'free',
          refreshCount: 5,
          notificationPreferences: {
            email: true,
            push: true,
            contentUpdates: true,
          },
          monetizationSettings: {
            premiumContentEnabled: false,
            pricePerAnswer: 0,
          },
        };
        setProfile(defaultProfile);
        await setDoc(doc(db, 'users', user.uid), defaultProfile);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    if (!auth.currentUser || !profile) return;

    try {
      const updatedProfile = { ...profile, ...updates };
      await setDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile);
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                Shrug
              </Link>
              <div className="text-sm text-gray-600">
                {profile.refreshCount} refreshes left today
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Profile
              </Link>
              <button
                onClick={() => {/* TODO: Implement logout */}}
                className="px-4 py-2 text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        {activeTab === 'public' ? (
          <div className="space-y-6">
            {/* Public Profile Section */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{profile.displayName}</h2>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      profile.verificationStatus === 'identity_verified'
                        ? 'bg-green-100 text-green-800'
                        : profile.verificationStatus === 'email_verified'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {profile.verificationStatus ? profile.verificationStatus.replace('_', ' ') : 'Not Verified'}
                    </span>
                    <span className="px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      {profile.membershipTier} member
                    </span>
                  </div>
                </div>
                {isEditing ? (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                  >
                    Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
              
              <div className="prose max-w-none">
                {isEditing ? (
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleProfileUpdate({ bio: e.target.value })}
                    className="w-full p-4 border rounded-xl"
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-gray-600">{profile.bio || 'No bio yet'}</p>
                )}
              </div>
            </div>

            {/* Content Showcase */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Featured Answers</h3>
              {/* TODO: Add content showcase implementation */}
              <p className="text-gray-600">No featured answers yet</p>
            </div>

            {profile.membershipTier === 'premium' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Premium Content</h3>
                {/* TODO: Add premium content section */}
                <p className="text-gray-600">No premium content available</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Management Section */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences ? profile.notificationPreferences.email : false}
                    onChange={(e) => handleProfileUpdate({
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        email: e.target.checked
                      }
                    })}
                    className="rounded text-blue-500"
                  />
                  <span>Email notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences ? profile.notificationPreferences.push : false}
                    onChange={(e) => handleProfileUpdate({
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        push: e.target.checked
                      }
                    })}
                    className="rounded text-blue-500"
                  />
                  <span>Push notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences ? profile.notificationPreferences.contentUpdates : false}
                    onChange={(e) => handleProfileUpdate({
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        contentUpdates: e.target.checked
                      }
                    })}
                    className="rounded text-blue-500"
                  />
                  <span>Content update notifications</span>
                </label>
              </div>
            </div>

            {profile.membershipTier === 'premium' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Monetization Settings</h3>
                <div className="space-y-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={profile.monetizationSettings.premiumContentEnabled}
                      onChange={(e) => handleProfileUpdate({
                        monetizationSettings: {
                          ...profile.monetizationSettings,
                          premiumContentEnabled: e.target.checked
                        }
                      })}
                      className="rounded text-blue-500"
                    />
                    <span>Enable premium content</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price per answer ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={profile.monetizationSettings.pricePerAnswer}
                      onChange={(e) => handleProfileUpdate({
                        monetizationSettings: {
                          ...profile.monetizationSettings,
                          pricePerAnswer: parseFloat(e.target.value)
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Account Security</h3>
              <div className="space-y-4">
                <button
                  onClick={() => {/* TODO: Implement password change */}}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                >
                  Change Password
                </button>
                {profile.verificationStatus && !profile.verificationStatus.includes('verified') && (
                  <button
                    onClick={() => {/* TODO: Implement verification flow */}}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                  >
                    Verify Account
                  </button>
                )}
                {profile.membershipTier !== 'premium' && (
                  <button
                    onClick={() => {/* TODO: Implement upgrade flow */}}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600"
                  >
                    Upgrade to Premium
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 