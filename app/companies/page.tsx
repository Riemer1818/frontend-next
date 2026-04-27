'use client';

import { useCompanies } from '@/lib/supabase/companies';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClickableTableRow } from '@/components/ui/clickable-table-row';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import Link from 'next/link';

export default function CompaniesPage() {
  const { data: companies, isLoading, error } = useCompanies();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6 bg-background min-h-screen">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">Companies</h1>
            <Link href="/companies/create">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Add Company
              </Button>
            </Link>
          </div>
          <div className="flex justify-center py-12">
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6 bg-background min-h-screen">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">Companies</h1>
            <Link href="/companies/create">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Add Company
              </Button>
            </Link>
          </div>
          <div className="flex justify-center py-12">
            <p className="text-red-500">Error loading companies: {error.message}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const companiesArray = companies || [];

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Companies</h1>
          </div>
          <Link href={ROUTES.companies.create}>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              Add Company
            </Button>
          </Link>
        </div>

        <div className="border border-border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-background">
                <TableHead className="text-foreground font-semibold">Name</TableHead>
                <TableHead className="text-foreground font-semibold">Type</TableHead>
                <TableHead className="text-foreground font-semibold">Email</TableHead>
                <TableHead className="text-foreground font-semibold">Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companiesArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No companies found. Create your first company to get started.
                  </TableCell>
                </TableRow>
              ) : (
                companiesArray.map((company) => (
                  <ClickableTableRow
                    key={company.id}
                    href={ROUTES.companies.detail(company.id)}
                  >
                    <TableCell className="font-medium text-foreground">{company.name}</TableCell>
                    <TableCell className="text-foreground">
                      <span className={company.type === 'client' ? 'bg-primary text-white px-2 py-1 rounded text-xs' : 'bg-muted text-foreground px-2 py-1 rounded text-xs'}>
                        {company.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground">{company.email || '—'}</TableCell>
                    <TableCell className="text-foreground">{company.phone || '—'}</TableCell>
                  </ClickableTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
