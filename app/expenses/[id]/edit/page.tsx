'use client';

import { trpc } from '@/lib/trpc';
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

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = parseInt(params.id as string);

  const { data: expense, isLoading } = trpc.expense.getById.useQuery({ id: expenseId });
  const { data: projects } = trpc.project.getAll.useQuery({ status: 'active' });

  const [formData, setFormData] = useState({
    supplier_name: '',
    description: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    project_id: null as number | null,
    currency: 'EUR' as string,
  });

  const [lastCurrency, setLastCurrency] = useState('EUR');

  useEffect(() => {
    if (expense) {
      const initialCurrency = expense.original_currency || 'EUR';
      setFormData({
        supplier_name: expense.supplier_name || '',
        description: expense.description || '',
        subtotal: parseFloat(expense.original_subtotal || expense.subtotal) || 0,
        tax_amount: parseFloat(expense.original_tax_amount || expense.tax_amount) || 0,
        total_amount: parseFloat(expense.original_amount || expense.total_amount) || 0,
        project_id: expense.project_id || null,
        currency: initialCurrency,
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

  const updateMutation = trpc.expense.update.useMutation({
    onSuccess: () => {
      router.push(`/expenses/${expenseId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 FRONTEND: Submitting form data:', formData);
    updateMutation.mutate({
      id: expenseId,
      data: formData,
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

  if (!expense) {
    return (
      <MainLayout>
        <div className="p-8">
          <p className="text-slate-500">Expense not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div>
          <Link href={`/expenses/${expenseId}`} className="text-sm text-slate-600 hover:text-slate-900 mb-2 inline-block">
            ← Back to Expense
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Edit Expense</h1>
          <p className="text-slate-600 mt-1">Update expense information</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Expense Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="supplier_name" className="text-slate-900">Supplier</Label>
                <Input
                  id="supplier_name"
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="mt-1 text-slate-900"
                />
              </div>

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

              <div>
                <Label htmlFor="currency" className="text-slate-900">Currency</Label>
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
                  <Label htmlFor="subtotal" className="text-slate-900">Subtotal</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="subtotal"
                      type="number"
                      step="0.01"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) })}
                      className="text-slate-900"
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
                      onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) })}
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
                      onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                      className="text-slate-900"
                    />
                    <span className="text-slate-600 min-w-[3rem] text-sm">{formData.currency}</span>
                  </div>
                </div>
              </div>

              {expense.original_currency && expense.original_currency !== 'EUR' && (
                <div className="p-4 bg-slate-100 border border-slate-300 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">Current Conversion</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        {expense.original_currency} {parseFloat(expense.original_amount || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Rate: {parseFloat(expense.exchange_rate || 1).toFixed(4)}
                      </p>
                    </div>
                    <div className="text-slate-500 text-xl">=</div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        €{parseFloat(expense.total_amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
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
              className="bg-blue-900 hover:bg-blue-800 text-white"
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
