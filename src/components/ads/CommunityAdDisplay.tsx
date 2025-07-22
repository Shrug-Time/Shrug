"use client";

import { useState, useEffect } from 'react';
import { CommunityAdService } from '@/services/communityAdService';
import { CommunityAd } from '@/types/models';

interface CommunityAdDisplayProps {
  className?: string;
  placement?: 'sidebar' | 'feed' | 'footer' | 'header';
}

export function CommunityAdDisplay({ className = '', placement = 'sidebar' }: CommunityAdDisplayProps) {
  const [currentAd, setCurrentAd] = useState<CommunityAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadNextAd();
  }, []);

  const loadNextAd = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const ad = await CommunityAdService.getNextAdForDisplay();
      setCurrentAd(ad);
    } catch (error) {
      console.error('Error loading ad:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAdClick = async () => {
    if (!currentAd) return;

    try {
      // Track the click
      await CommunityAdService.recordAdClicked(currentAd.id);
      
      // Open the PDF directly since there's no separate target URL
      window.open(currentAd.pdfUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error tracking ad click:', error);
      // Still allow navigation even if tracking fails
      window.open(currentAd.pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Don't render anything if there's no ad or we're loading
  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}>
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !currentAd) {
    return null; // Fail silently - ads are not critical
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Community Ad Label */}
      <div className="px-3 py-1 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Subscription Ad
        </span>
        <button
          onClick={loadNextAd}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          title="Load next ad"
        >
          ↻
        </button>
      </div>

      {/* Ad Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">
            Subscribe for $9.99/month
          </h3>
          <p className="text-xs text-gray-600">
            Premium subscription promotion
          </p>
        </div>

        {/* PDF Display */}
        <div className="mb-3">
          <div 
            className="bg-gray-100 rounded-lg p-3 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={handleAdClick}
          >
            <div className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 18h12V6h-4V2H4v16zm-2 1V1h10l4 4v14H2z"/>
                <path d="M9 13h2v-3h3V8h-3V5H9v3H6v2h3v3z"/>
              </svg>
              <span className="text-sm font-medium">View Subscription Ad</span>
              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Stats (for debugging - can be removed in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
            {currentAd.impressions} views • {currentAd.clicks} clicks
          </div>
        )}
      </div>
    </div>
  );
}

// Convenience components for different placements
export function SidebarAd() {
  return (
    <CommunityAdDisplay 
      className="w-full max-w-sm" 
      placement="sidebar" 
    />
  );
}

export function FeedAd() {
  return (
    <CommunityAdDisplay 
      className="w-full max-w-lg" 
      placement="feed" 
    />
  );
}

export function FooterAd() {
  return (
    <CommunityAdDisplay 
      className="w-full max-w-2xl" 
      placement="footer" 
    />
  );
} 