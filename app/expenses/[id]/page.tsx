'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Edit2, ArrowLeft, Save, X, FileText } from 'lucide-react';

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    supplier_name: '',
    description: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });
  const [uploadedPdf, setUploadedPdf] = useState<string | null>(null);

  const { data: expense, isLoading } = trpc.expense.getById.useQuery({ id });

  const approveMutation = trpc.expense.approve.useMutation({
    onSuccess: () => {
      utils.expense.getById.invalidate({ id });
      utils.expense.getPending.invalidate();
      utils.reporting.getDashboardStats.invalidate();
      setIsEditing(false);
      router.push('/money');
    },
  });

  const rejectMutation = trpc.expense.reject.useMutation({
    onSuccess: () => {
      utils.expense.getById.invalidate({ id });
      utils.expense.getPending.invalidate();
      utils.reporting.getDashboardStats.invalidate();
      router.push('/money');
    },
  });

  const uploadPdfMutation = trpc.expense.uploadPdf.useMutation({
    onSuccess: () => {
      utils.expense.getById.invalidate({ id });
    },
  });

  const handleEdit = () => {
    if (expense) {
      setEditedData({
        supplier_name: expense.supplier_name,
        description: expense.description || '',
        subtotal: parseFloat(expense.subtotal),
        tax_amount: parseFloat(expense.tax_amount),
        total_amount: parseFloat(expense.total_amount),
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleApprove = () => {
    if (isEditing) {
      // Approve with edits
      approveMutation.mutate({
        id,
        edits: editedData,
      });
    } else {
      // Approve without edits
      approveMutation.mutate({ id });
    }
  };

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this expense?')) {
      rejectMutation.mutate({ id });
    }
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

  if (!expense) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Expense not found</p>
        </div>
      </MainLayout>
    );
  }

  const isPending = expense.review_status === 'pending';
  const isApproved = expense.review_status === 'approved';
  const isRejected = expense.review_status === 'rejected';

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
              <h1 className="text-3xl font-bold text-slate-900">Expense Details</h1>
              <p className="text-slate-600 mt-1">
                {expense.supplier_name} • {format(new Date(expense.invoice_date), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
          <div>
            {isPending && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Pending Review
              </Badge>
            )}
            {isApproved && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Approved
              </Badge>
            )}
            {isRejected && (
              <Badge variant="destructive">Rejected</Badge>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle>Invoice PDF</CardTitle>
          </CardHeader>
          <CardContent>
{uploadedPdf || expense.invoice_file_base64 ? (
              <div className="space-y-4">
                <iframe
                  src={`data:application/pdf;base64,${uploadedPdf || expense.invoice_file_base64}`}
                  className="w-full h-[600px] border border-slate-200 rounded"
                  title="Invoice PDF"
                />
                {uploadedPdf && !expense.invoice_file_base64 && (
                  <Button
                    onClick={() => {
                      console.log('Uploading PDF, length:', uploadedPdf.length);
                      uploadPdfMutation.mutate({ id, pdfBase64: uploadedPdf });
                    }}
                    disabled={uploadPdfMutation.isPending}
                    className="w-full bg-blue-900 hover:bg-blue-800"
                  >
                    {uploadPdfMutation.isPending ? 'Saving PDF...' : 'Save PDF to Database'}
                  </Button>
                )}
                {uploadPdfMutation.isError && (
                  <p className="text-sm text-red-600 text-center">
                    Error: {uploadPdfMutation.error?.message || 'Failed to save PDF'}
                  </p>
                )}
                {uploadPdfMutation.isSuccess && (
                  <p className="text-sm text-green-600 text-center">✓ PDF saved successfully</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center h-[300px] bg-slate-50 rounded border-2 border-dashed border-slate-300">
                  <FileText className="h-12 w-12 text-slate-400 mb-2" />
                  <p className="text-slate-600 font-medium">No PDF attached</p>
                  <p className="text-sm text-slate-500 mt-1">Upload a PDF to view it here</p>
                </div>
                <div>
                  <label htmlFor="pdf-upload" className="block text-sm font-medium text-slate-700 mb-2">
                    Upload Invoice PDF
                  </label>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.type === 'application/pdf') {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const base64 = reader.result?.toString().split(',')[1];
                          if (base64) {
                            setUploadedPdf(base64);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      cursor-pointer"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expense Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Expense Information</span>
                {isPending && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Supplier Name */}
              <div>
                <label className="text-sm font-medium text-slate-700">Supplier</label>
                {isEditing ? (
                  <Input
                    value={editedData.supplier_name}
                    onChange={(e) =>
                      setEditedData({ ...editedData, supplier_name: e.target.value })
                    }
                    className="mt-1"
                  />
                ) : (
                  <p className="text-slate-900 mt-1">{expense.supplier_name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                {isEditing ? (
                  <Textarea
                    value={editedData.description}
                    onChange={(e) =>
                      setEditedData({ ...editedData, description: e.target.value })
                    }
                    className="mt-1"
                    rows={3}
                  />
                ) : (
                  <p className="text-slate-900 mt-1">{expense.description || '—'}</p>
                )}
              </div>

              {/* Invoice Date */}
              <div>
                <label className="text-sm font-medium text-slate-700">Invoice Date</label>
                <p className="text-slate-900 mt-1">
                  {format(new Date(expense.invoice_date), 'MMMM dd, yyyy')}
                </p>
              </div>

              {/* Due Date */}
              {expense.due_date && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Due Date</label>
                  <p className="text-slate-900 mt-1">
                    {format(new Date(expense.due_date), 'MMMM dd, yyyy')}
                  </p>
                </div>
              )}

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-slate-700">Subtotal</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.subtotal}
                      onChange={(e) =>
                        setEditedData({ ...editedData, subtotal: parseFloat(e.target.value) })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      €{parseFloat(expense.subtotal).toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">VAT</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.tax_amount}
                      onChange={(e) =>
                        setEditedData({ ...editedData, tax_amount: parseFloat(e.target.value) })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      €{parseFloat(expense.tax_amount).toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Total</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.total_amount}
                      onChange={(e) =>
                        setEditedData({ ...editedData, total_amount: parseFloat(e.target.value) })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      €{parseFloat(expense.total_amount).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Status */}
              {expense.payment_status && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-slate-700">Payment Status</label>
                  <p className="text-slate-900 mt-1 capitalize">{expense.payment_status}</p>
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
              {isPending && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 flex items-center gap-2"
                  >
                    {isEditing ? <Save className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    {isEditing ? 'Save & Approve' : 'Approve'}
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
                </>
              )}

              {isApproved && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-700 font-medium">This expense has been approved</p>
                  {expense.reviewed_at && (
                    <p className="text-xs text-green-600 mt-1">
                      on {format(new Date(expense.reviewed_at), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              )}

              {isRejected && (
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-red-700 font-medium">This expense has been rejected</p>
                  {expense.reviewed_at && (
                    <p className="text-xs text-red-600 mt-1">
                      on {format(new Date(expense.reviewed_at), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}