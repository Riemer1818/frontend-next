'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCreateExpense, useUploadExpensePdf } from '@/lib/supabase/expenses';
import { useProjects } from '@/lib/supabase/projects';
import { useCompanies } from '@/lib/supabase/companies';
import { useExpenseCategories } from '@/lib/supabase/categories';
import { extractInvoiceFromPdf } from '@/app/actions/extract-invoice';

export default function NewExpensePage() {
  const router = useRouter();
  const [uploadMethod, setUploadMethod] = useState<'pdf' | 'manual'>('pdf');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const { data: projectsData } = useProjects({ status: 'active' });
  const projects = projectsData || [];

  const { data: categoriesData } = useExpenseCategories();
  const categories = categoriesData || [];

  const [formData, setFormData] = useState({
    supplier_name: '',
    description: '',
    invoice_date: new Date().toISOString().split('T')[0],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    project_id: null as number | null,
    currency: 'EUR' as string,
    notes: '',
    category: null as number | null,
    deductibility_percentage: 100,
  });

  const createExpenseMutation = useCreateExpense();
  const uploadPdfMutation = useUploadExpensePdf();

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInvoiceFile(file);
    setIsExtracting(true);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setInvoicePreview(previewUrl);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data URL prefix

        // Call server action to extract data from PDF or image
        const result = await extractInvoiceFromPdf(base64);

        if ('data' in result && result.success) {
          // Pre-fill form with extracted data
          setFormData({
            ...formData,
            supplier_name: result.data.supplier_name || '',
            description: result.data.description || '',
            invoice_date: result.data.invoice_date || formData.invoice_date,
            subtotal: result.data.subtotal || 0,
            tax_amount: result.data.tax_amount || 0,
            total_amount: result.data.total_amount || 0,
            currency: result.data.currency || 'EUR',
          });
        } else if ('error' in result) {
          alert(`Failed to extract invoice data: ${result.error}`);
        }

        setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to read file:', error);
      alert('Failed to read file');
      setIsExtracting(false);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreview(previewUrl);
  };

  const { data: companiesData } = useCompanies();
  const companies = companiesData || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Find or create the supplier company
    let supplierId: number | null = null;
    try {
      const response = await fetch('/api/trpc/company.findOrCreate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.supplier_name,
          type: 'supplier',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to find or create company');
      }

      const result = await response.json();
      supplierId = result.result.data.id;
    } catch (error) {
      console.error('Failed to find or create company:', error);
      alert('Failed to find or create supplier company. Please try again.');
      return;
    }

    try {
      const result = await createExpenseMutation.mutateAsync({
        supplier_id: supplierId,
        invoice_date: formData.invoice_date,
        description: formData.description || null,
        subtotal: formData.subtotal,
        tax_amount: formData.tax_amount,
        total_amount: formData.total_amount,
        project_id: formData.project_id,
        category_id: formData.category,
        notes: formData.notes || null,
        review_status: 'pending' as const,
      });

      if (result) {
        // Upload invoice file if one was selected
        if (invoiceFile) {
          try {
            await uploadPdfMutation.mutateAsync({
              expenseId: result.id,
              file: invoiceFile,
            });
          } catch (uploadError) {
            console.error('Failed to upload invoice:', uploadError);
            alert('Expense created but invoice upload failed.');
          }
        }

        // Upload receipt file if one was selected
        if (receiptFile) {
          try {
            await uploadPdfMutation.mutateAsync({
              expenseId: result.id,
              file: receiptFile,
            });
          } catch (uploadError) {
            console.error('Failed to upload receipt:', uploadError);
            alert('Expense created but receipt upload failed.');
          }
        }

        router.push(`/expenses/${result.id}`);
      }
    } catch (error) {
      console.error('Failed to create expense:', error);
      alert('Failed to create expense. Please try again.');
    }
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div>
          <Link href="/money" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
            ← Back to Money Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Add Incoming Invoice</h1>
          <p className="text-muted-foreground mt-1">Upload a PDF or enter details manually</p>
        </div>

        {/* Upload Method Selector */}
        <div className="flex gap-4">
          <button
            onClick={() => setUploadMethod('pdf')}
            className={`flex-1 p-4 rounded-lg border-2 transition ${
              uploadMethod === 'pdf'
                ? 'border-primary bg-secondary'
                : 'border-border bg-card hover:border-border'
            }`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-foreground">Upload PDF</p>
            <p className="text-sm text-muted-foreground mt-1">Auto-extract invoice data</p>
          </button>

          <button
            onClick={() => setUploadMethod('manual')}
            className={`flex-1 p-4 rounded-lg border-2 transition ${
              uploadMethod === 'manual'
                ? 'border-primary bg-secondary'
                : 'border-border bg-card hover:border-border'
            }`}
          >
            <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-foreground">Manual Entry</p>
            <p className="text-sm text-muted-foreground mt-1">Fill out form manually</p>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invoice Upload (PDF or Image) */}
              {uploadMethod === 'pdf' && (
                <div>
                  <Label className="text-foreground mb-2 block">Invoice (PDF or Image)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6">
                    <div className="text-center">
                      {!invoiceFile ? (
                        <label htmlFor="invoice-upload" className="cursor-pointer">
                          <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                          <p className="text-sm font-medium text-foreground">Click to upload invoice</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG supported</p>
                          <input
                            id="invoice-upload"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleInvoiceUpload}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div>
                          <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
                          <p className="text-sm font-medium text-foreground">{invoiceFile.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{(invoiceFile.size / 1024).toFixed(1)} KB</p>
                          {isExtracting && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              <span className="text-sm text-muted-foreground">Extracting invoice data...</span>
                            </div>
                          )}
                          {!isExtracting && (
                            <p className="text-sm text-green-600 mt-4">
                              ✅ Data extracted! Review and submit.
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setInvoiceFile(null);
                              setInvoicePreview(null);
                            }}
                            className="mt-4"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Attachment Upload - Always visible for manual mode, or as receipt for PDF mode */}
              <div>
                <Label className="text-foreground mb-2 block">
                  {uploadMethod === 'manual' ? 'Attachment (Optional)' : 'Receipt (Optional)'}
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6">
                  <div className="text-center">
                    {!receiptFile ? (
                      <label htmlFor="receipt-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm font-medium text-foreground">Add receipt</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG</p>
                        <input
                          id="receipt-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleReceiptUpload}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div>
                        <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-medium text-foreground">{receiptFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{(receiptFile.size / 1024).toFixed(1)} KB</p>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptPreview(null);
                          }}
                          className="mt-2 text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Supplier */}
              <div>
                <Label htmlFor="supplier_name" className="text-foreground">Supplier</Label>
                <Input
                  id="supplier_name"
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="mt-1 text-foreground"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 text-foreground"
                  rows={3}
                />
              </div>

              {/* Invoice Date */}
              <div>
                <Label htmlFor="invoice_date" className="text-foreground">Invoice Date</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="mt-1 text-foreground"
                  required
                />
              </div>

              {/* Project */}
              <div>
                <Label htmlFor="project_id" className="text-foreground">Project</Label>
                <Select
                  value={formData.project_id?.toString() || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, project_id: value === 'none' ? null : parseInt(value) })
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
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category" className="text-foreground">Category</Label>
                <Select
                  value={formData.category?.toString() || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value === 'none' ? null : parseInt(value) })
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
              </div>

              {/* Deductibility Percentage */}
              <div>
                <Label htmlFor="deductibility_percentage" className="text-foreground">
                  Tax Deductibility
                </Label>
                <Select
                  value={formData.deductibility_percentage.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, deductibility_percentage: parseFloat(value) })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100%</SelectItem>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="0">0%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-foreground">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 text-foreground"
                  rows={2}
                  placeholder="e.g. reis- en verblijfkosten"
                />
              </div>

              {/* Currency */}
              <div>
                <Label htmlFor="currency" className="text-foreground">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
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

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subtotal" className="text-foreground">Subtotal</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="subtotal"
                      type="number"
                      step="0.01"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                      className="text-foreground"
                      required
                    />
                    <span className="text-muted-foreground min-w-[3rem] text-sm">{formData.currency}</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tax_amount" className="text-foreground">VAT</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="tax_amount"
                      type="number"
                      step="0.01"
                      value={formData.tax_amount}
                      onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })}
                      className="text-foreground"
                    />
                    <span className="text-muted-foreground min-w-[3rem] text-sm">{formData.currency}</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="total_amount" className="text-foreground">Total</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                      className="text-foreground"
                      required
                    />
                    <span className="text-muted-foreground min-w-[3rem] text-sm">{formData.currency}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/money')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>

        {/* File Previews */}
        {(invoicePreview || receiptPreview) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Invoice Preview */}
            {invoicePreview && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground text-sm">Invoice Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoiceFile?.type === 'application/pdf' ? (
                    <div className="bg-muted rounded p-4 text-center">
                      <FileText className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">PDF: {invoiceFile.name}</p>
                      <a
                        href={invoicePreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-2 inline-block"
                      >
                        Open in new tab
                      </a>
                    </div>
                  ) : (
                    <img
                      src={invoicePreview}
                      alt="Invoice preview"
                      className="w-full h-auto rounded border border-border"
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Receipt Preview */}
            {receiptPreview && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground text-sm">Receipt Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {receiptFile?.type === 'application/pdf' ? (
                    <div className="bg-muted rounded p-4 text-center">
                      <FileText className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">PDF: {receiptFile.name}</p>
                      <a
                        href={receiptPreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-2 inline-block"
                      >
                        Open in new tab
                      </a>
                    </div>
                  ) : (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-full h-auto rounded border border-border"
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
