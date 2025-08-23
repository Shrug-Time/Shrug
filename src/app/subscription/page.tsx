"use client";

import { isFeatureEnabled } from '@/config/featureFlags';
import { redirect } from 'next/navigation';

function SubscriptionContent() {
  return null; // This component is disabled
}

export default function SubscriptionPage() {
  // Redirect to home if subscriptions are disabled
  if (!isFeatureEnabled('SUBSCRIPTIONS_ENABLED')) {
    redirect('/');
  }
  
  return null; // This page is disabled
} 