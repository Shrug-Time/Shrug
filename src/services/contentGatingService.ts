/**
 * Content Gating Service
 * 
 * Handles creator-controlled content gating functionality.
 * Manages access control for paid content and payment processing.
 */

import { db, auth } from '@/firebase';
import { 
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  runTransaction
} from 'firebase/firestore';
import { UserService } from './userService';
import { SubscriptionService } from './subscriptionService';
import { UserProfile } from '@/types/models';

// Types for content gating
export interface GatedContent {
  id: string;
  contentType: 'answer' | 'post' | 'totem' | 'collection';
  contentId: string;
  creatorId: string;
  price: number;
  currency: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ContentPurchase {
  id: string;
  gatedContentId: string;
  buyerId: string;
  price: number;
  currency: string;
  purchaseDate: number;
  transactionId?: string;
}

/**
 * Service for managing creator content gating
 */
export class ContentGatingService {
  // Collection references
  private static readonly GATED_CONTENT_COLLECTION = 'gatedContent';
  private static readonly CONTENT_PURCHASES_COLLECTION = 'contentPurchases';
  private static readonly USERS_COLLECTION = 'users';
  
  /**
   * Creates or updates a gated content entry
   * @param contentData Gated content data
   * @returns Created/updated gated content object
   */
  static async createGatedContent(
    contentData: Omit<GatedContent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GatedContent> {
    try {
      // Verify the user is allowed to create gated content
      const creatorProfile = await UserService.getUserByFirebaseUid(contentData.creatorId);
      if (!creatorProfile) {
        throw new Error('Creator not found');
      }
      
      // Create a unique content ID based on content type and ID
      const contentId = `${contentData.contentType}_${contentData.contentId}`;
      
      // Check if this content is already gated
      const existingContent = await this.getGatedContentByContentId(
        contentData.contentType,
        contentData.contentId
      );
      
      const now = Date.now();
      const contentRef = existingContent 
        ? doc(db, this.GATED_CONTENT_COLLECTION, existingContent.id)
        : doc(collection(db, this.GATED_CONTENT_COLLECTION));
      
      const gatedContent: GatedContent = {
        id: existingContent?.id || contentRef.id,
        ...contentData,
        createdAt: existingContent?.createdAt || now,
        updatedAt: now
      };
      
      await setDoc(contentRef, gatedContent);
      return gatedContent;
    } catch (error) {
      console.error('Error creating gated content:', error);
      throw error;
    }
  }
  
  /**
   * Gets gated content by content type and ID
   * @param contentType Type of content (answer, post, etc.)
   * @param contentId ID of the specific content
   * @returns Gated content or null if not found
   */
  static async getGatedContentByContentId(
    contentType: GatedContent['contentType'],
    contentId: string
  ): Promise<GatedContent | null> {
    try {
      const gatedContentRef = collection(db, this.GATED_CONTENT_COLLECTION);
      const q = query(
        gatedContentRef,
        where('contentType', '==', contentType),
        where('contentId', '==', contentId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const data = snapshot.docs[0].data() as GatedContent;
      return {
        ...data,
        id: snapshot.docs[0].id
      };
    } catch (error) {
      console.error('Error getting gated content:', error);
      throw error;
    }
  }
  
  /**
   * Checks if a user has access to gated content
   * @param userId User ID to check
   * @param contentType Type of content
   * @param contentId ID of content
   * @returns Whether the user has access
   */
  static async userHasAccess(
    userId: string,
    contentType: GatedContent['contentType'],
    contentId: string
  ): Promise<boolean> {
    try {
      // If the user is the creator, they always have access
      const gatedContent = await this.getGatedContentByContentId(contentType, contentId);
      
      if (!gatedContent) {
        // Content is not gated, so access is granted
        return true;
      }
      
      if (gatedContent.creatorId === userId) {
        // Creator always has access to their own content
        return true;
      }
      
      // Check if the user has purchased this content
      const purchasesRef = collection(db, this.CONTENT_PURCHASES_COLLECTION);
      const q = query(
        purchasesRef,
        where('gatedContentId', '==', gatedContent.id),
        where('buyerId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking content access:', error);
      return false;
    }
  }
  
  /**
   * Records a purchase of gated content
   * @param gatedContentId ID of the gated content
   * @param buyerId ID of the buyer
   * @param transactionId Optional external transaction ID
   * @returns The content purchase record
   */
  static async recordContentPurchase(
    gatedContentId: string,
    buyerId: string,
    transactionId?: string
  ): Promise<ContentPurchase> {
    try {
      // Get the gated content
      const gatedContentRef = doc(db, this.GATED_CONTENT_COLLECTION, gatedContentId);
      const gatedContentDoc = await getDoc(gatedContentRef);
      
      if (!gatedContentDoc.exists()) {
        throw new Error('Gated content not found');
      }
      
      const gatedContent = gatedContentDoc.data() as GatedContent;
      
      // Create the purchase record
      const purchaseRef = doc(collection(db, this.CONTENT_PURCHASES_COLLECTION));
      const now = Date.now();
      
      const purchase: ContentPurchase = {
        id: purchaseRef.id,
        gatedContentId,
        buyerId,
        price: gatedContent.price,
        currency: gatedContent.currency,
        purchaseDate: now,
        transactionId
      };
      
      await setDoc(purchaseRef, purchase);
      
      // TODO: In a real implementation, this would handle payment processing
      // and possibly creator payouts
      
      return purchase;
    } catch (error) {
      console.error('Error recording content purchase:', error);
      throw error;
    }
  }
  
  /**
   * Gets all gated content by a creator
   * @param creatorId Creator's user ID
   * @returns Array of gated content
   */
  static async getGatedContentByCreator(creatorId: string): Promise<GatedContent[]> {
    try {
      const gatedContentRef = collection(db, this.GATED_CONTENT_COLLECTION);
      const q = query(
        gatedContentRef,
        where('creatorId', '==', creatorId)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as GatedContent[];
    } catch (error) {
      console.error('Error getting creator\'s gated content:', error);
      throw error;
    }
  }
  
  /**
   * Gets all purchases made by a user
   * @param userId User ID
   * @returns Array of content purchases
   */
  static async getUserPurchases(userId: string): Promise<ContentPurchase[]> {
    try {
      const purchasesRef = collection(db, this.CONTENT_PURCHASES_COLLECTION);
      const q = query(
        purchasesRef,
        where('buyerId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ContentPurchase[];
    } catch (error) {
      console.error('Error getting user purchases:', error);
      throw error;
    }
  }
  
  /**
   * Removes gating from content
   * @param contentId ID of the gated content
   * @param creatorId ID of the creator (for verification)
   * @returns Success status
   */
  static async removeGating(contentId: string, creatorId: string): Promise<boolean> {
    try {
      const contentRef = doc(db, this.GATED_CONTENT_COLLECTION, contentId);
      const contentDoc = await getDoc(contentRef);
      
      if (!contentDoc.exists()) {
        return false;
      }
      
      const content = contentDoc.data() as GatedContent;
      
      if (content.creatorId !== creatorId) {
        throw new Error('Only the creator can remove gating');
      }
      
      // Delete the gated content entry
      await runTransaction(db, async (transaction) => {
        transaction.delete(contentRef);
      });
      
      return true;
    } catch (error) {
      console.error('Error removing content gating:', error);
      throw error;
    }
  }
} 