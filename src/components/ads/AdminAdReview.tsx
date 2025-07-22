"use client";

import { useState, useEffect } from 'react';
import { CommunityAdService } from '@/services/communityAdService';
import { CommunityAd } from '@/types/models';
import { formatDistanceToNow } from 'date-fns';

interface AdminAdReviewProps {
  isAdmin: boolean;
}

export function AdminAdReview({ isAdmin }: AdminAdReviewProps) {
  const [pendingAds, setPendingAds] = useState<CommunityAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAd, setProcessingAd] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadPendingAds();
    }
  }, [isAdmin]);

  const loadPendingAds = async () => {
    try {
      setLoading(true);
      const ads = await CommunityAdService.getPendingAds();
      setPendingAds(ads);
    } catch (error) {
      console.error('Error loading pending ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (adId: string) => {
    setProcessingAd(adId);
    try {
      await CommunityAdService.approveAd(adId);
      setPendingAds(prev => prev.filter(ad => ad.id !== adId));
    } catch (error) {
      console.error('Error approving ad:', error);
      alert('Failed to approve ad');
    } finally {
      setProcessingAd(null);
    }
  };

  const handleReject = async (adId: string) => {
    setProcessingAd(adId);
    try {
      await CommunityAdService.rejectAd(adId);
      setPendingAds(prev => prev.filter(ad => ad.id !== adId));
    } catch (error) {
      console.error('Error rejecting ad:', error);
      alert('Failed to reject ad');
    } finally {
      setProcessingAd(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Access Denied</h3>
        <p className="text-red-700">
          This interface is only available to administrators.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading pending ads...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Ad Review Queue</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
              {pendingAds.length} pending
            </span>
            <button 
              onClick={loadPendingAds}
              className="px-3 py-1 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {pendingAds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-2">🎉 All caught up!</p>
            <p className="text-gray-500">No ads pending review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingAds.map((ad) => (
              <div key={ad.id} className="border border-gray-200 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Ad Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Subscription Promotion Ad</h3>
                    <p className="text-gray-700 mb-4">
                      PDF or PNG advertisement promoting $9.99/month subscription
                    </p>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Submitted:</span>{' '}
                        {formatDistanceToNow(ad.submittedAt)} ago
                      </div>
                      <div>
                        <span className="font-medium">Submitter ID:</span>{' '}
                        <code className="bg-gray-100 px-1 rounded text-xs">
                          {ad.submitterId}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* PDF Preview & Actions */}
                  <div>
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">PDF or PNG Advertisement</h4>
                      <div className="bg-gray-100 rounded-lg p-4">
                        <a
                          href={ad.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 18h12V6h-4V2H4v16zm-2 1V1h10l4 4v14H2z"/>
                            <path d="M9 13h2v-3h3V8h-3V5H9v3H6v2h3v3z"/>
                          </svg>
                          <span>Open file in new tab</span>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                            <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"/>
                          </svg>
                        </a>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Review: Does this prominently feature "$9.99 subscription" and encourage signups?
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(ad.id)}
                        disabled={processingAd === ad.id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {processingAd === ad.id ? 'Processing...' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(ad.id)}
                        disabled={processingAd === ad.id}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {processingAd === ad.id ? 'Processing...' : '❌ Reject'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Approved ads will appear in rotation immediately
                    </p>
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