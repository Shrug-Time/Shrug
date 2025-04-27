/**
 * Profile Section Service
 * 
 * Provides functionality for managing user profile sections and organization.
 */

import { db } from '@/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  deleteDoc,
  addDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { ProfileSection, UserProfile, Post } from '@/types/models';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { PostService } from './standardized';

/**
 * Service for managing user profile sections
 */
export class ProfileSectionService {
  // Collection references
  private static readonly USERS_COLLECTION = 'users';
  private static readonly SECTIONS_COLLECTION = 'sections';
  
  /**
   * Get all sections for a user
   * @param userId Firebase UID of the user
   * @returns Array of profile sections
   */
  static async getSections(userId: string): Promise<ProfileSection[]> {
    try {
      const sectionsRef = collection(
        db, 
        this.USERS_COLLECTION, 
        userId, 
        this.SECTIONS_COLLECTION
      );
      
      const sectionsQuery = query(
        sectionsRef,
        orderBy('position', 'asc')
      );
      
      const snapshot = await getDocs(sectionsQuery);
      
      if (snapshot.empty) {
        // If no sections exist, create default sections
        return this.createDefaultSections(userId);
      }
      
      return snapshot.docs.map(doc => ({
        ...doc.data() as ProfileSection,
        id: doc.id
      }));
    } catch (error) {
      console.error('Error getting profile sections:', error);
      throw error;
    }
  }
  
