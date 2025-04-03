"use client";

import { QueryProvider } from '@/providers/QueryProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Navbar } from '@/components/layout/Navbar';
import { ReactNode } from 'react';
import { TotemProviderV2 } from '@/contexts/TotemContextV2';
import { AuthProvider } from '@/contexts/AuthContext';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryProvider>
          <TotemProviderV2>
            <Navbar />
            {children}
          </TotemProviderV2>
        </QueryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
} 