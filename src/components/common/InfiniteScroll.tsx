"use client";

import { useEffect, useRef, ReactNode } from 'react';
import { useInView } from 'react-intersection-observer';

interface InfiniteScrollProps {
  children: ReactNode;
  onLoadMore: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  loadingComponent?: ReactNode;
  className?: string;
}

export function InfiniteScroll({
  children,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  loadingComponent = <div className="py-4 text-center">Loading more...</div>,
  className = '',
}: InfiniteScrollProps) {
  const { ref, inView } = useInView({
    threshold: 0,
  });

  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (inView && hasNextPage && !isLoading) {
      // Throttle the load more calls to prevent multiple rapid calls
      if (throttleTimeout.current) return;

      throttleTimeout.current = setTimeout(() => {
        onLoadMore();
        throttleTimeout.current = null;
      }, 500);
    }

    return () => {
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }
    };
  }, [inView, hasNextPage, isLoading, onLoadMore]);

  return (
    <div className={className}>
      {children}
      {(hasNextPage || isLoading) && (
        <div ref={ref} className="w-full">
          {isLoading && loadingComponent}
        </div>
      )}
    </div>
  );
} 