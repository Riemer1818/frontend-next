'use client';

import { useProject, useDeleteProject, useProjectMonthlyExpenses } from '@/lib/supabase/projects';
import { useTimeEntries, useProjectTotalHours, useUninvoicedTimeEntries } from '@/lib/supabase/time-entries';
import { useInvoices } from '@/lib/supabase/invoices';
import { useExpenses } from '@/lib/supabase/expenses';
import { useContactsByCompany, usePrimaryContact } from '@/lib/supabase/contacts';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import EmbeddedGraph from '@/components/graph/EmbeddedGraph';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.id as string);

  const { data: project, isLoading } = useProject(projectId);
  const { data: timeEntries = [] } = useTimeEntries({ projectId });
  const { data: totalHours } = useProjectTotalHours(projectId);
  const { data: uninvoicedEntries = [] } = useUninvoicedTimeEntries(projectId);
  const { data: invoices = [] } = useInvoices({ projectId });
  const { data: monthlyExpenses = [] } = useProjectMonthlyExpenses(projectId);
  const { data: expenses = [] } = useExpenses({ projectId });
  const { data: contacts = [] } = useContactsByCompany(project?.client_id, false);
  const { data: primaryContact } = usePrimaryContact(project?.client_id);

  const deleteMutation = useDeleteProject();

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${project?.name}? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: projectId }, {
        onSuccess: () => {
          router.push('/projects');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading project details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="p-8">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </MainLayout>
    );
  }

  // Calculate recent time entries (last 10)
  const recentTimeEntries = timeEntries.slice(0, 10) || [];

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
              ← Back to Projects
            </Link>
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground mt-1">
              {project.client_id ? (
                <Link href={`/companies/${project.client_id}`} className="hover:underline">
                  {project.client_name || 'View Client'}
                </Link>
              ) : (
                'No client assigned'
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => router.push(`/projects/${projectId}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              className="text-foreground hover:bg-secondary"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm font-medium">Hourly Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                €{project.hourly_rate ? Number(project.hourly_rate).toFixed(2) : '0.00'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {totalHours?.totalHours?.toFixed(1) || '0.0'}h
              </p>
            </CardContent>
          </Card>

          <Card
            className={uninvoicedEntries && uninvoicedEntries.length > 0 ? 'bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors' : 'bg-card border-border'}
            onClick={() => {
              if (uninvoicedEntries && uninvoicedEntries.length > 0) {
                const timeEntryIds = uninvoicedEntries.map((e: any) => e.id).join(',');
                router.push(`/invoices/new?project=${projectId}&timeEntries=${timeEntryIds}`);
              }
            }}
          >
            <CardHeader>
              <CardTitle className={uninvoicedEntries && uninvoicedEntries.length > 0 ? 'text-amber-900 text-sm font-medium' : 'text-foreground text-sm font-medium'}>
                Uninvoiced Hours {uninvoicedEntries && uninvoicedEntries.length > 0 && '→'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={uninvoicedEntries && uninvoicedEntries.length > 0 ? 'text-2xl font-bold text-amber-900' : 'text-2xl font-bold text-foreground'}>
                {uninvoicedEntries && uninvoicedEntries.length > 0
                  ? `${uninvoicedEntries.reduce((sum: number, e: any) => sum + Number(e.total_hours), 0).toFixed(1)}h`
                  : '0.0h'}
              </p>
              {uninvoicedEntries && uninvoicedEntries.length > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  €{(uninvoicedEntries.reduce((sum: number, e: any) => sum + Number(e.total_hours), 0) * Number(project.hourly_rate || 0)).toFixed(2)} • Click to invoice
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                €{project.total_spent ? Number(project.total_spent).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Approved expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Project Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Project Name</p>
                <p className="text-foreground font-medium">{project.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Client</p>
                {project.client_id ? (
                  <Link href={`/companies/${project.client_id}`} className="text-primary hover:underline hover:text-foreground">
                    {project.client_name || 'View Client'}
                  </Link>
                ) : (
                  <p className="text-foreground">—</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                <p className="text-foreground">
                  {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">End Date</p>
                <p className="text-foreground">
                  {project.end_date ? new Date(project.end_date).toLocaleDateString() : '—'}
                </p>
              </div>
              {primaryContact && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Primary Contact</p>
                  <Link href={`/contacts/${primaryContact.id}`} className="text-primary hover:underline hover:text-foreground">
                    {primaryContact.first_name} {primaryContact.last_name}
                  </Link>
                </div>
              )}
              {project.description && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-foreground whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Relationship Graph */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Network Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <EmbeddedGraph
              entityId={projectId.toString()}
              entityType="project"
              height="500px"
              degrees={2}
              showControls={true}
              showLegend={true}
            />
          </CardContent>
        </Card>

        {/* Contacts */}
        {contacts && contacts.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Client Contacts ({contacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-background">
                    <TableHead className="text-foreground font-semibold">Name</TableHead>
                    <TableHead className="text-foreground font-semibold">Role</TableHead>
                    <TableHead className="text-foreground font-semibold">Email</TableHead>
                    <TableHead className="text-foreground font-semibold">Phone</TableHead>
                    <TableHead className="text-right text-foreground font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact: any) => (
                    <TableRow key={contact.id} className="hover:bg-background">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {contact.first_name} {contact.last_name}
                          {contact.is_primary && (
                            <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{contact.role || '—'}</TableCell>
                      <TableCell className="text-foreground">{contact.email || '—'}</TableCell>
                      <TableCell className="text-foreground">{contact.phone || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/contacts/${contact.id}`}>
                          <Button variant="ghost" size="sm" className="text-foreground hover:bg-secondary">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Monthly Expenses */}
        {monthlyExpenses && monthlyExpenses.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Monthly Expenses (Last 12 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyExpenses.map((expense: any) => {
                  const maxSpent = Math.max(...monthlyExpenses.map(e => e.total_spent));
                  const widthPercent = maxSpent > 0 ? (expense.total_spent / maxSpent) * 100 : 0;
                  const monthName = new Date(expense.month + '-01').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short'
                  });

                  return (
                    <div key={expense.month} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-muted-foreground font-medium">{monthName}</div>
                      <div className="flex-1">
                        <div className="bg-secondary rounded-full h-8 overflow-hidden">
                          <div
                            className="bg-primary h-full flex items-center justify-end px-3 text-primary-foreground text-sm font-medium transition-all"
                            style={{ width: `${Math.max(widthPercent, 10)}%` }}
                          >
                            €{expense.total_spent.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="w-20 text-sm text-muted-foreground text-right">
                        {expense.invoice_count} {expense.invoice_count === 1 ? 'invoice' : 'invoices'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoices */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Invoices ({invoices.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices && invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-background">
                    <TableHead className="text-foreground font-semibold">Invoice #</TableHead>
                    <TableHead className="text-foreground font-semibold">Date</TableHead>
                    <TableHead className="text-foreground font-semibold">Amount</TableHead>
                    <TableHead className="text-right text-foreground font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice: any) => (
                    <TableRow key={invoice.id} className="hover:bg-background">
                      <TableCell className="font-medium text-foreground">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-foreground">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-foreground">€{Number(invoice.total_amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="sm" className="text-foreground hover:bg-secondary">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">No invoices found for this project</p>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Project Expenses ({expenses.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses && expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-background">
                    <TableHead className="text-foreground font-semibold">Date</TableHead>
                    <TableHead className="text-foreground font-semibold">Supplier</TableHead>
                    <TableHead className="text-foreground font-semibold">Description</TableHead>
                    <TableHead className="text-foreground font-semibold">Amount</TableHead>
                    <TableHead className="text-foreground font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense: any) => (
                    <TableRow
                      key={expense.id}
                      className="cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
                      onClick={() => router.push(`/expenses/${expense.id}`)}
                    >
                      <TableCell className="text-foreground">
                        {new Date(expense.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{expense.supplier_name || '—'}</TableCell>
                      <TableCell className="text-foreground">{expense.description || '—'}</TableCell>
                      <TableCell className="text-foreground">€{Number(expense.total_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={expense.review_status === 'approved' ? 'default' : 'secondary'}>
                          {expense.review_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">No expenses found for this project</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Time Entries */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Time Entries ({timeEntries.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTimeEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-background">
                    <TableHead className="text-foreground font-semibold">Date</TableHead>
                    <TableHead className="text-foreground font-semibold">Hours</TableHead>
                    <TableHead className="text-foreground font-semibold">Objective</TableHead>
                    <TableHead className="text-foreground font-semibold">Invoiced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTimeEntries.map((entry: any) => (
                    <TableRow key={entry.id} className="hover:bg-background">
                      <TableCell className="font-medium text-foreground">
                        {new Date(entry.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-foreground">{Number(entry.total_hours).toFixed(1)}h</TableCell>
                      <TableCell className="text-foreground">{entry.objective || '—'}</TableCell>
                      <TableCell>
                        <span className={entry.is_invoiced ? 'bg-primary text-primary-foreground px-2 py-1 rounded text-xs' : 'bg-muted text-foreground px-2 py-1 rounded text-xs'}>
                          {entry.is_invoiced ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">No time entries found for this project</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
