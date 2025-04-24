"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { Sidebar } from '@/components/layout/Sidebar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';
import Image from 'next/image';

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
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

  if (isLoading || !profile) {
    return (
      <div className="flex">
        <Sidebar activePage="customization" />
        <div className="flex-1 min-h-screen p-4 flex justify-center items-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <Sidebar activePage="customization" />
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
      <Sidebar activePage="customization" />
      
      <div className="flex-1 p-4">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
          />
        )}
        
        <div className="max-w-4xl mx-auto">
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
                <button
                  onClick={() => setActiveTab('content')}
                  className={`py-2 px-4 text-sm border-b-2 -mb-px ${
                    activeTab === 'content' 
                      ? 'border-blue-500 text-blue-600 font-medium' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Content Access
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
                        <button 
                          type="button"
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Change
                        </button>
                        <button 
                          type="button"
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Remove
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
                  
                  {/* Page URL */}
                  <div className="mb-6">
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                      Page URL
                    </label>
                    <p className="text-xs text-gray-500 mb-1">This is the standard web address to your content.</p>
                    <input
                      type="text"
                      id="url"
                      name="url"
                      value={`https://shrug.io/u/${profile.username}`}
                      readOnly
                      className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-500"
                    />
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
              
              {/* Content Access Tab */}
              {activeTab === 'content' && (
                <div>
                  <h2 className="text-lg font-medium mb-2">Content Access Control</h2>
                  <p className="text-gray-600 mb-6">Make your content exclusive to monetize your expertise.</p>
                  
                  <p className="text-gray-700 mb-6">
                    Content access control allows you to create paid content that requires separate purchase. Only paying supporters will be able to view your exclusive content.
                  </p>
                  
                  {/* Default Content Access */}
                  <div className="mb-8">
                    <h3 className="text-md font-medium mb-2">Default Content Access</h3>
                    <p className="text-sm text-gray-600 mb-4">New content will be set to this access level by default</p>
                    
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <select
                        name="defaultAccess"
                        value={formData.defaultAccess}
                        onChange={handleChange}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="public">Public (Everyone)</option>
                        <option value="exclusive">Exclusive (Paid Access)</option>
                      </select>
                      
                      <div className="flex space-x-2">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
                          All Content
                        </button>
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">
                          Exclusive Only
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content Management */}
                  <div className="mb-6">
                    <h3 className="text-md font-medium mb-4">Content Management</h3>
                    
                    {/* Example Content Items */}
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex justify-between p-4 items-center">
                          <div>
                            <h4 className="font-medium">How to catch trout in mountain streams</h4>
                          </div>
                          <div className="text-sm text-gray-500">
                            Post
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium mb-2">Content Access Settings</h5>
                          <p className="text-sm text-gray-600">This content is shared publicly.</p>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex justify-between p-4 items-center">
                          <div>
                            <h4 className="font-medium">Best fly fishing techniques for beginners</h4>
                          </div>
                          <div className="text-sm text-gray-500">
                            Answer
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium mb-2">Content Access Settings</h5>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">Make this content paid/exclusive?</p>
                              <p className="text-xs text-gray-600">Creator-exclusive content requires a separate payment to access.</p>
                            </div>
                            
                            <div className="relative inline-block w-10 align-middle select-none">
                              <input type="checkbox" name="toggle" id="toggle" className="sr-only" />
                              <div className="block h-6 bg-gray-200 rounded-full w-12"></div>
                              <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-500 mt-4">
                            Creator-exclusive content allows you to monetize your expertise. This is separate from Shrug's platform subscription.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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