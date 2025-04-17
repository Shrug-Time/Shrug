import { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { MembershipTier } from '@/types/models';

interface SubscriptionManagementProps {
  onSubscriptionChange?: () => void;
}

export function SubscriptionManagement({ onSubscriptionChange }: SubscriptionManagementProps) {
  const { 
    isPremium, 
    membershipTier, 
    refreshesRemaining, 
    loadingSubscription, 
    updateMembership 
  } = useSubscription();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubscriptionChange = async (tier: MembershipTier) => {
    if (tier === membershipTier) return;
    
    setIsUpdating(true);
    setError(null);
    
    try {
      await updateMembership(tier);
      if (onSubscriptionChange) {
        onSubscriptionChange();
      }
    } catch (err) {
      console.error('Error updating subscription:', err);
      setError('Failed to update subscription. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Membership Management</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <div className="font-medium">Current Status</div>
        <div className="mt-1 flex items-center">
          <span className={`inline-block h-3 w-3 rounded-full mr-2 ${isPremium ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          <span>{isPremium ? 'Premium' : 'Free'} Membership</span>
        </div>
        <div className="mt-1 text-sm text-gray-600">
          {refreshesRemaining} refreshes remaining
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="font-medium mb-2">Select a Plan</div>
        
        <div 
          className={`p-4 border rounded-lg cursor-pointer ${membershipTier === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          onClick={() => handleSubscriptionChange('free')}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">Free</div>
              <div className="text-sm text-gray-600">Basic functionality with ads</div>
            </div>
            <div className="text-lg font-medium">$0</div>
          </div>
          <div className="mt-2 text-sm">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              5 refreshes per day
            </div>
            <div className="flex items-center mt-1">
              <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Standard features
            </div>
          </div>
        </div>
        
        <div 
          className={`p-4 border rounded-lg cursor-pointer ${membershipTier === 'premium' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          onClick={() => handleSubscriptionChange('premium')}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">Premium</div>
              <div className="text-sm text-gray-600">Ad-free experience with more refreshes</div>
            </div>
            <div className="text-lg font-medium">$9.99/mo</div>
          </div>
          <div className="mt-2 text-sm">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              20 refreshes per day
            </div>
            <div className="flex items-center mt-1">
              <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ad-free experience
            </div>
            <div className="flex items-center mt-1">
              <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Premium support
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <p>
          Note: This is a demo implementation. In production, this would integrate with a payment provider like Stripe.
        </p>
      </div>
    </div>
  );
} 