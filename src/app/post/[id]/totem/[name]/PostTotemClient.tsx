"use client";

import { useState } from 'react';
import { TotemDetail } from '@/components/totem/TotemDetail';
import type { Post } from '@/types/models';
import { updateTotemLikes, refreshTotem } from '@/lib/firebase/posts';

interface PostTotemClientProps {
  initialPost: Post;
  totemName: string;
}

export function PostTotemClient({ initialPost, totemName }: PostTotemClientProps) {
  const [post, setPost] = useState(initialPost);

  const handleLikeTotem = async (postId: string, totemName: string) => {
    await updateTotemLikes(postId, totemName);
    // Optimistically update the UI
    setPost(prevPost => ({
      ...prevPost,
      answers: prevPost.answers.map(answer => ({
        ...answer,
        totems: answer.totems?.map(totem => 
          totem.name === totemName 
            ? { ...totem, likes: totem.likes + 1 }
            : totem
        )
      }))
    }));
  };

  const handleRefreshTotem = async (postId: string, totemName: string) => {
    const updatedTotem = await refreshTotem(postId, totemName);
    if (!updatedTotem) return;
    
    // Update the UI with the refreshed totem
    setPost(prevPost => ({
      ...prevPost,
      answers: prevPost.answers.map(answer => ({
        ...answer,
        totems: answer.totems?.map(totem => 
          totem.name === totemName 
            ? { ...totem, crispness: updatedTotem.crispness }
            : totem
        )
      }))
    }));
  };

  return (
    <TotemDetail
      totemName={totemName}
      posts={[post]}
      onLikeTotem={handleLikeTotem}
      onRefreshTotem={handleRefreshTotem}
    />
  );
} 