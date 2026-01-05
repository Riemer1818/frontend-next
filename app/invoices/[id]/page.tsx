'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, FileText, Calendar } from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  const utils = trpc.useUtils();

  const { data: invoice, isLoading } = trpc.invoice.getById.useQuery({ id });

  const updateStatusMutation = trpc.invoice.updateStatus.useMutation({
    onSuccess: () => {
      utils.invoice.getById.invalidate({ id });
      utils.reporting.getOutstandingInvoices.invalidate();
      utils.reporting.getDashboardStats.invalidate();
    },
  });

  const handleMarkAsPaid = () => {
    const paidDate = new Date().toISOString().split('T')[0];
    updateStatusMutation.mutate({
      id,
      status: 'paid',
      paidDate,
    });
  };

  const handleMarkAsSent = () => {
    updateStatusMutation.mutate({
      id,
      status: 'sent',
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!invoice) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Invoice not found</p>
        </div>
      </MainLayout>
    );
  }

  const isDraft = invoice.status === 'draft';
  const isSent = invoice.status === 'sent';
  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.status === 'overdue';
  const isCancelled = invoice.status === 'cancelled';

  const getStatusBadge = () => {
    if (isPaid) {
      return <Badge className="bg-green-600">Paid</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (isSent) {
      return <Badge className="bg-blue-600">Sent</Badge>;
    }
    if (isCancelled) {
      return <Badge variant="outline" className="bg-slate-200 text-slate-700">Cancelled</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{invoice.invoice_number}</h1>
              <p className="text-slate-600 mt-1">
                {invoice.client_name || `Client ID: ${invoice.client_id}`}
              </p>
            </div>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client & Project Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Client</label>
                  <p className="text-slate-900 mt-1">
                    {invoice.client_name || `Client ID: ${invoice.client_id}`}
                  </p>
                </div>
                {invoice.project_id && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Project</label>
                    <p className="text-slate-900 mt-1">Project ID: {invoice.project_id}</p>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Invoice Date
                  </label>
                  <p className="text-slate-900 mt-1">
                    {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </label>
                  <p className="text-slate-900 mt-1">
                    {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                {invoice.paid_date && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Paid Date
                    </label>
                    <p className="text-green-600 font-medium mt-1">
                      {format(new Date(invoice.paid_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {invoice.description && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <p className="text-slate-900 mt-1">{invoice.description}</p>
                </div>
              )}

              {/* Amounts */}
              <div className="pt-4 border-t">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-700">Subtotal</span>
                    <span className="font-medium text-slate-900">
                      €{parseFloat(invoice.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">VAT ({invoice.tax_rate}%)</span>
                    <span className="font-medium text-slate-900">
                      €{parseFloat(invoice.tax_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-lg font-bold text-slate-900">Total Amount</span>
                    <span className="text-2xl font-bold text-slate-900">
                      €{parseFloat(invoice.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t text-xs text-slate-500">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {format(new Date(invoice.created_at), 'MMM dd, yyyy HH:mm')}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>{' '}
                  {format(new Date(invoice.updated_at), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Mark as Paid */}
              {!isPaid && !isCancelled && (
                <Button
                  onClick={handleMarkAsPaid}
                  disabled={updateStatusMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark as Paid
                </Button>
              )}

              {/* Mark as Sent */}
              {isDraft && (
                <Button
                  onClick={handleMarkAsSent}
                  disabled={updateStatusMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Mark as Sent
                </Button>
              )}

              {/* Status Message */}
              {isPaid && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-700 font-medium">Invoice has been paid</p>
                  {invoice.paid_date && (
                    <p className="text-xs text-green-600 mt-1">
                      on {format(new Date(invoice.paid_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              )}

              {isOverdue && !isPaid && (
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">This invoice is overdue</p>
                  <p className="text-xs text-red-600 mt-1">
                    Due date was {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}

              {/* Quick Stats */}
              <div className="pt-4 border-t">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Days since issue:</span>
                    <span className="font-medium text-slate-900">
                      {Math.floor(
                        (new Date().getTime() - new Date(invoice.invoice_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}
                    </span>
                  </div>
                  {!isPaid && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Days until due:</span>
                      <span
                        className={`font-medium ${
                          Math.floor(
                            (new Date(invoice.due_date).getTime() - new Date().getTime()) /
                              (1000 * 60 * 60 * 24)
                          ) < 0
                            ? 'text-red-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {Math.floor(
                          (new Date(invoice.due_date).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}