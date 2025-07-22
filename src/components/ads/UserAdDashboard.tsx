"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { CommunityAdService } from '@/services/communityAdService';
import { CommunityAd } from '@/types/models';
import { formatDistanceToNow } from 'date-fns';

interface UserAdDashboardProps {
  onNewSubmission?: () => void;
}

export function UserAdDashboard({ onNewSubmission }: UserAdDashboardProps) {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [userAds, setUserAds] = useState<CommunityAd[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && isPremium) {
      loadUserAds();
    }
  }, [user, isPremium]);

  const loadUserAds = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const ads = await CommunityAdService.getUserAds(user.uid);
      setUserAds(ads);
    } catch (error) {
      console.error('Error loading user ads:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Premium Feature</h3>
        <p className="text-blue-700 mb-4">
          Ad submission and tracking is available to Premium members only.
        </p>
        <a 
          href="/subscription" 
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Upgrade to Premium
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading your ads...</span>
      </div>
    );
  }

  const getStatusColor = (status: CommunityAd['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: CommunityAd['status']) => {
    switch (status) {
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">My Community Ads</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadUserAds}
              className="px-3 py-1 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              Refresh
            </button>
            {onNewSubmission && (
              <button
                onClick={onNewSubmission}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit New Ad
              </button>
            )}
          </div>
        </div>

        {userAds.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No ads submitted yet</h3>
            <p className="text-gray-600 mb-6">
              Submit your first community ad to get started. All approved ads get equal rotation across the platform.
            </p>
            {onNewSubmission && (
              <button
                onClick={onNewSubmission}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Submit Your First Ad
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {userAds.map((ad) => (
              <div key={ad.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Subscription Promotion Ad</h3>
                    <p className="text-gray-600 text-sm">PDF or PNG promoting $9.99/month subscription</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(ad.status)}`}>
                    <span>{getStatusIcon(ad.status)}</span>
                    {ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Ad Details */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">PDF or PNG Advertisement</h4>
                      <a
                        href={ad.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 18h12V6h-4V2H4v16zm-2 1V1h10l4 4v14H2z"/>
                          <path d="M9 13h2v-3h3V8h-3V5H9v3H6v2h3v3z"/>
                        </svg>
                        View File
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                          <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"/>
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* Statistics & Timeline */}
                  <div className="space-y-3">
                    {ad.status === 'approved' && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Performance</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-blue-900 font-semibold">{ad.impressions}</div>
                            <div className="text-blue-700">Views</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-green-900 font-semibold">{ad.clicks}</div>
                            <div className="text-green-700">Clicks</div>
                          </div>
                        </div>
                        {ad.impressions > 0 && (
                          <div className="text-xs text-gray-500 mt-2">
                            Click rate: {((ad.clicks / ad.impressions) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Timeline</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Submitted:</span>
                          <span>{formatDistanceToNow(ad.submittedAt)} ago</span>
                        </div>
                        {ad.approvedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Approved:</span>
                            <span>{formatDistanceToNow(ad.approvedAt)} ago</span>
                          </div>
                        )}
                        {ad.lastShown && ad.lastShown > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last shown:</span>
                            <span>{formatDistanceToNow(ad.lastShown)} ago</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {ad.status === 'rejected' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="text-red-800 text-sm">
                          <div className="font-medium mb-1">Ad Rejected</div>
                          <div>You can resubmit a new ad at any time. Please review the guidelines before resubmitting.</div>
                        </div>
                      </div>
                    )}

                    {ad.status === 'pending' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="text-yellow-800 text-sm">
                          <div className="font-medium mb-1">Under Review</div>
                          <div>Your ad is being reviewed by our team. This usually takes 1-2 business days.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 