"use client";

import React from 'react';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { useAuth } from '@/contexts/AuthContext';
import type { Totem } from '@/types/modelsV2';
import { TotemButton } from '@/components/totem/TotemButtonV2';

interface TotemDisplayV2Props {
  totem: Totem;
  postId: string;
  className?: string;
}

export function TotemDisplayV2({ totem, postId, className = '' }: TotemDisplayV2Props) {
  const { user } = useAuth();
  const { isLiked } = useTotemV2();

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