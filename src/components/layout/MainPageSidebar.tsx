import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TotemService } from '@/services/standardized';
import { SidebarAd } from '@/components/ads/CommunityAdDisplay';

interface MainPageSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function MainPageSidebar({ isExpanded, onToggle }: MainPageSidebarProps) {
  const router = useRouter();
  const { profile, refetch } = useUser();
  const [expandedSections, setExpandedSections] = useState<string[]>(['recentTotems', 'popularTotems']);
  const [recentTotems, setRecentTotems] = useState<string[]>([]);
  const [popularTotems, setPopularTotems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stable key representing the user's recent totems — only re-run the effect when the list actually changes
  const recentTotemsKey = useMemo(
    () => (profile?.totems?.recent || []).slice(0, 5).join(','),
    [profile?.totems?.recent]
  );

  // Load recent totems from user's recent activity
  useEffect(() => {
    if (!profile) return;

    const loadRecentTotems = async () => {
      try {
        const userTotems = profile.totems?.recent || [];
        setRecentTotems(userTotems.slice(0, 5));

        const popularTotemsData = await TotemService.getPopularTotems(5);
        setPopularTotems(popularTotemsData.map(totem => totem.name));
      } catch (error) {
        console.error('❌ Error loading totems:', error);
        setPopularTotems(['Fishing', 'Flies', 'Streams', 'Gear', 'Techniques'].slice(0, 5));
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentTotems();
  }, [recentTotemsKey]); // only re-runs when the actual totem list changes, not on every profile refresh

  // Refresh user profile data periodically to catch totem interaction updates
  useEffect(() => {
    if (!profile) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refetch();
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }, 120000); // Refresh every 2 minutes

    return () => clearInterval(refreshInterval);
  }, [refetch]); // removed profile from deps — no need to restart interval on every profile update

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

  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-20 p-2 bg-white hover:bg-gray-100 transition-colors rounded-r-lg shadow-md z-40"
        title="Expand sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] bg-gray-50 border-r border-gray-200 z-40 w-64 shadow-lg transition-transform duration-300"
         style={{ transform: isExpanded ? 'translateX(0)' : 'translateX(-100%)' }}>
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Discover</h2>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
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

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h3>
          <div className="space-y-1">
            <button
              onClick={() => router.push('/post/new')}
              className="w-full p-2 text-sm text-left text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Ask a Question
            </button>
            <button
              onClick={() => router.push('/search')}
              className="w-full p-2 text-sm text-left text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              Search Content
            </button>
          </div>
        </div>

        {/* Community Ad */}
        <div className="pt-4 border-t border-gray-200">
          <SidebarAd />
        </div>

        {/* Footer Links */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
            <Link href="/about" className="hover:text-gray-600">About</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/contact" className="hover:text-gray-600">Contact</Link>
          </div>
          <p className="text-xs text-gray-300 mt-2">&copy; {new Date().getFullYear()} Shrug</p>
        </div>
      </div>
    </div>
  );
} 