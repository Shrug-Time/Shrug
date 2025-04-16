import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, signIn, signInWithGoogle } from '@/firebase';
// Keep this import commented until Apple authentication is enabled
// import { signInWithApple } from '@/firebase';

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn(email, password, rememberMe);
      onSuccess();
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSocialLoading('google');
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err) {
      console.error('Google sign-in error:', err);
      // Check for popup blocked error
      if (err instanceof Error && err.message.includes('Popup was blocked')) {
        setError('Popup was blocked. Please allow popups for this site and try again.');
      } else {
        setError('Failed to sign in with Google');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  /* Keep this function commented until Apple authentication is enabled
  const handleAppleSignIn = async () => {
    setError(null);
    setSocialLoading('apple');
    try {
      await signInWithApple();
      onSuccess();
    } catch (err) {
      console.error('Apple sign-in error:', err);
      setError('Failed to sign in with Apple');
    } finally {
      setSocialLoading(null);
    }
  };
  */

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      
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
        />
      </div>

      <div className="flex items-center">
        <input
          id="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
          Remember me
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading || socialLoading !== null}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>

      <div className="mt-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || socialLoading !== null}
            className="w-full flex items-center justify-center rounded-lg border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {socialLoading === 'google' ? 'Signing in...' : 'Google'}
          </button>
          
          {/* Apple login button is disabled for now */}
          {/* 
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={isLoading || socialLoading !== null}
            className="flex items-center justify-center rounded-lg border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {socialLoading === 'apple' ? 'Signing in...' : 'Apple'}
          </button>
          */}
        </div>
      </div>
    </form>
  );
} 