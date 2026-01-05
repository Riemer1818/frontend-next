'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function InvoicesPage() {
  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage outgoing invoices</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Management Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              This page will include invoice creation, editing, and status management.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Backend tRPC router for invoices needs to be created first.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
