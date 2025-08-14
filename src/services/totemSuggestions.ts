import { db } from '@/firebase';
import { collection, query, getDocs, limit, where, orderBy } from 'firebase/firestore';

export interface TotemSuggestion {
  name: string;
  count: number;
  category?: string;
}

export class TotemSuggestionsService {
  private static cache: TotemSuggestion[] = [];
  private static lastFetch = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get popular totems for suggestions
   */
  static async getPopularTotems(limitCount: number = 20): Promise<TotemSuggestion[]> {
    // Return cached results if recent
    if (this.cache.length > 0 && Date.now() - this.lastFetch < this.CACHE_DURATION) {
      return this.cache.slice(0, limitCount);
    }

    if (!db) {
      return this.getFallbackSuggestions(limitCount);
    }

    try {
      // Get all posts to analyze totem usage
      const postsRef = collection(db, 'posts');
      const postsQuery = query(postsRef, limit(100)); // Limit for performance
      const postsSnapshot = await getDocs(postsQuery);
      
      const totemCounts = new Map<string, number>();
      
      postsSnapshot.docs.forEach(doc => {
        const post = doc.data();
        if (post.answers && Array.isArray(post.answers)) {
          post.answers.forEach((answer: any) => {
            if (answer.totems && Array.isArray(answer.totems)) {
              answer.totems.forEach((totem: any) => {
                const name = totem.name?.toLowerCase();
                if (name) {
                  totemCounts.set(name, (totemCounts.get(name) || 0) + 1);
                }
              });
            }
          });
        }
      });

      // Convert to suggestions and sort by popularity
      const suggestions: TotemSuggestion[] = Array.from(totemCounts.entries())
        .map(([name, count]) => ({
          name: this.capitalizeTotem(name),
          count,
          category: this.inferCategory(name)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limitCount);

      // Cache results
      this.cache = suggestions;
      this.lastFetch = Date.now();
      
      return suggestions;
    } catch (error) {
      console.error('Error fetching totem suggestions:', error);
      return this.getFallbackSuggestions(limitCount);
    }
  }

  /**
   * Search for totems that match a query
   */
  static async searchTotems(query: string, limitCount: number = 10): Promise<TotemSuggestion[]> {
    const popular = await this.getPopularTotems(50);
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      return popular.slice(0, limitCount);
    }

    // Filter and score matches
    const matches = popular
      .filter(totem => totem.name.toLowerCase().includes(searchTerm))
      .map(totem => ({
        ...totem,
        score: this.calculateMatchScore(totem.name.toLowerCase(), searchTerm)
      }))
      .sort((a, b) => b.score - a.score || b.count - a.count)
      .slice(0, limitCount);

    return matches;
  }

  /**
   * Calculate match score for search relevance
   */
  private static calculateMatchScore(totemName: string, searchTerm: string): number {
    if (totemName === searchTerm) return 100;
    if (totemName.startsWith(searchTerm)) return 90;
    if (totemName.includes(searchTerm)) return 70;
    return 0;
  }

  /**
   * Capitalize totem name properly
   */
  private static capitalizeTotem(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Infer category from totem name (simple heuristics)
   */
  private static inferCategory(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (['funny', 'hilarious', 'lol', 'humor', 'joke'].some(word => lowerName.includes(word))) {
      return 'humor';
    }
    if (['helpful', 'useful', 'practical', 'tip', 'advice'].some(word => lowerName.includes(word))) {
      return 'helpful';
    }
    if (['smart', 'clever', 'brilliant', 'genius', 'insightful'].some(word => lowerName.includes(word))) {
      return 'insightful';
    }
    if (['simple', 'easy', 'basic', 'straightforward'].some(word => lowerName.includes(word))) {
      return 'simple';
    }
    
    return 'general';
  }

  /**
   * Fallback suggestions when database is unavailable
   */
  private static getFallbackSuggestions(limitCount: number): TotemSuggestion[] {
    const fallbacks: TotemSuggestion[] = [
      { name: 'Helpful', count: 10, category: 'helpful' },
      { name: 'Simple', count: 8, category: 'simple' },
      { name: 'Smart', count: 7, category: 'insightful' },
      { name: 'Funny', count: 6, category: 'humor' },
      { name: 'Practical', count: 5, category: 'helpful' },
      { name: 'Clever', count: 4, category: 'insightful' },
      { name: 'Useful', count: 4, category: 'helpful' },
      { name: 'Informative', count: 3, category: 'general' },
      { name: 'Creative', count: 3, category: 'general' },
      { name: 'Educational', count: 2, category: 'general' }
    ];
    
    return fallbacks.slice(0, limitCount);
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache = [];
    this.lastFetch = 0;
  }
}