/**
 * Feature Flags Configuration
 * 
 * Controls which features are enabled/disabled for the current release.
 * Set to false to hide features while preserving infrastructure.
 */

export const FEATURE_FLAGS = {
  // Ad System - Community ads and promotion system
  ADS_ENABLED: false,
  
  // Subscription System - Platform subscriptions and payments
  SUBSCRIPTIONS_ENABLED: false,
  
  // Premium Content Gating - Creator-controlled paid content
  PREMIUM_CONTENT_ENABLED: false,
  
  // Subscriber Management - Subscription-based following (distinct from social following)
  SUBSCRIBER_MANAGEMENT_ENABLED: false,
  
  // Payment Processing - Stripe integration and transactions
  PAYMENT_PROCESSING_ENABLED: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}