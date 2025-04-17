"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Redirect to content page by default
      router.push('/profile/content');
    } else if (!loading && !user) {
      // Redirect to home if not logged in
      router.push('/');
    }
  }, [loading, user, router]);

  // Show loading state while redirecting
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-600">Loading profile...</div>
      </div>
    </div>
  );
} 