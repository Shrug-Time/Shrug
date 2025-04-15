"use client";

import React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import Link from 'next/link';
import type { Post } from '@/types/models';
import { TotemDisplay } from '@/components/totem/TotemDisplay';

interface ProfilePageClientProps {
  posts: Post[];
  userId: string;
}

export function ProfilePageClient({ posts, userId }: ProfilePageClientProps) {
  const { isLiked } = useTotem();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Profile: {userId}</h1>
      
      {posts.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => (
              <div key={post.id} className="border rounded-lg p-4 shadow-sm">
                <Link href={`/post/${post.id}`} className="text-blue-600 hover:underline">
                  <h3 className="font-medium">{post.question}</h3>
                </Link>
                
                {post.answers && post.answers.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700">Totems:</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {post.answers.flatMap(answer => 
                        answer.totems.map(totem => (
                          <TotemDisplay 
                            key={`${post.id}-${totem.name}`}
                            totem={totem}
                            postId={post.id}
                            className="inline-block"
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-600">No posts found for this user.</p>
      )}
    </div>
  );
} 