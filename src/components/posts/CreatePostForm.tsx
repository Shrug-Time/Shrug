import { useState } from 'react';
import { doc, setDoc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post } from '@/types/models';

interface CreatePostFormProps {
  firebaseUid: string;
  username: string;
  name: string;
  onPostCreated: () => void;
  onCancel: () => void;
}

export function CreatePostForm({
  firebaseUid,
  username,
  name,
  onPostCreated,
  onCancel
}: CreatePostFormProps) {
  const [question, setQuestion] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const postsRef = collection(db, 'posts');
      const newPostRef = doc(postsRef);
      const now = new Date();
      
      const newPost: Partial<Post> = {
        id: newPostRef.id,
        question: question.trim(),
        firebaseUid,
        username,
        name,
        categories,
        createdAt: now.getTime(),
        lastEngagement: now.getTime(),
        answers: []
      };
      
      await setDoc(newPostRef, {
        ...newPost,
        createdAt: Timestamp.fromDate(now),
        lastEngagement: serverTimestamp()
      });
      
      onPostCreated();
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Ask a Question</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="question" className="block text-gray-700 mb-2">
            Your Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-3 border rounded-lg"
            rows={4}
            placeholder="What would you like to ask?"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="categories" className="block text-gray-700 mb-2">
            Categories (optional)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              id="categories"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 p-3 border rounded-lg"
              placeholder="Add a category"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              Add
            </button>
          </div>
          
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center"
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post Question'}
          </button>
        </div>
      </form>
    </div>
  );
} 