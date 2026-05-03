'use client';

import { useParams, useRouter } from 'next/navigation';
import { useInvoice, useUpdateInvoiceStatus, useDeleteInvoice, useGenerateInvoicePdf, useSendInvoiceEmail } from '@/lib/supabase/invoices';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmailPreviewModal, EmailData } from '@/components/email/EmailPreviewModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { ArrowLeft, CheckCircle, FileText, Calendar, ExternalLink, Trash2, Download, Mail } from 'lucide-react';
import Link from 'next/link';
import { getInvoicePdfPath, getPublicUrl } from '@/lib/supabase/storage';
import { useState } from 'react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const { data: invoice, isLoading, error } = useInvoice(id);

  const updateStatusMutation = useUpdateInvoiceStatus();

  const deleteMutation = useDeleteInvoice();

  const generatePdfMutation = useGenerateInvoicePdf();
  const sendEmailMutation = useSendInvoiceEmail();

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState<EmailData | null>(null);

  const handleMarkAsPaid = () => {
    updateStatusMutation.mutate({
      id,
      payment_status: 'paid',
    });
  };

  const handleMarkAsSent = () => {
    // Mark as sent - invoice has been sent to client
    updateStatusMutation.mutate({
      id,
      payment_status: 'sent',
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this invoice? Time entries will be unmarked and available for invoicing again.')) {
      console.log('Deleting invoice:', id);
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          console.log('Invoice deleted successfully, redirecting...');
          router.push('/invoices');
        },
        onError: (error: any) => {
          console.error('Failed to delete invoice:', error);
          alert(`Failed to delete invoice: ${error?.message || 'Unknown error'}`);
        },
      });
    }
  };

  const handleDeleteOld = () => {
    if (confirm('Are you sure you want to delete this invoice? Time entries will be unmarked and available for invoicing again.')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleGeneratePdf = async () => {
    setPdfGenerating(true);
    try {
      const result = await generatePdfMutation.mutateAsync({ id, summarize: true });

      // Download the PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${result.pdf}`;
      link.download = `${invoice?.invoice_number || 'invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      alert(`Failed to generate PDF: ${error.message}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handlePreviewEmail = async () => {
    if (!invoice) return;

    try {
      // Fetch email preview from API
      const result = await sendEmailMutation.mutateAsync({
        id: invoice.id,
        preview: true,
        to: 'riemer.vandervliet@live.nl', // For testing
      });

      if (result.preview && result.email) {
        // Set email data for preview modal
        setEmailPreviewData({
          to: result.email.to,
          cc: result.email.cc,
          subject: result.email.subject,
          bodyText: result.email.text,
          bodyHtml: result.email.html,
          attachments: result.email.attachments,
        });
        setEmailPreviewOpen(true);
      }
    } catch (error: any) {
      alert(`Failed to load email preview: ${error.message}`);
    }
  };

  const handleSendEmailFromPreview = async (emailData: EmailData) => {
    if (!invoice) return;

    try {
      const result = await sendEmailMutation.mutateAsync({
        id: invoice.id,
        to: emailData.to,
        cc: emailData.cc || undefined,
      });

      if (result.success) {
        alert(`Invoice email sent successfully to ${result.sentTo}!`);
        setEmailPreviewOpen(false);
      }
    } catch (error: any) {
      alert(`Failed to send email: ${error.message}`);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading invoice..." />;
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

  const isDraft = invoice.payment_status === 'draft';
  const isSent = invoice.payment_status === 'sent';
  const isPaid = invoice.payment_status === 'paid';
  const isOverdue = invoice.payment_status === 'overdue';
  const isCancelled = invoice.payment_status === 'cancelled';

  const getStatusBadge = () => {
    if (isPaid) {
      return <StatusBadge status="paid">Paid</StatusBadge>;
    }
    if (isOverdue) {
      return <StatusBadge status="overdue">Overdue</StatusBadge>;
    }
    if (isSent) {
      return <StatusBadge status="info">Sent</StatusBadge>;
    }
    if (isCancelled) {
      return <StatusBadge status="neutral">Cancelled</StatusBadge>;
    }
    return <StatusBadge status="draft">Draft</StatusBadge>;
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
              {/* Generate PDF */}
              <Button
                onClick={handleGeneratePdf}
                disabled={pdfGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {pdfGenerating ? 'Generating PDF...' : 'Generate & Download PDF'}
              </Button>

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

              {/* Preview & Send Invoice Email */}
              {isDraft && invoice.pdf_file && (
                <Button
                  onClick={handlePreviewEmail}
                  disabled={sendEmailMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {sendEmailMutation.isPending ? 'Loading Preview...' : 'Preview & Send Email'}
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

        {/* Email Preview Modal */}
        {emailPreviewData && (
          <EmailPreviewModal
            open={emailPreviewOpen}
            onOpenChange={setEmailPreviewOpen}
            emailData={emailPreviewData}
            onSend={handleSendEmailFromPreview}
            sending={sendEmailMutation.isPending}
            title={`Send Invoice ${invoice?.invoice_number}`}
            description="Review and edit the email before sending to the client"
          />
        )}
      </div>
    </MainLayout>
  );
}