import { useState, useEffect } from 'react';
import { Post, ProfileSection } from '@/types/models';
import { ProfileSectionService } from '@/services/profileSectionService';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { formatDate } from '@/utils/formatters';

interface CustomAnswersSectionProps {
  userId: string;
  section: ProfileSection;
}

export function CustomAnswersSection({ userId, section }: CustomAnswersSectionProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSectionContent = async () => {
      try {
        setIsLoading(true);
        const sectionContent = await ProfileSectionService.getSectionContent(userId, section);
        setPosts(sectionContent);
      } catch (error) {
        console.error('Error loading section content:', error);
        setError('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    loadSectionContent();
  }, [userId, section]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-4 text-gray-500 border border-gray-200 rounded-md text-center">
        No content in this section
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">{section.title}</h3>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <Link href={`/post/${post.id}`} className="block">
              <h4 className="text-lg font-medium mb-2">{post.question}</h4>
              
              {post.answers && post.answers[0] && (
                <div className="text-gray-600 mb-3 line-clamp-3">
                  {post.answers[0].text}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mb-2">
                {post.totemAssociations?.map((association) => (
                  <span 
                    key={association.totemId} 
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    {association.totemName}
                  </span>
                ))}
              </div>
              
              <div className="text-xs text-gray-500">
                {formatDate(post.createdAt)} • 
                {post.answers?.length || 0} {post.answers?.length === 1 ? 'answer' : 'answers'}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 