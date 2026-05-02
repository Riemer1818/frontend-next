import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardClient } from './DashboardClient';
import {
  getDashboardStats,
  getOutstandingInvoices,
  getIncomeExpenseTrend,
  getEmailStats,
  getRecentEmails,
} from '@/lib/server/dashboard-queries';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic'; // Don't cache this page
export const revalidate = 0; // Always fetch fresh data

export default async function DashboardPage() {
  // Fetch all data in parallel on the server
  const now = new Date();

  const [stats, invoices, trendData, emailStats, emails] = await Promise.all([
    getDashboardStats(now),
    getOutstandingInvoices(),
    getIncomeExpenseTrend(6, now),
    getEmailStats(),
    getRecentEmails(10),
  ]);

  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();
  const selectedMonth = format(now, 'MMMM yyyy');

  return (
    <MainLayout>
      <DashboardClient
        initialStats={stats}
        initialInvoices={invoices}
        initialTrendData={trendData}
        initialEmailStats={emailStats}
        initialEmails={emails}
        selectedMonth={selectedMonth}
        currentYear={currentYear}
        currentQuarter={currentQuarter}
      />
    </MainLayout>
  );
}
