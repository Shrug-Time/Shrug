"use client";

import React from 'react';

interface IntroductionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntroductionModal({ isOpen, onClose }: IntroductionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Exact Figma container: 817x330px, 12px corner radius, white background */}
      <div 
        className="bg-white shadow-xl mx-4 relative"
        style={{ 
          width: '817px',
          height: '330px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          borderRadius: '12px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-xl z-10"
          aria-label="Close"
        >
          ×
        </button>

        {/* Content positioned exactly as in Figma */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          
          {/* Header: "Welcome to" + logo - positioned at top */}
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
            {/* Logo placeholder - would need actual Shrug SVG */}
            <div className="ml-3 text-blue-600 font-bold text-lg">🤷</div>
          </div>

          {/* Body Text - exact Figma specs: 643px width, centered */}
          <div className="mb-8" style={{ width: '643px', maxWidth: '90%' }}>
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
            onClick={onClose}
            style={{
              width: '131px',
              height: '40px',
              backgroundColor: 'rgb(43, 103, 246)', // Exact Figma color: r:0.169, g:0.404, b:0.965
              color: '#FFFFFF',
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: '16px',
              lineHeight: '18px',
              letterSpacing: '0px',
              borderRadius: '30px', // Exact from Figma cornerRadius: 30.0
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0',
              boxShadow: '0 2px 8px rgba(43, 103, 246, 0.2)'
            }}
            className="hover:brightness-110 active:brightness-95 transition-all duration-200"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}