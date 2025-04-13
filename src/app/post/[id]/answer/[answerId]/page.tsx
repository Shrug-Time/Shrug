"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getAnswerUrl } from '@/utils/routes';

// Redirect from singular 'answer' route to plural 'answers' route
export default function AnswerRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const answerId = params.answerId as string;

  useEffect(() => {
    // Redirect to the plural version of the route
    router.replace(getAnswerUrl(postId, answerId));
  }, [postId, answerId, router]);

  // Show a loading message while redirecting
  return <div>Redirecting...</div>;
} 