"use client";

import { Sidebar } from '@/components/layout/Sidebar';
import { useUser } from '@/hooks/useUser';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useState } from 'react';

export default function SubscriptionsPage() {
  const { profile, isLoading, updateProfile } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>(
    profile?.membershipTier === 'premium' ? 'premium' : 'free'
  );
  
  const handleUpgrade = async () => {
    if (!profile) return;
    
    setIsUpdating(true);
    try {
      // In a real implementation, this would integrate with a payment provider
      // For now, we'll just update the user's membership tier
      await updateProfile({
        membershipTier: 'premium',
        refreshesRemaining: 20
      });
      
      setSelectedPlan('premium');
    } catch (error) {
      console.error('Error upgrading account:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDowngrade = async () => {
    if (!profile) return;
    
    setIsUpdating(true);
    try {
      await updateProfile({
        membershipTier: 'free',
        refreshesRemaining: 5
      });
      
      setSelectedPlan('free');
    } catch (error) {
      console.error('Error downgrading account:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activePage="subscriptions" />
        <div className="flex-1 p-8 flex justify-center items-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="subscriptions" />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Manage Your Subscriptions</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-medium mb-4">Membership Management</h2>
            
            <div className="mb-6">
              <h3 className="font-medium mb-2">Current Status</h3>
              <div className="flex items-center mb-2">
                <div className={`w-4 h-4 rounded-full mr-2 ${profile?.membershipTier === 'premium' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                <span>{profile?.membershipTier === 'premium' ? 'Premium Membership' : 'Free Membership'}</span>
              </div>
              <p className="text-gray-600">{profile?.refreshesRemaining} refreshes remaining</p>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Select a Plan</h3>
              
              <div className="space-y-4">
                {/* Free Plan */}
                <div 
                  className={`border rounded-lg p-6 flex justify-between items-center ${
                    profile?.membershipTier === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <h4 className="text-lg font-medium">Free</h4>
                    <p className="text-gray-600 mb-4">Basic functionality with ads</p>
                    
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>5 refreshes per day</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Standard features</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold mb-4">$0</div>
                    
                    {profile?.membershipTier === 'premium' && (
                      <button
                        onClick={handleDowngrade}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300 transition-colors"
                      >
                        {isUpdating ? 'Downgrading...' : 'Downgrade'}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Premium Plan */}
                <div 
                  className={`border rounded-lg p-6 flex justify-between items-center ${
                    profile?.membershipTier === 'premium' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <h4 className="text-lg font-medium">Premium</h4>
                    <p className="text-gray-600 mb-4">Ad-free experience with more refreshes</p>
                    
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>20 refreshes per day</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Ad-free experience</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Premium support</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold mb-4">$9.99/mo</div>
                    
                    {profile?.membershipTier !== 'premium' && (
                      <button
                        onClick={handleUpgrade}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 transition-colors"
                      >
                        {isUpdating ? 'Upgrading...' : 'Upgrade'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm">
            Note: This is a demo implementation. In production, this would integrate with a payment provider like Stripe.
          </p>
        </div>
      </div>
    </div>
  );
} 