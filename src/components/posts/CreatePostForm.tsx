import { useState, useEffect, useRef, useCallback } from 'react';
import type { Post } from '@/types/models';
import { useAuth } from '@/contexts/AuthContext';
import { PostService } from '@/services/standardized/PostService';
import { SimilarityService } from '@/services/similarity';

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
  const { isVerified, verificationStatus, sendVerificationEmail, refreshVerificationStatus } = useAuth();
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [similarPosts, setSimilarPosts] = useState<Post[]>([]);
  const [searchingPosts, setSearchingPosts] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchSimilar = useCallback(async (text: string) => {
    if (text.trim().length < 10) {
      setSimilarPosts([]);
      return;
    }
    setSearchingPosts(true);
    try {
      const results = await PostService.searchPosts(text.trim(), 100);
      // Score by similarity and take top 3
      const scored = results
        .map(post => ({
          post,
          score: SimilarityService.calculateTextSimilarity(text, post.question)
        }))
        .filter(({ score }) => score > 0.15)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      setSimilarPosts(scored.map(s => s.post));
    } catch {
      setSimilarPosts([]);
    } finally {
      setSearchingPosts(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchSimilar(question);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [question, searchSimilar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    // Check verification status
    if (!isVerified) {
      setError('Your account needs to be verified before you can create a post.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const now = Date.now();
      
      const newPost: Partial<Post> = {
        question: question.trim(),
        firebaseUid,
        username,
        name,
        createdAt: now,
        updatedAt: now,
        lastInteraction: now,
        totemAssociations: [],
        answers: [],
        answerFirebaseUids: [],
        answerUsernames: []
      };
      
      // Use the PostService to create the post
      await PostService.createPost(newPost);
      
      onPostCreated();
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendVerification = async () => {
    setIsSendingVerification(true);
    setVerificationMessage(null);
    
    try {
      await sendVerificationEmail();
      setVerificationMessage('Verification email sent! Please check your inbox.');
    } catch (error) {
      setVerificationMessage('Failed to send verification email. Please try again.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleCheckVerification = async () => {
    setVerificationMessage('Checking verification status...');
    
    try {
      await refreshVerificationStatus();
      setVerificationMessage('Verification status updated!');
    } catch (error) {
      setVerificationMessage('Failed to update verification status.');
    }
  };

  // Show verification notice if not verified
  if (!isVerified) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Verification Required</h2>
        
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 mb-6">
          <p className="text-sm text-yellow-700 mb-4">
            Your account needs to be verified before you can create a question.
            {verificationStatus === 'pending' && ' Please check your email for a verification link.'}
          </p>
          
          {verificationMessage && (
            <p className="text-sm font-medium text-yellow-800 mb-4">{verificationMessage}</p>
          )}
          
          <div className="flex space-x-4">
            <button
              onClick={handleSendVerification}
              disabled={isSendingVerification || verificationStatus === 'pending'}
              className="px-4 py-2 text-sm bg-yellow-200 text-yellow-800 rounded-md hover:bg-yellow-300 disabled:opacity-50"
            >
              {isSendingVerification ? 'Sending...' : verificationStatus === 'pending' ? 'Email Sent' : 'Send Verification Email'}
            </button>
            
            {verificationStatus === 'pending' && (
              <button
                onClick={handleCheckVerification}
                className="px-4 py-2 text-sm bg-white border border-yellow-300 text-yellow-800 rounded-md hover:bg-yellow-50"
              >
                I've Verified My Email
              </button>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

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

        {(similarPosts.length > 0 || searchingPosts) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">
              {searchingPosts ? 'Checking for similar questions...' : 'Similar questions already asked:'}
            </p>
            {similarPosts.map(post => (
              <a
                key={post.id}
                href={`/post/${post.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:text-blue-800 hover:underline py-1"
              >
                {post.question}
                <span className="text-blue-400 ml-2">({post.answers?.length || 0} answers)</span>
              </a>
            ))}
          </div>
        )}

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