"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';
import Image from 'next/image';
import { UserService } from '@/services/userService';

export default function ProfileCustomizationPage() {
  const { profile, isLoading, error, updateProfile } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'content' | 'home'>('profile');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    handle: '',
    defaultAccess: 'public',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        handle: `@${profile.username}`,
        defaultAccess: 'public',
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;
    
    try {
      setIsSaving(true);
      await updateProfile({
        name: formData.name,
        username: formData.username,
        bio: formData.bio,
      });
      
      setToast({
        message: 'Profile updated successfully',
        type: 'success'
      });
      
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setToast({
        message: 'Failed to update profile',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setIsUploading(true);
      const updatedProfile = await UserService.uploadAvatar(file, profile.firebaseUid);
      
      // The profile will be updated automatically through the useUser hook
      // No need to manually update it here
      
      setToast({
        message: 'Avatar updated successfully',
        type: 'success'
      });
      
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to upload avatar',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarRemove = async () => {
    if (!profile) return;

    try {
      setIsUploading(true);
      await UserService.removeAvatar(profile.firebaseUid);
      
      // Refresh the profile to get the updated photoURL
      await updateProfile({});
      
      setToast({
        message: 'Avatar removed successfully',
        type: 'success'
      });
      
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error) {
      console.error('Error removing avatar:', error);
      setToast({
        message: 'Failed to remove avatar',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="flex">
        <ProfileSidebar />
        <div className="flex-1 min-h-screen p-4 flex justify-center items-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <ProfileSidebar />
        <div className="flex-1 min-h-screen p-4">
          <div className="max-w-4xl mx-auto bg-red-50 p-4 rounded-lg text-red-600">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <ProfileSidebar />
      
      <div className="flex-1 p-4">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
          />
        )}
        
        <div className="max-w-4xl ml-0">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h1 className="text-xl font-semibold mb-6">Page Customization</h1>
              
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-2 px-4 text-sm border-b-2 -mb-px ${
                    activeTab === 'profile' 
                      ? 'border-blue-500 text-blue-600 font-medium' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('home')}
                  className={`py-2 px-4 text-sm border-b-2 -mb-px ${
                    activeTab === 'home' 
                      ? 'border-blue-500 text-blue-600 font-medium' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Home Tab
                </button>
              </div>
              
              {/* Profile Tab Content */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSubmit}>
                  {/* Profile Picture */}
                  <div className="mb-6">
                    <h2 className="text-sm font-medium mb-2">Profile Picture</h2>
                    <p className="text-xs text-gray-500 mb-3">Your profile picture will appear on your profile, comments, and activity.</p>
                    
                    <div className="flex items-center">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mr-6">
                        {profile.photoURL ? (
                          <Image
                            src={profile.photoURL}
                            alt={profile.name}
                            width={96}
                            height={96}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-500 text-3xl font-bold">
                            {profile.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-x-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUploading ? 'Uploading...' : 'Change'}
                        </button>
                        <button 
                          type="button"
                          onClick={handleAvatarRemove}
                          disabled={isUploading || !profile.photoURL}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUploading ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">It is recommended to use a square photo. Max file size: 5MB.</p>
                  </div>
                  
                  {/* Name */}
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <p className="text-xs text-gray-500 mb-1">Enter your full name. We suggest that you use your real name.</p>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your name"
                    />
                  </div>
                  
                  {/* Handle/Username */}
                  <div className="mb-4">
                    <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-1">
                      Handle
                    </label>
                    <p className="text-xs text-gray-500 mb-1">Choose your unique handle for linking to your profile. You can only change your handle once in 14 days.</p>
                    <div className="flex">
                      <div className="bg-gray-100 flex items-center px-3 rounded-l-md border border-r-0 border-gray-300">
                        @
                      </div>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Description/Bio */}
                  <div className="mb-6">
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-xs text-gray-500 mb-1">Write a short description about yourself and your content.</p>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Educational content for all levels of passionate fly fishermen."
                    ></textarea>
                  </div>
                  
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
                    <button
                      type="button"
                      onClick={() => router.push('/profile')}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 rounded-md text-sm text-white hover:bg-blue-700 flex items-center"
                    >
                      {isSaving ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Saving...
                        </>
                      ) : 'Publish'}
                    </button>
                  </div>
                </form>
              )}
              
              
              {/* Home Tab Content */}
              {activeTab === 'home' && (
                <div>
                  <h2 className="text-lg font-medium mb-4">Home Tab Settings</h2>
                  <p className="text-gray-600 mb-6">
                    Customize how your profile's Home tab appears to visitors.
                  </p>
                  
                  <div className="border border-gray-200 rounded-lg p-4 mb-6">
                    <h3 className="text-md font-medium mb-2">Default View</h3>
                    <p className="text-sm text-gray-600 mb-4">Choose which tab is shown by default when someone visits your profile</p>
                    
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="home">Home</option>
                      <option value="about">About</option>
                      <option value="content">Content</option>
                    </select>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-md font-medium mb-2">Featured Sections</h3>
                    <p className="text-sm text-gray-600 mb-4">Manage your profile sections from the Customize Page button on your profile</p>
                    
                    <button
                      onClick={() => router.push('/profile')}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                    >
                      Go to Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 