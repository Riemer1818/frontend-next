'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CheckCircle, XCircle, ArrowLeft, Save, FileText } from 'lucide-react';

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<string | null>(null);

  const { data: expense, isLoading } = trpc.expense.getById.useQuery({ id });
  const { data: projects } = trpc.project.getAll.useQuery({ status: 'active' });

  // Auto-enable edit mode for pending expenses (review mode)
  const isPendingStatus = expense?.review_status === 'pending';

  // Auto-enable editing for pending expenses
  useEffect(() => {
    if (isPendingStatus) {
      setIsEditing(true);
    }
  }, [isPendingStatus]);

  const [editedData, setEditedData] = useState({
    supplier_name: '',
    description: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    project_id: null as number | null,
    currency: 'EUR' as string,
    invoice_date: '',
  });

  // Update editedData when expense loads
  useEffect(() => {
    if (expense) {
      setEditedData({
        supplier_name: expense.supplier_name,
        description: expense.description || '',
        subtotal: parseFloat(expense.original_subtotal || expense.subtotal),
        tax_amount: parseFloat(expense.original_tax_amount || expense.tax_amount),
        total_amount: parseFloat(expense.original_amount || expense.total_amount),
        project_id: expense.project_id || null,
        currency: expense.original_currency || 'EUR',
        invoice_date: expense.invoice_date ? format(new Date(expense.invoice_date), 'yyyy-MM-dd') : '',
      });
    }
  }, [expense]);

  const approveMutation = trpc.expense.approve.useMutation({
    onSuccess: () => {
      utils.expense.getById.invalidate({ id });
      utils.expense.getPending.invalidate();
      utils.reporting.getDashboardStats.invalidate();
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

  const updateMutation = trpc.expense.approve.useMutation({
    onSuccess: () => {
      utils.expense.getById.invalidate({ id });
      utils.expense.getPending.invalidate();
      utils.reporting.getDashboardStats.invalidate();
      setIsEditing(false);
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (expense) {
      setEditedData({
        supplier_name: expense.supplier_name,
        description: expense.description || '',
        subtotal: parseFloat(expense.original_subtotal || expense.subtotal),
        tax_amount: parseFloat(expense.original_tax_amount || expense.tax_amount),
        total_amount: parseFloat(expense.original_amount || expense.total_amount),
        project_id: expense.project_id || null,
        currency: expense.original_currency || 'EUR',
        invoice_date: expense.invoice_date ? format(new Date(expense.invoice_date), 'yyyy-MM-dd') : '',
      });
    }
    setIsEditing(false);
  };

  const handleSave = () => {
    updateMutation.mutate({
      id,
      edits: editedData,
    });
  };

  const handleApprove = () => {
    // Always approve with the current edited data in review mode
    console.log('🔍 FRONTEND APPROVE: Sending editedData:', editedData);
    approveMutation.mutate({
      id,
      edits: editedData,
    });
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
                {expense.language && <span> • {expense.language.toUpperCase()}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isPendingStatus && (
              <Button
                className="bg-blue-900 hover:bg-blue-800 text-white"
                onClick={() => router.push(`/expenses/${id}/edit`)}
              >
                Edit
              </Button>
            )}
          </div>
          <div>
            {isPendingStatus && (
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

              {/* Project */}
              <div>
                <label className="text-sm font-medium text-slate-700">Project</label>
                {isEditing ? (
                  <Select
                    value={editedData.project_id?.toString() || 'none'}
                    onValueChange={(value) =>
                      setEditedData({ ...editedData, project_id: value === 'none' ? null : parseInt(value) })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects?.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-slate-900 mt-1">
                    {expense.project_name || '—'}
                  </p>
                )}
              </div>

              {/* Invoice Date */}
              <div>
                <label className="text-sm font-medium text-slate-700">Invoice Date</label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedData.invoice_date}
                    onChange={(e) =>
                      setEditedData({ ...editedData, invoice_date: e.target.value })
                    }
                    className="mt-1"
                  />
                ) : (
                  <p className="text-slate-900 mt-1">
                    {format(new Date(expense.invoice_date), 'MMMM dd, yyyy')}
                  </p>
                )}
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

              {/* Currency Selector - Only in edit mode */}
              {isEditing && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-slate-700">Currency</label>
                  <Select
                    value={editedData.currency}
                    onValueChange={(value) => setEditedData({ ...editedData, currency: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">€ EUR (Euro)</SelectItem>
                      <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                      <SelectItem value="GBP">£ GBP (British Pound)</SelectItem>
                      <SelectItem value="SGD">S$ SGD (Singapore Dollar)</SelectItem>
                      <SelectItem value="JPY">¥ JPY (Japanese Yen)</SelectItem>
                      <SelectItem value="CHF">CHF (Swiss Franc)</SelectItem>
                      <SelectItem value="CAD">C$ CAD (Canadian Dollar)</SelectItem>
                      <SelectItem value="AUD">A$ AUD (Australian Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-slate-700">Subtotal</label>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={editedData.subtotal}
                        onChange={(e) =>
                          setEditedData({ ...editedData, subtotal: parseFloat(e.target.value) })
                        }
                      />
                      <span className="text-slate-600 min-w-[3rem] text-sm">{editedData.currency}</span>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {expense.original_currency && expense.original_currency !== 'EUR' ? (
                        <>
                          <p className="text-lg font-bold text-slate-900">
                            {expense.original_currency} {parseFloat(expense.original_subtotal || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            ≈ €{parseFloat(expense.subtotal).toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p className="text-lg font-bold text-slate-900">
                          €{parseFloat(expense.subtotal).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">VAT</label>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={editedData.tax_amount}
                        onChange={(e) =>
                          setEditedData({ ...editedData, tax_amount: parseFloat(e.target.value) })
                        }
                      />
                      <span className="text-slate-600 min-w-[3rem] text-sm">{editedData.currency}</span>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {expense.original_currency && expense.original_currency !== 'EUR' ? (
                        <>
                          <p className="text-lg font-bold text-slate-900">
                            {expense.original_currency} {parseFloat(expense.original_tax_amount || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            ≈ €{parseFloat(expense.tax_amount).toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p className="text-lg font-bold text-slate-900">
                          €{parseFloat(expense.tax_amount).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Total</label>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={editedData.total_amount}
                        onChange={(e) =>
                          setEditedData({ ...editedData, total_amount: parseFloat(e.target.value) })
                        }
                      />
                      <span className="text-slate-600 min-w-[3rem] text-sm">{editedData.currency}</span>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {expense.original_currency && expense.original_currency !== 'EUR' ? (
                        <>
                          <p className="text-xl font-bold text-slate-900">
                            {expense.original_currency} {parseFloat(expense.original_amount || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            ≈ €{parseFloat(expense.total_amount).toFixed(2)} @ {parseFloat(expense.exchange_rate || 1).toFixed(4)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xl font-bold text-slate-900">
                          €{parseFloat(expense.total_amount).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Currency Conversion Info - Show after approval */}
              {!isEditing && expense.original_currency && expense.original_currency !== 'EUR' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Currency Conversion</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Exchange rate from {format(new Date(expense.invoice_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        {expense.original_currency} {parseFloat(expense.original_amount || 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        = €{parseFloat(expense.total_amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        @ {parseFloat(expense.exchange_rate || 1).toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Currency Info */}
              {expense.original_currency && expense.original_currency !== 'EUR' && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-slate-700">Currency Conversion</label>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-slate-700">
                      <span className="font-medium">Original:</span> {expense.original_currency} {parseFloat(expense.original_amount || 0).toFixed(2)}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-medium">Rate:</span> {parseFloat(expense.exchange_rate || 1).toFixed(4)}
                    </p>
                    {expense.exchange_rate_date && (
                      <p className="text-slate-500 text-xs">
                        Rate from {format(new Date(expense.exchange_rate_date), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              )}

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
              {isPendingStatus && (
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

        {/* PDF Viewer */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Attachments {expense.attachments && expense.attachments.length > 0 && `(${expense.attachments.length})`}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expense.attachments && expense.attachments.length > 0 ? (
              <div className="space-y-6">
                {expense.attachments.map((attachment: any, index: number) => (
                  <div key={attachment.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {attachment.file_name}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {attachment.attachment_type} • {(attachment.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Badge variant={attachment.attachment_type === 'invoice' ? 'default' : 'secondary'}>
                        {attachment.attachment_type}
                      </Badge>
                    </div>
                    <iframe
                      src={`data:${attachment.file_type};base64,${attachment.file_data}`}
                      className="w-full h-[600px] border border-slate-200 rounded"
                      title={attachment.file_name}
                    />
                  </div>
                ))}
              </div>
            ) : uploadedPdf || expense.invoice_file_base64 ? (
              <div className="space-y-4">
                <iframe
                  src={`data:application/pdf;base64,${uploadedPdf || expense.invoice_file_base64}`}
                  className="w-full h-[600px] border border-slate-200 rounded"
                  title="Invoice PDF"
                />
                {uploadPdfMutation.isPending && (
                  <p className="text-sm text-blue-600 text-center">Saving PDF...</p>
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
                            // Auto-save PDF immediately
                            uploadPdfMutation.mutate({ id, pdfBase64: base64 });
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
      </div>
    </MainLayout>
  );
}