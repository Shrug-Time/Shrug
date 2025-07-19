/**
 * Standardized Search Service
 * 
 * Provides unified search functionality across all content types:
 * - Posts (questions and answers)
 * - Users (by name, username, bio)
 * - Totems (by name, description)
 */

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  QueryConstraint
} from 'firebase/firestore';
import { Post, UserProfile, Totem } from '@/types/models';
import { PostService } from './PostService';
import { UserService } from '../userService';
import { TotemService } from './TotemService';
import { COMMON_FIELDS, USER_FIELDS } from '@/constants/fields';
import { validatePost, validateUserProfile, validateTotem } from '@/utils/schemaValidation';
import { handleServiceError, DEFAULT_PAGE_SIZE } from '@/utils/serviceHelpers';

export interface SearchResult {
  type: 'post' | 'user' | 'totem';
  id: string;
  title: string;
  description?: string;
  url: string;
  relevance: number;
  data: Post | UserProfile | Totem;
}

export interface SearchOptions {
  types?: ('post' | 'user' | 'totem')[];
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'popularity';
}

/**
 * Service class for unified search functionality
 */
export class SearchService {
  private static readonly POSTS_COLLECTION = 'posts';
  private static readonly USERS_COLLECTION = 'users';
  private static readonly TOTEMS_COLLECTION = 'totems';
  
