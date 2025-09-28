"use client";

import { TotemPageClient } from './TotemPageClient';
import { Post } from '@/types/models';
import { useParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getPostsForTotem } from '@/lib/firebase/posts';

export default function TotemPage() {
  const params = useParams();
  const totemName = params.name as string;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPosts() {
      try {
        const fetchedPosts = await getPostsForTotem(totemName);
        
        // Convert posts to standardized format
        const standardizedPosts: Post[] = fetchedPosts.map((post: any) => ({
          id: post.id,
          question: post.question,
          answers: post.answers,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt
        }));
        
        setPosts(standardizedPosts);
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadPosts();
  }, [totemName]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="container lg:ml-64 mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold"># {totemName}</h1>
        <p className="text-gray-600">
          Posts tagged with {totemName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.length > 0 ? (
          <TotemPageClient
          posts={posts}
          totemName={totemName}
        />
        ) : (
          <p>No posts found for this totem.</p>
        )}
      </div>
    </div>
  );
} 