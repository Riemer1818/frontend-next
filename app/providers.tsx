'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '@/components/theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer, less refetching
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Don't refetch on component mount if data exists
        retry: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="riemer-fyi-theme">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
