import './globals.css';
import ClientLayout from './ClientLayout';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Shrug - Share What You Know',
    template: '%s | Shrug',
  },
  description: 'A Q&A platform where knowledge is shared, valued, and recognized through Totems.',
  openGraph: {
    title: 'Shrug - Share What You Know',
    description: 'A Q&A platform where knowledge is shared, valued, and recognized through Totems.',
    type: 'website',
    siteName: 'Shrug',
  },
  twitter: {
    card: 'summary',
    title: 'Shrug - Share What You Know',
    description: 'A Q&A platform where knowledge is shared, valued, and recognized through Totems.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}