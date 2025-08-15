import { useState } from 'react';
import { DeleteService } from '@/services/deleteService';

export const useDeleteAnswer = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAnswer = async (postId: string, answerId: string): Promise<boolean> => {
    try {
      setIsDeleting(true);
      setError(null);
      
      await DeleteService.deleteAnswer(postId, answerId);
      return true;
    } catch (error) {
      console.error('Error deleting answer:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete answer');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteAnswer,
    isDeleting,
    error,
  };
};