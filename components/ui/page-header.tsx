import Link from 'next/link';
import { ReactNode } from 'react';
import { Button } from './button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backLink?: {
    href: string;
    label: string;
  };
  actions?: ReactNode;
}

/**
 * PageHeader - Consistent page header across all detail pages
 *
 * Usage:
 * <PageHeader
 *   title="Project Name"
 *   subtitle="Client Name"
 *   backLink={{ href: '/projects', label: 'Back to Projects' }}
 *   actions={
 *     <>
 *       <Button onClick={handleEdit}>Edit</Button>
 *       <Button variant="ghost" onClick={handleDelete}>Delete</Button>
 *     </>
 *   }
 * />
 */
export function PageHeader({ title, subtitle, backLink, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        {backLink && (
          <Link
            href={backLink.href}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            ← {backLink.label}
          </Link>
        )}
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
