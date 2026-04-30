'use client';

import { useContact, useDeleteContact } from '@/lib/supabase/contacts';
import { useCompany } from '@/lib/supabase/companies';
import { useProjects } from '@/lib/supabase/projects';
import { useEmailsByContact } from '@/lib/supabase/emails';
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
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/loading-state';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Mail, Phone, Building2, Briefcase } from 'lucide-react';
import EmbeddedGraph from '@/components/graph/EmbeddedGraph';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = parseInt(params.id as string);

  const { data: contact, isLoading } = useContact(contactId);
  const { data: company } = useCompany(contact?.company_id || undefined);

  // Get projects for this contact's company
  const { data: projects = [] } = useProjects({
    clientId: contact?.company_id || undefined
  });

  // Get emails from this contact
  const { data: emails = [] } = useEmailsByContact(contactId);

  // Don't show time entries for contacts - time entries are work YOU do, not work contacts do

  const deleteMutation = useDeleteContact();

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${contact?.first_name}? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: contactId }, {
        onSuccess: () => {
          router.push('/contacts');
        },
      });
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading contact details..." />;
  }

  if (!contact) {
    return (
      <MainLayout>
        <div className="p-8">
          <p className="text-muted-foreground">Contact not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <PageHeader
          title={`${contact.first_name} ${contact.last_name}`}
          subtitle={
            <>
              {contact.description && <p>{contact.description}</p>}
              {contact.role && <p className="text-sm mt-1">{contact.role}</p>}
            </>
          }
          backLink={{ href: '/contacts', label: 'Back to Contacts' }}
          actions={
            <>
              <Button
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() => router.push(`/contacts/${contactId}/edit`)}
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
            </>
          }
        />

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                      {contact.email}
                    </a>
                  </div>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                </div>
              )}

              {contact.company_id && company && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <Link href={`/companies/${contact.company_id}`} className="text-primary hover:underline flex items-center gap-2">
                      {company.name}
                      {contact.is_primary && (
                        <Badge className="bg-primary text-white text-xs">Primary</Badge>
                      )}
                    </Link>
                  </div>
                </div>
              )}

              {contact.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-foreground whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Associated Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.company_id && (
                <>
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Company Projects</p>
                      <p className="text-2xl font-bold text-foreground">{projects.length || 0}</p>
                    </div>
                  </div>
                </>
              )}

              {!contact.company_id && (
                <p className="text-muted-foreground text-sm">This contact is not associated with any company.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Relationship Graph */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Network Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <EmbeddedGraph
              entityId={contactId.toString()}
              entityType="contact"
              height="500px"
              degrees={2}
              showControls={true}
              showLegend={true}
            />
          </CardContent>
        </Card>

        {/* Projects */}
        {contact.company_id && projects && projects.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Associated Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-background">
                    <TableHead className="text-foreground font-semibold">Project</TableHead>
                    <TableHead className="text-foreground font-semibold">Hourly Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project: any) => (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">{project.name}</TableCell>
                      <TableCell className="text-foreground">
                        €{Number(project.hourly_rate || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <p className="text-muted-foreground text-sm">No emails from this contact</p>
            )}
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
