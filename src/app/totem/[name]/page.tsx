import { TotemPageClient } from './TotemPageClient';
import { Post } from '@/types/models';
import { Metadata } from 'next';
import { getPostsForTotem } from '@/lib/firebase/posts';

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
  return {
    title: `${params.name} - Shrug`,
    description: `View posts tagged with ${params.name}`,
  };
}

export default async function TotemPage({ params }: { params: { name: string } }) {
  const totemName = params.name;
  const posts = await getPostsForTotem(totemName);
  
  // Convert posts to standardized format
  const standardizedPosts: Post[] = posts.map((post: any) => ({
    id: post.id,
    question: post.question,
    answers: post.answers,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold"># {totemName}</h1>
        <p className="text-gray-600">
          Posts tagged with {totemName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.length > 0 ? (
          <TotemPageClient
          posts={standardizedPosts}
          totemName={totemName}
        />
        ) : (
          <p>No posts found for this totem.</p>
        )}
      </div>
    </div>
  );
} 