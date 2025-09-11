import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUser } from '@/hooks/useUser';
import { getAdminReportsUrl } from '@/utils/routes';
import { isFeatureEnabled } from '@/config/featureFlags';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TotemService } from '@/services/standardized';

export function ProfileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { profile, refetch } = useUser();
  const [expandedSections, setExpandedSections] = useState<string[]>(['recentTotems', 'popularTotems']);
  const [recentTotems, setRecentTotems] = useState<string[]>([]);
  const [popularTotems, setPopularTotems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = profile?.membershipTier === 'admin';

  // Load recent totems from user's recent activity
  useEffect(() => {
    const loadRecentTotems = async () => {
      if (!profile) {
        return;
      }
      
      try {
        // Get user's recent totems from their profile
        const userTotems = profile.totems?.recent || [];
        setRecentTotems(userTotems.slice(0, 5)); // Show last 5
        
        // Load real popular totems instead of placeholder data
        const popularTotemsData = await TotemService.getPopularTotems(5);
        setPopularTotems(popularTotemsData.map(totem => totem.name));
      } catch (error) {
        console.error('❌ Error loading totems:', error);
        // Fallback to placeholder data if there's an error (limited to 5)
        setPopularTotems(['Fishing', 'Flies', 'Streams', 'Gear', 'Techniques'].slice(0, 5));
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentTotems();
  }, [profile]);

  // Refresh user profile data periodically to catch totem interaction updates
  useEffect(() => {
    if (!profile) return;
    
    const refreshInterval = setInterval(async () => {
      try {
        await refetch();
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(refreshInterval);
  }, [profile, refetch]);

  // Listen for totem interaction events to refresh immediately
  useEffect(() => {
    const handleTotemInteraction = async () => {
      try {
        await refetch();
      } catch (error) {
        console.error('Error refreshing user profile after totem interaction:', error);
      }
    };

    // Listen for custom totem interaction events
    window.addEventListener('totem-interaction', handleTotemInteraction);
    
    return () => {
      window.removeEventListener('totem-interaction', handleTotemInteraction);
    };
  }, [refetch]);

  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter(s => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };

  const handleTotemClick = (totemName: string) => {
    router.push(`/totem/${totemName}`);
  };

  if (!user) return null;
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-gray-100' : '';
  };

  return (
    <aside className="w-full md:w-64 flex-shrink-0">
      <nav className="space-y-0.5">
        <Link 
          href="/profile" 
          className={`flex items-center px-4 py-3 text-gray-700 ${isActive('/profile')}`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Content
        </Link>
        
        <Link 
          href="/profile/customization" 
          className={`flex items-center px-4 py-3 text-gray-700 ${isActive('/profile/customization')}`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
          </svg>
          Customization
        </Link>
        
        {isFeatureEnabled('SUBSCRIBER_MANAGEMENT_ENABLED') && (
          <Link 
            href="/profile/subscriptions" 
            className={`flex items-center px-4 py-3 text-gray-700 ${isActive('/profile/subscriptions')}`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            {isPremium ? (
              <span className="flex items-center">
                Your Subscriptions
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">Premium</span>
              </span>
            ) : (
              <span>Your Subscriptions</span>
            )}
          </Link>
        )}
        
        {isFeatureEnabled('ADS_ENABLED') && (
          <Link 
            href="/ads" 
            className={`flex items-center px-4 py-3 text-gray-700 ${isActive('/ads')}`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
            </svg>
            {isPremium ? (
              <span className="flex items-center">
                Promotion Ads
                <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">Premium</span>
              </span>
            ) : (
              <span>Promotion Ads</span>
            )}
          </Link>
        )}
        
        {isFeatureEnabled('SUBSCRIBER_MANAGEMENT_ENABLED') && (
          <Link 
            href="/profile/subscribers" 
            className={`flex items-center px-4 py-3 text-gray-700 ${isActive('/profile/subscribers')}`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            Your Subscribers
          </Link>
        )}
        
        <Link 
          href="/profile/analytics" 
          className={`flex items-center px-4 py-3 text-gray-700 ${isActive('/profile/analytics')}`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          Analytics
        </Link>
        
        {isAdmin && (
          <Link 
            href={getAdminReportsUrl()} 
            className={`flex items-center px-4 py-3 text-gray-700 ${isActive('/admin/reports')}`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path>
            </svg>
            Content Reports
            <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">Admin</span>
          </Link>
        )}
      </nav>
      
      {/* Totem Sections - copied exactly from MainPageSidebar */}
      <div className="p-4 space-y-3">
        {/* Recent Totems */}
        <div>
          <button 
            onClick={() => toggleSection('recentTotems')}
            className="flex items-center w-full p-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 font-medium text-gray-700">Recent Totems</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.includes('recentTotems') ? 'transform rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.includes('recentTotems') && (
            <div className="mt-2 pl-10">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : recentTotems.length > 0 ? (
                <ul className="space-y-1">
                  {recentTotems.map((totem, index) => (
                    <li key={index}>
                      <button
                        onClick={() => handleTotemClick(totem)}
                        className="block w-full p-2 text-sm text-left text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {totem}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No recent totems</p>
              )}
            </div>
          )}
        </div>

        {/* Popular Totems */}
        <div>
          <button 
            onClick={() => toggleSection('popularTotems')}
            className="flex items-center w-full p-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="flex-1 font-medium text-gray-700">Popular Totems</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.includes('popularTotems') ? 'transform rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.includes('popularTotems') && (
            <div className="mt-2 pl-10">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : popularTotems.length > 0 ? (
                <ul className="space-y-1">
                  {popularTotems.map((totem, index) => (
                    <li key={index}>
                      <button
                        onClick={() => handleTotemClick(totem)}
                        className="block w-full p-2 text-sm text-left text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {totem}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No popular totems</p>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
} 