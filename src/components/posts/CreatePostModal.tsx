import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { CreatePostForm } from './CreatePostForm';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const { profile } = useUser();

  const handlePostCreated = () => {
    onClose();
    // Optionally refresh the page or update the feed
    window.location.reload();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {profile ? (
            <CreatePostForm
              firebaseUid={profile.firebaseUid}
              username={profile.username}
              name={profile.name}
              onPostCreated={handlePostCreated}
              onCancel={handleCancel}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Please log in to create a question.</p>
              <button
                onClick={handleCancel}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 