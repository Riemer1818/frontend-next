'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { CheckCircle, XCircle, ArrowLeft, Save, FileText, Trash2 } from 'lucide-react';
import { useExpense, useUpdateExpense, useApproveExpense, useRejectExpense, useUploadExpensePdf, useDeleteExpense } from '@/lib/supabase/expenses';
import { useProjects } from '@/lib/supabase/projects';
import { useExpenseCategories } from '@/lib/supabase/categories';
import { listFiles, getPublicUrl } from '@/lib/supabase/storage';

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [uploadedPdf, setUploadedPdf] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string }>>([]);

  const { data: expense, isLoading } = useExpense(id);
  const { data: projectsData } = useProjects({ status: 'active' });
  const projects = projectsData || [];

  // Load attachments from storage
  useEffect(() => {
    async function loadAttachments() {
      const files = await listFiles('invoice-attachments');
      const expenseFiles = files
        .filter(f => f.name.startsWith(`expense_${id}_`))
        .map(f => ({
          name: f.name.replace(`expense_${id}_`, ''),
          url: getPublicUrl(`invoice-attachments/${f.name}`)
        }));
      setAttachments(expenseFiles);
    }
    if (id) loadAttachments();
  }, [id]);

  const { data: categoriesData } = useExpenseCategories();
  const categories = categoriesData || [];

  const isPendingStatus = expense?.review_status === 'pending';

  const [editedData, setEditedData] = useState({
    supplier_name: '',
    description: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    project_id: null as number | null,
    currency: 'EUR' as string,
    invoice_date: '',
    notes: '',
    category: null as number | null,
  });

  // Update editedData when expense loads
  useEffect(() => {
    if (expense) {
      setEditedData({
        supplier_name: expense.supplier_name,
        description: expense.description || '',
        subtotal: expense.subtotal || 0,
        tax_amount: expense.tax_amount || 0,
        total_amount: expense.total_amount || 0,
        project_id: expense.project_id || null,
        currency: expense.original_currency || 'EUR',
        invoice_date: expense.invoice_date ? format(new Date(expense.invoice_date), 'yyyy-MM-dd') : '',
        notes: expense.notes || '',
        category: expense.category_id || null,
      });
    }
  }, [expense]);

  const approveMutation = useApproveExpense();
  const rejectMutation = useRejectExpense();
  const uploadPdfMutation = useUploadExpensePdf();
  const deleteMutation = useDeleteExpense();

  const handleApprove = async () => {
    // Always approve with the current edited data in review mode
    console.log('🔍 FRONTEND APPROVE: Sending editedData:', editedData);
    try {
      await approveMutation.mutateAsync({
        id,
        edits: editedData as any,
      });
      router.push('/money');
    } catch (error) {
      console.error('Failed to approve expense:', error);
      alert('Failed to approve expense');
    }
  };

  const handleReject = async () => {
    if (confirm('Are you sure you want to reject this expense?')) {
      try {
        await rejectMutation.mutateAsync({ id });
        router.push('/money');
      } catch (error) {
        console.error('Failed to reject expense:', error);
        alert('Failed to reject expense');
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      try {
        await deleteMutation.mutateAsync({ id });
        router.push('/money');
      } catch (error) {
        console.error('Failed to delete expense:', error);
        alert('Failed to delete expense');
      }
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading expense details..." />;
  }

  if (!expense) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Expense not found</p>
        </div>
      </MainLayout>
    );
  }

  const isApproved = expense.review_status === 'approved';
  const isRejected = expense.review_status === 'rejected';

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            title="Expense Details"
            subtitle={`${expense.supplier_name} • ${formatDate(expense.invoice_date)}`}
            backLink={{ href: '/expenses', label: 'Back to Expenses' }}
            actions={
              !isPendingStatus ? (
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => router.push(`/expenses/${id}/edit`)}
                >
                  Edit
                </Button>
              ) : undefined
            }
          />
          <div>
            {isPendingStatus && (
              <StatusBadge status="pending">Pending Review</StatusBadge>
            )}
            {isApproved && (
              <StatusBadge status="approved">Approved</StatusBadge>
            )}
            {isRejected && (
              <StatusBadge status="rejected">Rejected</StatusBadge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expense Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Expense Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Supplier Name */}
              <div>
                <label className="text-sm font-medium text-foreground">Supplier</label>
                <p className="text-foreground mt-1">{expense.supplier_name}</p>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <p className="text-foreground mt-1">{expense.description || '—'}</p>
              </div>

              {/* Project */}
              <div>
                <label className="text-sm font-medium text-foreground">Project</label>
                <p className="text-foreground mt-1">
                  {expense.project_name || '—'}
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-foreground">Category</label>
                <p className="text-foreground mt-1">
                  {(categories as any).find((c: any) => c.id === expense.category_id)?.name || '—'}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-foreground">Notes</label>
                <p className="text-foreground mt-1">{expense.notes || '—'}</p>
              </div>

              {/* Invoice Date */}
              <div>
                <label className="text-sm font-medium text-foreground">Invoice Date</label>
                <p className="text-foreground mt-1">
                  {formatDate(expense.invoice_date, 'MMMM dd, yyyy')}
                </p>
              </div>

              {/* Due Date */}
              {expense.due_date && (
                <div>
                  <label className="text-sm font-medium text-foreground">Due Date</label>
                  <p className="text-foreground mt-1">
                    {formatDate(expense.due_date, 'MMMM dd, yyyy')}
                  </p>
                </div>
              )}

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-foreground">Subtotal</label>
                  <div className="mt-1">
                    {expense.original_currency && expense.original_currency !== 'EUR' ? (
                      <>
                        <p className="text-lg font-bold text-foreground">
                          {expense.original_currency} {(expense.original_subtotal || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ €{(expense.subtotal || 0).toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-foreground">
                        €{(expense.subtotal || 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">VAT</label>
                  <div className="mt-1">
                    {expense.original_currency && expense.original_currency !== 'EUR' ? (
                      <>
                        <p className="text-lg font-bold text-foreground">
                          {expense.original_currency} {(expense.original_tax_amount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ €{(expense.tax_amount || 0).toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-foreground">
                        €{(expense.tax_amount || 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Total</label>
                  <div className="mt-1">
                    {expense.original_currency && expense.original_currency !== 'EUR' ? (
                      <>
                        <p className="text-xl font-bold text-foreground">
                          {expense.original_currency} {(expense.original_amount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ €{expense.total_amount.toFixed(2)} @ {(expense.exchange_rate || 1).toFixed(4)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xl font-bold text-foreground">
                        €{expense.total_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Currency Conversion Info - Show after approval */}
              {expense.original_currency && expense.original_currency !== 'EUR' && (
                <div className="p-4 bg-background border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Currency Conversion</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Exchange rate from {formatDate(expense.invoice_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">
                        {expense.original_currency} {(expense.original_amount || 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        = €{expense.total_amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @ {(expense.exchange_rate || 1).toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Currency Info */}
              {expense.original_currency && expense.original_currency !== 'EUR' && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-foreground">Currency Conversion</label>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-foreground">
                      <span className="font-medium">Original:</span> {expense.original_currency} {(expense.original_amount || 0).toFixed(2)}
                    </p>
                    <p className="text-foreground">
                      <span className="font-medium">Rate:</span> {(expense.exchange_rate || 1).toFixed(4)}
                    </p>
                    {expense.exchange_rate_date && (
                      <p className="text-muted-foreground text-xs">
                        Rate from {formatDate(expense.exchange_rate_date)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Status */}
              {expense.payment_status && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-foreground">Payment Status</label>
                  <p className="text-foreground mt-1 capitalize">{expense.payment_status}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isPendingStatus && (
                <>
                  <Button
                    onClick={() => router.push(`/expenses/${id}/edit`)}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    variant="destructive"
                    className="w-full flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                  <div className="pt-2 border-t">
                    <Button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      variant="outline"
                      className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </>
              )}

              {isApproved && (
                <>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-700 font-medium">This expense has been approved</p>
                    {expense.reviewed_at && (
                      <p className="text-xs text-green-600 mt-1">
                        on {formatDate(expense.reviewed_at)}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t">
                    <Button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      variant="outline"
                      className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </>
              )}

              {isRejected && (
                <>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm text-red-700 font-medium">This expense has been rejected</p>
                    {expense.reviewed_at && (
                      <p className="text-xs text-red-600 mt-1">
                        on {formatDate(expense.reviewed_at)}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t">
                    <Button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      variant="outline"
                      className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Attachments ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {attachments.map((attachment, idx) => (
                <div key={idx}>
                  <h3 className="text-sm font-medium mb-2">{attachment.name}</h3>
                  <div className="bg-secondary rounded-lg overflow-hidden border border-border" style={{ height: '800px' }}>
                    <iframe
                      src={attachment.url}
                      className="w-full h-full"
                      title={attachment.name}
                    />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = attachment.url;
                        a.download = attachment.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(attachment.url, '_blank')}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}