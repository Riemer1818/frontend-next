'use client';

import { trpc } from '@/lib/trpc';
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

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = parseInt(params.id as string);

  const { data: company, isLoading } = trpc.company.getById.useQuery({ id: companyId });
  const { data: projects } = trpc.project.getAll.useQuery({ clientId: companyId });
  const { data: invoices } = trpc.invoice.getAll.useQuery({ clientId: companyId });
  const { data: expenses } = trpc.expense.getAll.useQuery({ supplierId: companyId });
  const { data: contacts } = trpc.contact.getByCompanyId.useQuery({ companyId, activeOnly: false });
  const { data: primaryContact } = trpc.contact.getPrimaryByCompanyId.useQuery({ companyId });

  const deleteMutation = trpc.company.delete.useMutation({
    onSuccess: () => {
      router.push('/companies');
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${company?.name}? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: companyId });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading company details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!company) {
    return (
      <MainLayout>
        <div className="p-8">
          <p className="text-slate-500">Company not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/companies" className="text-sm text-slate-600 hover:text-slate-900 mb-2 inline-block">
              ← Back to Companies
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
            <p className="text-slate-600 mt-1">
              {company.type === 'client' ? 'Client' : company.type === 'supplier' ? 'Supplier' : 'Client & Supplier'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-blue-900 hover:bg-blue-800 text-white"
              onClick={() => router.push(`/companies/${companyId}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              className="text-slate-900 hover:bg-slate-100"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Total Spent (for suppliers) */}
        {(company.type === 'supplier' || company.type === 'both') && (
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                €{company.total_spent ? Number(company.total_spent).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-slate-600 mt-1">Approved invoices only</p>
            </CardContent>
          </Card>
        )}

        {/* Company Information */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">Company Name</p>
                <p className="text-slate-900 font-medium">{company.name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Type</p>
                <span className={company.type === 'client' ? 'bg-blue-900 text-white px-2 py-1 rounded text-xs' : 'bg-slate-200 text-slate-900 px-2 py-1 rounded text-xs'}>
                  {company.type}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Email</p>
                <p className="text-slate-900">{company.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Phone</p>
                <p className="text-slate-900">{company.phone || '—'}</p>
              </div>
              {primaryContact && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Primary Contact</p>
                  <Link href={`/contacts/${primaryContact.id}`} className="text-blue-900 hover:underline">
                    {primaryContact.first_name} {primaryContact.last_name}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-600 mb-1">Address</p>
                <p className="text-slate-900">
                  {company.street_address || '—'}
                  {company.city && `, ${company.city}`}
                  {company.postal_code && ` ${company.postal_code}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Country</p>
                <p className="text-slate-900">{company.country || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">KVK Number</p>
                <p className="text-slate-900">{company.kvk_number || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">VAT Number</p>
                <p className="text-slate-900">{company.vat_number || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">IBAN</p>
                <p className="text-slate-900">{company.iban || '—'}</p>
              </div>
            </div>
            {company.notes && (
              <div className="mt-6">
                <p className="text-sm text-slate-600 mb-1">Notes</p>
                <p className="text-slate-900 whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Contacts ({contacts?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts && contacts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-900 font-semibold">Name</TableHead>
                    <TableHead className="text-slate-900 font-semibold">Role</TableHead>
                    <TableHead className="text-slate-900 font-semibold">Email</TableHead>
                    <TableHead className="text-slate-900 font-semibold">Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                    >
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {contact.first_name} {contact.last_name}
                          {contact.is_primary && (
                            <Badge variant="default" className="bg-blue-900 text-white text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700">{contact.role || '—'}</TableCell>
                      <TableCell className="text-slate-700">{contact.email || '—'}</TableCell>
                      <TableCell className="text-slate-700">{contact.phone || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-slate-500 text-sm">No contacts found for this company</p>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Projects ({projects?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {projects && projects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-900 font-semibold">Name</TableHead>
                    <TableHead className="text-slate-900 font-semibold">Hourly Rate</TableHead>
                    <TableHead className="text-slate-900 font-semibold">Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium text-slate-900">{project.name}</TableCell>
                      <TableCell className="text-slate-700">€{Number(project.hourly_rate || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-slate-700">
                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-slate-500 text-sm">No projects found for this company</p>
            )}
          </CardContent>
        </Card>

        {/* Invoices (Outgoing - for clients) */}
        {(company.type === 'client' || company.type === 'both') && (
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Invoices Sent ({invoices?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-slate-900 font-semibold">Invoice #</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Date</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                      >
                        <TableCell className="font-medium text-slate-900">{invoice.invoice_number}</TableCell>
                        <TableCell className="text-slate-700">
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-slate-700">€{Number(invoice.total_amount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-slate-500 text-sm">No invoices sent to this company</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expenses (Incoming - for suppliers) */}
        {(company.type === 'supplier' || company.type === 'both') && (
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Expenses from this Supplier ({expenses?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses && expenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-slate-900 font-semibold">Date</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Description</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Amount</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow
                        key={expense.id}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => router.push(`/expenses/${expense.id}`)}
                      >
                        <TableCell className="text-slate-700">
                          {new Date(expense.invoice_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{expense.description || '—'}</TableCell>
                        <TableCell className="text-slate-700">€{Number(expense.total_amount || 0).toFixed(2)}</TableCell>
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
                <p className="text-slate-500 text-sm">No expenses found from this supplier</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
