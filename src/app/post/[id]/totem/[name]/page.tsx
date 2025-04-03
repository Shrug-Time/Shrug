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
          {decodedName} answers
        </h1>
      </div>
      
      <PostTotemClient
        postId={postId}
        totemName={decodedName}
      />
    </main>
  );
} 