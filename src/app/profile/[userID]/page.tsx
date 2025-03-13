"use client";

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';
import { QuestionList } from '@/components/questions/QuestionList';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { UserService, PostService } from '@/services/firebase';
import { handleTotemLike as utilHandleTotemLike, handleTotemRefresh as utilHandleTotemRefresh } from '@/utils/totem';
import { useRouter } from 'next/navigation';
import type { Post, UserProfile } from '@/types/models';

interface PageProps {
  params: { userID: string };
}

// Create a client
const queryClient = new QueryClient();

function ProfileContent({ userID }: { userID: string }) {
  const router = useRouter();

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
    queryFn: () => {
      console.log('Fetching posts for user:', userID);
      return PostService.getUserPosts(userID);
    }
  });

  const handleSelectQuestion = (post: Post) => {
    router.push(`/post/${post.id}`);
  };

  const handleTotemLike = async (post: Post, answerIdx: number, totemName: string) => {
    if (!userData) return;
    await utilHandleTotemLike(post, answerIdx, totemName, userData.userID);
  };

  const handleTotemRefresh = async (post: Post, answerIdx: number, totemName: string) => {
    if (!userData) return;
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
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{userData.name}</h1>
        <p className="text-gray-600">{userData.bio || 'No bio provided'}</p>
      </div>
      
      {userPosts && userPosts.length > 0 ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Posts and Answers</h2>
            <QuestionList 
              posts={userPosts}
              onSelectQuestion={handleSelectQuestion}
              onLikeTotem={handleTotemLike}
              onRefreshTotem={handleTotemRefresh}
              showAllTotems={false}
            />
          </div>
        </div>
      ) : (
        <p className="text-gray-500">No posts or answers yet</p>
      )}
    </div>
  );
}

export default function UserProfilePage({ params }: PageProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ProfileContent userID={params.userID} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
} 