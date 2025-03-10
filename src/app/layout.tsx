import './globals.css';
import { QueryClientProvider } from '@/providers/QueryClientProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Shrug',
  description: 'A platform for sharing knowledge and expertise',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <QueryClientProvider>
            {children}
          </QueryClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}