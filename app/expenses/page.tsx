'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

export default function ExpenseReviewPage() {
  // TODO: Uncomment when expense router is created in backend
  // const utils = trpc.useUtils();
  // const { data: pendingExpenses, isLoading } = trpc.expense.getPending.useQuery();

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Review Expenses</h1>
          <p className="text-slate-500 mt-1">Approve or reject incoming invoices</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Review Workflow Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              This page will include the expense approval workflow shown in the handoff document.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Backend tRPC router for incoming invoices needs to be created first.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              See the complete implementation in the handoff document section 3.3.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
