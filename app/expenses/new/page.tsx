'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewExpensePage() {
  const router = useRouter();
  const [uploadMethod, setUploadMethod] = useState<'pdf' | 'manual'>('pdf');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const { data: projects } = trpc.project.getAll.useQuery({ status: 'active' });
  const { data: categories } = trpc.expenseCategory.getAll.useQuery();

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
  });

  const createMutation = trpc.expense.createManual.useMutation({
    onSuccess: (data) => {
      router.push(`/expenses/${data.id}`);
    },
  });

  const extractMutation = trpc.expense.extractPdf.useMutation({
    onSuccess: (extracted) => {
      console.log('✅ PDF extraction successful:', extracted);
      setFormData({
        ...formData,  // Keep existing fields like notes and category
        supplier_name: extracted.supplier_name,
        description: extracted.description || '',
        invoice_date: extracted.invoice_date,
        subtotal: extracted.subtotal,
        tax_amount: extracted.tax_amount,
        total_amount: extracted.total_amount,
        currency: extracted.currency,
      });
      setIsExtracting(false);
    },
    onError: (error) => {
      console.error('Failed to extract PDF data:', error);
      alert('Failed to extract invoice data from PDF. Please fill out manually.');
      setIsExtracting(false);
    },
  });

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFile(file);
    setIsExtracting(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        // Call tRPC endpoint to extract data from PDF
        extractMutation.mutate({
          pdfBase64: base64,
          filename: file.name,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to read PDF file:', error);
      setIsExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div>
          <Link href="/money" className="text-sm text-slate-600 hover:text-slate-900 mb-2 inline-block">
            ← Back to Money Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Add Incoming Invoice</h1>
          <p className="text-slate-600 mt-1">Upload a PDF or enter details manually</p>
        </div>

        {/* Upload Method Selector */}
        <div className="flex gap-4">
          <button
            onClick={() => setUploadMethod('pdf')}
            className={`flex-1 p-4 rounded-lg border-2 transition ${
              uploadMethod === 'pdf'
                ? 'border-blue-900 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-blue-900" />
            <p className="font-medium text-slate-900">Upload PDF</p>
            <p className="text-sm text-slate-600 mt-1">Auto-extract invoice data</p>
          </button>

          <button
            onClick={() => setUploadMethod('manual')}
            className={`flex-1 p-4 rounded-lg border-2 transition ${
              uploadMethod === 'manual'
                ? 'border-blue-900 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <FileText className="h-8 w-8 mx-auto mb-2 text-blue-900" />
            <p className="font-medium text-slate-900">Manual Entry</p>
            <p className="text-sm text-slate-600 mt-1">Fill out form manually</p>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PDF Upload */}
              {uploadMethod === 'pdf' && (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8">
                  <div className="text-center">
                    {pdfFile ? (
                      <div>
                        <FileText className="h-12 w-12 mx-auto mb-4 text-blue-900" />
                        <p className="text-sm font-medium text-slate-900">{pdfFile.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                        {isExtracting && (
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-900" />
                            <span className="text-sm text-slate-600">Extracting invoice data...</span>
                          </div>
                        )}
                        {!isExtracting && pdfFile && (
                          <p className="text-sm text-green-600 mt-4">
                            ✅ Data extracted! Review and click "Create Invoice" to save.
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setPdfFile(null)}
                          className="mt-4"
                        >
                          Remove file
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="pdf-upload" className="cursor-pointer">
                        <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">Click to upload PDF</p>
                        <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                        <input
                          id="pdf-upload"
                          type="file"
                          accept=".pdf"
                          onChange={handlePdfUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Supplier */}
              <div>
                <Label htmlFor="supplier_name" className="text-slate-900">Supplier</Label>
                <Input
                  id="supplier_name"
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="mt-1 text-slate-900"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-slate-900">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 text-slate-900"
                  rows={3}
                />
              </div>

              {/* Invoice Date */}
              <div>
                <Label htmlFor="invoice_date" className="text-slate-900">Invoice Date</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="mt-1 text-slate-900"
                  required
                />
              </div>

              {/* Project */}
              <div>
                <Label htmlFor="project_id" className="text-slate-900">Project</Label>
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
                    {projects?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category" className="text-slate-900">Category</Label>
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
                    {categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-slate-900">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 text-slate-900"
                  rows={2}
                  placeholder="e.g. reis- en verblijfkosten"
                />
              </div>

              {/* Currency */}
              <div>
                <Label htmlFor="currency" className="text-slate-900">Currency</Label>
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
                  <Label htmlFor="subtotal" className="text-slate-900">Subtotal</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="subtotal"
                      type="number"
                      step="0.01"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                      className="text-slate-900"
                      required
                    />
                    <span className="text-slate-600 min-w-[3rem] text-sm">{formData.currency}</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tax_amount" className="text-slate-900">VAT</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="tax_amount"
                      type="number"
                      step="0.01"
                      value={formData.tax_amount}
                      onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })}
                      className="text-slate-900"
                    />
                    <span className="text-slate-600 min-w-[3rem] text-sm">{formData.currency}</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="total_amount" className="text-slate-900">Total</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                      className="text-slate-900"
                      required
                    />
                    <span className="text-slate-600 min-w-[3rem] text-sm">{formData.currency}</span>
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
              className="bg-blue-900 hover:bg-blue-800 text-white"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
