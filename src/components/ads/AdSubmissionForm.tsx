"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { CommunityAdService } from '@/services/communityAdService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase';

interface AdSubmissionFormProps {
  onSubmissionComplete?: () => void;
}

export function AdSubmissionForm({ onSubmissionComplete }: AdSubmissionFormProps) {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const guidelines = CommunityAdService.getGuidelines();

  if (!isPremium) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Premium Feature</h3>
        <p className="text-blue-700 mb-4">
          Ad submission is available to Premium members only. Upgrade to submit your subscription promotion ads.
        </p>
        <a 
          href="/subscription" 
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Upgrade to Premium
        </a>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && file.type !== 'image/png') {
        setError('Please upload a PDF or PNG file only.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setError('File size must be under 5MB.');
        return;
      }
      setPdfFile(file);
      setError(null);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    if (!storage) {
      throw new Error('Storage not initialized');
    }
    
    const fileName = `community_ads/${user!.uid}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !pdfFile) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload file to Firebase Storage
      const fileUrl = await uploadFile(pdfFile);
      
      // Submit ad for approval
      await CommunityAdService.submitAd(user.uid, fileUrl);

      setSuccess(true);
      setPdfFile(null);
      
      if (onSubmissionComplete) {
        onSubmissionComplete();
      }
    } catch (error) {
      console.error('Error submitting ad:', error);
      setError('Failed to submit ad. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Ad Submitted!</h3>
        <p className="text-green-700 mb-4">
          Your subscription promotion ad has been submitted for review. You'll be able to see its status in your ad dashboard.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Submit Another Ad
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Submit Subscription Promotion Ad</h2>
        
        {/* Guidelines Section */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3">Ad Guidelines</h3>
          
          <div className="mb-4">
            <h4 className="font-medium text-blue-800 mb-2">Purpose</h4>
            <p className="text-sm text-gray-700">{guidelines.purpose}</p>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-green-700 mb-2">Requirements</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {guidelines.requirements.map((requirement, index) => (
                <li key={index}>• {requirement}</li>
              ))}
            </ul>
          </div>
          
          <div className="p-3 bg-blue-50 rounded">
            <h4 className="font-medium text-blue-800 mb-1">Technical Requirements</h4>
            <p className="text-sm text-blue-700">
              {guidelines.technicalRequirements.fileFormat} • {guidelines.technicalRequirements.maxFileSize}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Recommended sizes: {guidelines.technicalRequirements.recommendedSizes.join(' • ')}
            </p>
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700 mb-1">
              PDF or PNG Advertisement *
            </label>
            <input
              type="file"
              id="pdfFile"
              accept=".pdf,.png"
              onChange={handleFileChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Create a PDF or PNG that promotes our $9.99/month subscription. Include your name/content to drive signups through your promotion.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !pdfFile}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>
        
        <p className="mt-4 text-sm text-gray-600 text-center">
          Approved ads will rotate equally with all other subscription promotion ads.
        </p>
      </div>
    </div>
  );
} 