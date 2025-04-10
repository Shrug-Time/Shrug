"use client";

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { CreatePostForm } from '@/components/posts/CreatePostForm';

export default function NewPostPage() {
  const router = useRouter();
  const { profile, isLoading } = useUser();

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">Please sign in to create a new question.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create a New Question</h1>
      
      <CreatePostForm
        firebaseUid={profile.firebaseUid || ''}
        username={profile.username || ''}
        name={profile.name || ''}
        onPostCreated={() => {
          router.push('/');
        }}
        onCancel={() => {
          router.back();
        }}
      />
    </div>
  );
} 