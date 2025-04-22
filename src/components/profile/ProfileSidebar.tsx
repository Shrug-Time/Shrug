import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUser } from '@/hooks/useUser';
import { getAdminReportsUrl } from '@/utils/routes';

export function ProfileSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { profile } = useUser();

  const isAdmin = profile?.membershipTier === 'admin';

  if (!user) return null;
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-gray-100' : '';
  };

  return (
    <aside className="w-full md:w-64 flex-shrink-0">
      <div className="mb-6">
        <div className="text-center">
          <img
            src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName || 'User'}`}
            alt="Profile"
            className="w-24 h-24 rounded-full mx-auto mb-2"
          />
          <h3 className="font-semibold text-lg">Your Page</h3>
          <p className="text-sm text-gray-600">@{user.displayName || user.email?.split('@')[0]}</p>
        </div>
      </div>
      
      <nav className="space-y-1">
        <Link 
          href="/profile/content" 
          className={`flex items-center px-4 py-3 text-gray-700 ${isActive('/profile/content')}`}
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
        
        <Link 
          href="/profile/subscribers" 
          className={`flex items-center px-4 py-3 text-gray-700 ${isActive('/profile/subscribers')}`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          Your Subscribers
        </Link>
        
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
    </aside>
  );
} 