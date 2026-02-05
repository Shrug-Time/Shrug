import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { UserService } from '@/services/userService';
import * as Sentry from '@sentry/nextjs';

interface SignupFormProps {
  onSuccess: () => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Network timeout detection
    const timeoutMs = 15000; // 15 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), timeoutMs);
    });

    try {
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }

      console.log('Starting signup process for:', email);

      // Create user account with timeout
      console.log('Creating Firebase user...');
      const userCredential = await Promise.race([
        createUserWithEmailAndPassword(auth, email, password),
        timeoutPromise
      ]) as any;
      const user = userCredential.user;
      console.log('Firebase user created successfully:', user.uid);

      // Note: User profile will be created automatically by AuthContext
      // when it detects the new authenticated user via onAuthStateChanged

      // If user provided a name, we'll update the profile after a brief delay
      // to ensure AuthContext has created the default profile first
      if (name) {
        setTimeout(async () => {
          try {
            console.log('Updating user profile with name...');
            await UserService.updateProfile(user.uid, {
              name: name
            });
            console.log('User name updated successfully');
          } catch (error) {
            console.error('Error updating user name:', error);
          }
        }, 1000);
      }

      // Signup complete, redirect to main app
      console.log('Signup complete, redirecting to app');
      onSuccess();
    } catch (err) {
      console.error('Signup error:', err);

      // Determine error type
      let errorMessage = 'Failed to create account. Please try again.';
      let isNetworkIssue = false;

      if (err instanceof Error) {
        if (err.message === 'NETWORK_TIMEOUT') {
          errorMessage = 'Connection timeout. Please check your internet connection and try again.';
          isNetworkIssue = true;
        } else {
          errorMessage = err.message;
        }
      }

      // Log to Sentry with context
      Sentry.captureException(err, {
        tags: {
          feature: 'signup',
          error_type: isNetworkIssue ? 'network_timeout' : 'signup_error'
        },
        extra: {
          email,
          hasName: !!name,
          isNetworkIssue
        }
      });

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name (optional)
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
          minLength={6}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </button>

      <p className="text-sm text-gray-500 text-center">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </form>
  );
} 