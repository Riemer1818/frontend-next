'use client';

import { useParams, useRouter } from 'next/navigation';
import { useInvoice, useUpdateInvoiceStatus, useDeleteInvoice } from '@/lib/supabase/invoices';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { ArrowLeft, CheckCircle, FileText, Calendar, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getInvoicePdfPath, getPublicUrl } from '@/lib/supabase/storage';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const { data: invoice, isLoading, error } = useInvoice(id);

  const updateStatusMutation = useUpdateInvoiceStatus();

  const deleteMutation = useDeleteInvoice();

  const handleMarkAsPaid = () => {
    updateStatusMutation.mutate({
      id,
      status: 'paid',
    });
  };

  const handleMarkAsSent = () => {
    // Mark as sent by updating to unpaid status (invoice has been sent to client)
    updateStatusMutation.mutate({
      id,
      status: 'unpaid',
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          router.push('/invoices');
        },
      });
    }
  };

  const handleDeleteOld = () => {
    if (confirm('Are you sure you want to delete this invoice? Time entries will be unmarked and available for invoicing again.')) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col h-full items-center justify-center gap-4">
          <p className="text-destructive">Error loading invoice: {error.message}</p>
          <Button onClick={() => router.push('/invoices')}>
            Back to Invoices
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!invoice) {
    return (
      <MainLayout>
        <div className="flex flex-col h-full items-center justify-center gap-4">
          <p className="text-muted-foreground">Invoice #{id} not found</p>
          <Button onClick={() => router.push('/invoices')}>
            Back to Invoices
          </Button>
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
      return <Badge className="bg-primary">Sent</Badge>;
    }
    if (isCancelled) {
      return <Badge variant="outline" className="bg-muted text-foreground">Cancelled</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
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
              <h1 className="text-3xl font-bold text-foreground">{invoice.invoice_number}</h1>
              <p className="text-muted-foreground mt-1">
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
                  <label className="text-sm font-medium text-foreground">Client</label>
                  <Link
                    href={`/companies/${invoice.client_id}`}
                    className="text-primary hover:underline font-medium mt-1 flex items-center gap-1"
                  >
                    {invoice.client_name || `Client ID: ${invoice.client_id}`}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {invoice.client_email && (
                    <p className="text-sm text-muted-foreground mt-1">{invoice.client_email}</p>
                  )}
                  {invoice.client_phone && (
                    <p className="text-sm text-muted-foreground">{invoice.client_phone}</p>
                  )}
                </div>
                {invoice.project_id && (
                  <div>
                    <label className="text-sm font-medium text-foreground">Project</label>
                    <Link
                      href={`/projects/${invoice.project_id}`}
                      className="text-primary hover:underline font-medium mt-1 flex items-center gap-1"
                    >
                      {invoice.project_name || `Project ID: ${invoice.project_id}`}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    {invoice.project_description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {invoice.project_description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Invoice Date
                  </label>
                  <p className="text-foreground mt-1">
                    {formatDate(invoice.invoice_date)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </label>
                  <p className="text-foreground mt-1">
                    {formatDate(invoice.due_date)}
                  </p>
                </div>
                {invoice.paid_date && (
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Paid Date
                    </label>
                    <p className="text-green-600 font-medium mt-1">
                      {formatDate(invoice.paid_date)}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {invoice.description && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <p className="text-foreground mt-1">{invoice.description}</p>
                </div>
              )}

              {/* Amounts */}
              <div className="pt-4 border-t">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">
                      €{parseFloat(String(invoice.subtotal_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground">VAT {invoice.vat_rate ? `(${invoice.vat_rate}%)` : ''}</span>
                    <span className="font-medium text-foreground">
                      €{parseFloat(String(invoice.vat_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-lg font-bold text-foreground">Total Amount</span>
                    <span className="text-2xl font-bold text-foreground">
                      €{parseFloat(String(invoice.total_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {formatDateTime(invoice.created_at)}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>{' '}
                  {formatDateTime(invoice.updated_at)}
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
                  className="w-full bg-primary hover:bg-primary/90 flex items-center gap-2"
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
                      on {formatDate(invoice.paid_date)}
                    </p>
                  )}
                </div>
              )}

              {isOverdue && !isPaid && (
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">This invoice is overdue</p>
                  <p className="text-xs text-red-600 mt-1">
                    Due date was {formatDate(invoice.due_date)}
                  </p>
                </div>
              )}

              {/* Quick Stats */}
              <div className="pt-4 border-t">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days since issue:</span>
                    <span className="font-medium text-foreground">
                      {Math.floor(
                        (new Date().getTime() - new Date(invoice.invoice_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}
                    </span>
                  </div>
                  {!isPaid && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days until due:</span>
                      <span
                        className={`font-medium ${
                          Math.floor(
                            (new Date(invoice.due_date).getTime() - new Date().getTime()) /
                              (1000 * 60 * 60 * 24)
                          ) < 0
                            ? 'text-red-600'
                            : 'text-foreground'
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

              {/* Delete Invoice */}
              {isDraft && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PDF Preview */}
        {invoice.pdf_file && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice PDF
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const pdfPath = getInvoicePdfPath(invoice.invoice_number);
                const pdfUrl = getPublicUrl(pdfPath);
                return (
                  <>
                    <div className="bg-secondary rounded-lg overflow-hidden border border-border" style={{ height: '800px' }}>
                      <iframe
                        src={pdfUrl}
                        className="w-full h-full"
                        title="Invoice PDF"
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = pdfUrl;
                          a.download = `${invoice.invoice_number}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.open(pdfUrl, '_blank');
                        }}
                      >
                        Open in New Tab
                      </Button>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}