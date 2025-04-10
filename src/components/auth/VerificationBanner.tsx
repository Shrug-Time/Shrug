import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function VerificationBanner() {
  const { user, verificationStatus, isVerified, sendVerificationEmail, refreshVerificationStatus } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastVerificationSent, setLastVerificationSent] = useState<number | null>(null);

  // Auto-check verification status on mount and every 30 seconds if pending
  useEffect(() => {
    if (!user || isVerified || verificationStatus !== 'pending') return;
    
    const checkStatus = async () => {
      await refreshVerificationStatus();
    };
    
    // Check immediately
    checkStatus();
    
    // Then check periodically
    const interval = setInterval(checkStatus, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [user, isVerified, verificationStatus, refreshVerificationStatus]);
  
  // Don't show banner if user is verified or not logged in
  if (isVerified || !user) {
    return null;
  }

  const handleSendVerification = async () => {
    setIsSending(true);
    setMessage(null);
    
    try {
      await sendVerificationEmail();
      setMessage('Verification email sent! Please check your inbox.');
      setLastVerificationSent(Date.now());
    } catch (error) {
      setMessage('Failed to send verification email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsChecking(true);
    setMessage('Checking verification status...');
    
    try {
      await refreshVerificationStatus();
      setMessage('Verification status updated!');
    } catch (error) {
      setMessage('Failed to update verification status.');
    } finally {
      setIsChecking(false);
    }
  };

  // Calculate if we should show cooldown for resending
  const canResend = !lastVerificationSent || (Date.now() - lastVerificationSent > 60000); // 1 minute cooldown

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 sticky top-0 z-10 shadow-md">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-base font-medium text-yellow-800">Email Verification Required</h3>
          <div className="mt-2 text-sm text-yellow-700">
            {verificationStatus === 'pending' ? (
              <p>
                <strong>Almost there!</strong> Please check your email ({user.email}) and click the verification link to get full access.
                If you don't see the email, check your spam folder.
              </p>
            ) : (
              <p>
                <strong>Action required:</strong> Your account needs to be verified before you can create content. We'll send you a verification email.
              </p>
            )}
            
            {message && (
              <div className="mt-2 p-2 bg-white rounded-md font-medium border border-yellow-300">
                {message}
              </div>
            )}
            
            <div className="mt-4 flex flex-wrap gap-4">
              <button
                onClick={handleSendVerification}
                disabled={isSending || (verificationStatus === 'pending' && !canResend)}
                className="inline-flex items-center text-sm px-4 py-2 bg-yellow-200 text-yellow-800 rounded-md hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : verificationStatus === 'pending' && !canResend ? (
                  'Email Sent (wait 1 min to resend)'
                ) : (
                  'Send Verification Email'
                )}
              </button>
              
              {verificationStatus === 'pending' && (
                <button
                  onClick={handleRefreshStatus}
                  disabled={isChecking}
                  className="inline-flex items-center text-sm px-4 py-2 bg-white border border-yellow-300 text-yellow-800 rounded-md hover:bg-yellow-50"
                >
                  {isChecking ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking...
                    </>
                  ) : (
                    "I've Verified My Email"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 