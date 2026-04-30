# Design System - High Contrast Brutalist Theme

## Overview

This design system follows a **brutalist, high-contrast aesthetic** inspired by the `/website` directory's pure black-and-white approach. The goal is maximum readability and visual clarity in both light and dark modes.

## Core Principles

### 1. **Pure Contrast**
- **Light Mode**: Pure white backgrounds (`#ffffff`) with solid black text/borders (`#000000`)
- **Dark Mode**: Pure black backgrounds (`#000000`) with solid white text/borders (`#ffffff`)
- **NO opacity tricks** on borders or text for better contrast

### 2. **Solid Borders**
- All borders use **solid colors** (no `rgba` transparency)
- Light mode: `--border: #000000`
- Dark mode: `--border: #ffffff`

### 3. **Readable Text**
- Muted text should still be readable:
  - Light mode: `--muted-foreground: #000000` (not gray)
  - Dark mode: `--muted-foreground: #ffffff` (not gray)

### 4. **Accent Colors for Actions**
- Construction-themed rust/amber for CTAs and interactive elements
- Primary: `#c44b2a` (light) / `#d66b4a` (dark)
- Accent: `#d97706` (light) / `#f7b87a` (dark)

## Color Tokens

### Light Mode
```css
--background: #ffffff;        /* Pure white */
--foreground: #000000;        /* Pure black */
--border: #000000;            /* Solid black borders */
--muted: #f5f5f5;             /* Light gray backgrounds */
--muted-foreground: #000000;  /* Black text (readable) */
--card: #ffffff;              /* White cards */
--secondary: #f0f0f0;         /* Light gray */
```

### Dark Mode
```css
--background: #000000;        /* Pure black */
--foreground: #ffffff;        /* Pure white */
--border: #ffffff;            /* Solid white borders */
--muted: #141414;             /* Dark gray backgrounds */
--muted-foreground: #ffffff;  /* White text (readable) */
--card: #0a0a0a;              /* Near-black cards */
--secondary: #1a1a1a;         /* Dark gray */
```

## Component Guidelines

### Cards
```tsx
<Card className="bg-card border-border">
  <CardHeader>
    <CardTitle className="text-foreground">Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-foreground">Content</p>
  </CardContent>
</Card>
```

### Tables
- Use semantic color tokens: `text-foreground`, `border-border`, `bg-card`
- Hover states: `hover:bg-secondary`
- Example:
```tsx
<Table>
  <TableHeader>
    <TableRow className="border-b border-border">
      <TableHead className="text-foreground">Header</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-secondary">
      <TableCell className="text-foreground">Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Charts (Recharts)
**Always use `<ChartWrapper>`** for theme-aware charts:

```tsx
import { ChartWrapper } from '@/components/ui/chart-wrapper';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

<ChartWrapper>
  <ResponsiveContainer width="100%" height={400}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Area type="monotone" dataKey="value" fill="#c44b2a" />
    </AreaChart>
  </ResponsiveContainer>
</ChartWrapper>
```

The `ChartWrapper` automatically:
- Sets correct text/grid/axis colors for dark mode
- Styles tooltips consistently
- Handles theme switching

### Calendars (react-big-calendar)
Calendar styles are globally defined in `app/time-entries/page.tsx`. All calendar elements automatically adapt to dark mode:
- `.rbc-row-segment` - Calendar grid cells
- `.rbc-day-bg` - Day backgrounds
- `.rbc-header` - Month/week headers
- `.rbc-toolbar button` - Navigation buttons

### Network Graphs (EmbeddedGraph / Cytoscape)
The graph component automatically detects theme changes and updates:
- Node colors use `isDark ? visual.color.dark : visual.color.light`
- Canvas background: `#ffffff` (light) / `#000000` (dark)
- Legend backgrounds: pure white/black for maximum contrast
- All borders use solid black/white (no opacity)

**Usage:**
```tsx
import EmbeddedGraph from '@/components/graph/EmbeddedGraph';

<EmbeddedGraph
  entityId={projectId.toString()}
  entityType="project"
  height="500px"
  degrees={2}
  showControls={true}
  showLegend={true}
/>
```

