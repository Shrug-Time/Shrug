"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const TOOLTIP_STORAGE_KEY = 'shrug_totem_tooltip_shown';

export function useFirstLoginTooltip() {
  const { user } = useAuth();
  const [shouldShowTooltip, setShouldShowTooltip] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      setShouldShowTooltip(false);
      setIsTooltipVisible(false);
      return;
    }

    // Check if this is the user's first time seeing the tooltip
    const hasSeenTooltip = localStorage.getItem(TOOLTIP_STORAGE_KEY);
    
    if (!hasSeenTooltip) {
      // Show tooltip after a short delay to let the page load
      const timer = setTimeout(() => {
        setShouldShowTooltip(true);
        setIsTooltipVisible(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user?.uid]); // Only depend on user ID to prevent constant re-runs

  const dismissTooltip = () => {
    setIsTooltipVisible(false);
    setShouldShowTooltip(false);
    
    // Mark tooltip as seen in localStorage
    localStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
  };

  return {
    shouldShowTooltip,
    isTooltipVisible,
    dismissTooltip
  };
}