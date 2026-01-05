'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">Financial reports and analytics</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Reports & Charts Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              This page will include P&L reports, VAT summaries, and financial charts with Recharts.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Additional reporting endpoints needed in backend tRPC router.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