  /**
   * Create default sections for a new user
   * @param userId Firebase UID of the user
   * @returns Array of created sections
   */
  static async createDefaultSections(userId: string): Promise<ProfileSection[]> {
    try {
      const timestamp = Date.now();
      const batch = writeBatch(db);
      
      const defaultSections: Omit<ProfileSection, 'id'>[] = [
        {
          title: 'Recent',
          type: 'default',
          organizationMethod: 'chronological',
          contentIds: [],
          position: 0,
          isVisible: true,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          title: 'Popular',
          type: 'default',
          organizationMethod: 'popularity',
          contentIds: [],
          position: 1,
          isVisible: true,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ];
      
      const createdSections: ProfileSection[] = [];
      
      // Add default sections to batch
      for (const section of defaultSections) {
        const sectionId = uuidv4();
        const sectionRef = doc(
          db, 
          this.USERS_COLLECTION, 
          userId, 
          this.SECTIONS_COLLECTION, 
          sectionId
        );
        
        batch.set(sectionRef, section);
        
        createdSections.push({
          ...section,
          id: sectionId
        });
      }
      
      // Create totem-based sections
      const userPostsResult = await PostService.getUserPosts(userId, 100);
      const userAnswersResult = await PostService.getUserAnswers(userId, 100);
      
      const allPosts = [
        ...(userPostsResult.posts || []),
        ...(userAnswersResult.posts || [])
      ];
      
      // Extract totems from posts and answers
      const totemUsage = new Map<string, number>();
      
      allPosts.forEach(post => {
        // Extract totems from answers
        post.answers?.forEach(answer => {
          answer.totems?.forEach(totem => {
            if (totem.name) {
              const count = totemUsage.get(totem.name) || 0;
              totemUsage.set(totem.name, count + 1);
            }
          });
        });
        
        // Extract totems from post associations
        post.totemAssociations?.forEach(association => {
          if (association.totemName) {
            const count = totemUsage.get(association.totemName) || 0;
            totemUsage.set(association.totemName, count + 1);
          }
        });
      });
      
      // Create sections for top 3 totems
      const topTotems = Array.from(totemUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      let position = 2; // Start after Recent and Popular
      
      for (const [totemName, count] of topTotems) {
        const sectionId = uuidv4();
        const sectionRef = doc(
          db, 
          this.USERS_COLLECTION, 
          userId, 
          this.SECTIONS_COLLECTION, 
          sectionId
        );
        
        const totemSection: Omit<ProfileSection, 'id'> = {
          title: `${totemName}`,
          type: 'default',
          organizationMethod: 'chronological',
          contentIds: [],
          position: position++,
          isVisible: true,
          totemId: totemName,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        
        batch.set(sectionRef, totemSection);
        
        createdSections.push({
          ...totemSection,
          id: sectionId
        });
      }
      
      await batch.commit();
      
      return createdSections;
    } catch (error) {
      console.error('Error creating default sections:', error);
      throw error;
    }
  }
  
  /**
   * Create a new section
   * @param userId Firebase UID of the user
   * @param section Section data
   * @returns Created section
   */
  static async createSection(
    userId: string,
    section: Omit<ProfileSection, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProfileSection> {
    try {
      const timestamp = Date.now();
      const sectionId = uuidv4();
      const sectionRef = doc(
        db, 
        this.USERS_COLLECTION, 
        userId, 
        this.SECTIONS_COLLECTION, 
        sectionId
      );
      
      const newSection: Omit<ProfileSection, 'id'> = {
        ...section,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await setDoc(sectionRef, newSection);
      
      return {
        ...newSection,
        id: sectionId
      };
    } catch (error) {
      console.error('Error creating section:', error);
      throw error;
    }
  }
  
  /**
   * Update a section
   * @param userId Firebase UID of the user
   * @param sectionId ID of the section to update
   * @param updates Section updates
   * @returns Updated section
   */
  static async updateSection(
    userId: string,
    sectionId: string,
    updates: Partial<Omit<ProfileSection, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ProfileSection> {
    try {
      const sectionRef = doc(
        db, 
        this.USERS_COLLECTION, 
        userId, 
        this.SECTIONS_COLLECTION, 
        sectionId
      );
      
      const sectionDoc = await getDoc(sectionRef);
      
      if (!sectionDoc.exists()) {
        throw new Error('Section not found');
      }
      
      const timestampedUpdates = {
        ...updates,
        updatedAt: Date.now()
      };
      
      await updateDoc(sectionRef, timestampedUpdates);
      
      const updatedDoc = await getDoc(sectionRef);
      
      return {
        ...updatedDoc.data() as Omit<ProfileSection, 'id'>,
        id: sectionId
      };
    } catch (error) {
      console.error('Error updating section:', error);
      throw error;
    }
  }
  
  /**
   * Delete a section
   * @param userId Firebase UID of the user
   * @param sectionId ID of the section to delete
   * @returns Success status
   */
  static async deleteSection(userId: string, sectionId: string): Promise<boolean> {
    try {
      const sectionRef = doc(
        db, 
        this.USERS_COLLECTION, 
        userId, 
        this.SECTIONS_COLLECTION, 
        sectionId
      );
      
      await deleteDoc(sectionRef);
      
      return true;
    } catch (error) {
      console.error('Error deleting section:', error);
      throw error;
    }
  }
  
  /**
   * Add content to a section
   * @param userId Firebase UID of the user
   * @param sectionId ID of the section
   * @param contentId ID of the content to add
   * @returns Updated section
   */
  static async addContentToSection(
    userId: string,
    sectionId: string,
    contentId: string
  ): Promise<ProfileSection> {
    try {
      const sectionRef = doc(
        db, 
        this.USERS_COLLECTION, 
        userId, 
        this.SECTIONS_COLLECTION, 
        sectionId
      );
      
      const sectionDoc = await getDoc(sectionRef);
      
      if (!sectionDoc.exists()) {
        throw new Error('Section not found');
      }
      
      const section = sectionDoc.data() as Omit<ProfileSection, 'id'>;
      
      // Add content if it doesn't already exist
      if (!section.contentIds.includes(contentId)) {
        const updatedSection = {
          ...section,
          contentIds: [...section.contentIds, contentId],
          updatedAt: Date.now()
        };
        
        await updateDoc(sectionRef, updatedSection);
        
        return {
          ...updatedSection,
          id: sectionId
        };
      }
      
      return {
        ...section,
        id: sectionId
      };
    } catch (error) {
      console.error('Error adding content to section:', error);
      throw error;
    }
  }
  
  /**
   * Remove content from a section
   * @param userId Firebase UID of the user
   * @param sectionId ID of the section
   * @param contentId ID of the content to remove
   * @returns Updated section
   */
  static async removeContentFromSection(
    userId: string,
    sectionId: string,
    contentId: string
  ): Promise<ProfileSection> {
    try {
      const sectionRef = doc(
        db, 
        this.USERS_COLLECTION, 
        userId, 
        this.SECTIONS_COLLECTION, 
        sectionId
      );
      
      const sectionDoc = await getDoc(sectionRef);
      
      if (!sectionDoc.exists()) {
        throw new Error('Section not found');
      }
      
      const section = sectionDoc.data() as Omit<ProfileSection, 'id'>;
      
      const updatedSection = {
        ...section,
        contentIds: section.contentIds.filter(id => id !== contentId),
        updatedAt: Date.now()
      };
      
      await updateDoc(sectionRef, updatedSection);
      
      return {
        ...updatedSection,
        id: sectionId
      };
    } catch (error) {
      console.error('Error removing content from section:', error);
      throw error;
    }
  }
  
  /**
   * Reorder sections
   * @param userId Firebase UID of the user
   * @param sectionOrder Array of section IDs in desired order
   * @returns Success status
   */
  static async reorderSections(
    userId: string,
    sectionOrder: string[]
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      
      for (let i = 0; i < sectionOrder.length; i++) {
        const sectionId = sectionOrder[i];
        const sectionRef = doc(
          db, 
          this.USERS_COLLECTION, 
          userId, 
          this.SECTIONS_COLLECTION, 
          sectionId
        );
        
        batch.update(sectionRef, {
          position: i,
          updatedAt: Date.now()
        });
      }
      
      await batch.commit();
      
      return true;
    } catch (error) {
      console.error('Error reordering sections:', error);
      throw error;
    }
  }
  
  /**
   * Get content for a section
   * @param userId Firebase UID of the user
   * @param section Section to get content for
   * @returns Array of posts
   */
  static async getSectionContent(userId: string, section: ProfileSection): Promise<Post[]> {
    try {
      // For totem-based sections, fetch posts with that totem
      if (section.totemId) {
        // Get posts with the specified totem
        const userPostsResult = await PostService.getUserPosts(userId, 100);
        const userAnswersResult = await PostService.getUserAnswers(userId, 100);
        
        const allPosts = [
          ...(userPostsResult.posts || []),
          ...(userAnswersResult.posts || [])
        ];
        
        // Filter posts by totem
        const filteredPosts = allPosts.filter(post => {
          // Check post associations
          const hasTotemInPost = post.totemAssociations?.some(
            association => association.totemName === section.totemId
          );
          
          // Check answers for totems
          const hasTotemInAnswers = post.answers?.some(answer => 
            answer.totems?.some(totem => totem.name === section.totemId)
          );
          
          return hasTotemInPost || hasTotemInAnswers;
        });
        
        return this.sortSectionContent(filteredPosts, section.organizationMethod);
      }
      // For default sections like "Recent" and "Popular", use the organization method
      else if (section.type === 'default') {
        const userPostsResult = await PostService.getUserPosts(userId, 100);
        const userAnswersResult = await PostService.getUserAnswers(userId, 100);
        
        const allPosts = [
          ...(userPostsResult.posts || []),
          ...(userAnswersResult.posts || [])
        ];
        
        return this.sortSectionContent(allPosts, section.organizationMethod);
      }
      // For custom sections, get content by explicit IDs
      else if (section.contentIds.length > 0) {
        const contentPosts: Post[] = [];
        
        // Get posts by IDs
        // Note: We need to implement or use a different method since getPostById doesn't exist
        for (const contentId of section.contentIds) {
          try {
            // Fetch post by ID - alternative approach without getPostById
            const result = await PostService.getUserPosts(userId, 100);
            const post = result.posts?.find(p => p.id === contentId);
            if (post) {
              contentPosts.push(post);
            }
          } catch (error) {
            console.warn(`Failed to fetch post ${contentId}:`, error);
          }
        }
        
        return contentPosts;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting section content:', error);
      throw error;
    }
  }
  
  /**
   * Sort section content based on organization method
   * @param posts Array of posts to sort
   * @param method Organization method
   * @returns Sorted posts
   */
  private static sortSectionContent(posts: Post[], method: string): Post[] {
    switch (method) {
      case 'chronological':
        // Sort by creation date, newest first
        return [...posts].sort((a, b) => b.createdAt - a.createdAt);
        
      case 'popularity':
        // Sort by answer count or score if available
        return [...posts].sort((a, b) => {
          const aPopularity = a.answers?.length || 0;
          const bPopularity = b.answers?.length || 0;
          return bPopularity - aPopularity;
        });
        
      case 'series':
        // For series, we maintain the contentIds order for manual progression
        // This returns the posts in the exact order they were added to the section
        return posts;
        
      case 'custom':
        // For custom organization, sort alphabetically by question
        return [...posts].sort((a, b) => 
          a.question.localeCompare(b.question)
        );
        
      default:
        return posts;
    }
  }
} 