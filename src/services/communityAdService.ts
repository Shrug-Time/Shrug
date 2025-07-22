/**
 * Community Ad Service
 * 
 * Handles PDF ad submissions for $9.99 subscription promotion.
 * Users upload PDFs that promote the subscription and can include their own branding.
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';
import { CommunityAd, AdStatus, AdGuidelines } from '@/types/models';

export class CommunityAdService {
  private static readonly COMMUNITY_ADS_COLLECTION = 'community_ads';

  /**
   * Ad Guidelines for $9.99 subscription promotion
   */
  static getGuidelines(): AdGuidelines {
    return {
      purpose: 'Create PDF or PNG ads that promote our $9.99/month subscription. You can include your name and content to drive signups.',
      requirements: [
        'Must prominently feature "$9.99/month subscription" or "$9.99 subscription"',
        'Can include your name/brand to promote your content',
        'Should encourage users to subscribe to the platform',
        'Professional design and clear messaging',
        'No misleading claims or false advertising',
        'Family-friendly content only'
      ],
      technicalRequirements: {
        fileFormat: 'PDF or PNG files',
        maxFileSize: '5MB maximum',
        recommendedSizes: [
          '300x250 (Medium Rectangle)',
          '728x90 (Leaderboard)', 
          '400x600 (Vertical Banner)',
          '800x600 (Full Page)'
        ]
      }
    };
  }

  /**
   * Submit a new PDF or PNG ad for $9.99 subscription promotion
   */
  static async submitAd(
    submitterId: string,
    pdfUrl: string
  ): Promise<string> {
    try {
      const now = Date.now();
      
      const adData: Omit<CommunityAd, 'id'> = {
        submitterId,
        status: 'pending',
        pdfUrl, // Can be PDF or PNG
        impressions: 0,
        clicks: 0,
        submittedAt: now,
        lastShown: 0
      };

      const docRef = await addDoc(collection(db, this.COMMUNITY_ADS_COLLECTION), adData);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting ad:', error);
      throw new Error('Failed to submit ad');
    }
  }

  /**
   * Get all pending ads for admin review
   */
  static async getPendingAds(): Promise<CommunityAd[]> {
    try {
      const q = query(
        collection(db, this.COMMUNITY_ADS_COLLECTION),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CommunityAd));
    } catch (error) {
      console.error('Error getting pending ads:', error);
      return [];
    }
  }

  /**
   * Approve an ad
   */
  static async approveAd(adId: string): Promise<void> {
    try {
      const adRef = doc(db, this.COMMUNITY_ADS_COLLECTION, adId);
      await updateDoc(adRef, {
        status: 'approved',
        approvedAt: Date.now()
      });
    } catch (error) {
      console.error('Error approving ad:', error);
      throw new Error('Failed to approve ad');
    }
  }

  /**
   * Reject an ad
   */
  static async rejectAd(adId: string): Promise<void> {
    try {
      const adRef = doc(db, this.COMMUNITY_ADS_COLLECTION, adId);
      await updateDoc(adRef, {
        status: 'rejected'
      });
    } catch (error) {
      console.error('Error rejecting ad:', error);
      throw new Error('Failed to reject ad');
    }
  }

  /**
   * Get all approved ads for display rotation
   */
  static async getApprovedAds(): Promise<CommunityAd[]> {
    try {
      const q = query(
        collection(db, this.COMMUNITY_ADS_COLLECTION),
        where('status', '==', 'approved'),
        orderBy('lastShown', 'asc') // Show least recently shown first
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CommunityAd));
    } catch (error) {
      console.error('Error getting approved ads:', error);
      return [];
    }
  }

  /**
   * Get next ad for display (fair rotation)
   */
  static async getNextAdForDisplay(): Promise<CommunityAd | null> {
    try {
      const approvedAds = await this.getApprovedAds();
      
      if (approvedAds.length === 0) {
        return null;
      }

      // Get the ad that was shown longest ago (or never shown)
      const nextAd = approvedAds[0];
      
      // Update its display tracking
      await this.recordAdShown(nextAd.id);
      
      return {
        ...nextAd,
        impressions: nextAd.impressions + 1,
        lastShown: Date.now()
      };
    } catch (error) {
      console.error('Error getting next ad:', error);
      return null;
    }
  }

  /**
   * Record that an ad was shown
   */
  static async recordAdShown(adId: string): Promise<void> {
    try {
      const adRef = doc(db, this.COMMUNITY_ADS_COLLECTION, adId);
      await updateDoc(adRef, {
        impressions: increment(1),
        lastShown: Date.now()
      });
    } catch (error) {
      console.error('Error recording ad shown:', error);
    }
  }

  /**
   * Record that an ad was clicked
   */
  static async recordAdClicked(adId: string): Promise<void> {
    try {
      const adRef = doc(db, this.COMMUNITY_ADS_COLLECTION, adId);
      await updateDoc(adRef, {
        clicks: increment(1)
      });
    } catch (error) {
      console.error('Error recording ad clicked:', error);
    }
  }

  /**
   * Get ads submitted by a specific user
   */
  static async getUserAds(submitterId: string): Promise<CommunityAd[]> {
    try {
      const q = query(
        collection(db, this.COMMUNITY_ADS_COLLECTION),
        where('submitterId', '==', submitterId),
        orderBy('submittedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CommunityAd));
    } catch (error) {
      console.error('Error getting user ads:', error);
      return [];
    }
  }
} 