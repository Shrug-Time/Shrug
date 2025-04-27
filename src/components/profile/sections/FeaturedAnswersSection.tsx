"use client";

import { useState } from 'react';
import { Post, ProfileSection } from '@/types/models';

interface FeaturedAnswersSectionProps {
  section: ProfileSection;
  posts: Post[];
  userId: string;
  isOwner: boolean;
  onSectionUpdate: () => void;
}

export const FeaturedAnswersSection = ({
  section,
  posts,
  userId,
  isOwner,
  onSectionUpdate
}: FeaturedAnswersSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Post[]>([]);
  
  // Get posts whose IDs are in the section's contentIds
  const displayPosts = posts.filter(post => 
    section.contentIds.includes(post.id)
  );
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
  };
  
  const handleEditSectionTitle = async (newTitle: string) => {
    setIsLoading(true);
    try {
      // Commented out until service is available
      //await updateSection(userId, section.id, { title: newTitle });
      onSectionUpdate();
    } catch (error) {
      console.error('Error updating section title:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectAnswers = async (selectedPosts: Post[]) => {
    setIsLoading(true);
    setSelectedAnswers(selectedPosts);
    
    try {
      // Update the section's contentIds with the selected posts
      const selectedIds = selectedPosts.map(post => post.id);
      // Commented out until service is available
      //await updateSection(userId, section.id, { contentIds: selectedIds });
      
      // Refresh the section data
      onSectionUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating featured answers:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{section.title}</h2>
        {isOwner && (
          <button 
            onClick={handleEdit}
            className="text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-center">Answer selector will be implemented here.</p>
          <div className="flex justify-center mt-4 space-x-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {displayPosts.length > 0 ? (
            displayPosts.map(post => (
              <div key={post.id} className="p-4 border border-gray-200 rounded-md">
                <h3 className="font-medium">{post.question || 'Answer Title'}</h3>
                <p className="text-gray-600 text-sm mt-1">
                  {post.answers && post.answers[0]?.text 
                    ? post.answers[0].text.substring(0, 150) + '...'
                    : 'No answer text available'}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">
                {isOwner ? 
                  "You haven't added any featured answers yet. Click 'Edit' to add some!" :
                  "This user hasn't added any featured answers yet."
                }
              </p>
              {isOwner && (
                <button
                  onClick={handleEdit}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Add Featured Answers
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 