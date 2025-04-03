import { getPostsForTotem } from '@/lib/firebase/posts';
import { TotemPageClientV2 } from './TotemPageClientV2';
import { Post } from '@/types/modelsV2';

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
    
    // Convert posts to V2 format
    const v2Posts: Post[] = posts.map(post => ({
      id: post.id,
      question: post.question,
      answers: post.answers.map(answer => ({
        ...answer,
        totems: answer.totems.map(totem => ({
          name: totem.name,
          crispness: totem.crispness || 0,
          likeHistory: totem.likeHistory.map(like => ({
            ...like,
            value: like.value || 1 // Ensure value is always a number
          }))
        }))
      })),
      createdAt: typeof post.createdAt === 'object' && 'seconds' in post.createdAt 
        ? post.createdAt.seconds * 1000 
        : (post.createdAt as number),
      updatedAt: typeof post.updatedAt === 'object' && 'seconds' in post.updatedAt 
        ? post.updatedAt.seconds * 1000 
        : (post.updatedAt as number)
    }));
    
    return (
      <main className="container mx-auto px-4 py-8">
        <TotemPageClientV2
          posts={v2Posts}
          totemName={decodedName}
        />
      </main>
    );
  } catch (error) {
    console.error('Error fetching posts:', error);
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {decodedName}
          </h1>
          <p className="text-red-600">
            Error loading posts. Please try again later.
          </p>
        </div>
      </main>
    );
  }
} 