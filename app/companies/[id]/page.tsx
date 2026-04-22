'use client';

import { useCompany, useDeleteCompany } from '@/lib/supabase/companies';
import { useProjects } from '@/lib/supabase/projects';
import { useInvoices } from '@/lib/supabase/invoices';
import { useExpenses } from '@/lib/supabase/expenses';
import { useContactsByCompany, usePrimaryContact } from '@/lib/supabase/contacts';
import { useEmailsByCompany } from '@/lib/supabase/emails';
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

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = parseInt(params.id as string);

  const { data: company, isLoading } = useCompany(companyId);
  const { data: projects = [] } = useProjects({ clientId: companyId });
  const { data: invoices = [] } = useInvoices({ clientId: companyId });
  const { data: expenses = [] } = useExpenses({ supplierId: companyId });
  const { data: contacts = [] } = useContactsByCompany(companyId, false);
  const { data: primaryContact } = usePrimaryContact(companyId);
  const { data: emails = [] } = useEmailsByCompany(companyId);

  const deleteMutation = useDeleteCompany();

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${company?.name}? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: companyId }, {
        onSuccess: () => {
          router.push('/companies');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading company details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!company) {
    return (
      <MainLayout>
        <div className="p-8">
          <p className="text-muted-foreground">Company not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/companies" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
              ← Back to Companies
            </Link>
            <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
            <p className="text-muted-foreground mt-1">
              {company.type === 'client' ? 'Client' : company.type === 'supplier' ? 'Supplier' : 'Client & Supplier'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => router.push(`/companies/${companyId}/edit`)}
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

        {/* Total Spent (for suppliers) */}
        {(company.type === 'supplier' || company.type === 'both') && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                €{company.total_spent ? Number(company.total_spent).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Approved invoices only</p>
            </CardContent>
          </Card>
        )}

        {/* Company Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Company Name</p>
                <p className="text-foreground font-medium">{company.name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Type</p>
                <span className={company.type === 'client' ? 'bg-primary text-white px-2 py-1 rounded text-xs' : 'bg-muted text-foreground px-2 py-1 rounded text-xs'}>
                  {company.type}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="text-foreground">{company.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone</p>
                <p className="text-foreground">{company.phone || '—'}</p>
              </div>
              {primaryContact && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Primary Contact</p>
                  <Link href={`/contacts/${primaryContact.id}`} className="text-primary hover:underline">
                    {primaryContact.first_name} {primaryContact.last_name}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Address</p>
                <p className="text-foreground">
                  {company.street_address || '—'}
                  {company.city && `, ${company.city}`}
                  {company.postal_code && ` ${company.postal_code}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Country</p>
                <p className="text-foreground">{company.country || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">KVK Number</p>
                <p className="text-foreground">{company.kvk_number || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">VAT Number</p>
                <p className="text-foreground">{company.btw_number || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">IBAN</p>
                <p className="text-foreground">{company.iban || '—'}</p>
              </div>
            </div>
            {company.notes && (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-foreground whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationship Graph */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Network Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <EmbeddedGraph
              entityId={companyId.toString()}
              entityType="company"
              height="500px"
              degrees={2}
              showControls={true}
              showLegend={true}
            />
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Contacts ({contacts.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts && contacts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-background">
                    <TableHead className="text-foreground font-semibold">Name</TableHead>
                    <TableHead className="text-foreground font-semibold">Role</TableHead>
                    <TableHead className="text-foreground font-semibold">Email</TableHead>
                    <TableHead className="text-foreground font-semibold">Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact: any) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {contact.first_name} {contact.last_name}
                          {contact.is_primary && (
                            <Badge variant="default" className="bg-primary text-white text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{contact.role || '—'}</TableCell>
                      <TableCell className="text-foreground">{contact.email || '—'}</TableCell>
                      <TableCell className="text-foreground">{contact.phone || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">No contacts found for this company</p>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Projects ({projects.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {projects && projects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-background">
                    <TableHead className="text-foreground font-semibold">Name</TableHead>
                    <TableHead className="text-foreground font-semibold">Hourly Rate</TableHead>
                    <TableHead className="text-foreground font-semibold">Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project: any) => (
                    <TableRow
                      key={project.id}
                      className="hover:bg-background cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">{project.name}</TableCell>
                      <TableCell className="text-foreground">€{Number(project.hourly_rate || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-foreground">
                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">No projects found for this company</p>
            )}
          </CardContent>
        </Card>

        {/* Invoices (Outgoing - for clients) */}
        {(company.type === 'client' || company.type === 'both') && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Invoices Sent ({invoices.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background">
                      <TableHead className="text-foreground font-semibold">Invoice #</TableHead>
                      <TableHead className="text-foreground font-semibold">Date</TableHead>
                      <TableHead className="text-foreground font-semibold">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice: any) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                      >
                        <TableCell className="font-medium text-foreground">{invoice.invoice_number}</TableCell>
                        <TableCell className="text-foreground">
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-foreground">€{Number(invoice.total_amount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">No invoices sent to this company</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expenses (Incoming - for suppliers) */}
        {(company.type === 'supplier' || company.type === 'both') && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Expenses from this Supplier ({expenses.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses && expenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background">
                      <TableHead className="text-foreground font-semibold">Date</TableHead>
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
                        <TableCell className="font-medium text-foreground">{expense.description || '—'}</TableCell>
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
                <p className="text-muted-foreground text-sm">No expenses found from this supplier</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emails Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Emails ({emails.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {emails && emails.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Label</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email: any) => (
                    <TableRow
                      key={email.id}
                      className="cursor-pointer hover:bg-background"
                      onClick={() => router.push(`/emails/${email.id}`)}
                    >
                      <TableCell className="text-sm">
                        {new Date(email.received_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {email.subject || '(no subject)'}
                        {email.has_attachments && <span className="ml-2">📎</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {email.from_address}
                      </TableCell>
                      <TableCell>
                        {email.label ? (
                          <Badge variant="secondary">{email.label.replace('_', ' ')}</Badge>
                        ) : (
                          <Badge variant="outline">Unlabeled</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">No emails linked to this company</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
