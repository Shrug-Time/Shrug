import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import Link from 'next/link';
import { useState } from 'react';
import { getAdminReportsUrl } from '@/utils/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { isFeatureEnabled } from '@/config/featureFlags';

interface SidebarProps {
  activePage?: 'content' | 'customization' | 'subscriptions' | 'subscribers' | 'analytics' | 'reports' | 'ads';
}

export function Sidebar({ activePage }: SidebarProps) {
  const router = useRouter();
  const { profile } = useUser();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [expandedSections, setExpandedSections] = useState<string[]>(['myTotems', 'popularTotems']);
  
  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter(s => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };
  
  if (!profile) {
    return <div className="w-64 bg-gray-50 p-4">Loading...</div>;
  }
  
  return (
    <aside className="w-64 bg-gray-50 min-h-screen border-r border-gray-200">
      {/* Profile Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col items-center mb-2">
          <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <h2 className="font-medium">Your Page</h2>
          <p className="text-sm text-gray-600">@{profile.username}</p>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="p-2">
        <ul className="space-y-1">
          {/* Content */}
          <li>
            <Link 
              href="/profile" 
              className={`flex items-center p-2 rounded-lg ${
                activePage === 'content' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Content</span>
            </Link>
          </li>
          
          {/* Customization */}
          <li>
            <Link 
              href="/profile/customize" 
              className={`flex items-center p-2 rounded-lg ${
                activePage === 'customization' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Customization</span>
            </Link>
          </li>
          
          {/* Subscriptions - Only show if enabled */}
          {isFeatureEnabled('SUBSCRIBER_MANAGEMENT_ENABLED') && (
            <li>
              <Link 
                href="/settings/subscriptions" 
                className={`flex items-center p-2 rounded-lg ${
                  activePage === 'subscriptions' ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Your Subscriptions</span>
              </Link>
            </li>
          )}
          
          {/* Subscribers - Only show if enabled */}
          {isFeatureEnabled('SUBSCRIBER_MANAGEMENT_ENABLED') && (
            <li>
              <Link 
                href="/settings/subscribers" 
                className={`flex items-center p-2 rounded-lg ${
                  activePage === 'subscribers' ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Your Subscribers</span>
              </Link>
            </li>
          )}
          
          {/* Analytics */}
          <li>
            <Link 
              href="/analytics" 
              className={`flex items-center p-2 rounded-lg ${
                activePage === 'analytics' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </Link>
          </li>
          
          {/* Promotion Ads - Only show if enabled */}
          {isFeatureEnabled('ADS_ENABLED') && (
            <li>
              <Link 
                href="/ads" 
                className={`flex items-center p-2 rounded-lg ${
                  activePage === 'ads' ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <span className="flex-1">Promotion Ads</span>
                {isPremium && (
                  <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Premium</span>
                )}
              </Link>
            </li>
          )}
          
          {/* Content Reports (Admin) */}
          {profile?.membershipTier === 'admin' && (
            <li>
              <Link 
                href={getAdminReportsUrl()} 
                className={`flex items-center p-2 rounded-lg ${
                  activePage === 'reports' ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="flex-1">Content Reports</span>
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Admin</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>
      
      {/* Totem Sections */}
      <div className="p-2 mt-4">
        {/* My Totems */}
        <div className="mb-2">
          <button 
            onClick={() => toggleSection('myTotems')}
            className="flex items-center w-full p-2 text-left hover:bg-gray-100 rounded-lg"
          >
            <span className="flex-1 font-medium">My Totems</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.includes('myTotems') ? 'transform rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.includes('myTotems') && (
            <ul className="pl-4 mt-1 space-y-1">
              <li>
                <Link href="#" className="block p-2 text-sm rounded-lg hover:bg-gray-100">
                  All Totems
                </Link>
              </li>
              <li>
                <Link href="#" className="block p-2 text-sm rounded-lg hover:bg-gray-100">
                  Fishing
                </Link>
              </li>
              <li>
                <Link href="#" className="block p-2 text-sm rounded-lg hover:bg-gray-100">
                  Flies
                </Link>
              </li>
              <li>
                <Link href="#" className="block p-2 text-sm rounded-lg hover:bg-gray-100">
                  Streams
                </Link>
              </li>
              <li>
                <Link href="#" className="block p-2 text-sm rounded-lg hover:bg-gray-100">
                  Gear
                </Link>
              </li>
            </ul>
          )}
        </div>
        
        {/* Popular Totems */}
        <div>
          <button 
            onClick={() => toggleSection('popularTotems')}
            className="flex items-center w-full p-2 text-left hover:bg-gray-100 rounded-lg"
          >
            <span className="flex-1 font-medium">Popular Totems</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.includes('popularTotems') ? 'transform rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.includes('popularTotems') && (
            <ul className="pl-4 mt-1 space-y-1">
              <li>
                <Link href="#" className="block p-2 text-sm rounded-lg hover:bg-gray-100">
                  Fly Fishing
                </Link>
              </li>
              <li>
                <Link href="#" className="block p-2 text-sm rounded-lg hover:bg-gray-100">
                  Trout
                </Link>
              </li>
              <li>
                <Link href="#" className="block p-2 text-sm rounded-lg hover:bg-gray-100">
                  Bass
                </Link>
              </li>
              <li>
                <Link href="#" className="block p-2 text-sm rounded-lg hover:bg-gray-100">
                  Casting
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>
      
      {/* Resources Section */}
      <div className="p-2 mt-4 border-t border-gray-200">
        <h3 className="p-2 font-medium">Resources</h3>
        <ul className="space-y-1">
          <li>
            <Link href="#" className="flex items-center p-2 text-sm rounded-lg hover:bg-gray-100">
              Help
            </Link>
          </li>
          <li>
            <Link href="#" className="flex items-center p-2 text-sm rounded-lg hover:bg-gray-100">
              User Agreement
            </Link>
          </li>
          <li>
            <Link href="#" className="flex items-center p-2 text-sm rounded-lg hover:bg-gray-100">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="#" className="flex items-center p-2 text-sm rounded-lg hover:bg-gray-100">
              Cookie Policy
            </Link>
          </li>
        </ul>
      </div>
      
      {/* Contact Us */}
      <div className="p-4 mt-2">
        <button className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
          Contact Us
        </button>
      </div>
    </aside>
  );
} 