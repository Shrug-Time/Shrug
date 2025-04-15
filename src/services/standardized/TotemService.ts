/**
 * Standardized Totem Service
 * 
 * Provides standardized access to totem data following the schema standards.
 * All totem-related operations should go through this service to ensure consistency.
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove,
  QueryConstraint
} from 'firebase/firestore';
import { Totem, TotemLike, Post } from '@/types/models';
import { COMMON_FIELDS, POST_FIELDS } from '@/constants/fields';
import { validateTotem } from '@/utils/schemaValidation';
import { handleServiceError, createTimestamp, DEFAULT_PAGE_SIZE } from '@/utils/serviceHelpers';

/**
 * Service class for managing totem data with standardized schema
 */
export class TotemService {
  // Collection reference
  private static readonly TOTEMS_COLLECTION = 'totems';
  private static readonly POSTS_COLLECTION = 'posts';
  
  /**
   * Get a totem by ID or name
   * @param totemIdOrName Totem ID or name
   * @returns Totem data or null if not found
   */
  static async getTotem(totemIdOrName: string): Promise<Totem | null> {
    try {
      if (!totemIdOrName) {
        throw new Error('Totem ID or name is required');
      }
      
      // Try to get by ID first
      const totemRef = doc(db, this.TOTEMS_COLLECTION, totemIdOrName);
      const totemDoc = await getDoc(totemRef);
      
      if (totemDoc.exists()) {
        return validateTotem({ id: totemDoc.id, ...totemDoc.data() });
      }
      
      // If not found by ID, try by name
      const totemsRef = collection(db, this.TOTEMS_COLLECTION);
      const q = query(
        totemsRef,
        where('name', '==', totemIdOrName),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      
      const totemData = querySnapshot.docs[0];
      return validateTotem({ id: totemData.id, ...totemData.data() });
    } catch (error) {
      handleServiceError('get totem', error);
    }
  }
  
  /**
   * Create a new totem
   * @param totemData Totem data
   * @returns Created totem
   */
  static async createTotem(totemData: Partial<Totem>): Promise<Totem> {
    try {
      if (!totemData.name) {
        throw new Error('Totem name is required');
      }
      
      // Check if totem with this name already exists
      const existingTotem = await this.getTotem(totemData.name);
      if (existingTotem) {
        return existingTotem; // Return existing totem if found
      }
      
      const totemsRef = collection(db, this.TOTEMS_COLLECTION);
      const totemDoc = doc(totemsRef);
      const now = Date.now();
      
      // Create the new totem object
      const newTotem = {
        name: totemData.name.toLowerCase().trim(),
        description: totemData.description || '',
        category: totemData.category || 'other',
        createdBy: (totemData as any).createdBy || 'system',
        likeHistory: [],
        crispness: 100, // Default crispness
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
        lastInteraction: now
      } as Partial<Totem>;
      
      // Ensure category is set
      if (!newTotem.category) {
        newTotem.category = {
          id: 'general',
          name: 'General',
          description: '',
          children: [],
          usageCount: 0
        };
      }
      
      // Set decay model if not specified
      if (!newTotem.decayModel) {
        newTotem.decayModel = 'MEDIUM';
      }
      
      // Validate data before saving
      const validatedData = validateTotem(newTotem);
      
      // Save to database
      await setDoc(totemDoc, validatedData);
      
      return validatedData;
    } catch (error) {
      handleServiceError('create totem', error);
    }
  }
  
  /**
   * Get popular totems based on usage count
   * @param limit Maximum number of totems to return
   * @returns Most popular totems
   */
  static async getPopularTotems(maxResults: number = 10): Promise<Totem[]> {
    try {
      const totemsRef = collection(db, this.TOTEMS_COLLECTION);
      const q = query(
        totemsRef,
        orderBy('usageCount', 'desc'),
        limit(maxResults)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => 
        validateTotem({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      handleServiceError('get popular totems', error);
      return [];
    }
  }
  
  /**
   * Like a totem for a specific post
   * @param postId Post ID
   * @param totemName Totem name
   * @param firebaseUid User ID performing the like
   * @returns Updated post with totem likes
   */
  static async likeTotem(postId: string, totemName: string, firebaseUid: string): Promise<Post> {
    try {
      if (!postId || !totemName || !firebaseUid) {
        throw new Error('Post ID, totem name, and user ID are required');
      }
      
      // Use transaction to ensure data consistency
      return await runTransaction(db, async (transaction) => {
        // Get or create the totem
        let totem = await this.getTotem(totemName);
        if (!totem) {
          totem = await this.createTotem({ name: totemName });
        }
        
        const postRef = doc(db, this.POSTS_COLLECTION, postId);
        const postDoc = await transaction.get(postRef);
        
        if (!postDoc.exists()) {
          throw new Error('Post not found');
        }
        
        const post = postDoc.data() as Post;
        const now = createTimestamp();
        
        // Find the totem association in the post
        let totemAssociationIndex = -1;
        if (post.totemAssociations) {
          totemAssociationIndex = post.totemAssociations.findIndex(
            assoc => assoc.totemName === totemName
          );
        }
        
        // Make sure totemAssociations exists
        const associations = post.totemAssociations || [];
        
        // If totem association doesn't exist, create it
        if (totemAssociationIndex === -1) {
          associations.push({
            totemId: totem.id || '',
            totemName: totem.name || '',
            relevanceScore: 1.0,
            firebaseUid: firebaseUid,
            appliedAt: now,
            endorsedByFirebaseUids: [firebaseUid],
            contestedByFirebaseUids: []
          });
        } else {
          // Update the existing association safely
          const association = associations[totemAssociationIndex];
          if (association) {
            // Add user to endorsers if not already there
            if (!association.endorsedByFirebaseUids.includes(firebaseUid)) {
              association.endorsedByFirebaseUids.push(firebaseUid);
            }
            
            // Remove user from contesters if present
            const contestIndex = association.contestedByFirebaseUids.indexOf(firebaseUid);
            if (contestIndex !== -1) {
              association.contestedByFirebaseUids.splice(contestIndex, 1);
            }
          }
        }
        
        // Update the post with the new/updated associations
        transaction.update(postRef, {
          totemAssociations: associations,
          updatedAt: now,
          lastInteraction: now
        });
        
        // Update the totem - add null check for totem.id
        if (totem.id) {
          const totemRef = doc(db, this.TOTEMS_COLLECTION, totem.id);
          
          // Check if user already has a like record
          const existingLikeIndex = totem.likeHistory.findIndex(like => like.firebaseUid === firebaseUid);
          
          if (existingLikeIndex === -1) {
            // Add new like
            const newLike: TotemLike = {
              firebaseUid,
              originalTimestamp: now,
              lastUpdatedAt: now,
              isActive: true,
              value: 1
            };
            
            transaction.update(totemRef, {
              likeHistory: arrayUnion(newLike),
              usageCount: increment(1),
              updatedAt: now,
              lastInteraction: now
            });
          } else {
            // Update existing like to be active
            const updatedLikeHistory = [...totem.likeHistory];
            updatedLikeHistory[existingLikeIndex] = {
              ...updatedLikeHistory[existingLikeIndex],
              isActive: true,
              lastUpdatedAt: now
            };
            
            transaction.update(totemRef, {
              likeHistory: updatedLikeHistory,
              updatedAt: now,
              lastInteraction: now
            });
          }
        }
        
        // Return updated post
        return {
          ...post,
          id: postId,
          updatedAt: now,
          lastInteraction: now
        };
      });
    } catch (error) {
      handleServiceError('like totem', error);
    }
  }
  
  /**
   * Unlike a totem for a specific post
   * @param postId Post ID
   * @param totemName Totem name
   * @param firebaseUid User ID performing the unlike
   * @returns Updated post
   */
  static async unlikeTotem(postId: string, totemName: string, firebaseUid: string): Promise<Post> {
    try {
      if (!postId || !totemName || !firebaseUid) {
        throw new Error('Post ID, totem name, and user ID are required');
      }
      
      // Check if the totem exists
      const totem = await this.getTotem(totemName);
      if (!totem) {
        throw new Error('Totem not found');
      }
      
      // Use transaction to ensure data consistency
      return await runTransaction(db, async (transaction) => {
        const postRef = doc(db, this.POSTS_COLLECTION, postId);
        const postDoc = await transaction.get(postRef);
        
        if (!postDoc.exists()) {
          throw new Error('Post not found');
        }
        
        const post = postDoc.data() as Post;
        const now = createTimestamp();
        
        // Find the totem association in the post
        let totemAssociationIndex = -1;
        if (post.totemAssociations) {
          totemAssociationIndex = post.totemAssociations.findIndex(
            assoc => assoc.totemName === totemName
          );
        }
        
        // Make sure totemAssociations exists
        const associations = post.totemAssociations || [];
        
        if (totemAssociationIndex !== -1) {
          // Update existing association safely
          const association = associations[totemAssociationIndex];
          if (association) {
            // Remove user from endorsers if present
            const endorseIndex = association.endorsedByFirebaseUids.indexOf(firebaseUid);
            if (endorseIndex !== -1) {
              association.endorsedByFirebaseUids.splice(endorseIndex, 1);
            }
            
            // Add user to contesters if not already there
            if (!association.contestedByFirebaseUids.includes(firebaseUid)) {
              association.contestedByFirebaseUids.push(firebaseUid);
            }
          }
        }
        
        // Update the post with the new associations
        transaction.update(postRef, {
          totemAssociations: associations,
          updatedAt: now,
          lastInteraction: now
        });
        
        // Update the totem - add null check for totem.id
        if (totem.id) {
          const totemRef = doc(db, this.TOTEMS_COLLECTION, totem.id);
          
          // Find user's like in the history
          const existingLikeIndex = totem.likeHistory.findIndex(like => like.firebaseUid === firebaseUid);
          
          if (existingLikeIndex !== -1) {
            // Set the like to inactive
            const updatedLikeHistory = [...totem.likeHistory];
            updatedLikeHistory[existingLikeIndex] = {
              ...updatedLikeHistory[existingLikeIndex],
              isActive: false,
              lastUpdatedAt: now
            };
            
            transaction.update(totemRef, {
              likeHistory: updatedLikeHistory,
              updatedAt: now,
              lastInteraction: now
            });
          }
        }
        
        // Return updated post
        return {
          ...post,
          id: postId,
          updatedAt: now,
          lastInteraction: now
        };
      });
    } catch (error) {
      handleServiceError('unlike totem', error);
    }
  }
  
  /**
   * Get posts associated with a totem
   * @param totemName Totem name
   * @param pageSize Number of posts per page
   * @param lastVisible Last visible document for pagination
   * @returns Posts associated with the totem
   */
  static async getPostsByTotem(
    totemName: string,
    pageSize: number = DEFAULT_PAGE_SIZE,
    lastVisible: any = null
  ): Promise<{ posts: Post[], lastVisible: any }> {
    try {
      if (!totemName) {
        throw new Error('Totem name is required');
      }
      
      const postsRef = collection(db, this.POSTS_COLLECTION);
      const queryConstraints: QueryConstraint[] = [
        orderBy(COMMON_FIELDS.CREATED_AT, 'desc'),
        limit(pageSize)
      ];
      
      // Add pagination constraint if lastVisible is provided
      if (lastVisible) {
        queryConstraints.push(where(COMMON_FIELDS.CREATED_AT, '<', lastVisible));
      }
      
      const q = query(postsRef, ...queryConstraints);
      const snapshot = await getDocs(q);
      
      // Filter posts that have the totem in totemAssociations
      const posts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as Post)
        .filter(post => post.totemAssociations?.some(assoc => assoc.totemName === totemName));
      
      return {
        posts,
        lastVisible: snapshot.docs.length > 0 
          ? snapshot.docs[snapshot.docs.length - 1].data()[COMMON_FIELDS.CREATED_AT] 
          : null
      };
    } catch (error) {
      handleServiceError('get posts by totem', error);
      return { posts: [], lastVisible: null };
    }
  }
} 