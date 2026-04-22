'use client';

import { useDashboardStats, useOutstandingInvoices, useIncomeExpenseTrend } from '@/lib/supabase/reporting';
import { useEmails, useEmailStats, useUpdateEmailLabel, useMarkEmailAsRead, useDeleteEmail, useFetchUnreadEmails } from '@/lib/supabase/emails';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [isChecking, setIsChecking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const router = useRouter();

  const { data: stats, isLoading: loadingStats, error: statsError } = useDashboardStats(selectedDate);
  const { data: outstandingInvoices, isLoading: loadingInvoices } = useOutstandingInvoices();
  const { data: trendData, isLoading: loadingTrend } = useIncomeExpenseTrend(6, selectedDate);
  const { data: emailStats, isLoading: loadingEmailStats } = useEmailStats();
  const { data: emails, isLoading: loadingEmails, refetch: refetchEmails } = useEmails(undefined, false, 1, 10);

  const fetchEmails = useFetchUnreadEmails();

  const updateLabel = useUpdateEmailLabel();

  const deleteEmail = useDeleteEmail();

  const handleFetchEmails = () => {
    setIsChecking(true);
    toast.info('Fetching unread emails...');
    fetchEmails.mutate(undefined, {
      onSuccess: (data: any) => {
        if (data.success) {
          toast.success(`Fetched ${data.count} new email(s)!`);
          refetchEmails();
        } else {
          toast.error(data.error || 'Failed to fetch emails');
        }
        setIsChecking(false);
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.message}`);
        setIsChecking(false);
      },
    });
  };

  const handleLabelUpdate = (emailId: number, label: 'incoming_invoice' | 'receipt' | 'newsletter' | 'other') => {
    updateLabel.mutate({ id: emailId, label }, {
      onSuccess: () => {
        toast.success('Email labeled!');
        refetchEmails();
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.message}`);
      },
    });
  };

  const handleDeleteEmail = (emailId: number) => {
    deleteEmail.mutate({ id: emailId }, {
      onSuccess: () => {
        toast.success('Email deleted!');
        refetchEmails();
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.message}`);
      },
    });
  };

  const outstandingInvoicesArray = outstandingInvoices || [];
  const trendDataArray = trendData || [];
  const emailsArray = emails?.emails || [];

  if (loadingStats) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (statsError || !stats) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h2 className="text-red-800 font-semibold">Error loading dashboard</h2>
            <p className="text-red-600 text-sm mt-1">{statsError?.message || 'Failed to load stats'}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const currentQuarter = Math.ceil((selectedDate.getMonth() + 1) / 3);
  const currentYear = selectedDate.getFullYear();
  const selectedMonth = format(selectedDate, 'MMMM yyyy');

  const goToPreviousMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setSelectedDate(new Date());
  };

  const isCurrentMonth = selectedDate.getMonth() === new Date().getMonth() &&
                         selectedDate.getFullYear() === new Date().getFullYear();

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-slate-200">
              <Button
                onClick={goToPreviousMonth}
                size="sm"
                variant="outline"
                className="px-2"
              >
                ←
              </Button>
              <span className="text-sm font-medium text-slate-700 min-w-[120px] text-center">
                {selectedMonth}
              </span>
              <Button
                onClick={goToNextMonth}
                size="sm"
                variant="outline"
                className="px-2"
                disabled={isCurrentMonth}
              >
                →
              </Button>
              {!isCurrentMonth && (
                <Button
                  onClick={goToCurrentMonth}
                  size="sm"
                  variant="ghost"
                  className="text-xs ml-2"
                >
                  Today
                </Button>
              )}
            </div>
          </div>
          <Button
            onClick={handleFetchEmails}
            disabled={isChecking}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isChecking ? 'Fetching...' : '📧 Fetch New Emails'}
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
              <p className="text-3xl font-bold text-slate-900">€{(stats.income_this_month || 0).toFixed(2)}</p>
              <p className="text-sm text-slate-500 mt-1">YTD: €{(stats.income_ytd || 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Expenses This Month */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Expenses (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">€{(stats.expenses_this_month || 0).toFixed(2)}</p>
              <p className="text-sm text-slate-500 mt-1">YTD: €{(stats.expenses_ytd || 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Profit This Month */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Profit (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">€{(stats.profit_this_month || 0).toFixed(2)}</p>
              <p className="text-sm text-slate-500 mt-1">YTD: €{(stats.profit_ytd || 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{stats.active_projects || 0}</p>
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
              <p className="text-3xl font-bold text-white">€{(stats.vat_this_quarter || 0).toFixed(2)}</p>
              <p className="text-sm text-blue-100 mt-1">Total outstanding: €{(stats.vat_to_pay_total || 0).toFixed(2)}</p>
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
              <p className="text-3xl font-bold text-white">€{parseFloat(String(stats.estimated_income_tax_ytd || '0')).toFixed(2)}</p>
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
              <p className="text-3xl font-bold text-white">{stats.pending_expenses_count || 0}</p>
              <p className="text-sm text-blue-100 mt-1">Total: €{(stats.pending_expenses_amount || 0).toFixed(2)}</p>
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
                <p className="text-2xl font-bold text-slate-900">€{(stats.income_ytd || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-900">€{(stats.expenses_ytd || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">Net Profit</p>
                <p className="text-2xl font-bold text-slate-900">€{(stats.profit_ytd || 0).toFixed(2)}</p>
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
              ) : outstandingInvoicesArray.length === 0 ? (
                <p className="text-slate-500">No outstanding invoices</p>
              ) : (
                <div className="space-y-3">
                  {outstandingInvoicesArray.map((invoice: any) => (
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
                  {(() => {
                    // Calculate global max across all months (including uninvoiced)
                    const globalMax = Math.max(
                      ...trendDataArray.flatMap((m: any) => [m.income + (m.uninvoiced || 0), m.expenses]),
                      1
                    );

                    return trendDataArray.map((month: any) => {
                      const incomeWidth = (month.income / globalMax) * 100;
                      const totalIncomeWidth = ((month.income + (month.uninvoiced || 0)) / globalMax) * 100;
                      const expenseWidth = (month.expenses / globalMax) * 100;

                      return (
                        <div key={month.period} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span className="font-medium">{format(new Date(month.period + '-01'), 'MMM yyyy')}</span>
                          <span>Profit: €{month.profit.toFixed(0)}
                            {month.uninvoiced > 0 && <span className="text-green-400 ml-1">(+€{month.uninvoiced.toFixed(0)} uninv.)</span>}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-16 text-xs text-slate-500">Income</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden relative">
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
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fifth Row: Email Inbox */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-slate-900">Email Inbox</CardTitle>
              {emailStats && (
                <div className="flex gap-4 text-sm">
                  <span className="text-slate-600">
                    Total: <span className="font-bold text-slate-900">{emailStats.total_count}</span>
                  </span>
                  <span className="text-slate-600">
                    Unread: <span className="font-bold text-slate-900">{emailStats.unread_count}</span>
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingEmails ? (
              <p className="text-slate-500">Loading...</p>
            ) : !emails || emailsArray.length === 0 ? (
              <p className="text-slate-500">No emails yet. Click "Fetch New Emails" to import from your inbox.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailsArray.map((email: any) => (
                    <TableRow
                      key={email.id}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => router.push(`/emails/${email.id}`)}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(email.email_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {email.from_address}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {email.subject || '(no subject)'}
                        {email.has_attachments && <span className="ml-2 text-xs">📎</span>}
                      </TableCell>
                      <TableCell>
                        {email.label ? (
                          <Badge variant={
                            email.label === 'incoming_invoice' ? 'default' :
                            email.label === 'receipt' ? 'secondary' :
                            email.label === 'newsletter' ? 'outline' : 'destructive'
                          }>
                            {email.label.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">unlabeled</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1"
                            onClick={() => handleLabelUpdate(email.id, 'incoming_invoice')}
                          >
                            Invoice
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1"
                            onClick={() => handleLabelUpdate(email.id, 'receipt')}
                          >
                            Receipt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1"
                            onClick={() => handleLabelUpdate(email.id, 'newsletter')}
                          >
                            Newsletter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1"
                            onClick={() => handleLabelUpdate(email.id, 'other')}
                          >
                            Other
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs px-2 py-1"
                            onClick={() => handleDeleteEmail(email.id)}
                          >
                            ✕
                          </Button>
                        </div>
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
