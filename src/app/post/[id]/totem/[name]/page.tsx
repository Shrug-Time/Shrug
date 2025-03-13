import { getPost } from '@/lib/firebase/posts';
import { PostTotemClient } from './PostTotemClient';
import Link from 'next/link';

interface PostTotemPageProps {
  params: Promise<{
    id: string;
    name: string;
  }>;
}

export default async function PostTotemPage({ params }: PostTotemPageProps) {
  const resolvedParams = await params;
  const { id: postId, name: totemName } = resolvedParams;
  const decodedName = decodeURIComponent(totemName);
  
  try {
    const post = await getPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }
    
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href={`/post/${postId}`}
            className="text-blue-500 hover:underline mb-4 inline-block"
          >
            ← Back to Post
          </Link>
          <h1 className="text-3xl font-bold">
            {decodedName} answers for: {post.question}
          </h1>
        </div>
        
        <PostTotemClient
          initialPost={post}
          totemName={decodedName}
        />
      </main>
    );
  } catch (error) {
    console.error('Error fetching post:', error);
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          Error Loading Post
        </h1>
        <p className="text-red-600">
          Could not load the post. Please try again later.
        </p>
        <Link
          href="/"
          className="text-blue-500 hover:underline mt-4 inline-block"
        >
          ← Back to Home
        </Link>
      </main>
    );
  }
} 