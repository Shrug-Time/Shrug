import { useSubscription } from '@/contexts/SubscriptionContext';

export function AdBanner() {
  const { isPremium } = useSubscription();
  
  // Don't show ads to premium users
  if (isPremium) {
    return null;
  }
  
  return (
    <div className="w-full bg-gray-50 p-4 border rounded-lg my-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">ADVERTISEMENT</p>
          <p className="text-base font-semibold mt-1">Upgrade to Premium for an ad-free experience</p>
          <p className="text-sm text-gray-600 mt-1">
            Get 20 daily refreshes and remove all ads for just $9.99/month
          </p>
        </div>
        <a 
          href="/subscription" 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Upgrade Now
        </a>
      </div>
    </div>
  );
} 