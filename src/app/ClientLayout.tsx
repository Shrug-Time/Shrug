"use client";

import { QueryProvider } from '@/providers/QueryProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Navbar } from '@/components/layout/Navbar';
import { ReactNode } from 'react';
import { TotemProvider } from '@/contexts/TotemContext';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <TotemProvider>
          <Navbar />
          {children}
        </TotemProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
} 