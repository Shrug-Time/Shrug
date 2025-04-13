/**
 * Routes utility functions
 * 
 * This file contains utility functions for generating consistent URLs throughout the application.
 * Always use these functions instead of hardcoding routes to ensure consistency.
 */

/**
 * Generate URL to the home/feed page
 */
export const getHomeUrl = (): string => {
  return '/';
};

/**
 * Generate URL to view a single post/question
 */
export function getPostUrl(postId: string): string {
  return `/post/${postId}`;
}

/**
 * Generate URL to view a specific answer to a post
 */
export function getAnswerUrl(postId: string, answerId: string): string {
  return `/post/${postId}/answers/${answerId}`;
}

/**
 * Generate URL to view a specific totem for a post
 */
export const getTotemUrl = (postId: string, totemName: string): string => {
  return `/post/${encodeURIComponent(postId)}/totem/${encodeURIComponent(totemName)}`;
};

/**
 * Generate URL to a user's profile
 */
export function getProfileUrl(userId: string): string {
  return `/profile/${userId}`;
}

/**
 * Generate URL to the search page with an optional query
 */
export const getSearchUrl = (query?: string): string => {
  return query ? `/search?q=${encodeURIComponent(query)}` : '/search';
};

/**
 * Generate URL to create a new post
 */
export const getNewPostUrl = (): string => {
  return '/post/new';
};

/**
 * Generate URL to create an answer to a post
 */
export const getCreateAnswerUrl = (postId: string): string => {
  return `/post/${encodeURIComponent(postId)}/answer`;
};

/**
 * Generate URL to user settings
 */
export const getSettingsUrl = (): string => {
  return '/settings';
};

/**
 * Generate URL to profile settings
 */
export const getProfileSettingsUrl = (): string => {
  return '/settings/profile';
};

/**
 * Generate URL to admin reports page
 */
export const getAdminReportsUrl = (): string => {
  return '/admin/reports';
}; 