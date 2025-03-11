"use client";

import { QueryProvider } from '@/providers/QueryProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryProvider>{children}</QueryProvider>
    </ErrorBoundary>
  );
} 