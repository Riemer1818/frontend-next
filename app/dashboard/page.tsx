'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';

export default function DashboardPage() {
  const [isChecking, setIsChecking] = useState(false);

  const { data: stats, isLoading: loadingStats } = trpc.reporting.getDashboardStats.useQuery();
  const { data: outstandingInvoices, isLoading: loadingInvoices } = trpc.reporting.getOutstandingInvoices.useQuery();
  const { data: trendData, isLoading: loadingTrend } = trpc.reporting.getIncomeExpenseTrend.useQuery({ months: 6 });
  const { data: pendingExpenses, isLoading: loadingExpenses, refetch: refetchExpenses } = trpc.expense.getPending.useQuery();

  const checkForInvoices = trpc.invoiceIngestion.processInvoices.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Invoice check completed! Check your pending expenses.');
        refetchExpenses();
      } else {
        toast.error(data.message || 'Failed to check for invoices');
      }
      setIsChecking(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
      setIsChecking(false);
    },
  });

  const handleCheckInvoices = () => {
    setIsChecking(true);
    toast.info('Checking for new invoices in email...');
    checkForInvoices.mutate();
  };

  if (loadingStats) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = new Date().getFullYear();

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Overview of your business performance</p>
          </div>
          <Button
            onClick={handleCheckInvoices}
            disabled={isChecking}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isChecking ? 'Checking...' : '📧 Check for Invoices'}
          </Button>
        </div>

        {/* Main Stats Cards (Top Row) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Income This Month */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Income (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">€{stats?.income_this_month?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-slate-500 mt-1">YTD: €{stats?.income_ytd?.toFixed(2) || '0.00'}</p>
            </CardContent>
          </Card>

          {/* Expenses This Month */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Expenses (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">€{stats?.expenses_this_month?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-slate-500 mt-1">YTD: €{stats?.expenses_ytd?.toFixed(2) || '0.00'}</p>
            </CardContent>
          </Card>

          {/* Profit This Month */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Profit (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">€{stats?.profit_this_month?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-slate-500 mt-1">YTD: €{stats?.profit_ytd?.toFixed(2) || '0.00'}</p>
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{stats?.active_projects_count || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tax & VAT Section (Second Row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* VAT to Pay This Quarter */}
          <Card className="bg-blue-900 border-blue-900">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">
                VAT to Pay (Q{currentQuarter})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">€{stats?.vat_this_quarter?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-blue-100 mt-1">Total outstanding: €{stats?.vat_to_pay_total?.toFixed(2) || '0.00'}</p>
            </CardContent>
          </Card>

          {/* Estimated Income Tax */}
          <Card className="bg-blue-900 border-blue-900">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">
                Estimated Income Tax (YTD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">€{parseFloat(stats?.estimated_income_tax_ytd || '0').toFixed(2)}</p>
              <p className="text-sm text-blue-100 mt-1">30% of profit YTD</p>
            </CardContent>
          </Card>

          {/* Pending Expenses */}
          <Card className="bg-blue-900 border-blue-900">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">
                Pending Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{stats?.pending_expenses_count || 0}</p>
              <p className="text-sm text-blue-100 mt-1">Total: €{stats?.pending_expenses_amount?.toFixed(2) || '0.00'}</p>
              <Link href="/expenses?status=pending" className="inline-block mt-2 text-sm text-white hover:underline">
                Review now →
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Year-to-Date Summary (Third Row) */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Year-to-Date Summary ({currentYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-2">Total Income</p>
                <p className="text-2xl font-bold text-slate-900">€{stats?.income_ytd?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-900">€{stats?.expenses_ytd?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">Net Profit</p>
                <p className="text-2xl font-bold text-slate-900">€{stats?.profit_ytd?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fourth Row: Outstanding Invoices & Income/Expense Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Outstanding Invoices */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <p className="text-slate-500">Loading...</p>
              ) : !outstandingInvoices || outstandingInvoices.length === 0 ? (
                <p className="text-slate-500">No outstanding invoices</p>
              ) : (
                <div className="space-y-3">
                  {outstandingInvoices.map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-900 hover:underline">
                            {invoice.invoice_number}
                          </Link>
                          {invoice.urgency === 'overdue' && (
                            <Badge variant="destructive" className="text-xs">Overdue</Badge>
                          )}
                          {invoice.urgency === 'due_soon' && (
                            <Badge className="text-xs bg-orange-500">Due Soon</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{invoice.client_name}</p>
                        <p className="text-xs text-slate-500">Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">€{invoice.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Total Outstanding</span>
                      <span className="text-lg font-bold text-slate-900">
                        €{outstandingInvoices.reduce((sum: number, inv: any) => sum + inv.total_amount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Income/Expense Chart */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Income vs Expenses (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTrend ? (
                <p className="text-slate-500">Loading...</p>
              ) : !trendData || trendData.length === 0 ? (
                <p className="text-slate-500">No data available</p>
              ) : (
                <div className="space-y-4">
                  {trendData.map((month: any) => {
                    const maxValue = Math.max(month.income, month.expenses);
                    const incomeWidth = maxValue > 0 ? (month.income / maxValue) * 100 : 0;
                    const expenseWidth = maxValue > 0 ? (month.expenses / maxValue) * 100 : 0;

                    return (
                      <div key={month.period} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span className="font-medium">{format(new Date(month.period), 'MMM yyyy')}</span>
                          <span>Profit: €{month.profit.toFixed(0)}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-16 text-xs text-slate-500">Income</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                              <div
                                className="bg-green-500 h-full flex items-center justify-end pr-2"
                                style={{ width: `${incomeWidth}%` }}
                              >
                                {month.income > 0 && (
                                  <span className="text-xs text-white font-medium">€{month.income.toFixed(0)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 text-xs text-slate-500">Expenses</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                              <div
                                className="bg-red-500 h-full flex items-center justify-end pr-2"
                                style={{ width: `${expenseWidth}%` }}
                              >
                                {month.expenses > 0 && (
                                  <span className="text-xs text-white font-medium">€{month.expenses.toFixed(0)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fifth Row: Pending Expenses Table */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Expenses Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingExpenses ? (
              <p className="text-slate-500">Loading...</p>
            ) : !pendingExpenses || pendingExpenses.length === 0 ? (
              <p className="text-slate-500">No pending expenses to review</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingExpenses.map((expense: any) => (
                    <TableRow key={expense.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell>{format(new Date(expense.invoice_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">{expense.supplier_name}</TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description || '—'}</TableCell>
                      <TableCell className="text-right font-medium">€{parseFloat(expense.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/expenses/${expense.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Review →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
