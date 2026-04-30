import { MainLayout } from '@/components/layout/MainLayout';
import { ReactNode } from 'react';

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

/**
 * LoadingState - Consistent loading UI across all pages
 *
 * Usage:
 * if (isLoading) return <LoadingState />;
 * if (isLoading) return <LoadingState message="Loading project details..." />;
 * if (isLoading) return <LoadingState message="Loading..." fullPage={false} />;
 */
export function LoadingState({ message = 'Loading...', fullPage = true }: LoadingStateProps) {
  const content = (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  if (fullPage) {
    return <MainLayout>{content}</MainLayout>;
  }

  return content;
}

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/**
 * EmptyState - Consistent empty state UI
 *
 * Usage:
 * <EmptyState message="No projects found" />
 * <EmptyState
 *   message="No invoices yet"
 *   action={<Button onClick={createNew}>Create Invoice</Button>}
 * />
 */
export function EmptyState({ message, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon}
      <p className="text-muted-foreground mb-4">{message}</p>
      {action}
    </div>
  );
}
