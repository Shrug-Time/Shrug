'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { applyActionCode } from 'firebase/auth';
import useFirebase from '@/hooks/useFirebase';

export default function VerifySuccessClient() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');
  const { refreshVerificationStatus } = useAuth();
  const { auth } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Wait for auth to initialize
        if (!auth) {
          console.log('Waiting for Firebase auth to initialize...');
          return;
        }

        // Check if this is an email verification link
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');

        if (mode === 'verifyEmail' && oobCode) {
          console.log('Applying email verification code...');

          // Actually apply the verification code to Firebase
          await applyActionCode(auth, oobCode);

          console.log('Email verification code applied successfully');
          setStatus('success');
          setMessage('Your email has been successfully verified!');

          // Refresh the user's verification status
          await refreshVerificationStatus();

          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          // Direct access without verification parameters
          setStatus('success');
          setMessage('Welcome! Your email has been verified.');
          setTimeout(() => {
            router.push('/');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');

        // Provide more specific error messages
        if (error.code === 'auth/invalid-action-code') {
          setMessage('This verification link is invalid or has already been used.');
        } else if (error.code === 'auth/expired-action-code') {
          setMessage('This verification link has expired. Please request a new verification email.');
        } else {
          setMessage('There was an error verifying your email. Please try again or request a new verification email.');
        }
      }
    };

    handleEmailVerification();
  }, [searchParams, refreshVerificationStatus, router, auth]);

  if (status === 'processing') {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing your email verification...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Verified!</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <p className="text-sm text-gray-500">Redirecting you to the dashboard...</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <button
        onClick={() => router.push('/auth/login')}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
      >
        Back to Login
      </button>
    </div>
  );
}