## Files Modified

1. **[app/globals.css](app/globals.css)** - Core theme tokens (lines 61-120)
2. **[app/time-entries/page.tsx](app/time-entries/page.tsx)** - Calendar dark mode styles (lines 341-426)
3. **[components/ui/chart-wrapper.tsx](components/ui/chart-wrapper.tsx)** - Reusable chart theming
4. **[components/graph/EmbeddedGraph.tsx](components/graph/EmbeddedGraph.tsx)** - Graph dark mode support

## Abstraction Strategy

### When to Abstract
- **Third-party components** that don't use our design tokens (charts, calendars, rich text editors)
- **Repeated patterns** across 3+ components

### When NOT to Abstract
- Built-in components already using semantic tokens (Button, Card, Input, etc.)
- One-off styling for unique layouts

## Comparison with `/website`

The `/website` directory achieves perfect brutalism with:
```css
body { background: white; color: black; }
@media (prefers-color-scheme: dark) {
  body { background: black; color: white; }
  * { border-color: white !important; }
}
```

This app replicates that philosophy with:
- Same pure black/white colors
- Solid borders (no opacity)
- Strong visual hierarchy
- Construction-themed accents for personality

## Abstracted Components

To reduce repetition and ensure consistency, use these high-level components:

### PageHeader
Consistent page header for detail pages:
```tsx
import { PageHeader } from '@/components/ui/page-header';

<PageHeader
  title="Project Name"
  subtitle="Client Name"
  backLink={{ href: '/projects', label: 'Back to Projects' }}
  actions={
    <>
      <Button onClick={handleEdit}>Edit</Button>
      <Button variant="ghost" onClick={handleDelete}>Delete</Button>
    </>
  }
/>
```

### LoadingState & EmptyState
Consistent loading and empty states:
```tsx
import { LoadingState, EmptyState } from '@/components/ui/loading-state';

// Loading
if (isLoading) return <LoadingState />;
if (isLoading) return <LoadingState message="Loading projects..." />;

// Empty
<EmptyState message="No projects found" />
<EmptyState
  message="No invoices yet"
  action={<Button>Create Invoice</Button>}
/>
```

### StatusBadge
Semantic status badges (replaces 168 hardcoded color classes!):
```tsx
import { StatusBadge } from '@/components/ui/status-badge';

<StatusBadge status="paid">Paid</StatusBadge>
<StatusBadge status="overdue">Overdue</StatusBadge>
<StatusBadge status="pending">Pending</StatusBadge>
<StatusBadge status="approved">Approved</StatusBadge>
```

Available statuses: `paid`, `unpaid`, `overdue`, `draft`, `approved`, `pending`, `rejected`, `success`, `warning`, `error`, `info`, `neutral`

### StatCard
Consistent stat cards for dashboards:
```tsx
import { StatCard } from '@/components/ui/stat-card';

<StatCard
  label="Income This Month"
  value="€1,234.56"
  subtitle="YTD: €10,000"
/>

<StatCard
  label="VAT to Pay"
  value="€500.00"
  subtitle="Q1 2025"
  variant="primary"
/>

<StatCard
  label="Uninvoiced Hours"
  value="12.5h"
  subtitle="Click to invoice"
  variant="warning"
  onClick={() => router.push('/invoices/new')}
/>
```

## Migration Checklist

When adding new components:
- [ ] Use semantic color tokens (`text-foreground`, `bg-card`, `border-border`)
- [ ] Avoid hardcoded colors like `bg-gray-100` or `text-red-600`
- [ ] Use `<StatusBadge>` instead of hardcoded badge colors
- [ ] Use `<PageHeader>` for detail page headers
- [ ] Use `<LoadingState>` and `<EmptyState>` for consistent UX
- [ ] Use `<StatCard>` for dashboard metrics
- [ ] Test in both light and dark mode
- [ ] For charts, wrap with `<ChartWrapper>`
- [ ] For third-party UI, add dark mode styles globally or in component

## Resources

- [Tailwind CSS Variables](https://tailwindcss.com/docs/customizing-colors#using-css-variables)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- Website reference: `../website/src/app/globals.css`
