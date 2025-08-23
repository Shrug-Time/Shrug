"use client";

import { isFeatureEnabled } from '@/config/featureFlags';
import { redirect } from 'next/navigation';

export default function ContentGatingPage() {
  // Redirect to home if premium content is disabled
  if (!isFeatureEnabled('PREMIUM_CONTENT_ENABLED')) {
    redirect('/');
  }
  
  return null; // This page is disabled
  const { user } = useAuth();
  const [gatingStatus, setGatingStatus] = useState<boolean>(false);
  
  // Demo content items
  const contentItems = [
    { id: 'demo-post-1', title: 'Introduction to Premium Content', type: 'Post' },
    { id: 'demo-answer-1', title: 'Expert Analysis on Markets', type: 'Answer' },
    { id: 'demo-totem-1', title: 'Trending Totem Collection', type: 'Collection' },
  ];
  
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Content Gating Controls</h1>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-yellow-800">Please log in to access creator features.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Content Gating Controls</h1>
      <p className="mb-6 text-gray-600">
        As a creator, you can make your content premium-only, allowing you to monetize your expertise.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {contentItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-5">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 mb-4">Type: {item.type}</p>
              
              <ContentGatingControls
                contentId={item.id}
                creatorId={user.uid}
                contentType={item.type}
                initialIsGated={false}
                onGatingChange={(isGated) => {
                  console.log(`Content ${item.id} gating status: ${isGated}`);
                  setGatingStatus(isGated);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 