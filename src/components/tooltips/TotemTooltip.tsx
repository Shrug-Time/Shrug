"use client";

import React, { useState, useEffect } from 'react';

interface TotemTooltipProps {
  isVisible: boolean;
  onDismiss: () => void;
  children?: React.ReactNode;
}

export function TotemTooltip({ isVisible, onDismiss, children }: TotemTooltipProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div className="relative mt-3">
      {/* Tooltip Arrow pointing up - positioned to point directly at center of totem */}
      <div 
        className="absolute -top-3 left-8 w-4 h-3"
        style={{
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          backgroundColor: '#393938'
        }}
      ></div>
      
      {/* Main tooltip container - smaller size */}
      <div 
        className={`
          relative px-3 py-3 rounded-lg shadow-lg
          transition-all duration-300 ease-in-out
          ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'}
        `}
        style={{
          backgroundColor: '#393938',
          width: '260px',
          minHeight: '50px'
        }}
      >
        {/* Close button - smaller and repositioned */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-white hover:text-gray-300 transition-colors"
          aria-label="Dismiss tooltip"
          style={{ fontSize: '14px', lineHeight: '1' }}
        >
          ×
        </button>

        {/* Content - updated text */}
        <div className="pr-6 text-white">
          {children || (
            <p className="text-xs leading-4" style={{ fontSize: '12px', lineHeight: '16px' }}>
              A Totem is a label for your answer that others can lift to show support.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}