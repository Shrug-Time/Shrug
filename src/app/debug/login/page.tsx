'use client';

import { useState } from 'react';
import { signIn, auth } from '@/firebase';
import { useRouter } from 'next/navigation';

export default function DebugLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSuccess(false);

    try {
      await signIn(email, password);
      setSuccess(true);
      
      // Get the current user
      const user = auth.currentUser;
      console.log('Logged in user:', user ? {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      } : 'No user');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/debug/profile-test');
      }, 2000);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Debug Login</h1>
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Login successful! Redirecting to profile test page...
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            This is a debug login page for testing purposes.
          </p>
          <div className="mt-4">
            <a 
              href="/debug/client-logs" 
              className="text-blue-500 hover:text-blue-700 mr-4"
            >
              View Client Logs
            </a>
            <a 
              href="/debug/profile-test" 
              className="text-blue-500 hover:text-blue-700"
            >
              Profile Test
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 