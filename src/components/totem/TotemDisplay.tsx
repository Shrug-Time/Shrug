'use client';

import { useState } from 'react';
import type { Totem } from '@/types/models';
import { formatDistanceToNow } from 'date-fns';

interface TotemDisplayProps {
  totem: Totem;
  onLike: () => Promise<void>;
  onRefresh: () => Promise<void>;
  refreshesRemaining: number;
  isLiked: boolean;
  isPremium: boolean;
}

export function TotemDisplay({
  totem,
  onLike,
  onRefresh,
  refreshesRemaining,
  isLiked,
  isPremium
}: TotemDisplayProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      console.error('Error performing totem action:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const getCrispnessColor = (crispness: number) => {
    if (crispness >= 80) return 'text-green-500';
    if (crispness >= 60) return 'text-blue-500';
    if (crispness >= 40) return 'text-yellow-500';
    if (crispness >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  const getDecayLabel = (decayModel: string) => {
    switch (decayModel) {
      case 'FAST': return '1-week decay';
      case 'MEDIUM': return '1-year decay';
      case 'NONE': return 'No decay';
      default: return 'Unknown decay';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{totem.name}</h3>
        <span className="text-sm text-gray-500">{totem.category.name}</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div>
          <span className="text-2xl font-bold">{totem.likes}</span>
          <span className="text-gray-500 ml-1">likes</span>
        </div>
        <div>
          <span className={`text-2xl font-bold ${getCrispnessColor(totem.crispness)}`}>
            {Math.round(totem.crispness)}%
          </span>
          <span className="text-gray-500 ml-1">crisp</span>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        <p>Decay model: {getDecayLabel(totem.decayModel)}</p>
        {totem.lastLike && (
          <p>Last interaction: {formatTimestamp(totem.lastLike)}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleAction(onLike)}
          disabled={isLoading || isLiked}
          className={`px-4 py-2 rounded-full ${
            isLiked
              ? 'bg-gray-100 text-gray-500'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          } disabled:opacity-50`}
        >
          {isLiked ? 'Liked' : 'Like'}
        </button>

        <button
          onClick={() => handleAction(onRefresh)}
          disabled={isLoading || refreshesRemaining <= 0 || !isPremium}
          className="px-4 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:opacity-50"
          title={
            !isPremium
              ? 'Premium feature'
              : refreshesRemaining <= 0
              ? 'No refreshes remaining'
              : `${refreshesRemaining} refreshes remaining`
          }
        >
          Refresh ({refreshesRemaining})
        </button>
      </div>

      {!isPremium && (
        <p className="text-sm text-gray-500 mt-2">
          Upgrade to premium to refresh totems
        </p>
      )}
    </div>
  );
} 