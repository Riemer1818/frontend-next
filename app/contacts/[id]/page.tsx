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
import { Mail, Phone, Building2, Briefcase } from 'lucide-react';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = parseInt(params.id as string);

  const { data: contact, isLoading } = trpc.contact.getById.useQuery({ id: contactId });
  const { data: company } = trpc.company.getById.useQuery(
    { id: contact?.company_id || 0 },
    { enabled: !!contact?.company_id }
  );

  // Get projects for this contact's company
  const { data: projects } = trpc.project.getAll.useQuery(
    { clientId: contact?.company_id },
    { enabled: !!contact?.company_id }
  );

  // Don't show time entries for contacts - time entries are work YOU do, not work contacts do

  const deleteMutation = trpc.contact.delete.useMutation({
    onSuccess: () => {
      router.push('/contacts');
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${contact?.first_name}? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: contactId });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Loading contact details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!contact) {
    return (
      <MainLayout>
        <div className="p-8">
          <p className="text-slate-500">Contact not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/contacts" className="text-sm text-slate-600 hover:text-slate-900 mb-2 inline-block">
              ← Back to Contacts
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">
              {contact.first_name} {contact.last_name}
            </h1>
            {contact.description && (
              <p className="text-slate-600 mt-1">{contact.description}</p>
            )}
            {contact.role && (
              <p className="text-slate-500 text-sm mt-1">{contact.role}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-blue-900 hover:bg-blue-800 text-white"
              onClick={() => router.push(`/contacts/${contactId}/edit`)}
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

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <a href={`mailto:${contact.email}`} className="text-blue-900 hover:underline">
                      {contact.email}
                    </a>
                  </div>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <a href={`tel:${contact.phone}`} className="text-blue-900 hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                </div>
              )}

              {contact.company_id && company && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Company</p>
                    <Link href={`/companies/${contact.company_id}`} className="text-blue-900 hover:underline flex items-center gap-2">
                      {company.name}
                      {contact.is_primary && (
                        <Badge className="bg-blue-900 text-white text-xs">Primary</Badge>
                      )}
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="h-4 w-4" />
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <Badge variant={contact.is_active ? "default" : "secondary"} className={contact.is_active ? "bg-green-100 text-green-800" : ""}>
                    {contact.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {contact.notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Associated Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.company_id && (
                <>
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Company Projects</p>
                      <p className="text-2xl font-bold text-slate-900">{projects?.length || 0}</p>
                    </div>
                  </div>
                </>
              )}

              {!contact.company_id && (
                <p className="text-slate-500 text-sm">This contact is not associated with any company.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects */}
        {contact.company_id && projects && projects.length > 0 && (
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Associated Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-900 font-semibold">Project</TableHead>
                    <TableHead className="text-slate-900 font-semibold">Status</TableHead>
                    <TableHead className="text-slate-900 font-semibold">Hourly Rate</TableHead>
                    <TableHead className="text-right text-slate-900 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900">{project.name}</TableCell>
                      <TableCell>
                        <Badge variant={project.status === 'active' ? "default" : "secondary"} className={project.status === 'active' ? "bg-blue-900 text-white" : ""}>
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700">
                        €{Number(project.hourly_rate || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm" className="text-slate-900 hover:bg-slate-100">
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

      </div>
    </MainLayout>
  );
}
