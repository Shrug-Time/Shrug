'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomizationRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the correct URL
    router.replace('/profile/customize');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-48">
      <p className="text-gray-500">Redirecting to correct page...</p>
    </div>
  );
} 