'use client';

import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CompaniesPage() {
  const { data: companies, isLoading } = trpc.company.getAll.useQuery();

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Companies</h1>
          </div>
          <Link href="/companies/create">
            <Button className="bg-blue-900 hover:bg-blue-800 text-white">
              Add Company
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <p className="text-slate-500">Loading companies...</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-slate-900 font-semibold">Name</TableHead>
                  <TableHead className="text-slate-900 font-semibold">Type</TableHead>
                  <TableHead className="text-slate-900 font-semibold">Email</TableHead>
                  <TableHead className="text-slate-900 font-semibold">Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                      No companies found. Create your first company to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies?.map((company) => (
                    <TableRow
                      key={company.id}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => window.location.href = `/companies/${company.id}`}
                    >
                      <TableCell className="font-medium text-slate-900">{company.name}</TableCell>
                      <TableCell className="text-slate-700">
                        <span className={company.type === 'client' ? 'bg-blue-900 text-white px-2 py-1 rounded text-xs' : 'bg-slate-200 text-slate-900 px-2 py-1 rounded text-xs'}>
                          {company.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700">{company.email || '—'}</TableCell>
                      <TableCell className="text-slate-700">{company.phone || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
