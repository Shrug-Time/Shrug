"use client";

import { isFeatureEnabled } from '@/config/featureFlags';
import { redirect } from 'next/navigation';

export default function SubscribersPage() {
  // Redirect to home if subscriber management is disabled
  if (!isFeatureEnabled('SUBSCRIBER_MANAGEMENT_ENABLED')) {
    redirect('/');
  }
  
  return null; // This page is disabled
} 