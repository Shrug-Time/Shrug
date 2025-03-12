import { getPostsForTotem } from '@/lib/firebase/posts';
import { TotemPageClient } from './TotemPageClient';

interface TotemPageProps {
  params: Promise<{
    name: string;
  }>;
}

export default async function TotemPage({ params }: TotemPageProps) {
  const resolvedParams = await params;
  const decodedName = decodeURIComponent(resolvedParams.name);
  
  try {
    const posts = await getPostsForTotem(decodedName);
    
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          Posts with totem: {decodedName}
        </h1>
        
        <TotemPageClient
          initialPosts={posts}
          totemName={decodedName}
        />
      </main>
    );
  } catch (error) {
    console.error('Error fetching posts:', error);
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          Posts with totem: {decodedName}
        </h1>
        <p className="text-red-600">
          Error loading posts. Please try again later.
        </p>
      </main>
    );
  }
} 