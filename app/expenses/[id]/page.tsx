'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CheckCircle, XCircle, ArrowLeft, Save, FileText } from 'lucide-react';
import { useExpense, useUpdateExpense, useApproveExpense, useRejectExpense, useUploadExpensePdf } from '@/lib/supabase/expenses';
import { useProjects } from '@/lib/supabase/projects';

// TODO: Migrate to Supabase hooks
// Missing hooks:
// - useExpenseCategories (need to create)

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [isEditing, setIsEditing] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<string | null>(null);

  const { data: expense, isLoading } = useExpense(id);
  const { data: projectsData } = useProjects({ status: 'active' });
  const projects = projectsData || [];

  // TODO: Replace with useExpenseCategories once created
  const categories: any[] = [];

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
  const updateMutation = useUpdateExpense();

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (expense) {
      setEditedData({
        supplier_name: expense.supplier_name,
        description: expense.description || '',
        subtotal: expense.original_subtotal || expense.subtotal || 0,
        tax_amount: expense.original_tax_amount || expense.tax_amount || 0,
        total_amount: expense.original_amount || expense.total_amount || 0,
        project_id: expense.project_id || null,
        currency: expense.original_currency || 'EUR',
        invoice_date: expense.invoice_date ? format(new Date(expense.invoice_date), 'yyyy-MM-dd') : '',
        notes: expense.notes || '',
        category: expense.category_id || null,
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: editedData as any,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update expense:', error);
      alert('Failed to update expense');
    }
  };

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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
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
              <h1 className="text-3xl font-bold text-foreground">Expense Details</h1>
              <p className="text-muted-foreground mt-1">
                {expense.supplier_name} • {format(new Date(expense.invoice_date), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isPendingStatus && (
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
                <label className="text-sm font-medium text-foreground">Supplier</label>
                {isEditing ? (
                  <Input
                    value={editedData.supplier_name}
                    onChange={(e) =>
                      setEditedData({ ...editedData, supplier_name: e.target.value })
                    }
                    className="mt-1"
                  />
                ) : (
                  <p className="text-foreground mt-1">{expense.supplier_name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
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
                  <p className="text-foreground mt-1">{expense.description || '—'}</p>
                )}
              </div>

              {/* Project */}
              <div>
                <label className="text-sm font-medium text-foreground">Project</label>
                {isEditing ? (
                  <Select
                    value={editedData.project_id.toString() || 'none'}
                    onValueChange={(value) =>
                      setEditedData({ ...editedData, project_id: value === 'none' ? null : parseInt(value) })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground mt-1">
                    {expense.project_name || '—'}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-foreground">Category</label>
                {isEditing ? (
                  <Select
                    value={editedData.category.toString() || 'none'}
                    onValueChange={(value) =>
                      setEditedData({ ...editedData, category: value === 'none' ? null : parseInt(value) })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground mt-1">
                    {(categories as any).find((c: any) => c.id === expense.category_id).name || '—'}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-foreground">Notes</label>
                {isEditing ? (
                  <Textarea
                    value={editedData.notes}
                    onChange={(e) =>
                      setEditedData({ ...editedData, notes: e.target.value })
                    }
                    className="mt-1"
                    rows={2}
                    placeholder="e.g. reis- en verblijfkosten"
                  />
                ) : (
                  <p className="text-foreground mt-1">{expense.notes || '—'}</p>
                )}
              </div>

              {/* Invoice Date */}
              <div>
                <label className="text-sm font-medium text-foreground">Invoice Date</label>
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
                  <p className="text-foreground mt-1">
                    {format(new Date(expense.invoice_date), 'MMMM dd, yyyy')}
                  </p>
                )}
              </div>

              {/* Due Date */}
              {expense.due_date && (
                <div>
                  <label className="text-sm font-medium text-foreground">Due Date</label>
                  <p className="text-foreground mt-1">
                    {format(new Date(expense.due_date), 'MMMM dd, yyyy')}
                  </p>
                </div>
              )}

              {/* Currency Selector - Only in edit mode */}
              {isEditing && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-foreground">Currency</label>
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
                      <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
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
                  <label className="text-sm font-medium text-foreground">Subtotal</label>
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
                      <span className="text-muted-foreground min-w-[3rem] text-sm">{editedData.currency}</span>
                    </div>
                  ) : (
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
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">VAT</label>
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
                      <span className="text-muted-foreground min-w-[3rem] text-sm">{editedData.currency}</span>
                    </div>
                  ) : (
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
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Total</label>
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
                      <span className="text-muted-foreground min-w-[3rem] text-sm">{editedData.currency}</span>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>

              {/* Currency Conversion Info - Show after approval */}
              {!isEditing && expense.original_currency && expense.original_currency !== 'EUR' && (
                <div className="p-4 bg-background border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Currency Conversion</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Exchange rate from {format(new Date(expense.invoice_date), 'MMM dd, yyyy')}
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
                        Rate from {format(new Date(expense.exchange_rate_date), 'MMM dd, yyyy')}
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
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Document</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expense.invoice_file ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {expense.invoice_file_name || 'Invoice Document'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {expense.invoice_file_type}
                    </p>
                  </div>
                  <Badge variant="default">Invoice</Badge>
                </div>
                <iframe
                  src={`data:${expense.invoice_file_type};base64,${expense.invoice_file}`}
                  className="w-full h-[600px] border border-border rounded"
                  title={expense.invoice_file_name || 'Invoice'}
                />
              </div>
            ) : uploadedPdf || expense.invoice_file_base64 ? (
              <div className="space-y-4">
                <iframe
                  src={`data:application/pdf;base64,${uploadedPdf || expense.invoice_file_base64}`}
                  className="w-full h-[600px] border border-border rounded"
                  title="Invoice PDF"
                />
                {uploadPdfMutation.isPending && (
                  <p className="text-sm text-primary text-center">Saving PDF...</p>
                )}
                {uploadPdfMutation.isError && (
                  <p className="text-sm text-red-600 text-center">
                    Error: {uploadPdfMutation.error.message || 'Failed to save PDF'}
                  </p>
                )}
                {uploadPdfMutation.isSuccess && (
                  <p className="text-sm text-green-600 text-center">✓ PDF saved successfully</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center h-[300px] bg-background rounded border-2 border-dashed border-border">
                  <FileText className="h-12 w-12 text-slate-400 mb-2" />
                  <p className="text-muted-foreground font-medium">No PDF attached</p>
                  <p className="text-sm text-muted-foreground mt-1">Upload a PDF to view it here</p>
                </div>
                <div>
                  <label htmlFor="pdf-upload" className="block text-sm font-medium text-foreground mb-2">
                    Upload Invoice PDF
                  </label>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.type === 'application/pdf') {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const base64 = reader.result.toString().split(',')[1];
                          if (base64) {
                            setUploadedPdf(base64);
                            // Auto-save PDF immediately
                            uploadPdfMutation.mutate({ id, pdfBase64: base64 });
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-secondary file:text-primary
                      hover:file:bg-secondary hover:file:text-foreground
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