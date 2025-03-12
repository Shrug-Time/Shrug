'use client';

import { TotemDetail } from '@/components/totem/TotemDetail';
import { Post } from '@/types/models';
import { useState } from 'react';
import { updateTotemLikes, refreshTotem } from '@/lib/firebase/posts';

interface TotemPageClientProps {
  initialPosts: Post[];
  totemName: string;
}

export function TotemPageClient({ initialPosts, totemName }: TotemPageClientProps) {
  const [posts, setPosts] = useState(initialPosts);

  const handleLikeTotem = async (postId: string, totemName: string) => {
    await updateTotemLikes(postId, totemName);
    // Optimistically update the UI
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id !== postId) return post;
        return {
          ...post,
          answers: post.answers.map(answer => ({
            ...answer,
            totems: answer.totems?.map(totem => 
              totem.name === totemName 
                ? { ...totem, likes: totem.likes + 1 }
                : totem
            )
          }))
        };
      })
    );
  };

  const handleRefreshTotem = async (postId: string, totemName: string) => {
    const updatedTotem = await refreshTotem(postId, totemName);
    if (!updatedTotem) return;
    
    // Update the UI with the refreshed totem
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id !== postId) return post;
        return {
          ...post,
          answers: post.answers.map(answer => ({
            ...answer,
            totems: answer.totems?.map(totem => 
              totem.name === totemName 
                ? { ...totem, crispness: updatedTotem.crispness }
                : totem
            )
          }))
        };
      })
    );
  };

  return (
    <TotemDetail
      totemName={totemName}
      posts={posts}
      onLikeTotem={handleLikeTotem}
      onRefreshTotem={handleRefreshTotem}
    />
  );
} 