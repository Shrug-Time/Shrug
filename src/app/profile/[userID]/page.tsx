"use client";

import { use } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';
import { QuestionList } from '@/components/questions/QuestionList';
import { useQuery } from '@tanstack/react-query';
import { UserService, PostService } from '@/services/firebase';
import { handleTotemLike as utilHandleTotemLike, handleTotemRefresh as utilHandleTotemRefresh } from '@/utils/totem';
import { useRouter } from 'next/navigation';
import type { Post } from '@/types/models';
import { auth } from '@/firebase';

export default function UserProfilePage({ params }: { params: { userID: string } }) {
  const router = useRouter();
  const { userID } = params;

  const { 
    data: userData,
    isLoading: userLoading,
    error: userError
  } = useQuery({
    queryKey: ['user', userID],
    queryFn: () => UserService.getUserProfile(userID)
  });

  const {
    data: userPosts,
    isLoading: postsLoading,
    error: postsError
  } = useQuery({
    queryKey: ['userPosts', userID],
    queryFn: () => PostService.getUserPosts(userID),
    enabled: !!userData
  });

  const handleSelectQuestion = (post: Post) => {
    router.push(`/post/${post.id}`);
  };

  const handleTotemLike = async (postId: string, totemName: string) => {
    const post = userPosts?.find(p => p.id === postId);
    if (!post || !auth.currentUser) return;
    
    const answerIdx = post.answers.findIndex(a => a.totems.some(t => t.name === totemName));
    if (answerIdx === -1) return;

    await utilHandleTotemLike(post, answerIdx, totemName, auth.currentUser.uid);
  };

  const handleTotemRefresh = async (postId: string, totemName: string) => {
    const post = userPosts?.find(p => p.id === postId);
    if (!post || !userData) return;
    
    const answerIdx = post.answers.findIndex(a => a.totems.some(t => t.name === totemName));
    if (answerIdx === -1) return;

    await utilHandleTotemRefresh(post, answerIdx, totemName, userData.refreshesRemaining || 0);
  };

  if (userLoading || postsLoading) {
    return <LoadingSpinner size="lg" className="mx-auto mt-8" />;
  }

  if (userError || postsError) {
    return (
      <div className="p-4">
        <Toast 
          message={(userError || postsError)?.message || 'An error occurred'} 
          type="error"
        />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-4">
        <Toast message="User not found" type="error" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{userData.name}</h1>
          <p className="text-gray-600">{userData.bio || 'No bio provided'}</p>
        </div>
        
        {userPosts && userPosts.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Answers</h2>
            <QuestionList 
              posts={userPosts}
              onSelectQuestion={handleSelectQuestion}
              onLikeTotem={handleTotemLike}
              onRefreshTotem={handleTotemRefresh}
              showAllTotems={false}
            />
          </div>
        ) : (
          <p className="text-gray-500">No answers yet</p>
        )}
      </div>
    </ErrorBoundary>
  );
} 