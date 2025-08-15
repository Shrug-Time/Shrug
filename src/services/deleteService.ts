import { auth } from '@/firebase';

export class DeleteService {
  /**
   * Delete an answer from a post
   */
  static async deleteAnswer(postId: string, answerId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be logged in to delete answers');
    }

    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch(`/api/posts/${postId}/answers/${answerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete answer');
      }

      console.log('Answer deleted successfully');
    } catch (error) {
      console.error('Error deleting answer:', error);
      throw error;
    }
  }
}