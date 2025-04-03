"use client";

import React from 'react';
import { useTotemV2 } from '@/contexts/TotemContextV2';
import { useAuth } from '@/contexts/AuthContext';
import type { Post } from '@/types/modelsV2';
import { TotemDisplayV2 } from '@/components/totem/TotemDisplayV2';

interface ProfilePageV2Props {
  posts: Post[];
  userId: string;
}

export function ProfilePageV2({ posts, userId }: ProfilePageV2Props) {
  const { user } = useAuth();
  const { isLiked } = useTotemV2();

  // Get all totems from user's posts
  const userTotems = posts
    .flatMap(post => post.answers)
    .flatMap(answer => answer.totems)
    .filter(totem => totem.likeHistory?.some(like => 
      like.userId === userId && like.isActive
    ));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          User Profile
        </h1>
        <p className="text-gray-600">
          {userTotems.length} liked totems
        </p>
      </div>

      <div className="space-y-6">
        {userTotems.map(totem => (
          <div key={totem.name} className="bg-white rounded-xl shadow p-4">
            <TotemDisplayV2
              totem={totem}
              postId={posts.find(post => 
                post.answers.some(answer => 
                  answer.totems.some(t => t.name === totem.name)
                )
              )?.id || ''}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 