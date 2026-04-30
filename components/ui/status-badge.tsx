import { Badge } from './badge';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusVariants = cva(
  'font-semibold',
  {
    variants: {
      status: {
        // Invoice/Payment statuses
        paid: 'bg-green-600 text-white border-green-600 hover:bg-green-700',
        unpaid: 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700',
        overdue: 'bg-red-600 text-white border-red-600 hover:bg-red-700',
        draft: 'bg-secondary text-secondary-foreground',

        // Expense statuses
        approved: 'bg-green-600 text-white border-green-600 hover:bg-green-700',
        pending: 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700',
        rejected: 'bg-red-600 text-white border-red-600 hover:bg-red-700',

        // Generic statuses
        success: 'bg-green-600 text-white border-green-600 hover:bg-green-700',
        warning: 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700',
        error: 'bg-red-600 text-white border-red-600 hover:bg-red-700',
        info: 'bg-primary text-primary-foreground border-primary',
        neutral: 'bg-secondary text-secondary-foreground border-border',
      },
    },
    defaultVariants: {
      status: 'neutral',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusVariants> {
  children: React.ReactNode;
  className?: string;
}

/**
 * StatusBadge - Semantic status badges with consistent theming
 *
 * Replaces hardcoded color classes like:
 * - `className="bg-green-600 text-white"` → `<StatusBadge status="paid">`
 * - `className="bg-red-600 text-white"` → `<StatusBadge status="overdue">`
 * - `className="bg-amber-600 text-white"` → `<StatusBadge status="pending">`
 *
 * Usage:
 * <StatusBadge status="paid">Paid</StatusBadge>
 * <StatusBadge status="overdue">Overdue</StatusBadge>
 * <StatusBadge status="approved">Approved</StatusBadge>
 */
export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(statusVariants({ status }), className)}>
      {children}
    </Badge>
  );
}
