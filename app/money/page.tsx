'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Receipt, FileText, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MoneyPage() {
  const router = useRouter();
  const { data: stats, isLoading: loadingStats } = trpc.reporting.getDashboardStats.useQuery();
  const { data: outstandingInvoices, isLoading: loadingInvoices } = trpc.reporting.getOutstandingInvoices.useQuery();
  const { data: trendData, isLoading: loadingTrend } = trpc.reporting.getIncomeExpenseTrend.useQuery({ months: 6 });
  const { data: pendingExpenses, isLoading: loadingExpenses } = trpc.expense.getPending.useQuery();
  const { data: allExpenses, isLoading: loadingAllExpenses } = trpc.expense.getAll.useQuery();

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
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Money Dashboard</h1>
          <p className="text-slate-600 mt-1">Overview of invoices, expenses, and VAT</p>
        </div>

        {/* VAT & Tax Overview (Top Row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* VAT to Pay This Quarter */}
          <Card className="bg-blue-900 border-blue-900">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">
                VAT to Pay (Q{currentQuarter} {currentYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">€{stats?.vat_this_quarter?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-blue-100 mt-1">Total outstanding: €{stats?.vat_to_pay_total?.toFixed(2) || '0.00'}</p>
            </CardContent>
          </Card>

          {/* Income vs Expenses This Month */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Income
                  </span>
                  <span className="font-bold text-green-600">€{stats?.income_this_month?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Expenses
                  </span>
                  <span className="font-bold text-red-600">€{stats?.expenses_this_month?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Profit</span>
                    <span className="text-xl font-bold text-slate-900">€{stats?.profit_this_month?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Year to Date Summary */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Year to Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Income</span>
                  <span className="font-bold text-slate-900">€{stats?.income_ytd?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Expenses</span>
                  <span className="font-bold text-slate-900">€{stats?.expenses_ytd?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Profit</span>
                    <span className="text-xl font-bold text-slate-900">€{stats?.profit_ytd?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income/Expense Trend Chart */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Income vs Expenses Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTrend ? (
              <p className="text-slate-500">Loading...</p>
            ) : !trendData || trendData.length === 0 ? (
              <p className="text-slate-500">No data available</p>
            ) : (
              <div className="space-y-4">
                {trendData.map((month: any) => {
                  const maxValue = Math.max(month.income, month.expenses, 1);
                  const incomeWidth = (month.income / maxValue) * 100;
                  const expenseWidth = (month.expenses / maxValue) * 100;

                  return (
                    <div key={month.period} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span className="font-medium">{format(new Date(month.period), 'MMM yyyy')}</span>
                        <span className={month.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Profit: €{month.profit.toFixed(0)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-20 text-xs text-slate-500">Income</div>
                          <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-green-500 h-full flex items-center justify-end pr-2"
                              style={{ width: `${incomeWidth}%`, minWidth: month.income > 0 ? '40px' : '0' }}
                            >
                              {month.income > 0 && (
                                <span className="text-xs text-white font-medium">€{month.income.toFixed(0)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 text-xs text-slate-500">Expenses</div>
                          <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
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
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices & Expenses Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Outstanding Invoices */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Outstanding Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <p className="text-slate-500">Loading...</p>
              ) : !outstandingInvoices || outstandingInvoices.length === 0 ? (
                <p className="text-slate-500">No outstanding invoices</p>
              ) : (
                <div className="space-y-3">
                  {outstandingInvoices.slice(0, 5).map((invoice: any) => (
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

          {/* Pending Expenses for Review */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Expenses Pending Review
                {stats?.pending_expenses_count > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {stats.pending_expenses_count}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingExpenses ? (
                <p className="text-slate-500">Loading...</p>
              ) : !pendingExpenses || pendingExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">✓ No expenses pending review</p>
                  <p className="text-sm text-slate-400 mt-1">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingExpenses.slice(0, 5).map((expense: any) => (
                    <Link
                      key={expense.id}
                      href={`/expenses/${expense.id}`}
                      className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-slate-900">
                            {expense.supplier_name}
                          </span>
                          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                            Review
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 ml-6">{expense.description || 'No description'}</p>
                        <p className="text-xs text-slate-500 ml-6">
                          {format(new Date(expense.invoice_date), 'MMM dd, yyyy')}
                          {expense.language && <span> • {expense.language.toUpperCase()}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        {expense.original_currency && expense.original_currency !== 'EUR' ? (
                          <>
                            <p className="font-medium text-slate-700 text-sm">
                              {expense.original_currency} {parseFloat(expense.original_amount || 0).toFixed(2)}
                            </p>
                            <p className="font-bold text-slate-900">€{parseFloat(expense.total_amount).toFixed(2)}</p>
                          </>
                        ) : (
                          <p className="font-bold text-slate-900">€{parseFloat(expense.total_amount).toFixed(2)}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                  <div className="pt-2 border-t border-yellow-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Total Pending</span>
                      <span className="text-lg font-bold text-slate-900">
                        €{stats?.pending_expenses_amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Expenses Table (Recent Activity) */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAllExpenses ? (
              <p className="text-slate-500">Loading...</p>
            ) : !allExpenses || allExpenses.length === 0 ? (
              <p className="text-slate-500">No recent expenses</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Lang</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allExpenses.slice(0, 10).map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Link href={`/expenses/${expense.id}`} className="block w-full">
                          {format(new Date(expense.invoice_date), 'MMM dd, yyyy')}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/expenses/${expense.id}`} className="block w-full">
                          {expense.supplier_name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        <Link href={`/expenses/${expense.id}`} className="block w-full">
                          {expense.description || '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <Link href={`/expenses/${expense.id}`} className="block w-full">
                          {expense.original_currency && expense.original_currency !== 'EUR' ? (
                            <div>
                              <div className="text-sm text-slate-600">
                                {expense.original_currency} {parseFloat(expense.original_amount || 0).toFixed(2)}
                              </div>
                              <div className="font-bold">
                                €{parseFloat(expense.total_amount).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="font-bold">
                              €{parseFloat(expense.total_amount).toFixed(2)}
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/expenses/${expense.id}`} className="block w-full">
                          <span className="text-xs uppercase text-slate-600">
                            {expense.language || '—'}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/expenses/${expense.id}`} className="block w-full">
                          <span
                            className={
                              expense.review_status === 'pending'
                                ? 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-yellow-50 text-yellow-900 border-yellow-200'
                                : expense.review_status === 'approved'
                                ? 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-green-50 text-green-900 border-green-200'
                                : 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-900 border-red-200'
                            }
                          >
                            {expense.review_status}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/expenses/${expense.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {expense.review_status === 'pending' ? 'Review →' : 'View →'}
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