'use client';

import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, Download, FileText, Mail } from 'lucide-react';
import Link from 'next/link';
import { useEmail, useUpdateEmailLabel, useDeleteEmail, useLinkEmailToCompany, useLinkEmailToContact } from '@/lib/supabase/emails';
import { useCompanies } from '@/lib/supabase/companies';
import { useContacts } from '@/lib/supabase/contacts';

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const { data: email, isLoading } = useEmail(id);
  const { data: companiesData } = useCompanies();
  const companies = companiesData || [];
  const { data: contactsData } = useContacts();
  const contacts = contactsData || [];

  const updateLabelMutation = useUpdateEmailLabel();
  const deleteEmailMutation = useDeleteEmail();
  const linkToCompanyMutation = useLinkEmailToCompany();
  const linkToContactMutation = useLinkEmailToContact();

  const handleLabelUpdate = async (label: 'incoming_invoice' | 'receipt' | 'newsletter' | 'other') => {
    try {
      await updateLabelMutation.mutateAsync({ id, label });
    } catch (error) {
      console.error('Failed to update label:', error);
      alert('Failed to update label');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEmailMutation.mutateAsync({ id });
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete email:', error);
      alert('Failed to delete email');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!email) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Email not found</p>
        </div>
      </MainLayout>
    );
  }

  const getLabelBadge = (label: string | null | undefined) => {
    if (!label) return <Badge variant="outline">Unlabeled</Badge>;

    const variants: Record<string, any> = {
      incoming_invoice: 'default',
      receipt: 'secondary',
      newsletter: 'outline',
      other: 'destructive',
    };

    return (
      <Badge variant={variants[label] || 'outline'}>
        {label.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Email Details</h1>
              <p className="text-muted-foreground mt-1">
                {format(new Date(email.email_date), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getLabelBadge(email.label)}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteEmailMutation.isPending}
            >
              Delete Email
            </Button>
          </div>
        </div>

        {/* Email Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Subject</label>
              <p className="text-lg font-semibold text-foreground">{email.subject || '(no subject)'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">From</label>
                <p className="text-foreground">{email.from_address}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">To</label>
                <p className="text-foreground">{email.to_address || '—'}</p>
              </div>

              {/* CC address not tracked in new schema */}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <p className="text-foreground">
                  {format(new Date(email.email_date), 'PPPP p')}
                </p>
              </div>
            </div>

            {/* Linked invoice/expense tracking removed from new schema - use linked_company/contact instead */}

            <div className="pt-4 border-t space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Linked Company</label>
                {email.linked_company_id ? (
                  <div className="mt-2 flex gap-2 items-center">
                    <Link href={`/companies/${email.linked_company_id}`}>
                      <Button variant="outline" size="sm">
                        View Company
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => linkToCompanyMutation.mutate({ emailId: id, companyId: null })}
                    >
                      Unlink
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      onChange={(e) => {
                        const companyId = parseInt(e.target.value);
                        if (companyId) {
                          linkToCompanyMutation.mutate({ emailId: id, companyId });
                        }
                      }}
                    >
                      <option value="">Select company...</option>
                      {companies.map((company: any) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Linked Contact</label>
                {email.linked_contact_id ? (
                  <div className="mt-2 flex gap-2 items-center">
                    <Link href={`/contacts/${email.linked_contact_id}`}>
                      <Button variant="outline" size="sm">
                        View Contact
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => linkToContactMutation.mutate({ emailId: id, contactId: null })}
                    >
                      Unlink
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      onChange={(e) => {
                        const contactId = parseInt(e.target.value);
                        if (contactId) {
                          linkToContactMutation.mutate({ emailId: id, contactId });
                        }
                      }}
                    >
                      <option value="">Select contact...</option>
                      {contacts.map((contact: any) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Label Actions */}
        {!email.label && (
          <Card>
            <CardHeader>
              <CardTitle>Label this Email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleLabelUpdate('incoming_invoice')}
                  disabled={updateLabelMutation.isPending}
                >
                  Invoice
                </Button>
                <Button
                  onClick={() => handleLabelUpdate('receipt')}
                  disabled={updateLabelMutation.isPending}
                >
                  Receipt
                </Button>
                <Button
                  onClick={() => handleLabelUpdate('newsletter')}
                  disabled={updateLabelMutation.isPending}
                >
                  Newsletter
                </Button>
                <Button
                  onClick={() => handleLabelUpdate('other')}
                  disabled={updateLabelMutation.isPending}
                >
                  Other
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Body */}
        <Card>
          <CardHeader>
            <CardTitle>Email Content</CardTitle>
          </CardHeader>
          <CardContent>
            {email.body_html ? (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: email.body_html }}
              />
            ) : email.body_text ? (
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
                {email.body_text}
              </pre>
            ) : (
              <p className="text-muted-foreground">No email body content</p>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Attachments ({email.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {email.attachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{attachment.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.mime_type} • {(attachment.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([attachment.file_data], { type: attachment.mime_type });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = attachment.filename;
                        a.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing errors removed - no longer tracked in new architecture */}
      </div>
    </MainLayout>
  );
}
