'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useExpense, useUpdateExpense } from '@/lib/supabase/expenses';
import { useProjects } from '@/lib/supabase/projects';
import { useExpenseCategories } from '@/lib/supabase/categories';
import { convertCurrency } from '@/app/actions/convert-currency';

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = parseInt(params.id as string);

  const { data: expense, isLoading } = useExpense(expenseId);
  const { data: projectsData } = useProjects({ status: 'active' });
  const projects = projectsData || [];
  const { data: categoriesData } = useExpenseCategories();
  const categories = categoriesData || [];

  const [formData, setFormData] = useState({
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

  const [lastCurrency, setLastCurrency] = useState('EUR');

  useEffect(() => {
    if (expense) {
      const initialCurrency = expense.original_currency || 'EUR';
      setFormData({
        supplier_name: expense.supplier_name || '',
        description: expense.description || '',
        subtotal: expense.original_subtotal ?? expense.subtotal ?? 0,
        tax_amount: expense.original_tax_amount ?? expense.tax_amount ?? 0,
        total_amount: expense.original_amount ?? expense.total_amount,
        project_id: expense.project_id || null,
        currency: initialCurrency,
        invoice_date: expense.invoice_date ? format(new Date(expense.invoice_date), 'yyyy-MM-dd') : '',
        notes: expense.notes || '',
        category: expense.category_id || null,
      });
      setLastCurrency(initialCurrency);
    }
  }, [expense]);

  // Handle currency change - convert amounts between currencies
  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === lastCurrency || !expense) return;

    // Get exchange rates and convert
    // For simplicity, we'll just let the user edit the amounts manually
    // The backend will handle conversion when they save
    setFormData({ ...formData, currency: newCurrency });
    setLastCurrency(newCurrency);
  };

  const updateMutation = useUpdateExpense();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 FRONTEND: Submitting form data:', formData);
    try {
      // Convert currency if not EUR
      let eurSubtotal = formData.subtotal;
      let eurTaxAmount = formData.tax_amount;
      let eurTotalAmount = formData.total_amount;
      let exchangeRate = 1;
      let exchangeRateDate = formData.invoice_date;

      if (formData.currency !== 'EUR') {
        const conversion = await convertCurrency(
          formData.total_amount,
          formData.currency,
          'EUR',
          formData.invoice_date
        );

        exchangeRate = conversion.rate;
        exchangeRateDate = conversion.date;

        // Convert all amounts
        eurTotalAmount = conversion.convertedAmount;
        eurSubtotal = formData.subtotal * exchangeRate;
        eurTaxAmount = formData.tax_amount * exchangeRate;
      }

      // Map form data to database fields correctly
      await updateMutation.mutateAsync({
        id: expenseId,
        data: {
          supplier_name: formData.supplier_name,
          description: formData.description,
          subtotal: eurSubtotal,
          tax_amount: eurTaxAmount,
          total_amount: eurTotalAmount,
          project_id: formData.project_id,
          original_currency: formData.currency,
          original_amount: formData.total_amount,
          original_subtotal: formData.subtotal,
          original_tax_amount: formData.tax_amount,
          exchange_rate: exchangeRate,
          exchange_rate_date: exchangeRateDate,
          invoice_date: formData.invoice_date,
          notes: formData.notes,
          category_id: formData.category,
        },
      });
      console.log('✅ Update successful, redirecting...');
      router.push(`/expenses/${expenseId}`);
    } catch (error) {
      console.error('❌ Update failed:', error);
      alert(`Failed to update expense: ${error}`);
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
        <div className="p-8">
          <p className="text-muted-foreground">Expense not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div>
          <Link href={`/expenses/${expenseId}`} className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
            ← Back to Expense
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Edit Expense</h1>
          <p className="text-muted-foreground mt-1">Update expense information</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Expense Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="supplier_name" className="text-foreground">Supplier</Label>
                <Input
                  id="supplier_name"
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="mt-1 text-foreground"
                />
              </div>

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

              <div>
                <Label htmlFor="invoice_date" className="text-foreground">Invoice Date</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="mt-1 text-foreground"
                />
              </div>

              <div>
                <Label htmlFor="currency" className="text-foreground">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={handleCurrencyChange}
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subtotal" className="text-foreground">Subtotal</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="subtotal"
                      type="number"
                      step="0.01"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) })}
                      className="text-foreground"
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
                      onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) })}
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
                      onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                      className="text-foreground"
                    />
                    <span className="text-muted-foreground min-w-[3rem] text-sm">{formData.currency}</span>
                  </div>
                </div>
              </div>

              {expense.original_currency && expense.original_currency !== 'EUR' && (
                <div className="p-4 bg-secondary border border-border rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-2">Current Conversion</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {expense.original_currency} {(expense.original_amount || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rate: {/* Exchange rate calculation not in new schema */}
                      </p>
                    </div>
                    <div className="text-muted-foreground text-xl">=</div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        €{(expense.total_amount || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(expense.invoice_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/expenses/${expenseId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