  /**
   * Search across all content types
   * @param searchTerm Search query
   * @param options Search options
   * @returns Unified search results
   */
  static async search(
    searchTerm: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      if (!searchTerm?.trim()) {
        return [];
      }

      const {
        types = ['post', 'user', 'totem'],
        limit: resultLimit = DEFAULT_PAGE_SIZE,
        sortBy = 'relevance'
      } = options;

      const searchTermLower = searchTerm.toLowerCase().trim();
      const results: SearchResult[] = [];

      // Search posts
      if (types.includes('post')) {
        const posts = await this.searchPosts(searchTermLower, resultLimit);
        results.push(...posts);
      }

      // Search users
      if (types.includes('user')) {
        const users = await this.searchUsers(searchTermLower, resultLimit);
        results.push(...users);
      }

      // Search totems
      if (types.includes('totem')) {
        const totems = await this.searchTotems(searchTermLower, resultLimit);
        results.push(...totems);
      }

      // Sort results
      return this.sortResults(results, sortBy, searchTermLower).slice(0, resultLimit);
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Search posts (questions and answers)
   */
  private static async searchPosts(searchTerm: string, resultLimit: number): Promise<SearchResult[]> {
    try {
      // Use existing PostService.searchPosts for consistency
      const posts = await PostService.searchPosts(searchTerm, resultLimit);
      
      return posts.map(post => ({
        type: 'post' as const,
        id: post.id,
        title: post.question,
        description: post.answers?.[0]?.text?.substring(0, 150) + '...',
        url: `/post/${post.id}`,
        relevance: this.calculatePostRelevance(post, searchTerm),
        data: post
      }));
    } catch (error) {
      console.error('Error searching posts:', error);
      return [];
    }
  }

  /**
   * Search users by name, username, and bio
   */
  private static async searchUsers(searchTerm: string, resultLimit: number): Promise<SearchResult[]> {
    try {
      console.log(`[SearchService] Searching users for: "${searchTerm}"`);
      const usersRef = collection(db, this.USERS_COLLECTION);
      
      // Get all users and filter client-side for better search
      let q = query(usersRef, limit(100)); // Remove ordering to avoid index issues
      
      try {
        const snapshot = await getDocs(q);
        console.log(`[SearchService] Found ${snapshot.docs.length} users in database`);
        
        const users = snapshot.docs.map(doc => 
          validateUserProfile({ ...doc.data(), firebaseUid: doc.id })
        );

        // Filter and score users
        const matchingUsers = users
          .filter(user => 
            user.name?.toLowerCase().includes(searchTerm) ||
            user.username?.toLowerCase().includes(searchTerm) ||
            user.bio?.toLowerCase().includes(searchTerm)
          )
          .map(user => ({
            type: 'user' as const,
            id: user.firebaseUid,
            title: user.name || user.username,
            description: user.bio || `@${user.username}`,
            url: `/profile/${user.firebaseUid}`,
            relevance: this.calculateUserRelevance(user, searchTerm),
            data: user
          }))
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, resultLimit);

        console.log(`[SearchService] Returning ${matchingUsers.length} matching users`);
        return matchingUsers;
      } catch (orderByError) {
        console.log(`[SearchService] User query failed, trying without ordering:`, orderByError);
        
        // Fallback: try without any ordering
        const fallbackSnapshot = await getDocs(query(usersRef, limit(100)));
        console.log(`[SearchService] Fallback user query found ${fallbackSnapshot.docs.length} users`);
        
        const users = fallbackSnapshot.docs.map(doc => 
          validateUserProfile({ ...doc.data(), firebaseUid: doc.id })
        );

        const matchingUsers = users
          .filter(user => 
            user.name?.toLowerCase().includes(searchTerm) ||
            user.username?.toLowerCase().includes(searchTerm) ||
            user.bio?.toLowerCase().includes(searchTerm)
          )
          .map(user => ({
            type: 'user' as const,
            id: user.firebaseUid,
            title: user.name || user.username,
            description: user.bio || `@${user.username}`,
            url: `/profile/${user.firebaseUid}`,
            relevance: this.calculateUserRelevance(user, searchTerm),
            data: user
          }))
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, resultLimit);

        return matchingUsers;
      }
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Search totems by name and description
   */
  private static async searchTotems(searchTerm: string, resultLimit: number): Promise<SearchResult[]> {
    try {
      console.log(`[SearchService] Searching totems for: "${searchTerm}" - V2`);
      console.log(`[SearchService] Database projectId:`, db.app.options.projectId);
      
      // First, try the dedicated totems collection
      const totemsRef = collection(db, this.TOTEMS_COLLECTION);
      console.log(`[SearchService] Checking dedicated totems collection...`);
      
      try {
        const snapshot = await getDocs(query(totemsRef, limit(100)));
        console.log(`[SearchService] Found ${snapshot.docs.length} totems in dedicated collection`);
        
        if (snapshot.docs.length > 0) {
          // Process totems from dedicated collection
          const totems = snapshot.docs.map(doc => {
            const data = doc.data() as any;
            const lastUsedMs = data.lastUsed ? 
              (data.lastUsed.seconds * 1000) + (data.lastUsed.nanoseconds / 1000000) : 
              Date.now();
            
            return {
              id: doc.id,
              name: data.name || 'unnamed',
              description: '',
              usageCount: data.usageCount || 0,
              crispness: 100,
              likeHistory: [],
              category: { id: 'general', name: 'General', description: '', children: [], usageCount: 0 },
              decayModel: 'MEDIUM' as const,
              createdAt: lastUsedMs,
              updatedAt: lastUsedMs,
              lastInteraction: lastUsedMs
            } as Totem;
          });

          const matchingTotems = totems
            .filter(totem => totem.name?.toLowerCase().includes(searchTerm))
            .map(totem => ({
              type: 'totem' as const,
              id: totem.id || totem.name,
              title: `#${totem.name}`,
              description: `${totem.usageCount || 0} uses`,
              url: `/totem/${totem.name}`,
              relevance: this.calculateTotemRelevance(totem, searchTerm),
              data: totem
            }))
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, resultLimit);

          console.log(`[SearchService] Returning ${matchingTotems.length} matching totems from dedicated collection`);
          return matchingTotems;
        }
      } catch (error) {
        console.log(`[SearchService] Error accessing dedicated totems collection:`, error);
      }
      
      // If no totems in dedicated collection, try to extract from posts
      console.log(`[SearchService] No totems in dedicated collection, trying to extract from posts...`);
      const postsRef = collection(db, this.POSTS_COLLECTION);
      const postsSnapshot = await getDocs(query(postsRef, limit(50)));
      console.log(`[SearchService] Found ${postsSnapshot.docs.length} posts to search for embedded totems`);
      
      const totemSet = new Set<string>();
      const totemUsageCount = new Map<string, number>();
      
      postsSnapshot.docs.forEach(doc => {
        const post = doc.data() as any;
        if (post.answers) {
          post.answers.forEach((answer: any) => {
            if (answer.totems) {
              answer.totems.forEach((totem: any) => {
                if (totem.name) {
                  totemSet.add(totem.name);
                  totemUsageCount.set(totem.name, (totemUsageCount.get(totem.name) || 0) + 1);
                }
              });
            }
          });
        }
      });
      
      console.log(`[SearchService] Found ${totemSet.size} unique totems embedded in posts:`, Array.from(totemSet));
      
      const totems = Array.from(totemSet).map(name => ({
        id: name,
        name: name,
        description: '',
        usageCount: totemUsageCount.get(name) || 0,
        crispness: 100,
        likeHistory: [],
        category: { id: 'general', name: 'General', description: '', children: [], usageCount: 0 },
        decayModel: 'MEDIUM' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastInteraction: Date.now()
      } as Totem));

      const matchingTotems = totems
        .filter(totem => totem.name?.toLowerCase().includes(searchTerm))
        .map(totem => ({
          type: 'totem' as const,
          id: totem.id || totem.name,
          title: `#${totem.name}`,
          description: `${totem.usageCount || 0} uses`,
          url: `/totem/${totem.name}`,
          relevance: this.calculateTotemRelevance(totem, searchTerm),
          data: totem
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, resultLimit);

      console.log(`[SearchService] Returning ${matchingTotems.length} matching totems from embedded totems`);
      return matchingTotems;
      
    } catch (error) {
      console.error('Error searching totems:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code || 'unknown',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      return [];
    }
  }

  /**
   * Calculate relevance score for posts
   */
  private static calculatePostRelevance(post: Post, searchTerm: string): number {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Question title match (highest weight)
    if (post.question.toLowerCase().includes(term)) {
      score += 10;
      // Exact match gets bonus
      if (post.question.toLowerCase() === term) score += 5;
    }

    // Answer content match
    post.answers?.forEach(answer => {
      if (answer.text.toLowerCase().includes(term)) {
        score += 3;
      }
    });

    // Recency bonus (newer posts get slight boost)
    const daysSinceCreation = (Date.now() - post.createdAt) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 7) score += 1;
    if (daysSinceCreation < 1) score += 1;

    // Engagement bonus - calculate total likes from totem likeHistory
    let totalLikes = 0;
    post.answers?.forEach(answer => {
      answer.totems?.forEach(totem => {
        totalLikes += totem.likeHistory?.filter(like => like.isActive).length || 0;
      });
    });
    score += Math.min(totalLikes * 0.1, 5); // Cap at 5 points

    return score;
  }

  /**
   * Calculate relevance score for users
   */
  private static calculateUserRelevance(user: UserProfile, searchTerm: string): number {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Username exact match (highest weight)
    if (user.username?.toLowerCase() === term) {
      score += 10;
    } else if (user.username?.toLowerCase().includes(term)) {
      score += 8;
    }

    // Name match
    if (user.name?.toLowerCase().includes(term)) {
      score += 6;
    }

    // Bio match
    if (user.bio?.toLowerCase().includes(term)) {
      score += 3;
    }

    // Follower count bonus (popular users get slight boost)
    const followerCount = user.followers?.length || 0;
    score += Math.min(followerCount * 0.01, 3); // Cap at 3 points

    return score;
  }

  /**
   * Calculate relevance score for totems
   */
  private static calculateTotemRelevance(totem: Totem, searchTerm: string): number {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Name exact match (highest weight)
    if (totem.name?.toLowerCase() === term) {
      score += 10;
    } else if (totem.name?.toLowerCase().includes(term)) {
      score += 8;
    }

    // Description match
    if (totem.description?.toLowerCase().includes(term)) {
      score += 4;
    }

    // Usage count bonus (popular totems get slight boost)
    const usageCount = totem.usageCount || 0;
    score += Math.min(usageCount * 0.01, 3); // Cap at 3 points

    return score;
  }

  /**
   * Sort results by specified criteria
   */
  private static sortResults(results: SearchResult[], sortBy: string, searchTerm: string): SearchResult[] {
    switch (sortBy) {
      case 'relevance':
        return results.sort((a, b) => b.relevance - a.relevance);
      
      case 'date':
        return results.sort((a, b) => {
          const aDate = (a.data as any).createdAt || 0;
          const bDate = (b.data as any).createdAt || 0;
          return bDate - aDate;
        });
      
      case 'popularity':
        return results.sort((a, b) => {
          const aPopularity = this.getPopularityScore(a);
          const bPopularity = this.getPopularityScore(b);
          return bPopularity - aPopularity;
        });
      
      default:
        return results;
    }
  }

  /**
   * Get popularity score for sorting
   */
  private static getPopularityScore(result: SearchResult): number {
    switch (result.type) {
      case 'post':
        const post = result.data as Post;
        let totalLikes = 0;
        post.answers?.forEach(answer => {
          answer.totems?.forEach(totem => {
            totalLikes += totem.likeHistory?.filter(like => like.isActive).length || 0;
          });
        });
        return totalLikes;
      
      case 'user':
        const user = result.data as UserProfile;
        return user.followers?.length || 0;
      
      case 'totem':
        const totem = result.data as Totem;
        return totem.usageCount || 0;
      
      default:
        return 0;
    }
  }

  /**
   * Get search suggestions for autocomplete
   * @param partialTerm Partial search term
   * @param suggestionLimit Maximum number of suggestions
   * @returns Search suggestions
   */
  static async getSuggestions(partialTerm: string, suggestionLimit: number = 5): Promise<string[]> {
    try {
      if (!partialTerm?.trim() || partialTerm.length < 2) {
        return [];
      }

      console.log(`[SearchService] Getting suggestions for: "${partialTerm}"`);
      const suggestions = new Set<string>();
      const term = partialTerm.toLowerCase().trim();

      // Get popular totems as suggestions - use direct query instead of TotemService
      console.log(`[SearchService] Fetching popular totems for suggestions`);
      console.log(`[SearchService] Database projectId for suggestions:`, db.app.options.projectId);
      const totemsRef = collection(db, this.TOTEMS_COLLECTION);
      
      try {
        const totemsQuery = query(
          totemsRef,
          orderBy('usageCount', 'desc'),
          limit(20)
        );
        console.log(`[SearchService] Executing suggestions query...`);
        const totemsSnapshot = await getDocs(totemsQuery);
        console.log(`[SearchService] Suggestions query executed successfully`);
        console.log(`[SearchService] Found ${totemsSnapshot.docs.length} popular totems`);
        
        totemsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(totem => {
            const matches = totem.name?.toLowerCase().includes(term);
            console.log(`[SearchService] Totem "${totem.name}" matches: ${matches}`);
            return matches;
          })
          .slice(0, suggestionLimit)
          .forEach(totem => suggestions.add(`#${totem.name}`));
      } catch (orderByError) {
        console.log(`[SearchService] OrderBy query failed for suggestions, trying without ordering:`, orderByError);
        
        // Fallback: try without ordering
        const fallbackQuery = query(totemsRef, limit(20));
        console.log(`[SearchService] Executing fallback suggestions query...`);
        const fallbackSnapshot = await getDocs(fallbackQuery);
        console.log(`[SearchService] Fallback suggestions query executed successfully`);
        console.log(`[SearchService] Fallback suggestions query found ${fallbackSnapshot.docs.length} totems`);
        
        fallbackSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(totem => totem.name?.toLowerCase().includes(term))
          .slice(0, suggestionLimit)
          .forEach(totem => suggestions.add(`#${totem.name}`));
      }

      // Get popular usernames as suggestions
      const usersRef = collection(db, this.USERS_COLLECTION);
      
      try {
        const usersQuery = query(
          usersRef,
          orderBy(USER_FIELDS.FOLLOWERS, 'desc'),
          limit(20)
        );
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.docs
          .map(doc => doc.data())
          .filter(user => user.username?.toLowerCase().includes(term))
          .slice(0, suggestionLimit)
          .forEach(user => suggestions.add(`@${user.username}`));
      } catch (orderByError) {
        console.log(`[SearchService] User suggestions orderBy failed, trying without ordering:`, orderByError);
        
        // Fallback: try without ordering
        const fallbackQuery = query(usersRef, limit(20));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        fallbackSnapshot.docs
          .map(doc => doc.data())
          .filter(user => user.username?.toLowerCase().includes(term))
          .slice(0, suggestionLimit)
          .forEach(user => suggestions.add(`@${user.username}`));
      }

      const result = Array.from(suggestions).slice(0, suggestionLimit);
      console.log(`[SearchService] Returning ${result.length} suggestions:`, result);
      return result;
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }
} 