"use client";

import React from 'react';

interface WelcomeHeaderProps {
  onDismiss: () => void;
}

export function WelcomeHeader({ onDismiss }: WelcomeHeaderProps) {
  return (
    <div className="flex justify-center py-8 bg-gray-50">
      {/* Exact Figma card: 817x330px, white background, 12px corner radius */}
      <div 
        className="bg-white shadow-lg relative"
        style={{ 
          width: '817px',
          height: '330px',
          borderRadius: '12px',
          maxWidth: '90vw'
        }}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-lg z-10"
          aria-label="Close"
        >
          ×
        </button>

        {/* Content positioned exactly as in Figma */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-16 py-12">
          
          {/* Header: "Welcome to" + logo */}
          <div className="flex items-center mb-8">
            <span 
              style={{ 
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: '18px',
                letterSpacing: '0.72px',
                color: '#000000'
              }}
            >
              Welcome to
            </span>
            {/* Shrug logo - Blue geometric shapes representing people shrugging */}
            <div className="ml-4 flex items-center space-x-1">
              <svg width="72" height="25" viewBox="0 0 72 25" fill="none">
                {/* Left figure */}
                <path d="M57.5 5.5L62 2L66.5 5.5L62 9L57.5 5.5Z" fill="#0E65E8"/>
                <rect x="60" y="9" width="4" height="14" rx="1" fill="#0E65E8"/>
                
                {/* Center figure */}
                <path d="M32.5 6.5L37 3L41.5 6.5L37 10L32.5 6.5Z" fill="#0E65E8"/>
                <rect x="35" y="10" width="4" height="12" rx="1" fill="#0E65E8"/>
                
                {/* Right figure */}
                <path d="M7.5 5.5L12 2L16.5 5.5L12 9L7.5 5.5Z" fill="#0E65E8"/>
                <rect x="10" y="9" width="4" height="14" rx="1" fill="#0E65E8"/>
                
                {/* Center-left figure */}
                <path d="M45 7L49 4L53 7L49 10.5L45 7Z" fill="#0E65E8" transform="rotate(-6 49 7.25)"/>
                <rect x="47" y="10.5" width="4" height="13" rx="1" fill="#0E65E8" transform="rotate(-6 49 17)"/>
                
                {/* Center-right figure */}
                <path d="M19.5 6L24 2.5L28.5 6L24 9.5L19.5 6Z" fill="#0E65E8"/>
                <rect x="22" y="9.5" width="4" height="13.5" rx="1" fill="#0E65E8"/>
              </svg>
            </div>
          </div>

          {/* Body Text - exact Figma specs: 643px width, centered */}
          <div className="mb-8 text-center" style={{ width: '643px', maxWidth: '90%' }}>
            <p 
              style={{ 
                fontFamily: 'Inter',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '30px',
                letterSpacing: '0.56px',
                color: '#525865',
                textAlign: 'center'
              }}
            >
              Shrug is a space for open questions and diverse answers—free from corporate control. Instead of being steered by algorithms or ad-driven agendas, Shrug lets users lift totems to show which ideas resonate most. With crispness keeping posts fresh, it's a platform where genuine perspectives—not big businesses—shape the conversation.
            </p>
          </div>

          {/* Button - exact Figma specs: 131x40px, 30px corner radius */}
          <button
            onClick={onDismiss}
            style={{
              width: '131px',
              height: '40px',
              backgroundColor: 'rgb(43, 103, 246)',
              color: '#FFFFFF',
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: '16px',
              lineHeight: '18px',
              borderRadius: '30px',
              border: 'none',
              cursor: 'pointer'
            }}
            className="hover:brightness-110 transition-all duration-200"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}