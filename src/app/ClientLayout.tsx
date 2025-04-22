"use client";

import { QueryProvider } from '@/providers/QueryProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Navbar } from '@/components/layout/Navbar';
import { ReactNode } from 'react';
import { TotemProvider } from '@/contexts/TotemContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ContentGatingProvider } from '@/contexts/ContentGatingContext';
import { VerificationBanner } from '@/components/auth/VerificationBanner';
import FirebaseProvider from '@/components/FirebaseProvider';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <ContentGatingProvider>
              <QueryProvider>
                <TotemProvider>
                  <Navbar />
                  <div className="container mx-auto px-4">
                    <VerificationBanner />
                  </div>
                  {children}
                </TotemProvider>
              </QueryProvider>
            </ContentGatingProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  );
} 