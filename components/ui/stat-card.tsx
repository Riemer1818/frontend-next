import { Card, CardContent, CardHeader, CardTitle } from './card';
import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: 'default' | 'primary' | 'warning';
  onClick?: () => void;
}

/**
 * StatCard - Consistent stat card component
 *
 * Replaces repeated pattern:
 * <Card className="bg-card border-border">
 *   <CardHeader>
 *     <CardTitle className="text-foreground text-sm font-medium">Income This Month</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     <p className="text-3xl font-bold text-foreground">€1,234.56</p>
 *     <p className="text-sm text-muted-foreground mt-1">YTD: €10,000</p>
 *   </CardContent>
 * </Card>
 *
 * Usage:
 * <StatCard label="Income This Month" value="€1,234.56" subtitle="YTD: €10,000" />
 * <StatCard
 *   label="VAT to Pay"
 *   value="€500.00"
 *   subtitle="Total outstanding: €1,200"
 *   variant="primary"
 * />
 * <StatCard
 *   label="Uninvoiced Hours"
 *   value="12.5h"
 *   subtitle="€500.00 • Click to invoice"
 *   variant="warning"
 *   onClick={() => router.push('/invoices/new')}
 * />
 */
export function StatCard({
  label,
  value,
  subtitle,
  icon,
  variant = 'default',
  onClick,
}: StatCardProps) {
  const cardClasses =
    variant === 'primary'
      ? 'bg-primary border-primary cursor-default'
      : variant === 'warning'
      ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors'
      : 'bg-card border-border cursor-default';

  const titleClasses =
    variant === 'primary'
      ? 'text-primary-foreground'
      : variant === 'warning'
      ? 'text-amber-900 dark:text-amber-100'
      : 'text-foreground';

  const valueClasses =
    variant === 'primary'
      ? 'text-primary-foreground'
      : variant === 'warning'
      ? 'text-amber-900 dark:text-amber-100'
      : 'text-foreground';

  const subtitleClasses =
    variant === 'primary'
      ? 'text-primary-foreground/80'
      : variant === 'warning'
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-muted-foreground';

  return (
    <Card className={cardClasses} onClick={onClick}>
      <CardHeader>
        <CardTitle className={`${titleClasses} text-sm font-medium flex items-center gap-2`}>
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${valueClasses}`}>
          {value}
        </p>
        {subtitle && (
          <p className={`text-xs ${subtitleClasses} mt-1`}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
