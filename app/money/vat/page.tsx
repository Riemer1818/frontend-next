'use client';

import { useDashboardStats } from '@/lib/supabase/reporting';
import { useInvoices } from '@/lib/supabase/invoices';
import { useExpenses } from '@/lib/supabase/expenses';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function VATPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);

  const { data: stats, isLoading } = useDashboardStats();
  const { data: allInvoices = [] } = useInvoices();
  const { data: allExpenses = [] } = useExpenses();

  // Generate available years and quarters
  const availableYears = [2025, 2026, 2027];
  const availableQuarters = [1, 2, 3, 4];

  // Calculate quarter date range
  const getQuarterDates = (year: number, quarter: number) => {
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    return {
      start: new Date(year, startMonth, 1),
      end: new Date(year, endMonth + 1, 0),
    };
  };

  const { start, end } = getQuarterDates(selectedYear, selectedQuarter);

  // Filter invoices and expenses for selected quarter
  const quarterInvoices = allInvoices.filter((inv: any) => {
    const date = new Date(inv.invoice_date);
    return date >= start && date <= end;
  });

  const quarterExpenses = allExpenses.filter((exp: any) => {
    const date = new Date(exp.invoice_date);
    return date >= start && date <= end;
  });

  // Calculate VAT amounts (assuming 21% VAT rate)
  const vatCollected = quarterInvoices.reduce((sum: number, inv: any) => {
    const total = inv.total_amount || 0;
    return sum + (total * 0.21 / 1.21); // Extract VAT from total
  }, 0);

  const vatPaid = quarterExpenses.reduce((sum: number, exp: any) => {
    const vatAmount = exp.tax_amount || 0;
    return sum + vatAmount;
  }, 0);

  const vatToPay = vatCollected - vatPaid;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/money')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Money
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">BTW Aangifte</h1>
              <p className="text-muted-foreground mt-1">Quarterly VAT Declaration</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Period Selector */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Year:</span>
                <div className="flex gap-2">
                  {availableYears.map((year) => (
                    <Button
                      key={year}
                      variant="outline"
                      onClick={() => setSelectedYear(year)}
                      className={selectedYear === year ? 'bg-primary text-white border-primary' : ''}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Quarter:</span>
                <div className="flex gap-2">
                  {availableQuarters.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      onClick={() => setSelectedQuarter(q)}
                      className={selectedQuarter === q ? 'bg-primary text-white border-primary' : ''}
                    >
                      Q{q}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VAT Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">VAT Collected (Sales)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">€{vatCollected.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">{quarterInvoices.length} invoices</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">VAT Paid (Expenses)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">€{vatPaid.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">{quarterExpenses.length} expenses</p>
            </CardContent>
          </Card>

          <Card className={vatToPay > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">VAT to Pay/Refund</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${vatToPay > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                €{Math.abs(vatToPay).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {vatToPay > 0 ? 'To pay to tax office' : 'Refund from tax office'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Quarter Reference */}
        {selectedYear === currentYear && (
          <Card className="bg-secondary border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Current Quarter (Q{currentQuarter} {currentYear})</p>
                  <p className="text-sm text-primary mt-1">VAT to Pay: €{stats?.vat_this_quarter?.toFixed(2) || '0.00'}</p>
                </div>
                {selectedQuarter !== currentQuarter && (
                  <Button
                    onClick={() => setSelectedQuarter(currentQuarter)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    View Current Quarter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Quarter Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {quarterInvoices.length > 0 ? (
              <div className="space-y-2">
                {quarterInvoices.map((invoice: any) => (
                  <div key={invoice.id} className="flex justify-between items-center p-3 bg-background rounded">
                    <div>
                      <p className="font-medium text-foreground">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">€{invoice.total_amount?.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">VAT: €{(invoice.total_amount * 0.21 / 1.21).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No invoices for this quarter</p>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Quarter Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {quarterExpenses.length > 0 ? (
              <div className="space-y-2">
                {quarterExpenses.map((expense: any) => (
                  <div key={expense.id} className="flex justify-between items-center p-3 bg-background rounded">
                    <div>
                      <p className="font-medium text-foreground">{expense.supplier_name || expense.description || 'Expense'}</p>
                      <p className="text-sm text-muted-foreground">{new Date(expense.invoice_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">€{expense.total_amount?.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">VAT: €{expense.tax_amount?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No expenses for this quarter</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
