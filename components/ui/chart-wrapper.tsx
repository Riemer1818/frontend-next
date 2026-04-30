'use client';

import { useTheme } from 'next-themes';
import { ReactNode } from 'react';

interface ChartWrapperProps {
  children: ReactNode;
}

/**
 * ChartWrapper - High-contrast theme-aware wrapper for Recharts
 *
 * Wraps Recharts components and provides consistent colors that work in both light/dark modes.
 * Usage: Wrap your ResponsiveContainer with this component.
 *
 * Example:
 * <ChartWrapper>
 *   <ResponsiveContainer width="100%" height={400}>
 *     <AreaChart data={data}>
 *       <CartesianGrid strokeDasharray="3 3" />
 *       ...
 *     </AreaChart>
 *   </ResponsiveContainer>
 * </ChartWrapper>
 */
export function ChartWrapper({ children }: ChartWrapperProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        // CSS variables for Recharts components to use
        '--chart-text': isDark ? '#ffffff' : '#000000',
        '--chart-grid': isDark ? '#ffffff' : '#000000',
        '--chart-axis': isDark ? '#ffffff' : '#000000',
        '--chart-background': isDark ? '#000000' : '#ffffff',
      } as React.CSSProperties}
      className="w-full"
    >
      <style jsx global>{`
        /* Recharts dark mode overrides */
        .recharts-cartesian-axis-tick text,
        .recharts-label,
        .recharts-legend-item-text {
          fill: var(--chart-text) !important;
        }
        .recharts-cartesian-grid line {
          stroke: var(--chart-grid) !important;
          opacity: 0.2 !important;
        }
        .recharts-cartesian-axis-line {
          stroke: var(--chart-axis) !important;
        }
        .recharts-tooltip-wrapper {
          outline: none !important;
        }
        .recharts-default-tooltip {
          background-color: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px !important;
          padding: 10px !important;
        }
        .recharts-tooltip-label {
          color: hsl(var(--foreground)) !important;
          font-weight: 600 !important;
          margin-bottom: 4px !important;
        }
        .recharts-tooltip-item {
          color: hsl(var(--foreground)) !important;
        }
      `}</style>
      {children}
    </div>
  );
}

/**
 * Get theme-appropriate colors for chart elements
 */
export function useChartColors() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return {
    text: isDark ? '#ffffff' : '#000000',
    grid: isDark ? '#ffffff' : '#000000',
    axis: isDark ? '#ffffff' : '#000000',
    background: isDark ? '#000000' : '#ffffff',
    gridOpacity: 0.2,
  };
}
