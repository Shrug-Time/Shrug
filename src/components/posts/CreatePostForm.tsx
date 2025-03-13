import { useState } from 'react';
import { doc, setDoc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post } from '@/types/models';

interface CreatePostFormProps {
  userId: string;
  userName: string;
  onPostCreated: () => void;
  onCancel: () => void;
}

export function CreatePostForm({
  userId,
  userName,
  onPostCreated,
  onCancel
}: CreatePostFormProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!question.trim()) {
        throw new Error("Please enter a question");
      }

      const postsRef = collection(db, "posts");
      const newPostRef = doc(postsRef);
      const now = Date.now();

      const newPost: Post = {
        id: newPostRef.id,
        question: question.trim(),
        answers: [],
        createdAt: now,
        lastEngagement: now,
        score: 0,
        categories: [],
        userId,
        userName
      };

      // Create the post
      await setDoc(newPostRef, {
        ...newPost,
        createdAt: serverTimestamp(),
        lastEngagement: serverTimestamp()
      });

      // Create a reference in the user's posts collection
      const userAnswersRef = doc(db, "userAnswers", userId, "posts", newPostRef.id);
      await setDoc(userAnswersRef, {
        timestamp: serverTimestamp(),
        postId: newPostRef.id,
        type: "created"
      });

      setQuestion("");
      onPostCreated();
    } catch (err) {
      console.error("Error creating post:", err);
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700">
            Your Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to ask?"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={4}
            required
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="flex-1 p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Ask Question"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 