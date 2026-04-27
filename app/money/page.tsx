'use client';

import { useDashboardStats, useOutstandingInvoices, useIncomeExpenseTrend } from '@/lib/supabase/reporting';
import { useExpenses, usePendingExpenses } from '@/lib/supabase/expenses';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Receipt, FileText, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function MoneyPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [showAllExpenses, setShowAllExpenses] = React.useState(false);

  const { data: stats, isLoading: loadingStats, error: statsError } = useDashboardStats();
  const { data: outstandingInvoices, isLoading: loadingInvoices } = useOutstandingInvoices();
  const { data: trendData, isLoading: loadingTrend } = useIncomeExpenseTrend(6);
  const { data: pendingExpenses, isLoading: loadingExpenses } = usePendingExpenses();
  const { data: allExpenses, isLoading: loadingAllExpenses } = useExpenses();

  const outstandingInvoicesArray = outstandingInvoices || [];
  const trendDataArray = trendData || [];
  const pendingExpensesArray = pendingExpenses || [];
  const allExpensesArray = allExpenses || [];

  if (loadingStats) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (statsError || !stats) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-red-500">Error loading stats: {statsError?.message || 'No data'}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Money Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/money/vat')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              VAT
            </button>
            <button
              onClick={() => router.push('/money/tax')}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2"
            >
              Tax
            </button>
            <button
              onClick={() => router.push('/expenses/new')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 hover:text-primary-foreground flex items-center gap-2"
            >
              <Receipt className="h-5 w-5" />
              Add Expense
            </button>
            <button
              onClick={() => router.push('/invoices/new')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 hover:text-primary-foreground flex items-center gap-2"
            >
              <FileText className="h-5 w-5" />
              Build Invoice
            </button>
          </div>
        </div>

        {/* VAT & Tax Overview (Top Row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* VAT to Pay This Quarter */}
          <Card className="bg-primary border-primary">
            <CardHeader>
              <CardTitle className="text-primary-foreground text-sm font-medium">
                VAT to Pay (Q{currentQuarter} {currentYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary-foreground">€{stats.vat_this_quarter.toFixed(2)}</p>
              <p className="text-sm text-primary-foreground/80 mt-1">Total outstanding: €{stats.vat_to_pay_total.toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Income vs Expenses This Month */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm font-medium">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Income
                  </span>
                  <span className="font-bold text-green-600">€{stats.income_this_month.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Expenses
                  </span>
                  <span className="font-bold text-red-600">€{stats.expenses_this_month.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Profit</span>
                    <span className="text-xl font-bold text-foreground">€{stats.profit_this_month.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Year to Date Summary */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm font-medium">Year to Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Income</span>
                  <span className="font-bold text-foreground">€{stats.income_ytd.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expenses</span>
                  <span className="font-bold text-foreground">€{stats.expenses_ytd.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Profit</span>
                    <span className="text-xl font-bold text-foreground">€{stats.profit_ytd.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income/Expense Trend Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Income vs Expenses Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTrend ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : trendDataArray.length === 0 ? (
              <p className="text-muted-foreground">No data available</p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  // Calculate global max across all months (including uninvoiced)
                  const globalMax = Math.max(
                    ...trendDataArray.flatMap((m: any) => [m.income + (m.uninvoiced || 0), m.expenses]),
                    1
                  );

                  return trendDataArray.map((month: any) => {
                    const incomeWidth = (month.income / globalMax) * 100;
                    const uninvoicedWidth = ((month.uninvoiced || 0) / globalMax) * 100;
                    const totalIncomeWidth = ((month.income + (month.uninvoiced || 0)) / globalMax) * 100;
                    const expenseWidth = (month.expenses / globalMax) * 100;

                    return (
                      <div key={month.period} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="font-medium">{format(new Date(month.period), 'MMM yyyy')}</span>
                        <span className={month.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Profit: €{month.profit.toFixed(0)}
                          {month.uninvoiced > 0 && <span className="text-green-400 ml-1">(+€{month.uninvoiced.toFixed(0)} uninvoiced)</span>}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-20 text-xs text-muted-foreground">Income</div>
                          <div className="flex-1 bg-secondary rounded-full h-6 overflow-hidden relative">
                            {/* Uninvoiced income (semi-transparent background) */}
                            {month.uninvoiced > 0 && (
                              <div
                                className="bg-green-300 opacity-40 h-full absolute left-0"
                                style={{ width: `${totalIncomeWidth}%` }}
                              />
                            )}
                            {/* Invoiced income (solid) */}
                            <div
                              className="bg-green-500 h-full flex items-center justify-end pr-2 relative z-10"
                              style={{ width: `${incomeWidth}%`, minWidth: month.income > 0 ? '40px' : '0' }}
                            >
                              {month.income > 0 && (
                                <span className="text-xs text-white font-medium">€{month.income.toFixed(0)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 text-xs text-muted-foreground">Expenses</div>
                          <div className="flex-1 bg-secondary rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-red-500 h-full flex items-center justify-end pr-2"
                              style={{ width: `${expenseWidth}%`, minWidth: month.expenses > 0 ? '40px' : '0' }}
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
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices & Expenses Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Outstanding Invoices */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Outstanding Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : outstandingInvoicesArray.length === 0 ? (
                <p className="text-muted-foreground">No outstanding invoices</p>
              ) : (
                <div className="space-y-3">
                  {outstandingInvoicesArray.slice(0, 5).map((invoice: any) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {invoice.invoice_number}
                          </span>
                          {invoice.urgency === 'overdue' && (
                            <Badge variant="destructive" className="text-xs">Overdue</Badge>
                          )}
                          {invoice.urgency === 'due_soon' && (
                            <Badge className="text-xs bg-orange-500">Due Soon</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{invoice.client_name}</p>
                        <p className="text-xs text-muted-foreground">Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">€{invoice.total_amount.toFixed(2)}</p>
                        <p className="text-xs text-primary mt-1">View →</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Total Outstanding</span>
                      <span className="text-lg font-bold text-foreground">
                        €{outstandingInvoicesArray.reduce((sum: number, inv: any) => sum + inv.total_amount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Expenses for Review */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Expenses Pending Review
                {stats.pending_expenses_count > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {stats.pending_expenses_count}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingExpenses ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : pendingExpensesArray.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">✓ No expenses pending review</p>
                  <p className="text-sm text-slate-400 mt-1">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingExpensesArray.slice(0, 5).map((expense: any) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200 cursor-pointer"
                      onClick={() => router.push(`/expenses/${expense.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-foreground">
                            {expense.supplier_name}
                          </span>
                          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                            Review
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">{expense.description || 'No description'}</p>
                        <p className="text-xs text-muted-foreground ml-6">{format(new Date(expense.invoice_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">€{parseFloat(expense.total_amount).toFixed(2)}</p>
                        <p className="text-xs text-primary mt-1">Review →</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-yellow-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Total Pending</span>
                      <span className="text-lg font-bold text-foreground">
                        €{stats.pending_expenses_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Expenses Table (Recent Activity) */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Recent Expenses</CardTitle>
            {allExpensesArray.length > 10 && (
              <button
                onClick={() => setShowAllExpenses(!showAllExpenses)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/90 hover:text-foreground"
              >
                {showAllExpenses ? (
                  <>Show Less <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Show All ({allExpensesArray.length}) <ChevronDown className="h-4 w-4" /></>
                )}
              </button>
            )}
          </CardHeader>
          <CardContent>
            {loadingAllExpenses ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : allExpensesArray.length === 0 ? (
              <p className="text-muted-foreground">No recent expenses</p>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: showAllExpenses ? 'none' : '500px' }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAllExpenses ? allExpensesArray : allExpensesArray.slice(0, 10)).map((expense: any) => (
                      <TableRow
                        key={expense.id}
                        className="cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
                        onClick={() => router.push(`/expenses/${expense.id}`)}
                      >
                        <TableCell>{format(new Date(expense.invoice_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="font-medium">{expense.supplier_name}</TableCell>
                        <TableCell className="max-w-xs truncate">{expense.description || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{expense.project_name || '—'}</TableCell>
                        <TableCell className="text-right">€{(expense.subtotal || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">€{(expense.tax_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">€{expense.total_amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}