"use client";

import React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Totem } from '@/types/models';
import { TotemButton } from '@/components/totem/TotemButton';

interface TotemDisplayProps {
  totem: Totem;
  postId: string;
  className?: string;
}

export function TotemDisplay({ totem, postId, className = '' }: TotemDisplayProps) {
  const { user } = useAuth();
  const { isLiked } = useTotem();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <TotemButton
        totemName={totem.name}
        postId={postId}
      />
      {totem.crispness !== undefined && (
        <span className="text-xs text-gray-500">
          {Math.round(totem.crispness)}% fresh
        </span>
      )}
    </div>
  );
} 