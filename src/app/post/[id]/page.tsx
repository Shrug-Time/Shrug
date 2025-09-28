"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser';
import { PostService } from '@/services/standardized';
import { CreatePostForm } from '@/components/posts/CreatePostForm';
import { QuestionAnswers } from '@/components/questions/QuestionAnswers';
import { ReportButton } from '@/components/reports/ReportButton';
import { getProfileUrl } from '@/utils/routes';
import Link from 'next/link';
import type { Post } from '@/types/models';

export default function PostPage() {
  const params = useParams();
  const postId = params?.id as string;
  const queryClient = useQueryClient();
  const { profile: userData, isLoading: isLoadingUserData } = useUser();
  const [showCreatePost, setShowCreatePost] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => PostService.getPost(postId),
    enabled: !!postId
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="max-w-4xl ml-64 px-4 py-8">
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex justify-between items-start">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.question}</h1>
          <ReportButton contentId={post.id} contentType="post" />
        </div>
        <div className="text-sm text-gray-600">
          Asked by{' '}
          <Link 
            href={getProfileUrl(post.username || post.firebaseUid || '')}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {post.username || 'Anonymous'}
          </Link>
        </div>
      </div>

      <QuestionAnswers post={post} />

      {showCreatePost && userData && (
        <CreatePostForm
          firebaseUid={userData.firebaseUid ?? ''}
          username={userData.username ?? ''}
          name={userData.name ?? ''}
          onPostCreated={() => {
            setShowCreatePost(false);
            queryClient.invalidateQueries({ queryKey: ['posts'] });
          }}
          onCancel={() => setShowCreatePost(false)}
        />
      )}
    </div>
  );
} 